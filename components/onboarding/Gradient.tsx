import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { colors } from "../../theme/colors";

// The onboarding's gradient — violet into blue by default — laid over whatever
// it sits in. Drawn with react-native-svg rather than expo-linear-gradient,
// because svg is already in the dev build; a new native module would mean
// rebuilding the app on every phone before a colour could change.
//
// Absolutely fills its parent, so the parent decides the shape (and clips it
// with overflow-hidden + a radius).
//
// The SVG is given its size in numbers, measured off a plain View. Left to size
// itself by percentage, react-native-svg keeps the size it was first laid out
// at — so a gradient inside a bar that grows (the progress bar, the slider
// fill) stayed stuck at its starting width while the bar around it moved.
export type GradientProps = {
  // 90deg across for bars and buttons; 140deg for the round badge; down for
  // a fade.
  angle?: "across" | "diagonal" | "down";
  // Violet into blue unless a step needs its own pair.
  from?: string;
  to?: string;
  fromOpacity?: number;
  toOpacity?: number;
  // More than two colours, evenly spaced (the feeds' brand gradients).
  // Replaces from/to when given.
  stops?: readonly string[];
  // Solid bands instead of a blend: each of `stops` gets an equal stripe with
  // a hard edge to the next (the chosen country's flag — Fabian found the
  // blend too washed out, 2026-09-30).
  bands?: boolean;
};

// Two stops per colour, at the start and end of its stripe, so the gradient
// jumps at each edge instead of fading across the whole width.
function bandStops(stops: readonly string[]): { offset: number; color: string }[] {
  return stops.flatMap((color, i) => [
    { offset: i / stops.length, color },
    { offset: (i + 1) / stops.length, color },
  ]);
}

export function Gradient({
  angle = "across",
  from = colors.ob.violet,
  to = colors.ob.bright,
  fromOpacity = 1,
  toOpacity = 1,
  stops,
  bands = false,
}: GradientProps) {
  // Several gradients can be on screen at once, so each gets its own id. useId
  // returns ":r0:"-style ids, and a colon inside url(#…) is not a valid
  // reference on native — so only the letters and digits are kept.
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient
              id={id}
              x1="0"
              y1="0"
              x2={angle === "down" ? "0" : "1"}
              y2={angle === "across" ? "0" : "1"}
            >
              {/* A flat array of Stops, never a fragment: LinearGradient reads
                  its children directly and does not look inside fragments. */}
              {stops && stops.length > 1
                ? bands
                  ? bandStops(stops).map((stop, i) => (
                      <Stop key={i} offset={stop.offset} stopColor={stop.color} />
                    ))
                  : stops.map((color, i) => (
                      <Stop key={i} offset={i / (stops.length - 1)} stopColor={color} />
                    ))
                : [
                    <Stop key="from" offset="0" stopColor={from} stopOpacity={fromOpacity} />,
                    <Stop key="to" offset="1" stopColor={to} stopOpacity={toOpacity} />,
                  ]}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.width} height={size.height} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}
