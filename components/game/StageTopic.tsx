import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";

import { useReduceMotion } from "../../lib/use-reduce-motion";

// The topic on the stage. Every change of `title` replays the mockup's
// `topicSwap`: opacity 0 to 1 over the first 55% of the curve, scale .94 to 1
// across the whole of it, 200ms on cubic-bezier(.2,.9,.3,1).
//
// During a draw the title changes every 38ms at first, so the swaps overlap and
// read as a flicker; by the last ticks each one plays out in full. That
// difference is the whole illusion of a reel braking — nothing here knows a
// draw is happening.
const SWAP_MS = 200;

// The animated pair sits on a wrapping View rather than on the Text itself:
// NativeWind's className is not wired through Animated components, and the
// type scale belongs in the class, not hardcoded here.
export function StageTopic({ title }: { title: string }) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(1)).current;

  // The mockup keys its animation off a swap counter, so the very first render
  // is still. Same here: the placeholder must not fade in on mount.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: SWAP_MS,
      easing: Easing.bezier(0.2, 0.9, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [title, reduceMotion, progress]);

  return (
    <Animated.View
      // Decoration-free but non-interactive: the drag surface underneath has to
      // keep receiving touches that land on the word.
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          justifyContent: "center",
          opacity: progress.interpolate({
            inputRange: [0, 0.55, 1],
            outputRange: [0, 1, 1],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text className="px-6 text-center text-display font-sans-extrabold uppercase text-text">
        {title}
      </Text>
    </Animated.View>
  );
}
