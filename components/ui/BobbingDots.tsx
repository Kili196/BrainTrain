import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// Three dots bobbing in a wave — the loading-ui.com "bobbing dots" loader,
// rebuilt with Animated because the original is a web component.
//
// The wave is the whole trick: one delay per dot, so they never rise together.
// They also grow a little at the top of the arc, which is what keeps it from
// reading as three separate blinking dots.
const DOT_COUNT = 3;
const DOT_SIZE = 10;
const DOT_GAP = 10;

// The reference defaults to a one-second cycle: lower feels snappier, higher
// floatier.
const CYCLE_MS = 1000;
const STAGGER_MS = 140;
const RISE = 10;
const GROW = 1.18;

export function BobbingDots({ color = colors.accent.light }: { color?: string }) {
  const reduceMotion = useReduceMotion();

  const bobs = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (reduceMotion) return;

    const loops = bobs.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STAGGER_MS),
          Animated.timing(value, {
            toValue: 1,
            duration: CYCLE_MS / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: CYCLE_MS / 2,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [bobs, reduceMotion]);

  return (
    <View
      className="flex-row items-center"
      style={{ gap: DOT_GAP, height: DOT_SIZE + RISE }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bobs.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: color,
            transform: [
              {
                translateY: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -RISE],
                }),
              },
              {
                scale: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, GROW],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
