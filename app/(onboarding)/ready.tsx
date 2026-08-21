import { useRouter } from "expo-router";
import { View } from "react-native";

import { OnboardingScreen } from "../../components/onboarding/OnboardingScreen";
import { ScreenIntro } from "../../components/onboarding/ScreenIntro";
import { SummaryRow } from "../../components/onboarding/SummaryRow";
import { Button } from "../../components/ui/Button";
import { countries } from "../../constants/countries";
import { useOnboarding } from "../../lib/onboarding-context";

const TOTAL_STEPS = 5;

// Step 5 — recap + finish. Persists the profile to device storage, then replaces
// the stack with home so back doesn't return into the flow.
export default function ReadyScreen() {
  const router = useRouter();
  const { name, birth, countryCode, persist } = useOnboarding();

  const countryName =
    countries.find((c) => c.code === countryCode)?.name ?? "—";
  const born = `${birth.day}.${birth.month}.${birth.year}`;

  const finish = async () => {
    await persist();
    router.replace("/home");
  };

  return (
    <OnboardingScreen
      totalSteps={TOTAL_STEPS}
      currentStep={5}
      showBack
      onBack={() => router.back()}
      footer={<Button label="Start your first topic" onPress={finish} />}
    >
      <ScreenIntro
        eyebrow="Ready"
        title="You are set up."
        body="Your first topic is waiting. Two minutes of speaking is all it takes."
      />
      <View className="mt-8 gap-[14px] rounded-xl border bg-surface p-5">
        <SummaryRow label="Name" value={name || "—"} />
        <SummaryRow label="Born" value={born} />
        <SummaryRow label="Country" value={countryName} />
      </View>
    </OnboardingScreen>
  );
}
