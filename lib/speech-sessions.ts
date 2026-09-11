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
