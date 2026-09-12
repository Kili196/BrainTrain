import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { OnboardingScreen } from "../../components/onboarding/OnboardingScreen";
import { ScreenIntro } from "../../components/onboarding/ScreenIntro";
import { SummaryRow } from "../../components/onboarding/SummaryRow";
import { Button } from "../../components/ui/Button";
import { countries } from "../../constants/countries";
import { useUserId } from "../../lib/auth-context";
import { useOnboarding } from "../../lib/onboarding-context";
import { saveProfile } from "../../lib/profile";
import { useToast } from "../../lib/toast-context";

const TOTAL_STEPS = 5;

// Step 5 — recap + finish. Writes the profile to Supabase and to device
// storage, then replaces the stack with home so back doesn't return into the
// flow.
export default function ReadyScreen() {
  const router = useRouter();
  const toast = useToast();
  const userId = useUserId();
  const { name, birth, countryCode, persist } = useOnboarding();
  const [saving, setSaving] = useState(false);

  const countryName =
    countries.find((c) => c.code === countryCode)?.name ?? "—";
  const born = `${birth.day}.${birth.month}.${birth.year}`;

  const finish = async () => {
    if (!countryCode) return;

    setSaving(true);

    try {
      // Supabase first, device storage second. The local copy is what
      // `app/index.tsx` reads to decide whether onboarding is done, so writing
      // it before the real profile would mean a player who is through the flow
      // on this phone and has no profile anywhere else — and nothing would ever
      // go back for it.
      await saveProfile(userId, {
        name,
        birth,
        countryCode,
      });
      await persist();
    } catch (error: unknown) {
      // Same shape as the round save: stay, say so, leave the button. Nothing
      // is lost — the answers are still in the context one tap away. Reaching
      // this screen at all required a session, so being offline here means the
      // connection dropped during the flow.
      console.warn("[onboarding] could not save the profile:", error);
      setSaving(false);
      toast.show("Couldn't save your profile — try again");
      return;
    }

    router.replace("/home");
  };

  return (
    <OnboardingScreen
      totalSteps={TOTAL_STEPS}
      currentStep={5}
      showBack
      onBack={() => router.back()}
      footer={
        <Button
          label="Start your first topic"
          onPress={finish}
          disabled={saving}
        />
      }
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
