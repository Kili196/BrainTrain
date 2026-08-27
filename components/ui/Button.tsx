import { Pressable, Text, View } from "react-native";

// The app's one primary button (design §4): flat accent fill with a hard offset
// shadow and NO blur. It physically depresses on press — shifting down and
// shrinking its shadow. That press-down is the single piece of skeuomorphism in
// the UI, so it must never be swapped for a soft/blurred shadow.
//
// The shadow is drawn by a sibling <View> behind the button rather than a real
// box-shadow: React Native clips box-shadow to the (rounded) content box, so an
// offset hard shadow needs its own layer we can slide independently.
//
// Two variants:
//   primary — every screen's main action.
//   hero    — PLAY on Home and START on Play, and nowhere else. One step
//             brighter and taller so it reads as the loudest thing in the app.
export type ButtonVariant = "primary" | "hero";

export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  accessibilityLabel?: string;
};

// Resting and pressed shadow depth per variant. The hero sits 1px deeper and
// travels 5px instead of 4, which is what makes it feel heavier under the thumb.
const VARIANTS = {
  primary: {
    fill: "bg-accent",
    text: "text-button",
    padding: "px-7 py-4",
    restShadow: 6,
    pressShadow: 2,
    travel: 4,
  },
  hero: {
    fill: "bg-accent-raised",
    text: "text-button-lg",
    padding: "px-7 py-5",
    restShadow: 7,
    pressShadow: 2,
    travel: 5,
  },
} as const;

export function Button({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  accessibilityLabel,
}: ButtonProps) {
  const style = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      className="w-full"
      style={disabled ? { opacity: 0.35 } : undefined}
    >
      {({ pressed }) => {
        // Only move when the press can actually do something — a disabled
        // button that still depresses reads as broken rather than as blocked.
        const isDown = pressed && !disabled;
        const offset = isDown ? style.pressShadow : style.restShadow;

        return (
          <View className="relative w-full">
            {/* hard offset shadow layer */}
            <View
              className="absolute inset-x-0 rounded-lg bg-accent-shadow"
              style={{ top: offset, bottom: -offset }}
            />
            <View
              className={`w-full items-center justify-center rounded-lg ${style.fill} ${style.padding}`}
              style={{ transform: [{ translateY: isDown ? style.travel : 0 }] }}
            >
              <Text
                className={`${style.text} font-sans-extrabold uppercase text-text`}
              >
                {label}
              </Text>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}
