import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "../../theme/colors";

// The constellation behind everything on Home. Static: no animation, no
// interaction, never moves.
//
// Ported verbatim from the mockup, including the 390×844 viewBox and
// preserveAspectRatio="none" — the field is meant to stretch to the screen
// rather than keep its proportions, so the composition lands the same way on
// every device instead of leaving bands at the edges.
const LINES = [
  { d: "M64 232 L128 198 L186 246", opacity: 0.13 },
  { d: "M186 246 L268 214", opacity: 0.1 },
  { d: "M311 292 L349 350 L296 396", opacity: 0.11 },
  { d: "M46 372 L104 418", opacity: 0.09 },
  { d: "M118 486 L184 528 L254 502", opacity: 0.1 },
  { d: "M254 502 L326 552", opacity: 0.08 },
];

// The first thirteen sit on the polyline vertices; the last seven belong to no
// line at all. Those loose ones are what keep the field from reading as a
// diagram.
const DOTS = [
  { cx: 64, cy: 232, r: 1.5, opacity: 0.5 },
  { cx: 128, cy: 198, r: 1.1, opacity: 0.38 },
  { cx: 186, cy: 246, r: 1.4, opacity: 0.46 },
  { cx: 268, cy: 214, r: 1, opacity: 0.3 },
  { cx: 311, cy: 292, r: 1.3, opacity: 0.4 },
  { cx: 349, cy: 350, r: 1, opacity: 0.28 },
  { cx: 296, cy: 396, r: 1.4, opacity: 0.34 },
  { cx: 46, cy: 372, r: 1.1, opacity: 0.28 },
  { cx: 104, cy: 418, r: 1.5, opacity: 0.36 },
  { cx: 118, cy: 486, r: 1.2, opacity: 0.32 },
  { cx: 184, cy: 528, r: 1.5, opacity: 0.4 },
  { cx: 254, cy: 502, r: 1.1, opacity: 0.28 },
  { cx: 326, cy: 552, r: 1.3, opacity: 0.3 },
  { cx: 228, cy: 316, r: 0.9, opacity: 0.2 },
  { cx: 36, cy: 292, r: 0.9, opacity: 0.18 },
  { cx: 357, cy: 238, r: 1, opacity: 0.24 },
  { cx: 212, cy: 440, r: 0.9, opacity: 0.18 },
  { cx: 338, cy: 452, r: 1, opacity: 0.2 },
  { cx: 72, cy: 546, r: 0.9, opacity: 0.18 },
  { cx: 286, cy: 576, r: 1, opacity: 0.2 },
];

export function ConstellationBackdrop() {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="none"
      >
        {LINES.map((line) => (
          <Path
            key={line.d}
            d={line.d}
            stroke={colors.text.DEFAULT}
            strokeWidth={0.6}
            fill="none"
            opacity={line.opacity}
          />
        ))}
        {DOTS.map((dot, index) => (
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
    </View>
  );
}
