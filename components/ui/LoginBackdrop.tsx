import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "../../theme/colors";

// The moving constellation behind the login form. Home's ConstellationBackdrop
// is deliberately static; this one drifts, because a sign-in screen with
// nothing happening on it looks dead. Three layers of thin white leader-lines
// and dots each breathe on their own slow loop, so the field shifts and fades
// without ever pulling the eye off the form.
//
// Why three layers of plain Views wrapping SVG rather than animating the SVG
// circles directly: the native driver only animates a View's `opacity` and
// `transform`, and only those keep the loop on the UI thread — so it stays
// smooth even while a native Google/Apple sheet is spinning up on the JS
// thread. react-native-svg's own props can't take the native driver, so each
// layer is a whole SVG we translate and fade as one unit. The layers carry
// different durations so they drift out of phase and never pulse in lockstep.
//
// Coordinates live in a stretched 390×844 viewBox (preserveAspectRatio "none",
// the same trick ConstellationBackdrop uses) so the composition lands in the
// same place on any screen size. It is purely decorative: hidden from
// accessibility and it never catches a touch.

type Line = { d: string; opacity: number };
type Dot = { cx: number; cy: number; r: number; opacity: number };

type Layer = {
  lines: Line[];
  dots: Dot[];
  // How far this layer travels at the far end of its loop, in viewBox units.
  // Small on purpose — this is a drift, not a float.
  drift: { x: number; y: number };
  duration: number;
};

const LAYERS: Layer[] = [
  {
    duration: 6800,
    drift: { x: 16, y: 11 },
    lines: [
      // a short pointer above the provider buttons
      { d: "M196 300 L214 274", opacity: 0.12 },
      // near the password field's right edge
      { d: "M300 470 L336 500", opacity: 0.1 },
    ],
    dots: [
      { cx: 214, cy: 274, r: 1.4, opacity: 0.42 },
      { cx: 196, cy: 300, r: 1.1, opacity: 0.3 },
      { cx: 336, cy: 500, r: 1.3, opacity: 0.34 },
      { cx: 66, cy: 356, r: 1, opacity: 0.24 },
      { cx: 196, cy: 690, r: 1.2, opacity: 0.3 },
    ],
  },
  {
    duration: 8200,
    drift: { x: -14, y: 16 },
    lines: [
      { d: "M96 330 L70 350", opacity: 0.1 },
      // near the email field's right edge
      { d: "M300 408 L340 392", opacity: 0.09 },
    ],
    dots: [
      { cx: 70, cy: 350, r: 1.2, opacity: 0.3 },
      { cx: 340, cy: 392, r: 1.3, opacity: 0.36 },
      { cx: 110, cy: 500, r: 1, opacity: 0.24 },
      { cx: 300, cy: 300, r: 1.1, opacity: 0.28 },
      { cx: 176, cy: 636, r: 0.9, opacity: 0.2 },
    ],
  },
  {
    duration: 9600,
    drift: { x: 12, y: -14 },
    lines: [
      // the little chevron pointing down at a dot below the SIGN IN button
      { d: "M196 636 L188 664", opacity: 0.11 },
      { d: "M180 636 L188 664", opacity: 0.11 },
    ],
    dots: [
      { cx: 188, cy: 668, r: 1.3, opacity: 0.34 },
      { cx: 300, cy: 356, r: 1, opacity: 0.24 },
      { cx: 66, cy: 470, r: 1.1, opacity: 0.26 },
      { cx: 344, cy: 636, r: 1, opacity: 0.22 },
    ],
  },
];

function DriftLayer({ lines, dots, drift, duration }: Layer) {
  // useRef, not useState: recreating the value on every render would restart
  // the loop from the top each time.
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration,
          // sine easing at both ends, so the layer eases in and out of the turn
          // rather than snapping direction — that is what makes it read as drift.
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          pointerEvents: "none",
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, drift.x] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, drift.y] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="none">
        {lines.map((line) => (
          <Path
            key={line.d}
            d={line.d}
            stroke={colors.text.DEFAULT}
            strokeWidth={0.6}
            strokeLinecap="round"
            fill="none"
            opacity={line.opacity}
          />
        ))}
        {dots.map((dot, index) => (
          <Circle
            key={index}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={colors.text.DEFAULT}
            opacity={dot.opacity}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

export function LoginBackdrop() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
    >
      {LAYERS.map((layer, index) => (
        <DriftLayer key={index} {...layer} />
      ))}
    </View>
  );
}
