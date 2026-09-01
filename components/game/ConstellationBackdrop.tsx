import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "../../theme/colors";

// The constellation behind everything on Home. Static: no animation, no
// interaction, never moves.
//
// Ported from the mockup, including the 390×844 viewBox and
// preserveAspectRatio="none" — the field is meant to stretch to the screen
// rather than keep its proportions, so the composition lands the same way on
// every device instead of leaving bands at the edges.
//
// Extended past the mockup on 2026-09-01. Every dot it drew sat between y=198
// and y=576 of the 844-tall viewBox, so on a phone the whole field bunched into
// the middle third with empty black above and below. The two groups below carry
// it into the top and bottom bands and out to the side edges. The middle stays
// as the mockup drew it, and the area right behind the topic on the stage stays
// deliberately thin — the field is a backdrop, not a texture.
const LINES = [
  // top band
  { d: "M42 96 L108 62 L168 104", opacity: 0.11 },
  { d: "M168 104 L246 78", opacity: 0.09 },
  { d: "M292 128 L344 92", opacity: 0.08 },
  // middle band — the mockup's own
  { d: "M64 232 L128 198 L186 246", opacity: 0.13 },
  { d: "M186 246 L268 214", opacity: 0.1 },
  { d: "M311 292 L349 350 L296 396", opacity: 0.11 },
  { d: "M46 372 L104 418", opacity: 0.09 },
  { d: "M118 486 L184 528 L254 502", opacity: 0.1 },
  { d: "M254 502 L326 552", opacity: 0.08 },
  // bottom band
  { d: "M58 648 L126 692 L196 664", opacity: 0.1 },
  { d: "M196 664 L272 706", opacity: 0.09 },
  { d: "M300 744 L358 712", opacity: 0.08 },
];

// Most sit on the polyline vertices; the loose ones at the end of each band
// belong to no line at all, and they are what keep the field from reading as a
// diagram. The four at x<26 and x>366 are there on purpose: without a dot near
// the edges the stretched viewBox looks cropped.
const DOTS = [
  // top band
  { cx: 42, cy: 96, r: 1.2, opacity: 0.34 },
  { cx: 108, cy: 62, r: 1.4, opacity: 0.4 },
  { cx: 168, cy: 104, r: 1.1, opacity: 0.3 },
  { cx: 246, cy: 78, r: 1.3, opacity: 0.36 },
  { cx: 292, cy: 128, r: 1, opacity: 0.26 },
  { cx: 344, cy: 92, r: 1.2, opacity: 0.3 },
  { cx: 196, cy: 158, r: 0.9, opacity: 0.18 },
  { cx: 68, cy: 168, r: 1, opacity: 0.22 },
  { cx: 318, cy: 182, r: 0.9, opacity: 0.18 },
  { cx: 16, cy: 124, r: 0.9, opacity: 0.16 },
  { cx: 372, cy: 46, r: 1, opacity: 0.2 },
  // middle band — the mockup's own
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
  { cx: 18, cy: 332, r: 0.9, opacity: 0.16 },
  { cx: 374, cy: 268, r: 0.9, opacity: 0.16 },
  { cx: 378, cy: 430, r: 1, opacity: 0.2 },
  // bottom band
  { cx: 58, cy: 648, r: 1.3, opacity: 0.34 },
  { cx: 126, cy: 692, r: 1.1, opacity: 0.28 },
  { cx: 196, cy: 664, r: 1.4, opacity: 0.38 },
  { cx: 272, cy: 706, r: 1.2, opacity: 0.3 },
  { cx: 300, cy: 744, r: 1, opacity: 0.24 },
  { cx: 358, cy: 712, r: 1.3, opacity: 0.3 },
  { cx: 92, cy: 772, r: 0.9, opacity: 0.18 },
  { cx: 232, cy: 788, r: 1, opacity: 0.2 },
  { cx: 22, cy: 706, r: 0.9, opacity: 0.16 },
  { cx: 168, cy: 742, r: 0.9, opacity: 0.16 },
  { cx: 350, cy: 622, r: 1, opacity: 0.2 },
  { cx: 122, cy: 812, r: 0.9, opacity: 0.14 },
];

export type ConstellationBackdropProps = {
  // Where the field is allowed to start, in pixels from the top of the screen.
  // Home passes the bottom edge of its header: above that hairline the row of
  // achievements, streak and challenges has to read cleanly, and a star behind
  // it is noise. Every other screen leaves this at zero and gets the full
  // field. Because the viewBox is stretched rather than fitted, moving the top
  // edge down simply compresses the composition into what is left — nothing is
  // cropped away.
  top?: number;
};

export function ConstellationBackdrop({ top = 0 }: ConstellationBackdropProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // In the style, not as a prop: react-native-web ignores the prop.
      style={[StyleSheet.absoluteFill, { top, pointerEvents: "none" }]}
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
