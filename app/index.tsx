import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The "/" route — the first screen you land on. Right now it just renders
// something visible so you can confirm the router works. Later, swap this
// body for a <Redirect> that sends new users to onboarding and returning
// users to the main app.
export default function Index() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-bg items-center justify-center px-5 gap-3"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-text-faint text-eyebrow font-extrabold uppercase">
        Expo Router
      </Text>
      <Text className="text-text text-h1 font-extrabold">It works</Text>
      <Text className="text-text-secondary text-body text-center">
        This is app/index.tsx, the &quot;/&quot; route. Edit it, or replace it
        with a redirect into onboarding once your screens are ready.
      </Text>
    </View>
  );
}
