import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";

import { colors } from "../../theme/colors";

// 3 · 2 · 1 · LET'S GO, each frame flying past the viewer.
//
// Every step is 800ms and there are five of them, so four seconds from the
// first digit to the hand-off.
const STEP_MS = 800;

// Small and invisible, snapping to full opacity almost at once, then growing
// well past the screen while fading — the digit passes the reader rather than
// simply appearing. Each frame is fully transparent again by the end of its own
// step, so consecutive digits never overlap.
const ZOOM_FROM = 0.25;
const ZOOM_TO = 5.2;
const OPACITY_IN_AT = 0.22;
const ZOOM_EASING = Easing.bezier(0.2, 0.6, 0.4, 1);

// One-off display sizes. Deliberately not tokens: nothing else in the app is
// anywhere near this large, and a 104px entry in the type scale would invite
// someone to reuse it.
const DIGIT_SIZE = 104;
const GO_SIZE = 42;
const GO_TRACKING = GO_SIZE * 0.06;

type Frame = { text: string; size: number; tracking: number } | null;

// The fourth frame is empty on purpose. In the mockup the last digit holds its
// slot while its animation finishes and nothing replaces it, so there is a beat
// of dimmed screen between "1" and "LET'S GO". Reproduced as a frame of its own
// rather than by copying the trick that produces it there.
const FRAMES: Frame[] = [
  { text: "3", size: DIGIT_SIZE, tracking: 0 },
  { text: "2", size: DIGIT_SIZE, tracking: 0 },
  { text: "1", size: DIGIT_SIZE, tracking: 0 },
  null,
  { text: "LET'S\nGO", size: GO_SIZE, tracking: GO_TRACKING },
];

export type CountdownOverlayProps = {
  running: boolean;
  onFinish: () => void;
};

export function CountdownOverlay({ running, onFinish }: CountdownOverlayProps) {
  const [step, setStep] = useState(0);
  const zoom = useRef(new Animated.Value(0)).current;

  // onFinish is called from inside a timer that must not be rebuilt when the
  // parent re-renders, so it is read through a ref rather than captured.
  const finish = useRef(onFinish);
  useEffect(() => {
    finish.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!running) {
      setStep(0);
      return;
    }

    // Past the last frame the countdown is over. Without this the effect would
    // keep re-arming and hand off again every step.
    if (step >= FRAMES.length) return;

    // One timer per step rather than an interval: the last step hands off
    // instead of advancing, and an interval would have to be torn down mid-tick
    // to do that.
    const id = setTimeout(() => {
      const next = step + 1;
      setStep(next);
      // Called from the timer, never from inside a setState updater. React runs
      // updaters while rendering, so handing off from in there would navigate
      // in the middle of this component's render.
      if (next >= FRAMES.length) finish.current();
    }, STEP_MS);

    return () => clearTimeout(id);
  }, [running, step]);

  const frame = running ? FRAMES[step] ?? null : null;

  useEffect(() => {
    if (!frame) return;

    zoom.setValue(0);

    const animation = Animated.timing(zoom, {
      toValue: 1,
      duration: STEP_MS,
      easing: ZOOM_EASING,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
    // Keyed on the step, not the frame object: a new object every render would
    // restart the animation on every render instead of once per step.
  }, [running, step, zoom]);

  if (!running) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: "center",
          justifyContent: "center",
          // Nothing to tap during a countdown, and no way to cancel it.
          pointerEvents: "none",
          // Not opaque: the ring and the topic stay dimly visible behind the
          // count, so it reads as something happening to this screen rather
          // than as a new one.
          backgroundColor: colors.veil,
        },
      ]}
    >
      {frame ? (
        // The animation sits on a wrapper rather than on the text itself:
        // NativeWind does not wire className through Animated components, and
        // an Animated.Text here would mean naming the font family by hand.
        // Scaling the wrapper scales the text identically.
        <Animated.View
          style={{
            opacity: zoom.interpolate({
              inputRange: [0, OPACITY_IN_AT, 1],
              outputRange: [0, 1, 0],
            }),
            transform: [
              {
                scale: zoom.interpolate({
                  inputRange: [0, 1],
                  outputRange: [ZOOM_FROM, ZOOM_TO],
                }),
              },
            ],
          }}
        >
          <Text
            className="text-center font-sans-extrabold text-text"
            style={{
              fontSize: frame.size,
              lineHeight: frame.size * 1.02,
              letterSpacing: frame.tracking,
            }}
          >
            {frame.text}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
