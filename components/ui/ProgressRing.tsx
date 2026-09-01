import type { ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

// The arc is the only part that ever animates, so it is the only part that is
// wrapped. A second-by-second number would step the ring visibly; handed an
// Animated.Value it runs continuously instead.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

import { colors } from "../../theme/colors";

// The app's progress ring, design §12: a track at ~10% white, an arc in the
// accent with round caps, starting at twelve o'clock instead of three.
//
// Size and stroke come from the caller because the design gives the ring more
// than one of each — 230/8 for the speaking timer, 230/3 for the thin analysis
// ring. What sits in the middle is passed as children: every ring in the app
// holds something different (a time, a percentage, a mic above a label), and
// none of those is worth a prop.
//
// `PrepTimer` still draws its own copy of this. Left alone deliberately — it is
// on the path a round already takes, and this component arrived with two new
// screens that are not.
export type ProgressRingProps = {
  size: number;
  stroke: number;
  // 0 is an empty ring, 1 a closed circle. A number redraws on every change,
  // which is right for a value that arrives in steps (a percentage counting
  // up); an Animated.Value drives the arc straight and is what a clock wants —
  // seconds arrive once a second, and a ring that moves once a second ticks.
  progress: number | Animated.Value;
  color?: string;
  children?: ReactNode;
};

export function ProgressRing({
  size,
  stroke,
  progress,
  color = colors.accent.DEFAULT,
  children,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // The whole circumference is drawn as a single dash and then pushed out of
  // view by however much of it has not been reached. The number branch also
  // guards against a caller dividing by zero: NaN does not draw at all, which
  // looks like a missing ring rather than an empty one.
  const dashOffset =
    typeof progress === "number"
      ? circumference *
        (1 - (Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0))
      : Animated.multiply(Animated.subtract(1, progress), circumference);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View
        className="items-center justify-center"
        // In the style rather than as a prop: react-native-web ignores the prop.
        style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      >
        {children}
      </View>
    </View>
  );
}
