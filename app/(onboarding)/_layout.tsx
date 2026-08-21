import { Stack } from "expo-router";

import { OnboardingProvider } from "../../lib/onboarding-context";

// Layout for the onboarding route group. Wraps all steps in the provider so the
// answers collected on each screen survive until the Ready screen persists them.
// The parentheses in the folder name make this a group: it shares this layout
// without adding "onboarding" to the URL (routes stay /welcome, /name, …).
export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
