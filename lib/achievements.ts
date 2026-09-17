import type { Achievement, AchievementKey } from "../constants/achievements";
import { achievements } from "../constants/achievements";
import { fetchProfile } from "./profile";
import { supabase } from "./supabase";

// How far a player is through each of the 24 achievements.
//
// Everything is derived from the rounds themselves — there is no achievements
// table and deliberately none: a row saying "unlocked" would be a second copy
// of a fact `speech_sessions` already holds, and the two would drift the first
// time a round failed to save. Recomputing means the screen can never claim
// something the history does not support.
//
// Counted in JS rather than SQL, for the same reason `fetchRoundStats` is: RLS
// hands a player only their own rows, and their own rows are a handful. The day
// somebody has thousands of rounds this belongs in an RPC that groups
// server-side — the shape of the answer would not change, only where it is
// computed.

// The columns a measurement can be made from. Named here because the evaluator
// below is pure — it takes rows, not a user id — which is what makes it
// possible to reason about (and later test) without a database.
export type AchievementSession = {
  started_at: string;
  duration_ms: number;
  quiz_score: number | null;
  topic_id: string | null;
  topic_slug: string;
  topics: { category: string } | null;
};

export type AchievementInput = {
  sessions: readonly AchievementSession[];
  // The daily topic per UTC day, as `day -> topic_id`.
  dailyTopics: ReadonlyMap<string, string>;
  // When the account was created. `fast_start` and `year_one` are the only two
  // achievements that are about the account rather than the rounds.
  accountCreatedAt: string | null;
  // Passed in rather than read inside, so the same input always produces the
  // same answer.
  now: Date;
};

export type AchievementProgress = {
  achievement: Achievement;
  // What the player has actually reached, in the achievement's own unit.
  value: number;
  // The achievement's own target, copied here so the screen can draw the bar
  // without reaching back through `achievement` for it.
  target: number;
  done: boolean;
};

export type AchievementSummary = {
  // What the "6 / 24" counter at the top of the screen shows.
  completed: number;
  total: number;
  rows: AchievementProgress[];
  // The two tiles above the list. The streak here is the one running *now*,
  // unlike the `streak` achievement, which is the longest ever — a tile saying
  // "Day streak" is answering "am I on one?", and the row is answering "have I
  // ever been?".
  streakDays: number;
  spokenMs: number;
};

const SESSION_COLUMNS =
  "started_at, duration_ms, quiz_score, topic_id, topic_slug, topics(category)" as const;

export async function fetchAchievements(
  userId: string
): Promise<AchievementSummary> {
  // Three independent reads, so they go out together rather than in sequence —
  // the screen waits for the slowest, not the sum.
  const [sessions, dailyTopics, profile] = await Promise.all([
    fetchSessions(userId),
    fetchDailyTopics(),
    fetchProfile(userId),
  ]);

  return evaluateAchievements({
    sessions,
    dailyTopics,
    accountCreatedAt: profile?.created_at ?? null,
    now: new Date(),
  });
}

async function fetchSessions(userId: string): Promise<AchievementSession[]> {
  const { data, error } = await supabase
    .from("speech_sessions")
    .select(SESSION_COLUMNS)
    // Redundant while RLS restricts the table to `auth.uid() = user_id`, and
    // kept for the same reason as in `lib/speech-sessions.ts`: the day a policy
    // exposes other people's rows, this screen must still count one player's.
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load rounds: ${error.message}`);
  }

  return data ?? [];
}

// The whole table, on purpose. `daily_topics` holds one row per day and a topic
// can be the daily topic at most once ever, so it is bounded by the size of the
// published pool — 125 rows, forever. Reading it whole is cheaper than asking
// per round which day had which topic.
async function fetchDailyTopics(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("daily_topics")
    .select("day, topic_id");

  if (error) {
    throw new Error(`Failed to load daily topics: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.day, row.topic_id]));
}

export function evaluateAchievements(
  input: AchievementInput
): AchievementSummary {
  const { values, streakDays } = measure(input);

  const rows = achievements.map((achievement) =>
    progressOf(achievement, values[achievement.key])
  );

  return {
    completed: rows.filter((row) => row.done).length,
    total: rows.length,
    rows,
    streakDays,
    // The same number the `time_spent` ladder is measured against, so the tile
    // and the row can never disagree.
    spokenMs: values.time_spent,
  };
}

function progressOf(
  achievement: Achievement,
  value: number
): AchievementProgress {
  return {
    achievement,
    value,
    target: achievement.target,
    done: value >= achievement.target,
  };
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// The rules the measurements follow, all three worth stating once rather than
// repeating in twenty comments:
//
//  * **Every metric is a high-water mark.** Where a value could fall — the
//    current streak, an average that a bad round drags down — what is counted
//    is the best the history has ever shown. An achievement that can be lost is
//    not an achievement.
//  * **Days are the player's local days**, because a streak is about the
//    evenings somebody sat down, not about UTC. The one exception is the daily
//    topic, which is defined in UTC on the server (`daily_topic()`), so
//    matching it has to be too.
//  * **A skipped quiz is a zero**, the way the profile already treats it: it
//    cost the player nothing, it just earned nothing.
type Measurements = {
  values: Record<AchievementKey, number>;
  streakDays: number;
};

function measure(input: AchievementInput): Measurements {
  // Chronological, once — half the metrics below are about what followed what.
  const sessions = [...input.sessions].sort(
    (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at)
  );

  const createdAt = input.accountCreatedAt
    ? Date.parse(input.accountCreatedAt)
    : null;

  const roundsPerDay = new Map<string, number>();
  const categoriesPerDay = new Map<string, Set<string>>();
  const topicsPerCategory = new Map<string, Set<string>>();
  const roundsPerCategory = new Map<string, number>();
  // Running sum and count per category, plus whether the average has ever
  // cleared the bar. See `specialist` below.
  const scorePerCategory = new Map<
    string,
    { sum: number; rounds: number; qualified: boolean }
  >();
  // The best score the player has ever had on a topic, to date. Rebuilt as the
  // loop walks forward, so "beat your own earlier score" compares against what
  // was true at the time.
  const bestPerTopic = new Map<string, number>();
  const topics = new Set<string>();
  const startHours = new Set<number>();
  const weekdays = new Set<number>();
  const dailyTopicDays = new Set<string>();

  let perfectRun = 0;
  let longestPerfectRun = 0;
  let floorRun = 0;
  let longestFloorRun = 0;
  let rebounds = 0;
  let secondPasses = 0;
  let nightRounds = 0;
  let fastStartRounds = 0;
  let spokenMs = 0;
  let longestRoundMs = 0;
  let previousScore: number | null = null;

  for (const session of sessions) {
    const started = new Date(session.started_at);
    const score = session.quiz_score ?? 0;
    const day = localDay(started);

    roundsPerDay.set(day, (roundsPerDay.get(day) ?? 0) + 1);
    startHours.add(started.getHours());
    weekdays.add(started.getDay());
    // Midnight to 4am, which is what the row promises. The hour is the local
    // one: somebody speaking at 2am is doing it in their own night.
    if (started.getHours() < 4) nightRounds += 1;

    spokenMs += session.duration_ms;
    longestRoundMs = Math.max(longestRoundMs, session.duration_ms);

    if (createdAt !== null && started.getTime() < createdAt + 7 * DAY) {
      fastStartRounds += 1;
    }

    // Identified by slug rather than id: `topic_id` goes null when a topic is
    // unpublished or deleted, and a topic the player has genuinely spoken about
    // must not stop counting because the content changed underneath them.
    topics.add(session.topic_slug);

    const previousBest = bestPerTopic.get(session.topic_slug);
    if (previousBest !== undefined && score > previousBest) secondPasses += 1;
    bestPerTopic.set(session.topic_slug, Math.max(previousBest ?? 0, score));

    if (score === 100) {
      perfectRun += 1;
      longestPerfectRun = Math.max(longestPerfectRun, perfectRun);
    } else {
      perfectRun = 0;
    }

    if (score >= 60) {
      floorRun += 1;
      longestFloorRun = Math.max(longestFloorRun, floorRun);
    } else {
      floorRun = 0;
    }

    // An explicit 0, not a skipped quiz: skipping and then acing the next round
    // is not a recovery from anything.
    if (previousScore === 0 && session.quiz_score === 100) rebounds += 1;
    previousScore = session.quiz_score;

    if (
      session.topic_id !== null &&
      input.dailyTopics.get(utcDay(started)) === session.topic_id
    ) {
      // The day, not the round: playing the same daily topic twice is one
      // ritual kept, not two.
      dailyTopicDays.add(utcDay(started));
    }

    const category = session.topics?.category;
    if (!category) continue;

    const dayCategories = categoriesPerDay.get(day) ?? new Set<string>();
    dayCategories.add(category);
    categoriesPerDay.set(day, dayCategories);

    const categoryTopics = topicsPerCategory.get(category) ?? new Set<string>();
    categoryTopics.add(session.topic_slug);
    topicsPerCategory.set(category, categoryTopics);

    roundsPerCategory.set(category, (roundsPerCategory.get(category) ?? 0) + 1);

    // `specialist` asks for an average, and an average falls as easily as it
    // rises — so what is stored is whether it has ever stood at 80 or better
    // over at least five rounds. Five, because one lucky round is not a
    // speciality, and it is the number the row's description names. Walking the
    // history forward like this is what keeps a metric built on an average
    // monotonic.
    const running = scorePerCategory.get(category) ?? {
      sum: 0,
      rounds: 0,
      qualified: false,
    };
    running.sum += score;
    running.rounds += 1;
    running.qualified =
      running.qualified ||
      (running.rounds >= 5 && running.sum / running.rounds >= 80);
    scorePerCategory.set(category, running);
  }

  const playedDays = [...roundsPerDay.keys()];

  const values: Record<AchievementKey, number> = {
    rounds_played: sessions.length,
    play_days: playedDays.length,
    fast_start: fastStartRounds,
    // Not a count of anything — either the account has seen a year or it has
    // not. A one-level achievement is a yes/no drawn as 0/1.
    year_one:
      createdAt !== null && input.now.getTime() - createdAt >= 365 * DAY
        ? 1
        : 0,

    perfect_rounds: sessions.filter((s) => s.quiz_score === 100).length,
    perfect_streak: longestPerfectRun,
    high_floor: longestFloorRun,
    rebound: rebounds,

    distinct_topics: topics.size,
    all_categories: new Set(
      sessions.map((s) => s.topics?.category).filter(isCategory)
    ).size,
    category_complete: largest(topicsPerCategory, (set) => set.size),
    grand_tour: largest(categoriesPerDay, (set) => set.size),

    home_turf: largest(roundsPerCategory, (rounds) => rounds),
    specialist: [...scorePerCategory.values()].filter((c) => c.qualified).length,
    second_pass: secondPasses,

    // The longest streak the history holds, not the one running right now. The
    // current one is what Home shows; this one cannot be taken away by a day
    // off, which is what a level requires.
    streak: longestConsecutiveRun(playedDays),
    heavy_week: longestConsecutiveRun(
      playedDays.filter((day) => (roundsPerDay.get(day) ?? 0) >= 3)
    ),

    night_shift: nightRounds,
    big_day: largest(roundsPerDay, (rounds) => rounds),
    clock_face: startHours.size,
    all_weekdays: weekdays.size,

    time_spent: spokenMs,
    long_round: longestRoundMs,

    daily_topic: dailyTopicDays.size,
  };

  return { values, streakDays: currentRun(playedDays, input.now) };
}

// The streak on its own, for a screen that wants the flame and nothing else.
// One column of one table: the Home header used to render a placeholder because
// there was no cheap way to ask this, and a full `fetchAchievements` — three
// reads and 24 measurements — would be a heavy way to answer "how many days".
export async function fetchStreakDays(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("speech_sessions")
    .select("started_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load the streak: ${error.message}`);
  }

  return currentStreakDays(
    (data ?? []).map((row) => row.started_at),
    new Date()
  );
}

// The same streak, for callers that hold round timestamps and nothing else —
// the Knowledge screen, which carries the Home header and so has a flame to
// put a number under. Exported rather than reimplemented there: two copies of
// "does yesterday still count" would be one edit away from a flame that reads
// differently on two tabs.
export function currentStreakDays(
  startedAt: readonly string[],
  now: Date
): number {
  return currentRun(
    startedAt.map((stamp) => localDay(new Date(stamp))),
    now
  );
}

// The streak as it stands right now: the days counted back from the most recent
// one, but only if that day is today or yesterday.
//
// Yesterday counts because a streak is not broken until the day it needed a
// round has passed. Showing 0 all morning and 12 again after the evening round
// would be the tile lying twice a day.
function currentRun(days: readonly string[], now: Date): number {
  const ordered = [...new Set(days)].map(dayNumber).sort((a, b) => a - b);
  const today = dayNumber(localDay(now));

  let run = 0;
  let expected = today;

  for (const day of [...ordered].reverse()) {
    // The most recent day may be yesterday; after that every day has to follow
    // the one before it exactly.
    if (run === 0 && day === today - 1) expected = day;
    if (day !== expected) break;

    run += 1;
    expected -= 1;
  }

  return run;
}

function isCategory(category: string | undefined): category is string {
  return category !== undefined;
}

function largest<T>(
  entries: ReadonlyMap<string, T>,
  size: (value: T) => number
): number {
  let best = 0;
  for (const value of entries.values()) best = Math.max(best, size(value));
  return best;
}

// The longest run of calendar days with no gap. Days arrive unsorted and may
// repeat; both are handled here so the callers can stay one line each.
function longestConsecutiveRun(days: readonly string[]): number {
  const ordered = [...new Set(days)].map(dayNumber).sort((a, b) => a - b);

  let longest = 0;
  let run = 0;
  let previous: number | null = null;

  for (const day of ordered) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    previous = day;
    longest = Math.max(longest, run);
  }

  return longest;
}

// Days as `YYYY-MM-DD` strings rather than timestamps, so two rounds land on the
// same day exactly when a person would say they did — a date has no hours to
// disagree about.
function localDay(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

// `daily_topics.day` is a UTC date, so the lookup key has to be one too.
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Counting whole days, not milliseconds: the difference between two day numbers
// is 1 for consecutive days whether or not a clock changed in between, which is
// what makes a streak survive the end of summer time.
function dayNumber(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / DAY;
}
