import { Pressable, Text, View } from "react-native";

import { CloseIcon } from "../icons/CloseIcon";
import { SheetSurface } from "../ui/Sheet";
import { colors } from "../../theme/colors";

// What PLAY opens: where this round's topic comes from.
//
//   Standard    — whatever the settings say (random, or a chosen category).
//   Daily topic — the one everybody gets today.
//
// Two full-width rows and a dismiss, nothing else. The choice starts the round
// immediately, so there is no confirm step and no default selection to argue
// with.
export type PlayModeSheetProps = {
  visible: boolean;
  // Marks today's daily topic as not yet opened on this device.
  dailyUnseen: boolean;
  onStandard: () => void;
  onDaily: () => void;
  onClose: () => void;
};

export function PlayModeSheet({
  visible,
  dailyUnseen,
  onStandard,
  onDaily,
  onClose,
}: PlayModeSheetProps) {
  return (
    <SheetSurface visible={visible} onClose={onClose} closeLabel="Close play menu">
      <Choice label="Standard" onPress={onStandard} />

      <View className="border-t border-divider">
        <Choice
          label="Daily topic"
          onPress={onDaily}
          marked={dailyUnseen}
          // The dot is decoration for anyone who can see it; for anyone who
          // cannot, the label has to carry the same information.
          accessibilityLabel={
            dailyUnseen ? "Daily topic, new today" : "Daily topic"
          }
        />
      </View>

      <View className="items-center border-t border-divider py-3">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full border border-modal"
        >
          <CloseIcon size={15} color={colors.text.secondary} />
        </Pressable>
      </View>
    </SheetSurface>
  );
}

function Choice({
  label,
  onPress,
  marked = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  marked?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // Row-wide hit area with the label centred inside it — in a menu you aim
      // at the row, not at the word.
      className="flex-row items-center justify-center gap-2 py-5"
    >
      <Text className="text-h3 font-sans-extrabold uppercase tracking-button text-text">
        {label}
      </Text>
      {marked ? <View className="h-1.5 w-1.5 rounded-full bg-danger" /> : null}
    </Pressable>
  );
}
