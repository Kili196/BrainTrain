import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { formatDuration } from "../../lib/game-settings";
import { colors } from "../../theme/colors";

// The preparation phase: a ring draining from full to empty, the time left in
// the middle of it, and a way out for anyone who is ready sooner.
//
// 230px with an 8px stroke — the timer ring's size from design §12. The ring
// does not animate between values: over fifteen minutes one second moves the
// arc by less than a pixel, so redrawing it with each second is already
// smoother than anything an animation would add.
const RING_SIZE = 230;
const RING_STROKE = 8;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Arriving after the chrome has begun to leave, so the two do not compete. Not
// from the mockup — there is no appendix for this screen — but it follows the
// rule the rest of the transition works by: one thing at a time.
const ENTER_MS = 420;
const ENTER_DELAY_MS = 180;
const ENTER_FROM_SCALE = 0.94;

export type PrepTimerProps = {
  visible: boolean;
  secondsLeft: number;
  totalSeconds: number;
};

export function PrepTimer({
  visible,
  secondsLeft,
  totalSeconds,
}: PrepTimerProps) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: visible ? 1 : 0,
      duration: ENTER_MS,
      delay: visible ? ENTER_DELAY_MS : 0,
      easing: Easing.bezier(0.5, 0, 0.2, 1),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [visible, enter]);

  // A prep time of zero is a valid setting, and dividing by it would leave the
  // ring at NaN — an arc that simply never draws.
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return (
    <Animated.View
      style={{
        alignItems: "center",
        opacity: enter,
        transform: [
          {
            scale: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [ENTER_FROM_SCALE, 1],
            }),
          },
        ],
      }}
    >
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.track}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.accent.DEFAULT}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            // The whole circumference as one dash, pushed out of view by
            // however much time has already gone.
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            // Starts the arc at twelve o'clock instead of three.
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>

        <View
          className="items-center justify-center gap-2"
          // In the style, not as a prop: react-native-web ignores the prop.
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        >
          <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
            Prep
          </Text>
          <Text
            className="text-timer font-sans-extrabold text-text"
            // Without this the digits change width and the whole number jitters
            // once a second, which on a ring is impossible to miss.
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatDuration(secondsLeft)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
