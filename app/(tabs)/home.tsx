import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { clearOnboarding } from "../../lib/onboarding-storage";
import { Button } from "../../components/ui/Button";
import { useRouter } from "expo-router";

// Placeholder home — where onboarding lands. Replaced once the real app exists.
// The reset button is a dev convenience to re-run onboarding without reinstalling.
export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const reset = async () => {
    await clearOnboarding();
    router.replace("/welcome");
  };

  return (
    <View
      className="flex-1 items-center justify-center gap-3 bg-bg px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
        Home
      </Text>
      <Text className="text-h1 font-sans-extrabold text-text">
        You&apos;re in.
      </Text>
      <Text className="mb-6 text-center text-body font-sans text-text-secondary">
        This is a placeholder for the main app. Onboarding is done and your
        profile is saved on this device.
      </Text>
      <Button label="Reset onboarding" onPress={reset} />
    </View>
  );
}
