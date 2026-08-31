import { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckIcon } from "../icons/CheckIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// A confirmation that drops in under the status bar, waits, and leaves — or
// goes on the first tap of its X.
//
// Same surface as a sheet (design §12): #141414, a 12% hairline and the overlay
// shadow. It floats, so it is one of the three things in the app allowed a
// blurred shadow.
//
// Every toast the app raises today is a confirmation, so the check is part of
// the shell rather than a prop. The day there is a failure to report, that
// becomes a tone.
const VISIBLE_MS = 3200;
const IN_MS = 180;
const OUT_MS = 150;
const DROP = 14;

export function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const enter = useRef(new Animated.Value(0)).current;

  const close = useCallback(() => {
    if (reduceMotion) {
      onDismiss();
      return;
    }

    Animated.timing(enter, {
      toValue: 0,
      duration: OUT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [enter, onDismiss, reduceMotion]);

  useEffect(() => {
    if (!message) return;

    if (reduceMotion) {
      enter.setValue(1);
    } else {
      Animated.timing(enter, {
        toValue: 1,
        duration: IN_MS,
        easing: Easing.bezier(0.3, 0.8, 0.3, 1),
        useNativeDriver: true,
      }).start();
    }

    // The toast is mounted fresh per message (the provider keys it), so this
    // countdown starts once and is cleared if it is dismissed by hand first.
    const timer = setTimeout(close, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, enter, reduceMotion, close]);

  if (!message) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: insets.top + 12,
        left: 20,
        right: 20,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [-DROP, 0],
            }),
          },
        ],
        // In the style, not as a prop: react-native-web ignores the prop, and
        // this layer sits over whole screens — only the toast itself may take a
        // press.
        pointerEvents: "box-none",
      }}
    >
      <View
        className="flex-row items-center gap-3 rounded-xl border border-modal bg-surface px-4 py-3.5"
        style={{ boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9)" }}
      >
        <CheckIcon size={15} color={colors.accent.light} />

        <Text
          className="flex-1 text-eyebrow font-sans-extrabold uppercase text-text"
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>

        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={14}
        >
          <CloseIcon size={15} color={colors.text.secondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
