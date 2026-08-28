import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ConstellationBackdrop } from "../components/game/ConstellationBackdrop";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import { Button } from "../components/ui/Button";
import {
  DEFAULT_SETTINGS,
  formatDuration,
  loadGameSettings,
  type GameSettings,
} from "../lib/game-settings";
import { colors } from "../theme/colors";

// The round about to be played: the drawn topic, how long there is to prepare
// and to speak, and the one button that starts it.
//
// Sits at the root of the stack rather than inside (tabs) — a round is a flow,
// not a destination, and it has no tab bar.
//
// The topic arrives as a route param because it was drawn on Home and this
// screen is downstream of that draw; the two durations do not, they are read
// from the stored round settings. Passing them along would put the same two
// numbers in two places and let a route param disagree with the settings sheet.
export default function Play() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // `topicId` is carried but not read here — it identifies the route, and it is
  // what the round itself will need once there is one to save.
  const { title } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
  }>();

  // Same as Home: render the defaults for a frame rather than block the screen
  // on a disk read. The two numbers settle before anyone can act on them.
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadGameSettings().then(setSettings);
  }, []);

  // Reachable by deep link, where there is no topic to play. Nothing on this
  // screen means anything without one, so it hands back to the draw.
  if (!title) {
    return <Redirect href="/home" />;
  }

  return (
    <View className="flex-1 bg-bg">
      <ConstellationBackdrop />

      {/* The block is centred in the whole screen, so Back floats above it
          rather than taking a row off the top and pushing it down. */}
      <View
        className="flex-1 justify-center gap-8 px-6"
        style={{ paddingBottom: insets.bottom + 30 }}
      >
        <View className="items-center gap-3.5">
          <View className="items-center gap-2.5">
            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
              Your topic
            </Text>
            <Text className="text-center text-display font-sans-extrabold text-text">
              {title}
            </Text>
          </View>

          {/* The mockup reads "Speak freely — AI analyzes your spoken
              response". The MVP has no analysis behind it, so the promise is
              dropped and only the instruction is left. */}
          <Text className="text-center text-body font-sans text-accent-light">
            Speak freely
          </Text>
        </View>

        <View className="flex-row gap-3">
          <StatTile label="Prep" value={formatDuration(settings.prepSeconds)} />
          <StatTile
            label="Speak"
            value={formatDuration(settings.speakingSeconds)}
          />
        </View>

        <Button
          label="Start"
          variant="hero"
          // Goes nowhere yet: the prep and speaking timers do not exist. Wiring
          // it to a route that isn't there would be worse than a button that
          // waits.
          onPress={() => {}}
          accessibilityLabel="Start the round"
        />
      </View>

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

// Two of these sit side by side under the topic. A filled card rather than a
// divider row, because there are exactly two and they are the screen's only
// data — design §5 allows one filled block per screen and this pair is it.
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-2 rounded-lg border bg-card py-5">
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
        {label}
      </Text>
      <Text
        className="text-stat font-sans-extrabold text-text"
        // Non-negotiable on every number in the app: without it the digits
        // change width and a running timer jitters.
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}
