import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckIcon } from "../icons/CheckIcon";
import { colors } from "../../theme/colors";

// The shell every bottom sheet in the app shares (design §12): scrim, surface,
// hairline, overlay shadow, and a header whose only control is a check that
// closes it. There is no Cancel anywhere in this design — sheets edit live, so
// dismissing is always confirming.
export type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Android's hardware back button. Without this the sheet cannot be closed
      // that way and the press falls through to the navigator.
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Scrim as a sibling, not a parent: a tap on the sheet would otherwise
            bubble up to it and close what the user just reached for. */}
        <Pressable
          className="absolute inset-0 bg-scrim"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
        />

        <View
          className="rounded-xl border border-modal bg-surface"
          style={{
            marginHorizontal: 26,
            marginBottom: insets.bottom + 30,
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9)",
          }}
        >
          <View className="flex-row items-center justify-between px-5 py-4">
            <Text className="text-h3 font-sans-extrabold text-text">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Done"
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full border border-modal"
            >
              <CheckIcon size={16} color={colors.text.DEFAULT} />
            </Pressable>
          </View>

          {children}
        </View>
      </View>
    </Modal>
  );
}

// A sheet row: a hairline on top, generous padding, content laid out by the
// caller. The divider belongs to the row rather than sitting between rows, so
// rows can be reordered without the separators ending up in the wrong place.
export function SheetRow({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between border-t border-divider px-5 py-4">
      {children}
    </View>
  );
}
