import { Pressable, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { ArrowRightIcon } from "../icons/ArrowRightIcon";
import { Gradient } from "./Gradient";

// The onboarding's buttons, in the landing's look rather than the app's hard-
// shadow Button: a full-width pill that presses in by shrinking a hair.
//
//   primary  — white pill, dark label, arrow after it. The forward button.
//   gradient — the violet-to-blue pill. For an action inside a step (the
//              trial's Start) and for the flow's very last button — never
//              where it would sit under a second white pill arguing about
//              which one is the point.
//   quiet    — hairline outline, muted label. A secondary way through.
export type PillButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "gradient" | "quiet";
  disabled?: boolean;
  // A count riding in the button where the arrow would be: one gesture that
  // reads both "three chosen" and "go on".
  badge?: number | null;
  // The quiet variant fills with the violet-to-blue gradient once its job is
  // done ("Committed.") — the same gradient as the progress bar, so the done
  // state reads as part of the flow's own colour (Fabian, 2026-09-30).
  lit?: boolean;
  // Off where the button closes something rather than moving forward.
  arrow?: boolean;
  accessibilityLabel?: string;
};

export function PillButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  badge = null,
  lit = false,
  arrow = true,
  accessibilityLabel,
}: PillButtonProps) {
  const primary = variant === "primary";
  const quiet = variant === "quiet";
  const filled = variant === "gradient" || (quiet && lit);

  const labelColor = primary ? colors.ob.bg : quiet && !lit ? colors.ob.muted : colors.ob.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      {({ pressed }) => (
        <View
          className="min-h-[56px] flex-row items-center justify-center gap-3 overflow-hidden rounded-full px-6 py-3"
          style={{
            backgroundColor: primary ? colors.ob.text : "transparent",
            borderWidth: quiet && !lit ? 1 : 0,
            borderColor: colors.ob.border,
            transform: [{ scale: pressed && !disabled && !quiet ? 0.985 : 1 }],
          }}
        >
          {filled ? <Gradient /> : null}
          <Text
            className={`text-[17px] ${quiet ? "font-sans-semibold" : "font-sans-bold"}`}
            style={{ color: labelColor }}
          >
            {label}
          </Text>
          {primary && badge ? (
            <View
              className="h-7 min-w-[28px] items-center justify-center rounded-full px-2"
              style={{ backgroundColor: colors.ob.bg }}
            >
              <Text
                className="font-sans-semibold text-[15px]"
                style={{ color: colors.ob.text, fontVariant: ["tabular-nums"] }}
              >
                {badge}
              </Text>
            </View>
          ) : !quiet && arrow ? (
            <ArrowRightIcon size={20} color={labelColor} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
