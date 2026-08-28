import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { CategorySheet } from "../../components/game/CategorySheet";
import { PlayModeSheet } from "../../components/game/PlayModeSheet";
import { SettingsSheet } from "../../components/game/SettingsSheet";
import { ConstellationBackdrop } from "../../components/game/ConstellationBackdrop";
import { ORBIT_POOL_SIZE, TopicOrbit } from "../../components/game/TopicOrbit";
import { GearIcon } from "../../components/icons/GearIcon";
import { Button } from "../../components/ui/Button";
import {
  DEFAULT_SETTINGS,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from "../../lib/game-settings";
import type { CategoryKey } from "../../constants/categories";
import {
  hasSeenDailyTopic,
  markDailyTopicSeen,
} from "../../lib/daily-topic-seen";
import { clearOnboarding } from "../../lib/onboarding-storage";
import {
  fetchDailyTopic,
  fetchRandomTopic,
  fetchRandomTopics,
  type Topic,
} from "../../lib/topics";
import { colors } from "../../theme/colors";

// Home: a topic on the stage, a constellation of other topics behind it, and
// PLAY, which asks where this round's topic should come from. The wordmark, the
// achievements/challenges row and the mode pills are deliberately not here yet.
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
  const [openSheet, setOpenSheet] = useState<
    "none" | "mode" | "settings" | "category"
  >("none");

  // Drives the red dot on the daily entry: true until today's topic has been
  // opened on this device.
  const [isDailyUnseen, setDailyUnseen] = useState(false);

  // The titles drifting behind the stage. Drawn once on mount and then left
  // alone: they are scenery, and re-rolling them on every PLAY would turn the
  // background into a second thing competing for attention.
  const [backdrop, setBackdrop] = useState<string[]>([]);

  useEffect(() => {
    loadGameSettings().then(setSettings);

    hasSeenDailyTopic().then((seen) => setDailyUnseen(!seen));

    fetchRandomTopics(ORBIT_POOL_SIZE)
      .then((topics) => setBackdrop(topics.map((entry) => entry.title)))
      // Scenery failing is not worth telling the user about — the screen works
      // perfectly well without it.
      .catch(() => setBackdrop([]));
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

  // Both modes share the same shape: fetch, show, and say something useful when
  // there is nothing to show. Only where the topic comes from differs, so that
  // is the one thing passed in.
  const runDraw = async (
    load: () => Promise<Topic | null>,
    emptyMessage: string
  ) => {
    // Guard against a double tap firing two draws — the second result would
    // overwrite the first and the topic would visibly flicker.
    if (isDrawing) return;

    setDrawing(true);
    setError(null);

    try {
      const next = await load();
      setTopic(next);

      if (!next) {
        setError(emptyMessage);
      }
    } catch (cause) {
      // The thrown message already says what failed; the topic on screen stays
      // put so a failed draw doesn't wipe what the user was looking at.
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setDrawing(false);
    }
  };

  const drawStandard = () => {
    setOpenSheet("none");
    void runDraw(
      // Random mode passes nothing and draws from the whole pool; category mode
      // passes the chosen key. `categoryKey` is only ever non-null once a
      // category was actually picked, so the mode check is the only guard.
      () =>
        fetchRandomTopic(
          settings.topicMode === "category" ? settings.categoryKey : null
        ),
      "No topics available yet."
    );
  };

  const drawDaily = () => {
    setOpenSheet("none");
    void runDraw(async () => {
      const daily = await fetchDailyTopic();

      // Only counts as seen once one actually arrived — an exhausted pool or a
      // failed request must not clear the dot.
      if (daily) {
        setDailyUnseen(false);
        void markDailyTopicSeen();
      }

      return daily;
    }, "You have learned every topic there is. Nothing new for today.");
  };

  const reset = async () => {
    await clearOnboarding();
    router.replace("/welcome");
  };

  return (
    // Two layers: the star field edge to edge, and the padded content on top of
    // it. The backdrop sits outside the padding on purpose — Yoga insets
    // absolutely positioned children by the parent's padding, so from inside it
    // the field would stop short of the screen edges.
    <View className="flex-1 bg-bg">
      <ConstellationBackdrop />

      <View
        className="flex-1 px-5"
        style={{
          paddingTop: insets.top + 44,
          paddingBottom: insets.bottom + 30,
        }}
      >
      {/* the stage: one topic, centred, filling the space above the button */}
      <View className="flex-1 items-center justify-center">
        <TopicOrbit titles={backdrop} />

        {topic ? (
          <Text className="text-center text-display font-sans-extrabold uppercase text-text">
            {topic.title}
          </Text>
        ) : (
          <Text className="text-center text-display font-sans-extrabold uppercase text-text">
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
        onPress={() => setOpenSheet("mode")}
        disabled={isDrawing}
        variant="hero"
        accessibilityLabel="Play — choose where the topic comes from"
      />

      {/* Dev convenience: re-run onboarding without reinstalling. Ghost styling
          on purpose — the screen may only ever have one filled button. */}
      <PlayModeSheet
        visible={openSheet === "mode"}
        dailyUnseen={isDailyUnseen}
        onStandard={drawStandard}
        onDaily={drawDaily}
        onClose={() => setOpenSheet("none")}
      />

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
    </View>
  );
}
