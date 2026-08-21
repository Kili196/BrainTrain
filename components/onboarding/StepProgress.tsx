import { View } from "react-native";

// Segmented progress bar at the top of every onboarding screen. One segment per
// step; segments up to and including the current step fill accent-blue, the rest
// stay on the quiet track colour.
export type StepProgressProps = {
  totalSteps: number;
  currentStep: number; // 1-based
};

export function StepProgress({ totalSteps, currentStep }: StepProgressProps) {
  return (
    <View className="flex-row gap-[6px]">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          className={`h-[3px] flex-1 rounded-full ${
            i < currentStep ? "bg-accent" : "bg-track"
          }`}
        />
      ))}
    </View>
  );
}
