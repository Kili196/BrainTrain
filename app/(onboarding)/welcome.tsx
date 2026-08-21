import { useRouter } from "expo-router";

import { OnboardingScreen } from "../../components/onboarding/OnboardingScreen";
import { ScreenIntro } from "../../components/onboarding/ScreenIntro";
import { Button } from "../../components/ui/Button";

const TOTAL_STEPS = 5;

// Step 1 — the intro. No back button; just sets the tone and starts the flow.
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      totalSteps={TOTAL_STEPS}
      currentStep={1}
      footer={
        <Button label="Get started" onPress={() => router.push("/name")} />
      }
    >
      <ScreenIntro
        eyebrow="BrainTrain"
        title="Say what you know, out loud."
        body="You get a topic, a few minutes to think, and one shot at explaining it. The AI listens, checks your facts and tells you where you were vague."
      />
    </OnboardingScreen>
  );
}
