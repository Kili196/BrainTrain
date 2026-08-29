import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing } from "react-native";

// One group of chrome leaving the screen when a round starts, and coming back
// when it is over.
//
// The mockup does this with a permanent CSS transition and flips a class. React
// Native has no transitions, so each group runs its own pair of timings — a
// pair rather than one, because the mockup deliberately fades faster (260ms)
// than it travels (620ms). That is what makes the chrome vanish while it is
// still moving instead of visibly parking off-screen, and one driver cannot
// carry two durations.
export const CHROME_TRANSFORM_MS = 620;
export const CHROME_OPACITY_MS = 260;

// Very slow start, hard acceleration out — the chrome snaps away.
export const CHROME_EASING = Easing.bezier(0.66, 0, 0.2, 1);

// CSS `ease`, which is what the mockup uses for opacity.
export const FADE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export type FlyAwayProps = {
  away: boolean;
  // How far to travel, as a multiple of the group's own height — the mockup's
  // translateY percentages. Negative leaves upwards.
  distance: number;
  // The delays differ by direction on purpose. Leaving, it runs top to bottom;
  // returning, bottom to top. That is the whole trick: the way back is never
  // the way out played backwards.
  delayAway: number;
  delayBack: number;
  children: ReactNode;
};

export function FlyAway({
  away,
  distance,
  delayAway,
  delayBack,
  children,
}: FlyAwayProps) {
  // React Native cannot translate by a percentage, so the group measures
  // itself. Layout is unaffected by the transform, so this is read once and
  // stays right.
  const [height, setHeight] = useState(0);

  const travel = useRef(new Animated.Value(0)).current;
  const visible = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = away ? delayAway : delayBack;

    const animation = Animated.parallel([
      Animated.timing(travel, {
        toValue: away ? 1 : 0,
        duration: CHROME_TRANSFORM_MS,
        delay,
        easing: CHROME_EASING,
        // The mockup asks for `will-change: transform` here. On React Native
        // the equivalent is the native driver: transform and opacity are handed
        // to the UI thread, so the slide keeps its timing even while JS is busy
        // spinning the reel — which is exactly when this runs.
        useNativeDriver: true,
      }),
      Animated.timing(visible, {
        toValue: away ? 0 : 1,
        duration: CHROME_OPACITY_MS,
        delay,
        easing: FADE_EASING,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [away, delayAway, delayBack, travel, visible]);

  return (
    <Animated.View
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={{
        // Opacity 0 does not stop a view from taking touches, and a transform
        // does not move its hit area out of the way either — without this the
        // buttons that just flew off screen still swallow taps aimed at
        // whatever replaced them. In the style rather than as a prop, because
        // react-native-web ignores the prop.
        pointerEvents: away ? "none" : "auto",
        opacity: visible,
        transform: [
          {
            translateY: travel.interpolate({
              inputRange: [0, 1],
              outputRange: [0, height * distance],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
