import { useRouter } from "expo-router";
import { View } from "react-native";

import { CountryList } from "../../components/onboarding/CountryList";
import { OnboardingScreen } from "../../components/onboarding/OnboardingScreen";
import { ScreenIntro } from "../../components/onboarding/ScreenIntro";
import { Button } from "../../components/ui/Button";
import { countries } from "../../constants/countries";
import { useOnboarding } from "../../lib/onboarding-context";

const TOTAL_STEPS = 5;

// Step 4 — country. Content sits at the top so the list fills the space below;
// CONTINUE unlocks once a country is selected.
export default function CountryScreen() {
  const router = useRouter();
  const { countryCode, setCountryCode } = useOnboarding();

  return (
    <OnboardingScreen
      totalSteps={TOTAL_STEPS}
      currentStep={4}
      showBack
      onBack={() => router.back()}
      contentJustify="start"
      footer={
        <Button
          label="Continue"
          disabled={!countryCode}
          onPress={() => router.push("/ready")}
        />
      }
    >
      <ScreenIntro
        eyebrow="Step 3 of 4"
        title="Where are you from?"
        body="Sets your regional leaderboard and the language of your daily topics."
      />
      <View className="mt-7 flex-1">
        <CountryList
          countries={countries}
          selectedCode={countryCode}
          onSelect={setCountryCode}
        />
      </View>
    </OnboardingScreen>
  );
}
