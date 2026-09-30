import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { withAlpha } from "../../lib/with-alpha";
import { colors } from "../../theme/colors";
import { Gradient } from "./Gradient";

// One answer tile, shared by every pick-something step (apps, symptoms, the
// explain test, the scale).
//
// Chosen is a FILLED tile with a tick in the corner. The first version was a
// lit rim over a 16% wash, and on a phone that read as barely different from
// unchosen — Fabian asked for it to be more dominant, then for each answer to
// carry its own colour (2026-09-29): a feed's brand gradient, green and red for
// the explain test, the subject arc for everything else.
export type ChoiceFill = {
  // One colour for a flat fill, several for a gradient across the tile.
  colors: readonly string[];
  // The label and tick on top of it: dark on a light fill, white on a dark one.
  ink: string;
};

// The default: the bright blue, dark label.
const DEFAULT_FILL: ChoiceFill = { colors: [colors.ob.bright], ink: colors.ob.bg };

// The subject arc, teal to violet — the same colours the goals rows use.
const ARC = Object.values(colors.ob.subject);

// The fill for option `index` of `count` on a step with no colours of its own:
// its stretch of the subject arc, so a row of choices reads as one sweep from
// teal to violet and each tile carries a little gradient of its own.
export function arcFill(index: number, count: number): ChoiceFill {
  const at = (t: number) => ARC[Math.round(t * (ARC.length - 1))];
  const start = count <= 1 ? 0 : index / count;
  const end = count <= 1 ? 1 : (index + 1) / count;
  return { colors: [at(start), at(end)], ink: colors.ob.bg };
}

export type ChoiceTileProps = {
  label: string;
  on: boolean;
  onPress: () => void;
  role: "checkbox" | "radio";
  fill?: ChoiceFill;
  // Layout of the tile itself (height, flex, aspect) — the look is fixed here.
  className?: string;
  // Digits on the scale line up rather than jitter.
  numeric?: boolean;
  // The scale's pips are too small for a corner tick.
  tick?: boolean;
  accessibilityLabel?: string;
};

// A hole punched in the fill, behind the tick.
const HOLE = withAlpha(colors.ob.bg, 0.25);

export function ChoiceTile({
  label,
  on,
  onPress,
  role,
  fill = DEFAULT_FILL,
  className = "",
  numeric = false,
  tick = true,
  accessibilityLabel,
}: ChoiceTileProps) {
  const flat = fill.colors.length === 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: on }}
      accessibilityLabel={accessibilityLabel ?? label}
      className={`items-center justify-center overflow-hidden rounded-[14px] border px-3 py-4 ${className}`}
      style={{
        borderColor: on ? "transparent" : colors.ob.border,
        backgroundColor: !on ? colors.ob.raised : flat ? fill.colors[0] : "transparent",
      }}
    >
      {({ pressed }) => (
        <>
          {on && !flat ? <Gradient angle="diagonal" stops={fill.colors} /> : null}

          {/* Press feedback as a slight sink, like the forward pill. */}
          <View style={{ transform: [{ scale: pressed ? 0.97 : 1 }] }}>
            <Text
              className={`text-center text-[15px] leading-[20px] ${
                on ? "font-sans-bold" : "font-sans"
              }`}
              style={{
                color: on ? fill.ink : colors.ob.text,
                ...(numeric ? { fontSize: 17, fontVariant: ["tabular-nums"] } : null),
              }}
            >
              {label}
            </Text>
          </View>

          {on && tick ? (
            <View
              className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full"
              style={{ backgroundColor: HOLE }}
            >
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 13 L10 18 L19 7"
                  stroke={fill.ink}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
