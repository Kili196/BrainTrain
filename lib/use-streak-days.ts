import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { fetchStreakDays } from "./achievements";
import { useUserId } from "./auth-context";

// The streak for the Home header, which has a flame and no other reason to talk
// to the database.
//
// A hook rather than a fetch inside the screen, because Home is not ours to
// grow: it belongs to the other half of this project, and a hook keeps the
// change there down to one line and one import.
//
// Starts at 0 and stays there if the read fails. A flame that is briefly cold
// is a flame that is about to be right; an error state for it would be a screen
// shouting about a number nobody asked for.
export function useStreakDays(): number {
  const userId = useUserId();
  const [days, setDays] = useState(0);

  // On focus, not on mount: Home is the screen you come back to after a round,
  // and the round that just extended the streak has to show up on it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      fetchStreakDays(userId)
        .then((value) => {
          if (!cancelled) setDays(value);
        })
        .catch(() => {
          // Deliberately silent — see above.
        });

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return days;
}
