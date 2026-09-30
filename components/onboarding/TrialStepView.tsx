import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { TrialStep } from "../../constants/onboarding-steps";
import { useOnboarding } from "../../lib/onboarding-context";
import { colors } from "../../theme/colors";
import { PillButton } from "./PillButton";

// The real thing, shortened: a topic, twenty seconds on the clock, out loud.
// Everything before it is an argument; this is the product.
//
// NOTHING IS RECORDED, on purpose (Fabian, 2026-09-30). The landing records and
// plays the take back; the app keeps the landing's no-microphone path — same
// topic, same clock, nothing kept. Trying it is optional: the forward button is
// live from the start, so there is no separate "skip" link.
export type TrialStepViewProps = {
  step: TrialStep;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RADIUS = 18;
// The ring's length in viewBox units, for the dash arithmetic.
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TrialStepView({ step }: TrialStepViewProps) {
  const { answers, set } = useOnboarding();
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(step.seconds);

  // 0 → 1 over the whole run. Not switched off under reduced motion: this is a
  // clock, not decoration, and the only sign of how much time is left.
  const drain = useRef(new Animated.Value(0)).current;
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const left = useRef(step.seconds);

  const stop = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
    drain.stopAnimation();
  };

  // Leaving the step mid-run must not leave a timer behind.
  useEffect(() => stop, []);

  const finish = () => {
    stop();
    setRunning(false);
    set("trial", "done");
  };

  const start = () => {
    setRemaining(step.seconds);
    setRunning(true);
    drain.setValue(0);
    Animated.timing(drain, {
      toValue: 1,
      duration: step.seconds * 1000,
      easing: Easing.linear,
      // strokeDashoffset is an SVG prop, not a transform — the native driver
      // cannot move it.
      useNativeDriver: false,
    }).start();

    // The digits are a readout, once a second, not an animation. Counted in a
    // ref so the tick that reaches zero can end the run from here, rather than
    // from inside a state updater, which must not have side effects.
    left.current = step.seconds;
    ticker.current = setInterval(() => {
      left.current -= 1;
      setRemaining(Math.max(0, left.current));
      if (left.current <= 0) finish();
    }, 1000);
  };

  const done = answers.trial === "done";

  return (
    <View className="items-center gap-6 pt-8">
      {/* The loudest thing on the screen: for twenty seconds it is the only
          thing they have to think about. */}
      <Text
        className="text-center font-sans-bold text-[28px] text-ob-text"
        style={{ lineHeight: 31, letterSpacing: -1.2 }}
      >
        {step.topic}
      </Text>

      {running || done ? (
        <View className="h-36 w-36 items-center justify-center">
          <Svg width="100%" height="100%" viewBox="0 0 40 40">
            <Circle
              cx="20"
              cy="20"
              r={RADIUS}
              stroke={colors.ob.raised}
              strokeWidth={2}
              fill="none"
            />
            <AnimatedCircle
              cx="20"
              cy="20"
              r={RADIUS}
              stroke={colors.ob.bright}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={drain.interpolate({
                inputRange: [0, 1],
                outputRange: [0, CIRCUMFERENCE],
              })}
              // Starts at twelve o'clock rather than three.
              transform="rotate(-90 20 20)"
            />
          </Svg>
          <Text
            accessibilityLiveRegion="polite"
            className="absolute font-sans-semibold text-[28px] text-ob-text"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {`0:${String(running ? remaining : 0).padStart(2, "0")}`}
          </Text>
        </View>
      ) : null}

      {running ? (
        <Text className="text-center font-sans text-[13px] leading-[20px] text-ob-muted">
          Nothing is being recorded. Talk anyway — that part was always the exercise.
        </Text>
      ) : null}

      <View className="self-stretch">
        {running ? (
          <PillButton variant="quiet" label="Stop early" onPress={finish} />
        ) : done ? (
          <PillButton variant="quiet" label="Once more" onPress={start} />
        ) : (
          <PillButton
            variant="gradient"
            label={`Start — ${step.seconds} seconds`}
            onPress={start}
            // It starts a clock, it does not move the flow on.
            arrow={false}
          />
        )}
      </View>
    </View>
  );
}
