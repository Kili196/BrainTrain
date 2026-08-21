import { useRouter } from "expo-router";
import { View } from "react-native";

import { OnboardingScreen } from "../../components/onboarding/OnboardingScreen";
import { ScreenIntro } from "../../components/onboarding/ScreenIntro";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useOnboarding } from "../../lib/onboarding-context";

const TOTAL_STEPS = 5;

// Step 2 — display name. CONTINUE stays disabled until a non-empty name exists.
export default function NameScreen() {
  const router = useRouter();
  const { name, setName } = useOnboarding();

  const canContinue = name.trim().length > 0;

  return (
    <OnboardingScreen
      totalSteps={TOTAL_STEPS}
      currentStep={2}
      showBack
      onBack={() => router.back()}
      footer={
        <Button
          label="Continue"
          disabled={!canContinue}
          onPress={() => router.push("/birthdate")}
        />
      }
    >
      <ScreenIntro
        eyebrow="Step 1 of 4"
        title="What should we call you?"
        body="Shown on the leaderboard. A first name or a handle is enough."
      />
      <View className="mt-8">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={() => canContinue && router.push("/birthdate")}
          accessibilityLabel="Your name"
        />
      </View>
    </OnboardingScreen>
  );
}
