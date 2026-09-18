import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  DEFAULT_SETTINGS,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from "./game-settings";

// The round setup, shared by the two screens that can change it: the gear on
// Home and the Settings tab.
//
// It exists because of the second door. Home used to load the settings once, on
// mount — which was correct while it was the only way in, and wrong the moment
// Settings could change them too: tab screens stay mounted, so Home would keep
// handing a stale prep time to the next round. Reloading on focus fixes that at
// the one moment the copy can be stale, and costs a single AsyncStorage read.
export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      loadGameSettings().then((stored) => {
        if (!cancelled) setSettings(stored);
      });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Written on every change rather than on close: neither door has a Cancel, so
  // there is nothing to roll back, and dismissing a sheet by tapping the scrim
  // must not be able to lose a change.
  const update = useCallback((next: GameSettings) => {
    setSettings(next);
    void saveGameSettings(next);
  }, []);

  return { settings, update };
}
