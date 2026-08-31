import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ConstellationBackdrop } from "../components/game/ConstellationBackdrop";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import { MicIcon } from "../components/icons/MicIcon";
import { SkipIcon } from "../components/icons/SkipIcon";
import {
  DEFAULT_SETTINGS,
  formatDuration,
  loadGameSettings,
  type GameSettings,
} from "../lib/game-settings";
import { useCountdown } from "../lib/use-countdown";
import { colors } from "../theme/colors";

// The speaking phase. The clock is real; the microphone is not.
//
// Still missing: permission handling, the recording itself, a visible recording
// state, and somewhere to put the file. What is here is the part the rest of
// the round needs — a speaking time that runs out and hands over to the
// questions. Audio stays on the device per CLAUDE.md; only metadata goes to the
// server.
//
// When the recording lands, the skip button below becomes ANALYSE (design §4)
// and stops the recording instead of just the clock.
const MIC_DISC_SIZE = 86;
const SKIP_BUTTON_SIZE = 76;

export default function Recording() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { title, topicId } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
  }>();

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Null until the stored speaking time arrives — the deadline cannot be set
  // before we know how long it is. See lib/use-countdown for why this is a
  // timestamp and not a counter.
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const secondsLeft = useCountdown(endsAt);

  useEffect(() => {
    loadGameSettings().then((stored) => {
      setSettings(stored);
      setEndsAt(Date.now() + stored.speakingSeconds * 1000);
    });
  }, []);

  const handOffToQuestions = useCallback(() => {
    // How long was actually spoken: the whole speaking time when the clock ran
    // out, less than that when it was cut short here. The intro screen shows it
    // back, and it is the only place that number survives.
    const spoken = settings.speakingSeconds - (secondsLeft ?? 0);

    // replace, not push: a finished speaking phase is not somewhere to come
    // back to.
    router.replace({
      pathname: "/quiz-intro",
      params: { topicId, title, spoken: String(spoken) },
    });
  }, [router, topicId, title, settings.speakingSeconds, secondsLeft]);

  // Time is up. The same hand-off the skip button makes: those are the only two
  // ways out of the speaking phase, and they end it identically.
  useEffect(() => {
    if (secondsLeft !== 0) return;
    handOffToQuestions();
  }, [secondsLeft, handOffToQuestions]);

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
              {/* The stored time until the countdown has its deadline, so the
                  number never flashes a placeholder on the way in. */}
              {formatDuration(secondsLeft ?? settings.speakingSeconds)}
            </Text>
          </View>

          <Text className="max-w-[270px] text-center text-body font-sans text-text-muted">
            Recording is not built yet — only the clock runs. The questions
            follow when it reaches zero.
          </Text>

          {/* Design §4's round icon button, in the position ANALYSE will take.
              Until the recording exists there is nothing to analyse, so it does
              the one thing it can: end the phase early. */}
          <View className="items-center gap-3">
            <Pressable
              onPress={handOffToQuestions}
              accessibilityRole="button"
              accessibilityLabel="Skip the speaking time and go to the questions"
              className="items-center justify-center rounded-full border bg-inactive-fill"
              style={{ width: SKIP_BUTTON_SIZE, height: SKIP_BUTTON_SIZE }}
            >
              <SkipIcon size={28} color={colors.text.secondary} />
            </Pressable>

            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
              Skip to the questions
            </Text>
          </View>
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
