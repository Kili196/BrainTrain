import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingHeader } from "./OnboardingHeader";

// The scaffold every onboarding route composes. It owns the parts that are
// identical across the flow — safe-area insets, the 24px page padding, the
// progress+back header, keyboard avoidance, and a bottom-pinned footer (the CTA)
// — so each screen file only has to describe its own middle content.
//
// `contentJustify` places that middle content: "center" (welcome, name, date,
// ready) or "start" (country, whose list then fills the space itself).
export type OnboardingScreenProps = {
  totalSteps: number;
  currentStep: number;
  showBack?: boolean;
  onBack?: () => void;
  footer?: ReactNode;
  contentJustify?: "center" | "start";
  children: ReactNode;
};

export function OnboardingScreen({
  totalSteps,
  currentStep,
  showBack,
  onBack,
  footer,
  contentJustify = "center",
  children,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        className="flex-1 px-6"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <OnboardingHeader
          totalSteps={totalSteps}
          currentStep={currentStep}
          showBack={showBack}
          onBack={onBack}
        />

        <View
          className={`flex-1 ${
            contentJustify === "center" ? "justify-center" : "justify-start pt-[46px]"
          }`}
        >
          {children}
        </View>

        {footer ? <View className="pt-5">{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
