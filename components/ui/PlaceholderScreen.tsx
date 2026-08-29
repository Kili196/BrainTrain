import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A tab that exists but is not built yet.
//
// Four of the five tabs are in this state, and they only exist so the bar has
// somewhere to send you: a route that isn't there leaves you on the screen you
// were on, which reads as a broken button rather than as unfinished work.
//
// It borrows the empty-state recipe (design §12) — eyebrow, centred headline,
// one explaining sentence — but deliberately not its primary button: there is
// nothing here to do yet, and a button that does nothing is worse than none.
export type PlaceholderScreenProps = {
  // The section label at the top. Same word as the tab, so pressing a tab and
  // arriving somewhere are visibly the same place.
  section: string;
  headline: string;
  description: string;
};

export function PlaceholderScreen({
  section,
  headline,
  description,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      // 20px page padding, the same as Home. The bottom inset belongs to the
      // tab bar, which sits below this and pads itself.
      className="flex-1 bg-bg px-5"
      style={{ paddingTop: insets.top + 44, paddingBottom: 30 }}
    >
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
        {section}
      </Text>

      <View className="flex-1 items-center justify-center gap-2.5">
        <Text className="text-center text-h3 font-sans-extrabold text-text">
          {headline}
        </Text>

        <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
          {description}
        </Text>
      </View>
    </View>
  );
}
