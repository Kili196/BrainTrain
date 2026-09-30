import { useEffect, useId, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { useOnboarding } from "../../lib/onboarding-context";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// The last step: their two counters, standing here for the first time — topics,
// and the hours they came out of. The landing's three placeholder plans are
// left out on purpose (see the `finish` step); the paywall lands here later.
//
// The numbers are the payoff of the whole flow, so they are set as large as
// the app's name on the welcome, in the same gradient, and count up once when
// the step opens (Fabian found the boxed version boring, 2026-09-30). One run,
// no loop — the design keeps looping motion for things that are alive.
const COUNT_MS = 1100;

// SVG text is placed by its baseline, not its top, so the box and the baseline
// are set by hand: the box one line tall, the baseline where the digits' feet go.
const NUMBER_SIZE = 52;
const NUMBER_BOX = 60;
const NUMBER_BASELINE = 50;

type CounterProps = {
  label: string;
  value: number;
  // 0 → 1, shared by both counters so they land together.
  progress: Animated.Value;
};

function Counter({ label, value, progress }: CounterProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // A listener rather than an animated Text: the digits are a string, and
    // only JS can turn a number into one.
    const id = progress.addListener(({ value: t }) => setShown(Math.round(t * value)));
    return () => progress.removeListener(id);
  }, [progress, value]);

  // One gradient across the whole number (Fabian, 2026-09-30 — a colour per
  // digit looked striped). SVG text can take a gradient fill, which a plain
  // Text cannot without a masked view, a native module. The gradient is sized
  // to the text's own box, so it spans the digits, not the column.
  const id = `n${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className="flex-1 items-center gap-1"
    >
      <Svg width="100%" height={NUMBER_BOX}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.ob.violet} />
            <Stop offset="1" stopColor={colors.ob.bright} />
          </LinearGradient>
        </Defs>
        <SvgText
          x="50%"
          y={NUMBER_BASELINE}
          textAnchor="middle"
          fontFamily="Archivo_800ExtraBold"
          fontSize={NUMBER_SIZE}
          letterSpacing={-1.5}
          fill={`url(#${id})`}
        >
          {shown.toLocaleString("en-US")}
        </SvgText>
      </Svg>
      <Text
        className="font-sans-semibold text-[11px] uppercase text-ob-muted"
        style={{ letterSpacing: 1.3 }}
      >
        {label}
      </Text>
    </View>
  );
}

export function OutroStepView() {
  const { derived } = useOnboarding();
  const { topicsPerYear, hoursPerYear, dailyTopics, sessionMinutes } = derived;
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: COUNT_MS,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      // The value is read in JS (the listener), so the native driver is out.
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [progress, reduceMotion]);

  if (topicsPerYear === null || hoursPerYear === null) return null;

  return (
    <View className="items-center pt-10">
      <View className="flex-row items-center self-stretch">
        <Counter label="Topics a year" value={topicsPerYear} progress={progress} />
        {/* A hairline between the two, so they read as a pair, not a sum. */}
        <View className="h-14 w-px bg-ob-border" />
        <Counter label="Hours reclaimed" value={hoursPerYear} progress={progress} />
      </View>
      {/* What one of them costs, so the pair cannot be read as a minute
          apiece. */}
      <Text
        className="mt-6 text-center font-sans text-[13px] text-ob-muted"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {`${dailyTopics} a day, ${sessionMinutes} minutes each.`}
      </Text>
    </View>
  );
}
