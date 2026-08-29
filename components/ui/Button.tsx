import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import { colors } from "../../theme/colors";

// The app's one primary button (design §4): flat accent fill with a hard offset
// shadow and NO blur. It physically depresses on press — shifting down and
// shrinking its shadow. That press-down is the single piece of skeuomorphism in
// the UI, so it must never be swapped for a soft/blurred shadow.
//
// The shadow is drawn by a sibling <View> behind the button rather than a real
// box-shadow: React Native clips box-shadow to the (rounded) content box, so an
// offset hard shadow needs its own layer we can slide independently.
//
// Two variants:
//   primary — every screen's main action.
//   hero    — PLAY on Home and START on Play, and nowhere else. One step
//             brighter and taller so it reads as the loudest thing in the app.
export type ButtonVariant = "primary" | "hero";

export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  accessibilityLabel?: string;
};

// Resting and pressed shadow depth per variant. The hero sits 1px deeper and
// travels 5px instead of 4, which is what makes it feel heavier under the thumb.
//
// The hero is the one button whose proportions are the point, so it carries its
// own width and takes its height from a ratio rather than from padding. Both
// measured off the Home mockup: 237px wide inside 347px of content, and 65px
// tall. It is NOT full width — it sits inset from the screen padding again, and
// filling the row makes it far too heavy.
//
// A share of the row rather than a fixed 237px, so it keeps the same shape on a
// wider phone instead of shrinking into the middle of it.
const HERO_WIDTH = "68%";
const HERO_ASPECT_RATIO = 3.6;

const VARIANTS = {
  primary: {
    fill: "bg-accent",
    text: "text-button",
    padding: "px-7 py-4",
    width: "100%",
    aspectRatio: null,
    restShadow: 6,
    pressShadow: 2,
    travel: 4,
  },
  hero: {
    fill: "bg-accent-raised",
    text: "text-button-lg",
    padding: "px-7",
    width: HERO_WIDTH,
    aspectRatio: HERO_ASPECT_RATIO,
    restShadow: 7,
    pressShadow: 2,
    travel: 5,
  },
} as const;

// The shimmer sweep that only the hero button wears (design §4): a skewed white
// band crossing the face every 3.4s. One of exactly three looping animations in
// the app, and the reason PLAY reads as alive rather than as a blue rectangle.
//
// It needs the measured button width, because React Native cannot translate by a
// percentage — so the parent measures itself once and passes it in. Width 0 means
// "not measured yet", and we render nothing rather than a band parked at the left
// edge.
function Shimmer({ width }: { width: number }) {
  // useRef, not useState: the Animated.Value must survive re-renders untouched.
  // Recreating it on every render would restart the sweep from the left each time.
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (width === 0) return;

    const sweep = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 3400,
        easing: Easing.inOut(Easing.ease),
        // Runs on the UI thread, so the sweep keeps moving even while JS is busy
        // — e.g. while the topic request is in flight. Only transform and opacity
        // are allowed under the native driver, which is all this uses.
        useNativeDriver: true,
      })
    );

    sweep.start();

    // Without this, the loop keeps running after the button unmounts and holds a
    // reference to it.
    return () => sweep.stop();
  }, [progress, width]);

  if (width === 0) return null;

  const band = width * 0.26;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        // Decorative only — never announce it, never let it swallow a tap. In
        // the style, not as a prop: react-native-web ignores the prop, and this
        // band sits directly over the button's own label.
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        bottom: 0,
        width: band,
        backgroundColor: colors.shimmer,
        transform: [
          {
            // Starts fully off the left edge and ends fully off the right, so the
            // band is never parked visibly at either end between sweeps.
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-band * 2, width + band * 2],
            }),
          },
          { skewX: "-18deg" },
        ],
      }}
    />
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  accessibilityLabel,
}: ButtonProps) {
  const style = VARIANTS[variant];

  // Measured once by onLayout below and only needed by the shimmer, which the
  // hero variant alone renders.
  const [width, setWidth] = useState(0);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={{
        // Centred rather than stretched: the hero is narrower than the row it
        // sits in, and the primary fills it.
        width: style.width,
        alignSelf: "center",
        ...(disabled ? { opacity: 0.35 } : null),
      }}
    >
      {({ pressed }) => {
        // Only move when the press can actually do something — a disabled
        // button that still depresses reads as broken rather than as blocked.
        const isDown = pressed && !disabled;
        const offset = isDown ? style.pressShadow : style.restShadow;

        return (
          <View className="relative w-full">
            {/* hard offset shadow layer */}
            <View
              className="absolute inset-x-0 rounded-lg bg-accent-shadow"
              style={{ top: offset, bottom: -offset }}
            />
            <View
              // overflow-hidden clips the shimmer band to the rounded face —
              // without it the band sweeps out across the whole screen.
              className={`w-full items-center justify-center overflow-hidden rounded-lg ${style.fill} ${style.padding}`}
              style={{
                aspectRatio: style.aspectRatio ?? undefined,
                transform: [{ translateY: isDown ? style.travel : 0 }],
              }}
              onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            >
              <Text
                className={`${style.text} font-sans-extrabold uppercase text-text`}
              >
                {label}
              </Text>
              {/* after the label, so the band passes over the text, not under it */}
              {variant === "hero" ? <Shimmer width={width} /> : null}
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}
