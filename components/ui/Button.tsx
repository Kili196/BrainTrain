import { Pressable, Text, View } from "react-native";

// The app's one primary button (design §4): flat accent fill with a hard offset
// shadow and NO blur. It physically depresses on press — shifting down 4px and
// shrinking its shadow. That press-down is the single piece of skeuomorphism in
// the UI, so it must never be swapped for a soft/blurred shadow.
//
// The shadow is drawn by a sibling <View> behind the button rather than a real
// box-shadow: React Native clips box-shadow to the (rounded) content box, so an
// offset hard shadow needs its own layer we can slide independently.
export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function Button({ label, onPress, disabled = false }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="w-full"
      style={disabled ? { opacity: 0.35 } : undefined}
    >
      {({ pressed }) => (
        <View className="relative w-full">
          {/* hard offset shadow layer — 6px normally, 2px when pressed */}
          <View
            className="absolute inset-x-0 bg-accent-shadow rounded-lg"
            style={{ top: pressed ? 2 : 6, bottom: pressed ? -2 : -6 }}
          />
          <View
            className="w-full items-center justify-center rounded-lg bg-accent px-7 py-4"
            style={{ transform: [{ translateY: pressed && !disabled ? 4 : 0 }] }}
          >
            <Text className="text-button font-sans-extrabold uppercase text-text">
              {label}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
