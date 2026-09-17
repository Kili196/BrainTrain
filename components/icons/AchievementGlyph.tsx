import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";

import type { AchievementGlyph as GlyphName } from "../../constants/achievements";
import { colors } from "../../theme/colors";

// The badge shapes, one per achievement family.
//
// Two deliberate departures from the rest of `components/icons`:
//
//  * **They are solid, not stroked.** Design §9 governs icons — things that
//    label a control. These are awards, drawn in the mockup as solid Unicode
//    geometry (◆ ▲ ●), and a 1.8px outline at 16px on a filled accent square
//    would all but vanish. The ring is the one that stays open, because a ring
//    with its middle filled in is a circle.
//  * **They are not `<Icon>`.** That base sets a stroke, a stroke width and
//    round caps, none of which a filled shape has any use for.
//
// The mockup's Unicode glyphs could not be used directly: Archivo contains none
// of those characters, so every device would fall back to a different system
// font and the badges would not match between iOS and Android.
export type AchievementGlyphProps = {
  glyph: GlyphName;
  size?: number;
  color?: string;
};

// 15px in the mockup, on a 44px badge.
const GLYPH_SIZE = 16;

export function AchievementGlyph({
  glyph,
  size = GLYPH_SIZE,
  color = colors.text.DEFAULT,
}: AchievementGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shapeOf(glyph, color)}
    </Svg>
  );
}

function shapeOf(glyph: GlyphName, color: string) {
  switch (glyph) {
    // volume — a full round dot, the plainest mark in the set, for the
    // achievements that simply count rounds.
    case "circle":
      return <Circle cx={12} cy={12} r={7} fill={color} />;

    // accuracy
    case "diamond":
      return <Path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" fill={color} />;

    // breadth
    case "star":
      return (
        <Polygon
          points="12,3.5 14.12,9.09 20.08,9.37 15.42,13.11 17,18.88 12,15.6 7,18.88 8.58,13.11 3.92,9.37 9.88,9.09"
          fill={color}
        />
      );

    // depth — two chevrons stacked, the way a depth gauge marks going further
    // down the same ground.
    case "chevrons":
      return (
        <Path
          d="M12 2.5 19.5 10 17.1 12.4 12 7.3 6.9 12.4 4.5 10Z M12 11 19.5 18.5 17.1 20.9 12 15.8 6.9 20.9 4.5 18.5Z"
          fill={color}
        />
      );

    // streak — the flame's shape, reduced to a triangle.
    case "triangle":
      return <Path d="M12 3.6 21 19.6 3 19.6Z" fill={color} />;

    // rhythm — a clock face with nothing in it.
    case "ring":
      return (
        <Circle
          cx={12}
          cy={12}
          r={6.6}
          stroke={color}
          strokeWidth={3.4}
          fill="none"
        />
      );

    // endurance — a bar, the same shape as the progress it measures.
    case "bar":
      return <Rect x={3.5} y={10} width={17} height={4} rx={2} fill={color} />;

    // ritual — the daily draw, one cell of a honeycomb.
    case "hexagon":
      return (
        <Polygon
          points="12,3.5 19.36,7.75 19.36,16.25 12,20.5 4.64,16.25 4.64,7.75"
          fill={color}
        />
      );
  }
}
