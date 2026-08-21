import { Text, View } from "react-native";

// One row of the Ready-screen summary card: an eyebrow-style label on the left
// and the captured value, bold and white, on the right.
export type SummaryRowProps = {
  label: string;
  value: string;
};

export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
        {label}
      </Text>
      <Text className="font-sans-bold text-text" style={{ fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}
