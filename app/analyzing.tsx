import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ProgressRing } from "../components/ui/ProgressRing";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { colors } from "../theme/colors";

// The beat between the last answer and the result, drawn from the "Analyzing"
// mockup: a ring counting to a hundred, four steps lighting one after another,
// and a line saying what is happening.
//
// NOTHING IS ANALYSED HERE. There is no recording to transcribe, no delivery to
// measure and no facts to check — the four steps are a timer with labels on it,
// and the result was already decided when the last question was answered. This
// must not ship to real users in this state: it claims work that is not
// happening. It is now the last screen in the round that does.
//
// It is not throwaway either. When the scoring pipeline exists behind an Edge
// Function, this is the screen that waits for it: the steps become its real
// stages and RUN_MS gives way to however long the request takes.
const RUN_MS = 5200;

// Reduced motion still gets the screen — losing the steps entirely would hide
// what the app is doing — but it is over in a beat rather than held.
const RUN_REDUCED_MS = 1200;

const RING_SIZE = 230;
// The thin ring of design §12, where the speaking timer takes the 8px one. This
// screen is about the number in the middle, not the arc around it.
const RING_STROKE = 3;

// The meta word is the mockup's: a quiet tag on the right of the row saying
// which part of the round that step is reading.
const STEPS = [
  {
    label: "Transcribing your recording",
    meta: "audio",
    status: "Listening to how you said it.",
  },
  {
    label: "Measuring delivery",
    meta: "delivery",
    status: "Pace, pauses, and the words in between.",
  },
  {
    label: "Checking your facts",
    meta: "facts",
    status: "Holding your claims against the sources.",
  },
  {
    label: "Scoring and writing feedback",
    meta: "score",
    status: "Putting the round together.",
  },
];

export default function Analyzing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReduceMotion();

  // Everything the result screen needs, carried through untouched — this screen
  // reads none of it except the title.
  const { title, topicId, results, picks, seconds } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
    results?: string;
    picks?: string;
    seconds?: string;
  }>();

  const progress = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // React Native has no animated Text content, so the value is listened to
    // and rounded — a re-render only on the frames where the number changes.
    const id = progress.addListener(({ value }) => {
      const next = Math.round(value * 100);
      setPercent((current) => (current === next ? current : next));
    });

    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? RUN_REDUCED_MS : RUN_MS,
      // Linear: the steps are evenly spaced, and an eased bar would make them
      // fire at visibly uneven moments.
      easing: Easing.linear,
      useNativeDriver: false,
    });

    run.start(({ finished }) => {
      if (!finished) return;

      // replace, not push: an analysis that is over is not somewhere to come
      // back to, and the result must not be reachable by going back to a
      // progress bar at 100%.
      router.replace({
        pathname: "/quiz-result",
        params: { topicId, title, results, picks, seconds },
      });
    });

    return () => run.stop();
  }, [progress, reduceMotion, router, topicId, title, results, picks, seconds]);

  if (!title || !results) {
    return <Redirect href="/home" />;
  }

  // Four steps over the run, the last one holding through the end rather than
  // ticking over to a fifth that does not exist.
  const step = Math.min(STEPS.length - 1, Math.floor((percent / 100) * STEPS.length));

  return (
    <View
      className="flex-1 bg-bg px-6"
      style={{ paddingTop: insets.top + 44, paddingBottom: insets.bottom + 30 }}
    >
      <View className="items-center gap-2.5">
        <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-faint">
          Analyzing
        </Text>
        <Text className="text-center text-h1 font-sans-extrabold text-text">
          {title}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <ProgressRing
          size={RING_SIZE}
          stroke={RING_STROKE}
          progress={percent / 100}
          color={colors.accent.light}
        >
          <View className="items-center gap-1.5">
            <Text
              className="text-timer font-sans-extrabold text-text"
              style={{ fontVariant: ["tabular-nums"] }}
              // Read out as it changes would be a stream of numbers; the step
              // rows below are the useful thing to hear.
              accessibilityElementsHidden
            >
              {percent}%
            </Text>
            <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-faint">
              Analysis
            </Text>
          </View>
        </ProgressRing>
      </View>

      {/* Divider rows rather than cards, per design §5: a list that is scanned
          gets hairlines, not filled boxes. */}
      <View accessibilityLiveRegion="polite">
        {STEPS.map((entry, index) => {
          const active = index === step;
          const done = index < step;

          return (
            <View
              key={entry.label}
              className="flex-row items-center gap-3 border-t border-divider py-3.5"
            >
              <View
                className={`h-1.5 w-1.5 rounded-full ${
                  active
                    ? "bg-accent-light"
                    : done
                      ? "bg-text-muted"
                      : "bg-track"
                }`}
              />
              <Text
                className={`flex-1 text-h4 ${
                  active
                    ? "font-sans-bold text-text"
                    : done
                      ? "font-sans text-text-muted"
                      : "font-sans text-text-disabled"
                }`}
              >
                {entry.label}
              </Text>
              <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-disabled">
                {entry.meta}
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mt-6 text-center text-caption font-sans text-text-muted">
        {STEPS[step].status}
      </Text>
    </View>
  );
}
