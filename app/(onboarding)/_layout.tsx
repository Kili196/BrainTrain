import { Stack } from "expo-router";

import { OnboardingProvider } from "../../lib/onboarding-context";

// Layout for the onboarding route group. The whole flow is one screen now
// (`onboarding.tsx`, see why there); the provider sits here rather than inside
// it so the answers live outside the screen that shows them.
export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
