import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { DateInput, type DateParts } from "../../components/onboarding/DateInput";
import { OnboardingScreen } from "../../components/onboarding/OnboardingScreen";
import { ScreenIntro } from "../../components/onboarding/ScreenIntro";
import { Button } from "../../components/ui/Button";
import { useOnboarding } from "../../lib/onboarding-context";

const TOTAL_STEPS = 5;
const CURRENT_YEAR = new Date().getFullYear();

// True only for a real calendar date with a plausible birth year.
function isValidBirth({ day, month, year }: DateParts): boolean {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!day || !month || !year) return false;
  if (y < 1900 || y > CURRENT_YEAR) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // Reject impossible days (e.g. 31 Feb) by round-tripping through Date.
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// Step 3 — birthdate. Validation disables CONTINUE and surfaces a helper line
// (the design expresses errors by disabling the CTA, not recolouring fields).
export default function BirthdateScreen() {
  const router = useRouter();
  const { birth, setBirth } = useOnboarding();

  const valid = isValidBirth(birth);
  const allFilled = Boolean(birth.day && birth.month && birth.year);
  const showError = allFilled && !valid;

  return (
    <OnboardingScreen
      totalSteps={TOTAL_STEPS}
      currentStep={3}
      showBack
      onBack={() => router.back()}
      footer={
        <Button
          label="Continue"
          disabled={!valid}
          onPress={() => router.push("/country")}
        />
      }
    >
      <ScreenIntro
        eyebrow="Step 2 of 4"
        title="When were you born?"
        body="Used to compare your scores against speakers in your age group."
      />
      <View className="mt-8">
        <DateInput value={birth} onChange={setBirth} />
        {showError ? (
          <Text className="mt-3 text-center font-sans text-text-muted" style={{ fontSize: 12 }}>
            That date looks off.
          </Text>
        ) : null}
      </View>
    </OnboardingScreen>
  );
}
