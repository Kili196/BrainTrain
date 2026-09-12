import { categories } from "../constants/categories";
import type { Database } from "./database.types";
import type { RoundSession } from "./round-session";
import { supabase } from "./supabase";

// Writing a finished round to Supabase. Same shape as `lib/topics.ts` — a plain
// async function, called from a screen, no query library.
//
// This is the only table the app writes to, and every row in it belongs to
// exactly one user: the RLS policy is `auth.uid() = user_id` for all four
// operations, so an insert without a session does not fail quietly, it fails.
// That is why the whole app is gated behind an account before any screen runs.
type SpeechSessionInsert =
  Database["public"]["Tables"]["speech_sessions"]["Insert"];

// A round that actually reached the end of its speaking phase. `started_at` and
// `duration_ms` are not null in the table, and they are the two fields a round
// only gets when the recording screen stamps it — so rather than checking for
// them inside the save and failing at runtime, the save asks for a round that
// has them and the caller proves it with `isFinished`.
export type FinishedRound = RoundSession & {
  startedAt: string;
  spokenMs: number;
};

export function isFinished(
  round: RoundSession | null
): round is FinishedRound {
  return (
    round !== null && round.startedAt !== null && round.spokenMs !== null
  );
}

// `quizScore` is a percentage, 0–100, or null when the quiz was skipped.
export async function saveSpeechSession(
  round: FinishedRound,
  userId: string,
  quizScore: number | null
): Promise<void> {
  const row: SpeechSessionInsert = {
    user_id: userId,
    topic_id: round.topicId,
    topic_slug: round.topicSlug,
    started_at: round.startedAt,
    duration_ms: round.spokenMs,
    quiz_score: quizScore,
    transcript: round.transcript,
    client_session_id: round.clientSessionId,
  };

  // Upsert rather than insert, against the unique index on
  // (user_id, client_session_id). The key belongs to the round, so a save that
  // is retried — a tap on a flaky connection, a screen re-entered — lands on
  // the row it already wrote instead of adding a second copy of the same round.
  // That is the whole reason the column exists.
  const { error } = await supabase
    .from("speech_sessions")
    .upsert(row, { onConflict: "user_id,client_session_id" });

  // Thrown rather than swallowed: the screen has to know, because it is about
  // to tell the player their round was saved.
  if (error) throw error;
}

// Reading a player's rounds back, for the profile screen.
//
// One query, grouped here rather than in Postgres. That is a deliberate ceiling,
// not an oversight: RLS means a player reads only their own rows, and their own
// rows are a handful. The day that stops being true — a leaderboard across
// everyone, or a player with thousands of rounds — this belongs in an RPC that
// groups server-side, not in a larger select.
export type FieldStat = {
  // The raw `topics.category` key, not a label. `categoryName()` turns it into
  // one and survives a category the app has not shipped a name for yet.
  category: string;
  // Distinct topics, not rounds. Speaking about the same topic twice is
  // practice rather than breadth, and the design draws this as "12 topics".
  topicCount: number;
};

export type RoundStats = {
  rounds: number;
  // Every round's quiz percentage, summed. A skipped quiz is null in the table
  // and worth 0 here: it cost the player nothing, it just earned nothing.
  points: number;
  // Strongest first, and only categories the player has actually spoken about.
  fields: FieldStat[];
};

export async function fetchRoundStats(userId: string): Promise<RoundStats> {
  const { data, error } = await supabase
    .from("speech_sessions")
    .select("topic_id, quiz_score, topics(category)")
    // RLS already restricts this table to `auth.uid() = user_id`, so this
    // filter is not what makes the read safe. It is here to keep the query
    // honest if that ever changes: a leaderboard needs a policy that exposes
    // other people's rows, and on that day this screen must still count one
    // player's.
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load rounds: ${error.message}`);
  }

  const sessions = data ?? [];

  // A Set per category rather than a counter, because the question is how many
  // *different* topics were spoken about.
  const topicsByCategory = new Map<string, Set<string>>();

  for (const session of sessions) {
    // `topic_id` is nullable — a round whose topic has been unpublished or
    // deleted since it was played. It still counts as a round and still carries
    // its points; it just cannot be filed under a category, because the
    // category lived on the topic.
    const category = session.topics?.category;
    if (!category || !session.topic_id) continue;

    const seen = topicsByCategory.get(category) ?? new Set<string>();
    seen.add(session.topic_id);
    topicsByCategory.set(category, seen);
  }

  const fields = [...topicsByCategory.entries()]
    .map(([category, topics]) => ({ category, topicCount: topics.size }))
    .sort(strongestFirst);

  return {
    rounds: sessions.length,
    points: sessions.reduce((sum, s) => sum + (s.quiz_score ?? 0), 0),
    fields,
  };
}

// Most topics first. Ties fall back to the order the categories are authored in,
// because Postgres promises nothing about row order — without a tie-break, two
// categories on the same count would swap places between two visits to the
// screen for no visible reason.
function strongestFirst(a: FieldStat, b: FieldStat): number {
  if (a.topicCount !== b.topicCount) return b.topicCount - a.topicCount;
  return contentOrder(a.category) - contentOrder(b.category);
}

function contentOrder(key: string): number {
  const index = categories.findIndex((category) => category.key === key);
  // A category this build has no entry for sorts last rather than first.
  return index === -1 ? categories.length : index;
}
