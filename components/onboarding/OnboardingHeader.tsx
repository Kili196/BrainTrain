import { Pressable, View } from "react-native";

import { colors } from "../../theme/colors";
import { ArrowLeftIcon } from "../icons/ArrowLeftIcon";
import { StepProgress } from "./StepProgress";

// Top row of every onboarding screen: an optional back button followed by the
// step progress bar. On the first screen there is no back button, so the bar
// takes the full width (a fixed-width spacer keeps it aligned when back shows).
export type OnboardingHeaderProps = {
  totalSteps: number;
  currentStep: number;
  showBack?: boolean;
  onBack?: () => void;
};

export function OnboardingHeader({
  totalSteps,
  currentStep,
  showBack = false,
  onBack,
}: OnboardingHeaderProps) {
  return (
    <View className="flex-row items-center gap-[14px]">
      {showBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          className="h-6 w-6 items-center justify-center"
        >
          <ArrowLeftIcon size={20} color={colors.text.secondary} />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <StepProgress totalSteps={totalSteps} currentStep={currentStep} />
      </View>
    </View>
  );
}
