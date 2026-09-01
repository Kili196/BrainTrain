import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";

import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// The bars under the recording ring.
//
// This is the app's fourth looping animation, where CLAUDE.md §13 named three
// (streak flame, PLAY shimmer, analysis orbit). It earns the exception the same
// way they do: it marks something alive. A frozen waveform on a screen that
// says RECORDING reads as broken, not as honest — the honesty lives in the line
// at the bottom of the screen, which says plainly that no microphone is
// listening yet.
//
// Nothing here is random. Every amplitude comes out of two sines of the bar's
// index, so the pattern is identical on every run and on both platforms — a
// waveform redrawn from Math.random() on each frame flickers instead of moving.
// When the microphone lands, `amplitude` is what it replaces.
//
// Two things keep it smooth, and both were fixes rather than plans:
//
//  1. `memo`, because the screen around it re-renders once a second when the
//     clock ticks. Without it every tick rebuilt the interpolation nodes and
//     the row hitched — once a second, exactly on the second.
//  2. Three drivers rather than one. With a single loop every bar reached its
//     opening shape at the same instant, and that moment read as the row
//     stopping. The three periods below share no small common multiple, so the
//     row never lines up again within a take.
const BAR_COUNT = 42;
const BAR_WIDTH = 3;
const BAR_GAP = 3;
const BAR_HEIGHT = 44;

// Deliberately not multiples of each other: 15, 19 and 23 hundredths only
// coincide again after 65 seconds, by which point nobody is watching the seam.
const CYCLES_MS = [1500, 1900, 2300];

// Sampled shapes per loop. Eight is where the piecewise-linear path between
// them stops reading as a corner and starts reading as a curve.
const PHASES = 8;

// Never fully closed: a bar at zero looks like a gap in the row.
const MIN_SCALE = 0.16;

function amplitude(bar: number, phase: number): number {
  // The slow half — neighbouring bars belong to the same swell, which is what
  // makes it read as speech rather than as an equaliser.
  const envelope = 0.45 + 0.55 * Math.abs(Math.sin(bar * 0.21 + phase * 0.6));
  // The fast half — bar-to-bar detail.
  const detail = 0.35 + 0.65 * Math.abs(Math.sin(bar * 1.7 + phase * 1.3));

  return Math.max(MIN_SCALE, Math.min(1, envelope * detail));
}

export type WaveformProps = {
  // Paused freezes the bars where a still frame of the loop leaves them, rather
  // than collapsing them — the recording is held, not gone.
  running: boolean;
};

export const Waveform = memo(function Waveform({ running }: WaveformProps) {
  const reduceMotion = useReduceMotion();
  const still = !running || reduceMotion;

  const cycles = useRef(CYCLES_MS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (still) return;

    const loops = cycles.map((value, index) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: CYCLES_MS[index],
          // Linear: any easing makes the loop visibly restart at the seam.
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
      cycles.forEach((value) => value.setValue(0));
    };
  }, [still, cycles]);

  // Built once. Forty-two Animated.Values would each schedule their own timing;
  // this is forty-two interpolations of three, and they must survive a render
  // or the animation restarts from the top every time.
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, bar) => {
        const points = Array.from({ length: PHASES }, (_, phase) =>
          amplitude(bar, phase)
        );

        return {
          rest: points[0],
          scale: cycles[bar % cycles.length].interpolate({
            inputRange: Array.from({ length: PHASES + 1 }, (_, i) => i / PHASES),
            // Closing on the opening value, so the loop has no seam.
            outputRange: [...points, points[0]],
          }),
          // Slight variation across the row so it does not read as a printed
          // pattern. Deterministic, like the amplitudes.
          opacity: 0.45 + 0.35 * Math.abs(Math.sin(bar * 0.8)),
        };
      }),
    [cycles]
  );

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: BAR_GAP }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={{
            width: BAR_WIDTH,
            height: BAR_HEIGHT,
            borderRadius: BAR_WIDTH,
            backgroundColor: colors.accent.light,
            opacity: bar.opacity,
            transform: [{ scaleY: still ? bar.rest : bar.scale }],
          }}
        />
      ))}
    </View>
  );
});
