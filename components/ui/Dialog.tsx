import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";

// The app's one dialog (design §12): a 300px card in the middle of the screen,
// a title, a line of body copy, and a footer of exactly two text buttons split
// by a hairline cross.
//
// There is no close X anywhere in this design — the two buttons are the only
// ways out, plus the scrim and the Android back button, both of which mean
// cancel. That is deliberate: a dialog only appears when something needs an
// actual answer.
const POP_MS = 175;
const POP_EASING = Easing.bezier(0.3, 0.8, 0.3, 1);
const POP_FROM_SCALE = 0.92;

export type DialogProps = {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  // Destructive confirmations turn the confirm label red and darken the scrim.
  destructive?: boolean;
};

export function Dialog({
  visible,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = false,
}: DialogProps) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      // Reset rather than animate out: the Modal's own fade takes the card with
      // it, and a shrink underneath that reads as a stutter.
      pop.setValue(0);
      return;
    }

    const animation = Animated.timing(pop, {
      toValue: 1,
      duration: POP_MS,
      easing: POP_EASING,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [visible, pop]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Android's hardware back button. Backing out of a dialog is cancelling.
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center">
        {/* Scrim as a sibling, not a parent: a tap on the card would otherwise
            bubble up to it and dismiss what the user just reached for. */}
        <Pressable
          className="absolute inset-0"
          style={{
            backgroundColor: destructive ? "rgba(0,0,0,0.68)" : "rgba(0,0,0,0.6)",
          }}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        />

        {/* The animated node carries nothing but the animation. NativeWind does
            not wire className through Animated components, so the surface,
            hairline and radius live on a plain View inside it — putting them on
            the Animated.View drops them silently and the card renders
            transparent. */}
        <Animated.View
          style={{
            opacity: pop,
            transform: [
              {
                scale: pop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [POP_FROM_SCALE, 1],
                }),
              },
            ],
          }}
        >
          <View
            className="overflow-hidden rounded-xl border border-modal bg-surface"
            style={{
              width: 300,
              boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9)",
            }}
          >
            <Text className="px-[22px] pb-1.5 pt-5 text-center text-h3 font-sans-extrabold text-text">
              {title}
            </Text>

            <Text className="px-[22px] pb-5 text-center text-body font-sans text-text-secondary">
              {body}
            </Text>

            {/* The two buttons split the footer down the middle, divided by a
                hairline cross rather than sitting in a padded row. */}
            <View className="flex-row border-t border-divider">
              <DialogAction label={cancelLabel} onPress={onCancel} />
              <View className="w-px bg-divider" />
              <DialogAction
                label={confirmLabel}
                onPress={onConfirm}
                tone={destructive ? "danger" : "confirm"}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DialogAction({
  label,
  onPress,
  tone = "cancel",
}: {
  label: string;
  onPress: () => void;
  tone?: "cancel" | "confirm" | "danger";
}) {
  const color =
    tone === "cancel"
      ? "text-text-secondary"
      : tone === "danger"
        ? "text-danger"
        : "text-accent-light";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 items-center justify-center py-4"
    >
      <Text className={`text-h4 font-sans-bold ${color}`}>{label}</Text>
    </Pressable>
  );
}
