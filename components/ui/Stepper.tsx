import { Pressable, Text, View } from "react-native";

// − value + row (design §6). The value is tabular-nums so the row does not
// twitch sideways when 15:00 becomes 9:00 — non-negotiable for every number in
// this app.
//
// The component is presentational: it reports which way it was pressed and
// renders whatever value it is handed. Clamping lives in lib/game-settings.ts,
// so the rule exists once instead of once per stepper.
export type StepperProps = {
  value: string;
  onStep: (direction: 1 | -1) => void;
  canDecrease: boolean;
  canIncrease: boolean;
  // Spoken by screen readers as "Decrease <label>" / "Increase <label>", since
  // "−" and "+" alone say nothing about what they change.
  label: string;
};

export function Stepper({
  value,
  onStep,
  canDecrease,
  canIncrease,
  label,
}: StepperProps) {
  return (
    <View className="flex-row items-center gap-4">
      <StepButton
        glyph="−"
        disabled={!canDecrease}
        onPress={() => onStep(-1)}
        accessibilityLabel={`Decrease ${label}`}
      />
      <Text
        className="min-w-[62px] text-center text-h3 font-sans-extrabold text-text"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
      <StepButton
        glyph="+"
        disabled={!canIncrease}
        onPress={() => onStep(1)}
        accessibilityLabel={`Increase ${label}`}
      />
    </View>
  );
}

function StepButton({
  glyph,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  glyph: string;
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      // 44×44 hit area even though the disc is 34px — the design's minimum
      // touch target, met with padding rather than by growing the visual.
      hitSlop={5}
      className="h-9 w-9 items-center justify-center rounded-full bg-inactive-fill"
      style={disabled ? { opacity: 0.3 } : undefined}
    >
      <Text className="text-h3 font-sans-semibold leading-none text-text">
        {glyph}
      </Text>
    </Pressable>
  );
}
