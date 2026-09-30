import { supabase } from "./supabase";

// How many different players have started a round today (UTC). The paywall's
// "… people started today" line — a real count through the `players_today()`
// definer function, never a number made up to look busy. See the migration.
export async function fetchPlayersToday(): Promise<number> {
  const { data, error } = await supabase.rpc("players_today");

  if (error) {
    throw new Error(`Failed to count today's players: ${error.message}`);
  }

  return data ?? 0;
}
