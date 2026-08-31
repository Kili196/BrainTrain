import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing } from "react-native";

// The handover between two questions.
//
// The answered question leaves to the left and the next one arrives from the
// right — forward is leftward, the direction the text is read in, so the motion
// says "next" without anything having to label it.
//
// It is one driver, not two. `progress` runs -1 → 0 → 1: at -1 the block has
// left to the left, at 0 it sits in place, at 1 it is waiting off to the right.
// Leaving animates to -1, and the arrival starts by parking at +1 and coming
// back to 0. That symmetry is what keeps the two halves from drifting apart if
// one of the durations is ever tuned.
//
// The exchange happens at the midpoint, while nothing is on screen — so the
// segment bar, the counter and the CTA can update in the same instant without
// anyone seeing them change.

// Design §13 puts state changes at 90–260ms. Leaving is the shorter half: it is
// acknowledging a tap, and the answer that was just given is not worth
// lingering over. Arriving takes longer, because it is the thing to read.
const OUT_MS = 150;
const IN_MS = 240;

// Accelerating out, decelerating in. Neither is symmetric on purpose — the
// block should look pushed off and then settled, rather than sliding both ways
// at the same speed.
const OUT_EASING = Easing.bezier(0.4, 0, 1, 1);
const IN_EASING = Easing.bezier(0, 0, 0.2, 1);

// How far the question travels. The answers below it are given a longer throw
// by `depth`, which reads as the two layers sitting at different distances
// rather than as one flat card sliding.
const TRAVEL = 28;

export function useQuestionSwap(reduceMotion: boolean) {
  // Starts parked off to the right rather than at rest, so the first question
  // of a round arrives the same way every later one does — and so it is never
  // seen sitting in place for a frame before its own animation begins.
  const progress = useRef(new Animated.Value(1)).current;

  // Guards the CTA against a second tap while the block is mid-flight, which
  // would otherwise skip a question. A ref rather than state: nothing on screen
  // depends on it, and re-rendering the question during its own animation is
  // exactly what we do not want.
  const busy = useRef(false);

  // Read through a ref so both callbacks below can be stable. The setting
  // resolves asynchronously and can be switched on mid-round, and a `leave`
  // that changed identity when it did would re-run every effect that depends on
  // it — including the one that loads the questions.
  const reduce = useRef(reduceMotion);

  useEffect(() => {
    reduce.current = reduceMotion;
  }, [reduceMotion]);

  const leave = useCallback(
    (then: () => void) => {
      if (busy.current) return;
      busy.current = true;

      if (reduce.current) {
        // No travel and no fade — the swap is instant. `busy` is still set and
        // cleared, so the double-tap guard works the same either way.
        then();
        busy.current = false;
        return;
      }

      Animated.timing(progress, {
        toValue: -1,
        duration: OUT_MS,
        easing: OUT_EASING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // An interrupted animation must not swap the question underneath the
        // player — it only happens when the screen is going away anyway.
        if (!finished) {
          busy.current = false;
          return;
        }

        then();
        busy.current = false;
      });
    },
    [progress]
  );

  const enter = useCallback(() => {
    if (reduce.current) {
      progress.setValue(0);
      return;
    }

    // Park off to the right before the first frame of the arrival, so the block
    // is never seen at rest in the middle first.
    progress.setValue(1);

    Animated.timing(progress, {
      toValue: 0,
      duration: IN_MS,
      easing: IN_EASING,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return { progress, leave, enter };
}

export type QuestionSwapProps = {
  progress: Animated.Value;
  // A multiple of the base travel. 1 for the question, more for the block
  // underneath it.
  depth?: number;
  children: ReactNode;
};

export function QuestionSwap({
  progress,
  depth = 1,
  children,
}: QuestionSwapProps) {
  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, 1, 0],
        }),
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-TRAVEL * depth, 0, TRAVEL * depth],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
