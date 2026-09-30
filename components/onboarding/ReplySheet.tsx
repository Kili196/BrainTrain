import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { CheckIcon } from "../icons/CheckIcon";
import { Gradient } from "./Gradient";
import { PillButton } from "./PillButton";

// The flow answering back. Two steps ask the player something about themselves
// and say something in return the moment they answer — the scale and the
// explain test. What comes up is a reaction, never a verdict.
//
// A Modal rather than an absolutely positioned view: the steps render inside the
// shell's ScrollView, and nothing in there can cover the whole screen, the
// button row included. The Modal's own animation is off so the sheet can slide
// on the same curve as the landing's.
export type ReplySheetProps = {
  open: boolean;
  title?: string;
  body: string;
  onDismiss: () => void;
};

export function ReplySheet({ open, title, body, onDismiss }: ReplySheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  // 0 = down and invisible, 1 = up.
  const shown = useRef(new Animated.Value(0)).current;
  // The Modal has to stay mounted until the slide down has finished, or the
  // sheet would vanish instead of leaving.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    const animation = Animated.timing(shown, {
      toValue: open ? 1 : 0,
      duration: reduceMotion ? 0 : 380,
      easing: Easing.bezier(0.25, 0.8, 0.35, 1),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
    return () => animation.stop();
  }, [open, shown, reduceMotion]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* The dim. Opacity on a flat colour — cheap, and nothing to re-blur. */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: colors.ob.bg,
          opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [0, 0.72] }),
        }}
      >
        <Pressable
          className="flex-1"
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      <Animated.View
        accessibilityLiveRegion="polite"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          transform: [
            {
              translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }),
            },
          ],
        }}
      >
        <View
          className="items-center gap-3 rounded-t-[14px] border border-b-0 border-ob-border bg-ob-surface px-6 pt-8"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* The one lit object while the sheet is up — the same gradient as
              the progress bar, so the flow has one accent gesture, not two. */}
          <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full">
            <Gradient angle="diagonal" />
            <CheckIcon size={24} color={colors.ob.text} />
          </View>

          {title ? (
            <Text
              className="text-center font-sans-bold text-[20px] text-ob-text"
              style={{ letterSpacing: -0.9 }}
            >
              {title}
            </Text>
          ) : null}
          <Text className="text-center font-sans text-[15px] leading-[23px] text-ob-muted">
            {body}
          </Text>

          <View className="mt-2 self-stretch">
            <PillButton label="Got it" onPress={onDismiss} arrow={false} />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
