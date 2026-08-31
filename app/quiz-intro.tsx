import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ConstellationBackdrop } from "../components/game/ConstellationBackdrop";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { formatDuration } from "../lib/game-settings";
import { colors } from "../theme/colors";

// The beat between speaking and being asked about it.
//
// It exists because going straight from the last word into question one reads
// as being thrown. Nothing here is on a timer — the player presses on when they
// are ready; a screen that advanced by itself would throw them just the same,
// only later.
//
// Deliberately almost empty: the time spoken, and the way on. Once the
// recording and the analysis are real, this is where the "Analyzing" screen
// from the mockups goes — the analysis runs here and the button waits for it.

// The way on is a disc rather than a bar. Design §4 sizes the app's large round
// buttons at 76–86px; this one is filled with the accent and carries the hard
// offset shadow every primary button has, because it IS the primary action of
// the screen — the quiet bordered icon button would read as an aside.
const NEXT_SIZE = 86;
const SHADOW_REST = 6;
const SHADOW_PRESS = 2;
const PRESS_TRAVEL = 4;

export default function QuizIntro() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { title, topicId, spoken } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
    spoken?: string;
  }>();

  // Cosmetic, so a missing or junk value costs the line and nothing else —
  // unlike the topic, which the whole round hangs on.
  const spokenSeconds = Number(spoken);
  const showSpoken = Number.isFinite(spokenSeconds) && spokenSeconds > 0;

  if (!title) {
    return <Redirect href="/home" />;
  }

  return (
    <View className="flex-1 overflow-hidden bg-bg">
      <ConstellationBackdrop />

      {/* One block in the middle of the screen, rather than content at the top
          and a button at the bottom: there is not enough here to hold both ends
          of a screen apart. */}
      <View
        className="flex-1 items-center justify-center gap-12 px-6"
        style={{
          paddingTop: insets.top + 44,
          paddingBottom: insets.bottom + 30,
        }}
      >
        {showSpoken ? (
          <View className="items-center gap-2">
            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
              Spoke for
            </Text>
            <Text
              className="text-stat font-sans-extrabold text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatDuration(Math.round(spokenSeconds))}
            </Text>
          </View>
        ) : null}

        {/* The label under the disc, not inside it: the arrow says "onward",
            the word says where — the same pairing the recording screen uses for
            its skip button. */}
        <View className="items-center gap-3">
          <Pressable
            // replace, not push: a finished speaking phase is not somewhere to
            // come back to, and neither is this.
            onPress={() =>
              router.replace({ pathname: "/quiz", params: { topicId, title } })
            }
            accessibilityRole="button"
            accessibilityLabel="Go to the questions"
            hitSlop={12}
          >
            {({ pressed }) => (
              <View style={{ width: NEXT_SIZE, height: NEXT_SIZE }}>
                {/* The hard offset shadow, drawn as its own layer: React Native
                    clips box-shadow to the content box, so an offset shadow
                    needs a sibling it can slide independently. */}
                <View
                  className="absolute inset-x-0 rounded-full bg-accent-shadow"
                  style={{
                    top: pressed ? SHADOW_PRESS : SHADOW_REST,
                    bottom: pressed ? -SHADOW_PRESS : -SHADOW_REST,
                  }}
                />
                <View
                  className="h-full w-full items-center justify-center rounded-full bg-accent"
                  style={{
                    transform: [{ translateY: pressed ? PRESS_TRAVEL : 0 }],
                  }}
                >
                  <ArrowRightIcon size={32} color={colors.text.DEFAULT} />
                </View>
              </View>
            )}
          </Pressable>

          <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
            Questions
          </Text>
        </View>
      </View>
    </View>
  );
}
