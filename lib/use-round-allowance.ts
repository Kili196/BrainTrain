import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useUserId } from "./auth-context";
import { usePurchases } from "./purchases-context";
import { supabase } from "./supabase";

// What the player may start right now — the paywall's Free-vs-Pro table, as
// code. Free is the daily topic, one round per day; Pro is everything.
//
// Enforced here in the app only. Premium lives in RevenueCat, so the database
// cannot check it without a webhook mirroring it into a table — worth building
// once there is money worth protecting, not for the MVP.
export type RoundAllowance = {
  // Standard mode: random or by category. Pro only.
  standard: boolean;
  // The daily topic: free once per day, unlimited for Pro.
  daily: boolean;
};

// The start of today in UTC — the same boundary the daily topic turns over on,
// so "one round per day" and "today's topic" can never disagree about which
// day it is.
function startOfUtcDay(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

// Counts saved rounds, so a round abandoned halfway does not use up the day.
// That is lenient on purpose: losing your one round to a crash or a phone call
// would feel like a punishment, and a replay costs us nothing.
async function hasPlayedToday(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("speech_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", startOfUtcDay());

  if (error) {
    throw new Error(`Failed to count today's rounds: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

export function useRoundAllowance(): RoundAllowance {
  const userId = useUserId();
  const { status, isPremium } = usePurchases();

  // Null while unknown. Read on focus, because Home is where you come back to
  // after the round that just used the day up.
  const [playedToday, setPlayedToday] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      hasPlayedToday(userId)
        .then((played) => {
          if (!cancelled) setPlayedToday(played);
        })
        .catch(() => {
          // Unknown stays unknown, which lets the round through — see below.
        });

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // Only a confirmed free player is limited. While RevenueCat is still loading,
  // or unavailable altogether (a build without the native module, a failed
  // configure), the player could not buy their way out of a lock — so there is
  // none. A release build always has the module; "unavailable" there is our
  // bug, and a subscriber must never pay for it. Same for a failed count.
  const unlimited = status !== "ready" || isPremium;

  return {
    standard: unlimited,
    daily: unlimited || playedToday !== true,
  };
}
