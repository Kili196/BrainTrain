import { supabase } from "./supabase";

// Reading the leaderboard. The only call in the app that returns anything about
// another user, and the only one that goes through an RPC rather than a table:
// `profiles` and `speech_sessions` are locked to their owner by RLS, and the
// `leaderboard()` function is the one narrow door across. See the migration for
// why it is a function and not a policy.

// How many places to ask for. The board shows a podium plus a list, and nobody
// scrolls past fifty strangers to find out they are 51st — the caller's own row
// comes back regardless of where it sits, so a deeper page buys nothing.
const TOP_N = 50;

export type LeaderboardEntry = {
  place: number;
  // Nullable despite what `database.types.ts` says. The generator cannot see
  // nullability through a `returns table` clause and types both of these as
  // plain strings, but the columns behind them are nullable: `display_name` is
  // null until onboarding writes one, and `country_code` is optional. Trusting
  // the generated type here would mean a `.toUpperCase()` on undefined on the
  // first player who skipped a field.
  name: string | null;
  countryCode: string | null;
  points: number;
  // Which row is the caller's. Decided inside the function from `auth.uid()`
  // rather than by comparing ids here, because the function deliberately does
  // not return anybody's id — including your own.
  isYou: boolean;
};

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("leaderboard", { top_n: TOP_N });

  if (error) {
    throw new Error(`Failed to load the leaderboard: ${error.message}`);
  }

  // Mapped rather than passed through, so the honest nullability above is what
  // the screens see. The `?? null` is not defensive noise: it is the correction
  // to the generated type.
  return (data ?? []).map((row) => ({
    place: row.place,
    name: row.display_name ?? null,
    countryCode: row.country_code ?? null,
    points: row.points,
    isYou: row.is_you,
  }));
}

// What to show for a player who never entered a name. Not "Anonymous", which
// reads like a deliberate choice to hide, and not an empty row, which reads
// like a bug — they simply have not been asked yet at the point the board can
// already see them.
export const UNNAMED_PLAYER = "New player";

export function displayNameOf(entry: LeaderboardEntry): string {
  return entry.name?.trim() || UNNAMED_PLAYER;
}

// The disc initial. Same rule the profile screen uses for its avatar, kept
// here rather than imported across screens because the fallback differs: this
// one has a name to fall back to first.
export function initialOf(entry: LeaderboardEntry): string {
  return displayNameOf(entry).charAt(0).toUpperCase();
}
