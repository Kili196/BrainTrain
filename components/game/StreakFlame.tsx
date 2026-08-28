import { Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { colors } from "../../theme/colors";

// The streak: a flame with the day count under it.
//
// Design §1 gives the flame its own colour scale and it is the only thing in
// the app allowed to use it — grey at zero, orange while a streak is running,
// violet past 30 days. The jump to violet is the reward for a long streak, so
// the threshold is the point of the whole thing.
const LONG_STREAK_DAYS = 30;

// Filled, not stroked. Design §9 makes icons 24-viewBox strokes, but names the
// filled exceptions — this is one of them: a status indicator, not an icon
// sitting in a row of text.
const FLAME = "M12 3c3.3 3.3 5.3 5.9 5.3 9a5.3 5.3 0 1 1-10.6 0c0-1.7.7-3.2 1.9-4.4.2 1.3.8 2.2 1.8 2.7C9.8 7.7 10.3 5.2 12 3z";
const CORE = "M12 12.4c1.4 1.4 2.2 2.5 2.2 3.7a2.2 2.2 0 1 1-4.4 0c0-1.2.8-2.3 2.2-3.7z";

// The halo is a radial gradient rather than a blurred shadow: React Native has
// no blur, and design §1 already uses radial SVG halos for exactly this kind of
// glow elsewhere. It needs room around the flame, so the canvas is wider than
// the glyph and the glyph is drawn into the middle of it.
const CANVAS = 44;
const GLYPH = 24;
const GLYPH_OFFSET = (CANVAS - GLYPH) / 2;

export function streakColor(days: number): string {
  if (days <= 0) return colors.streak.idle;
  return days >= LONG_STREAK_DAYS ? colors.streak.long : colors.streak.flame;
}

export function StreakFlame({ days }: { days: number }) {
  const color = streakColor(days);

  return (
    <View
      className="items-center"
      accessibilityRole="text"
      accessibilityLabel={
        days > 0 ? `${days} day streak` : "No streak — play to start one"
      }
    >
      <Svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <Defs>
          <RadialGradient id="streakHalo" cx="50%" cy="55%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.45} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.14} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle
          cx={CANVAS / 2}
          cy={CANVAS / 2}
          r={CANVAS / 2}
          fill="url(#streakHalo)"
        />

        {/* The two paths are drawn in the 24-viewBox every icon uses; the group
            moves them into the middle of the larger canvas the halo needs. */}
        <G transform={`translate(${GLYPH_OFFSET}, ${GLYPH_OFFSET})`}>
          <Path d={FLAME} fill={color} />
          {/* The bright heart of the flame. White at low opacity rather than a
              second hue, so it lightens whichever colour the streak wears. */}
          <Path d={CORE} fill={colors.text.DEFAULT} fillOpacity={0.75} />
        </G>
      </Svg>

      <Text
        className="text-center font-sans-extrabold"
        style={{
          color,
          fontSize: 12,
          lineHeight: 13,
          fontVariant: ["tabular-nums"],
        }}
      >
        {days}
      </Text>
    </View>
  );
}
