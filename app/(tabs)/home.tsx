import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { CategorySheet } from "../../components/game/CategorySheet";
import { SettingsSheet } from "../../components/game/SettingsSheet";
import { GearIcon } from "../../components/icons/GearIcon";
import { Button } from "../../components/ui/Button";
import {
  DEFAULT_SETTINGS,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from "../../lib/game-settings";
import type { CategoryKey } from "../../constants/categories";
import { clearOnboarding } from "../../lib/onboarding-storage";
import { fetchRandomTopic, type Topic } from "../../lib/topics";
import { colors } from "../../theme/colors";

// Home, first slice: PLAY draws a random topic from the backend and puts it on
// the stage. Everything else from the design (wordmark, achievements/challenges
// row, mode pills, constellation backdrop) is deliberately not here yet.
export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [isDrawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Starts from the defaults and swaps in the stored values once they arrive.
  // Rendering defaults for one frame beats blocking the screen on a disk read —
  // the settings are not visible until the sheet opens anyway.
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // One value rather than a boolean per sheet: the two are mutually exclusive
  // by construction, so there is no state in which both are open. Stacked
  // modals are unreliable on Android anyway.
  const [openSheet, setOpenSheet] = useState<"none" | "settings" | "category">(
    "none"
  );

  useEffect(() => {
    loadGameSettings().then(setSettings);
  }, []);

  // Write on every press rather than on close: the sheet has no Cancel, so
  // there is nothing to roll back, and closing it by tapping the scrim must not
  // be able to lose a change.
  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    void saveGameSettings(next);
  };

  // Choosing a category is what switches the mode — the "By category" label
  // only opens this picker. Closing it without a choice therefore leaves the
  // mode alone instead of arming a category draw with no category.
  const selectCategory = (categoryKey: CategoryKey) => {
    updateSettings({ ...settings, topicMode: "category", categoryKey });
    setOpenSheet("settings");
  };

  const draw = async () => {
    // Guard against a double tap firing two draws — the second result would
    // overwrite the first and the topic would visibly flicker.
    if (isDrawing) return;

    setDrawing(true);
    setError(null);

    try {
      // Random mode passes nothing and draws from the whole pool; category mode
      // passes the chosen key. `categoryKey` is only ever non-null once a
      // category was actually picked, so the mode check is the only guard.
      const next = await fetchRandomTopic(
        settings.topicMode === "category" ? settings.categoryKey : null
      );
      setTopic(next);

      if (!next) {
        setError("No topics available yet.");
      }
    } catch (cause) {
      // The thrown message already says what failed; the topic on screen stays
      // put so a failed draw doesn't wipe what the user was looking at.
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setDrawing(false);
    }
  };

  const reset = async () => {
    await clearOnboarding();
    router.replace("/welcome");
  };

  return (
    <View
      className="flex-1 bg-bg px-5"
      style={{ paddingTop: insets.top + 44, paddingBottom: insets.bottom + 30 }}
    >
      {/* the stage: one topic, centred, filling the space above the button */}
      <View className="flex-1 items-center justify-center">
        {topic ? (
          <Text className="text-center text-display font-sans-extrabold uppercase text-text">
            {topic.title}
          </Text>
        ) : (
          <Text className="text-center text-display font-sans-extrabold uppercase text-text-disabled">
            Your topic
          </Text>
        )}

        {error ? (
          <Text className="mt-4 text-center text-body font-sans text-error">
            {error}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => setOpenSheet("settings")}
        accessibilityRole="button"
        accessibilityLabel="Round settings"
        hitSlop={12}
        className="mb-5 self-center"
      >
        <GearIcon size={20} color={colors.text.muted} />
      </Pressable>

      <Button
        label={isDrawing ? "Drawing…" : "Play"}
        onPress={draw}
        disabled={isDrawing}
        variant="hero"
        accessibilityLabel="Play — draw a random topic"
      />

      {/* Dev convenience: re-run onboarding without reinstalling. Ghost styling
          on purpose — the screen may only ever have one filled button. */}
      <SettingsSheet
        visible={openSheet === "settings"}
        settings={settings}
        onChange={updateSettings}
        onPickCategory={() => setOpenSheet("category")}
        onClose={() => setOpenSheet("none")}
      />

      <CategorySheet
        visible={openSheet === "category"}
        selected={settings.categoryKey}
        onSelect={selectCategory}
        // Backing out returns to the settings sheet rather than to the screen,
        // so the picker behaves like a step inside it and not like a detour.
        onClose={() => setOpenSheet("settings")}
      />

      <Pressable
        onPress={reset}
        accessibilityRole="button"
        className="mt-6 self-center py-2"
      >
        <Text className="text-body font-sans-bold text-text-muted">
          Reset onboarding
        </Text>
      </Pressable>
    </View>
  );
}
