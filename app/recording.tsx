import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ConstellationBackdrop } from "../components/game/ConstellationBackdrop";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import { MicIcon } from "../components/icons/MicIcon";
import {
  DEFAULT_SETTINGS,
  formatDuration,
  loadGameSettings,
  type GameSettings,
} from "../lib/game-settings";
import { colors } from "../theme/colors";

// PLACEHOLDER. The speaking phase, with nothing behind it yet: no microphone
// permission, no recording, no timer running down, no way to stop.
//
// It exists so the round has somewhere to land after the countdown instead of
// ending on a dead button, and so the shape of the screen — topic, mic, the
// time you have — is already in place when the recording itself is built.
//
// What replaces it needs, at least: expo-av (or expo-audio) with permission
// handling on both platforms, a countdown that stops the recording on its own,
// a visible recording state, and somewhere to put the file. Audio stays on the
// device per CLAUDE.md; only metadata goes to the server.
const MIC_DISC_SIZE = 86;

export default function Recording() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { title } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
  }>();

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadGameSettings().then(setSettings);
  }, []);

  if (!title) {
    return <Redirect href="/home" />;
  }

  return (
    <View className="flex-1 overflow-hidden bg-bg">
      <ConstellationBackdrop />

      <View
        className="flex-1 justify-center gap-10 px-6"
        style={{ paddingBottom: insets.bottom + 30 }}
      >
        <View className="items-center gap-2.5">
          <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
            Your topic
          </Text>
          <Text className="text-center text-h1 font-sans-extrabold text-text">
            {title}
          </Text>
        </View>

        <View className="items-center gap-6">
          {/* The idle mic disc from the design: a quiet filled circle, not a
              button — there is nothing to press until recording exists. */}
          <View
            className="items-center justify-center rounded-full border bg-card-alt"
            style={{ width: MIC_DISC_SIZE, height: MIC_DISC_SIZE }}
          >
            <MicIcon size={40} color={colors.text.secondary} />
          </View>

          <View className="items-center gap-2">
            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
              Speaking time
            </Text>
            <Text
              className="text-stat font-sans-extrabold text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatDuration(settings.speakingSeconds)}
            </Text>
          </View>

          <Text className="max-w-[270px] text-center text-body font-sans text-text-muted">
            Recording is not built yet. This is where the speaking phase will
            run.
          </Text>
        </View>
      </View>

      {/* Only here because the screen is a placeholder — the real recording
          screen has no way back out of a round in progress. */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        className="absolute flex-row items-center gap-1.5"
        style={{ top: insets.top + 16, left: 24 }}
      >
        <ArrowLeftIcon size={15} color={colors.text.secondary} />
        <Text className="text-body font-sans-bold text-text-secondary">
          Back
        </Text>
      </Pressable>
    </View>
  );
}
