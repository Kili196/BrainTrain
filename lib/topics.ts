import type { Database } from "./database.types";
import { supabase } from "./supabase";

// Reading topics from Supabase. Plain async functions on purpose — the same
// shape as `getHasOnboarded()`, callable from a `useEffect` without a query
// library. If caching and invalidation ever start hurting, that's the moment to
// reach for one, not before.
//
// The row types come from `lib/database.types.ts`, generated from the real
// schema by `npm run db:types`. Regenerate after every migration; a column that
// changes shape then shows up as a type error instead of as undefined at
// runtime.
type TopicRow = Database["public"]["Tables"]["topics"]["Row"];
type QuizQuestionRow = Database["public"]["Tables"]["quiz_questions"]["Row"];

// `status` is deliberately not selected and never filtered on here: the RLS
// policy on the table already restricts anonymous reads to published rows, so
// unpublished drafts are invisible no matter what the client asks for.
const TOPIC_COLUMNS =
  "id, slug, category, title, description, created_at, updated_at" as const;

export type Topic = Pick<
  TopicRow,
  | "id"
  | "slug"
  | "category"
  | "title"
  | "description"
  | "created_at"
  | "updated_at"
>;

// `options` is jsonb, so the generated type is `Json` — the database only
// guarantees it's an array of at least two entries, not that they are strings.
// Narrowing it here keeps the assertion in one place instead of at every call
// site, and turns bad content into a clear error instead of a blank answer card.
export type QuizQuestion = Omit<QuizQuestionRow, "options"> & {
  options: string[];
};

export async function fetchTopics(): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load topics: ${error.message}`);
  }

  return data ?? [];
}

// Draws one random published topic, rolled in Postgres by the `random_topic()`
// function (migration 20260827163100). Doing it server-side keeps the payload at
// one row instead of the whole pool, and the function runs `security invoker`,
// so the RLS policy still hides unpublished rows.
//
// Returns null when the pool is empty — a fresh database, or every topic still
// in draft. That is a state the UI has to handle, not an error.
//
// Note this is NOT the daily topic: this draw is independent per call and may
// repeat. The daily topic is global and recorded, and gets its own function.
export async function fetchRandomTopic(): Promise<Topic | null> {
  const { data, error } = await supabase.rpc("random_topic").maybeSingle();

  if (error) {
    throw new Error(`Failed to draw a random topic: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // The function returns the full row including `status`; the rest of the app
  // works with the narrower `Topic`, so drop it here rather than widening the
  // type for one caller.
  const { id, slug, category, title, description, created_at, updated_at } =
    data;

  return { id, slug, category, title, description, created_at, updated_at };
}

export async function fetchTopicBySlug(slug: string): Promise<Topic | null> {
  // `maybeSingle` returns null instead of erroring when nothing matches — an
  // unknown or unpublished slug is a normal outcome, not a failure.
  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load topic "${slug}": ${error.message}`);
  }

  return data;
}

export async function fetchQuizQuestions(
  topicId: string
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("topic_id", topicId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load questions for topic ${topicId}: ${error.message}`
    );
  }

  return (data ?? []).map(toQuizQuestion);
}

function toQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  const { options, ...rest } = row;

  if (
    !Array.isArray(options) ||
    !options.every((option) => typeof option === "string")
  ) {
    throw new Error(
      `Question ${row.id} has malformed options — expected an array of strings.`
    );
  }

  return { ...rest, options };
}
