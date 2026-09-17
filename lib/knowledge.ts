import { categories, categoryName } from "../constants/categories";
import { currentStreakDays } from "./achievements";
import { supabase } from "./supabase";
import type { Topic } from "./topics";
import { fetchTopics } from "./topics";

// What the Knowledge screen knows: which of the published topics the player has
// spoken about, how well they did, and what they have played lately.
//
// Same bargain as `lib/achievements.ts` — nothing is stored and everything is
// recomputed from the rounds. A "mastered" flag on a row would be a second copy
// of a fact `speech_sessions` already holds, and the two would disagree the
// first time a round failed to write.
//
// Unlike the achievements, this one also needs the *pool*. A screen about what
// you have covered says nothing without what there was to cover: "43 topics" is
// a number, "43 of 125" is a picture. So the topics are read too and the two
// are joined here rather than in the database — `topics` is 125 rows that
// several screens already fetch whole, and a join in SQL would buy nothing.

// The quiz percentage at which a topic stops counting as merely visited and
// starts counting as known. The net draws both states, which is why there is
// one threshold here and not two: every topic with a round is on the map, and
// this is the line where its dot goes bright.
export const MASTERY_SCORE = 80;

// A topic is either untouched, spoken about, or known. Three states rather than
// two because the screen's whole claim — "this is the brain you're training" —
// needs to show effort and result as different things. A map that only lit up
// at 80% would call a round you fumbled the same as a round you never played.
export type TopicState = "untouched" | "spoken" | "mastered";

export type KnowledgeTopic = {
  slug: string;
  title: string;
  category: string;
  state: TopicState;
  // The best quiz percentage ever scored on this topic, or null if every round
  // on it skipped the quiz. Best rather than latest, for the reason every
  // achievement metric is a high-water mark: a topic you once knew is not
  // un-known by a bad evening.
  bestScore: number | null;
  rounds: number;
};

export type KnowledgeCategory = {
  key: string;
  name: string;
  // Published topics in this category — the denominator of its bar.
  total: number;
  // Topics with at least one round. Includes the mastered ones, so `spoken` is
  // "how much of this have I touched" and never needs adding to `mastered`.
  spoken: number;
  mastered: number;
  // Every topic in the category, untouched ones included: the category card
  // lists what is left to do as much as what is done.
  topics: KnowledgeTopic[];
};

export type KnowledgeRound = {
  id: string;
  startedAt: string;
  topicSlug: string;
  title: string;
  score: number | null;
  durationMs: number;
};

export type KnowledgeSummary = {
  // The two numbers in the sentence at the top of the screen.
  masteredCount: number;
  topicCount: number;
  categories: KnowledgeCategory[];
  // Newest first — the list under the net is a history, and a history is read
  // from the top.
  rounds: KnowledgeRound[];
  // For the Home header this screen carries. The same rule the Achievements
  // tile uses, imported rather than rewritten, so the flame cannot show one
  // number here and another one tab away.
  streakDays: number;
};

// The columns a round contributes. `topic_slug` and not `topic_id`: a topic that
// gets unpublished sets `topic_id` to null, and a history that shrinks when
// content is edited would be a lie about what the player did.
const ROUND_COLUMNS =
  "id, started_at, duration_ms, quiz_score, topic_slug" as const;

export type KnowledgeSession = {
  id: string;
  started_at: string;
  duration_ms: number;
  quiz_score: number | null;
  topic_slug: string;
};

export type KnowledgeInput = {
  topics: readonly Topic[];
  sessions: readonly KnowledgeSession[];
  // Passed in rather than read inside, so the same input always produces the
  // same answer — the same reason `evaluateAchievements` takes it.
  now: Date;
};

export async function fetchKnowledge(
  userId: string
): Promise<KnowledgeSummary> {
  // Two independent reads, so the screen waits for the slower rather than for
  // the sum of both.
  const [topics, sessions] = await Promise.all([
    fetchTopics(),
    fetchRounds(userId),
  ]);

  return evaluateKnowledge({ topics, sessions, now: new Date() });
}

async function fetchRounds(userId: string): Promise<KnowledgeSession[]> {
  const { data, error } = await supabase
    .from("speech_sessions")
    .select(ROUND_COLUMNS)
    // Redundant while RLS restricts the table to `auth.uid() = user_id`, and
    // kept for the same reason as everywhere else that reads this table: the
    // day a policy exposes another player's rows, this screen must still be
    // counting exactly one player's.
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load rounds: ${error.message}`);
  }

  return data ?? [];
}

// Pure, so the whole screen can be reasoned about — and later tested — without
// a database in the room.
export function evaluateKnowledge(input: KnowledgeInput): KnowledgeSummary {
  const { topics, sessions, now } = input;

  const history = historyBySlug(sessions);
  const titles = new Map(topics.map((topic) => [topic.slug, topic.title]));

  const byCategory = new Map<string, KnowledgeTopic[]>();

  for (const topic of topics) {
    const seen = history.get(topic.slug);

    const entry: KnowledgeTopic = {
      slug: topic.slug,
      title: topic.title,
      category: topic.category,
      state: stateOf(seen),
      bestScore: seen?.bestScore ?? null,
      rounds: seen?.rounds ?? 0,
    };

    byCategory.set(topic.category, [
      ...(byCategory.get(topic.category) ?? []),
      entry,
    ]);
  }

  const grouped = [...byCategory.entries()]
    .map(([key, entries]) => ({
      key,
      name: categoryName(key),
      total: entries.length,
      spoken: entries.filter((entry) => entry.state !== "untouched").length,
      mastered: entries.filter((entry) => entry.state === "mastered").length,
      // Mastered first, then merely spoken, then the untouched rest — a list
      // you open to see where you stand should open on where you stand.
      topics: [...entries].sort(strongestFirst),
    }))
    // In the order the content was authored, not by how well the player is
    // doing: these five rows are a table of contents, and a table of contents
    // that reshuffles itself between visits cannot be learned.
    .sort((a, b) => contentOrder(a.key) - contentOrder(b.key));

  return {
    masteredCount: grouped.reduce((sum, group) => sum + group.mastered, 0),
    topicCount: topics.length,
    categories: grouped,
    rounds: roundsNewestFirst(sessions, titles),
    streakDays: currentStreakDays(
      sessions.map((session) => session.started_at),
      now
    ),
  };
}

type Seen = { rounds: number; bestScore: number | null };

function historyBySlug(
  sessions: readonly KnowledgeSession[]
): Map<string, Seen> {
  const history = new Map<string, Seen>();

  for (const session of sessions) {
    const seen = history.get(session.topic_slug) ?? {
      rounds: 0,
      bestScore: null,
    };

    history.set(session.topic_slug, {
      rounds: seen.rounds + 1,
      // A skipped quiz leaves the best score alone rather than counting as a 0:
      // it is the absence of an answer, not a wrong one.
      bestScore:
        session.quiz_score === null
          ? seen.bestScore
          : Math.max(seen.bestScore ?? 0, session.quiz_score),
    });
  }

  return history;
}

function stateOf(seen: Seen | undefined): TopicState {
  if (!seen) return "untouched";

  return (seen.bestScore ?? 0) >= MASTERY_SCORE ? "mastered" : "spoken";
}

function roundsNewestFirst(
  sessions: readonly KnowledgeSession[],
  titles: ReadonlyMap<string, string>
): KnowledgeRound[] {
  return [...sessions]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map((session) => ({
      id: session.id,
      startedAt: session.started_at,
      topicSlug: session.topic_slug,
      title: titles.get(session.topic_slug) ?? titleFromSlug(session.topic_slug),
      score: session.quiz_score,
      durationMs: session.duration_ms,
    }));
}

// Only ever reached by a round whose topic has since been unpublished, where the
// title is gone and the slug is all that survived. Slugs are made from titles,
// so undoing that is right far more often than it is wrong — and a readable
// guess beats showing the player `the-nature-of-time` for something they spoke
// about.
function titleFromSlug(slug: string): string {
  const words = slug.replace(/-/g, " ").trim();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Mastered before spoken before untouched, and within a state the better score
// first. Ties fall back to the title so the order is stable: Postgres promises
// nothing about row order, and two topics swapping places between two visits
// would be motion with no meaning behind it.
function strongestFirst(a: KnowledgeTopic, b: KnowledgeTopic): number {
  const byState = stateRank(a.state) - stateRank(b.state);
  if (byState !== 0) return byState;

  const byScore = (b.bestScore ?? -1) - (a.bestScore ?? -1);
  if (byScore !== 0) return byScore;

  return a.title.localeCompare(b.title);
}

function stateRank(state: TopicState): number {
  return state === "mastered" ? 0 : state === "spoken" ? 1 : 2;
}

function contentOrder(key: string): number {
  const index = categories.findIndex((category) => category.key === key);
  // A category this build has no entry for sorts last rather than first.
  return index === -1 ? categories.length : index;
}
