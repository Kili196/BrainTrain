import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, Tabs } from "expo-router";

import {
  CHROME_EASING,
  CHROME_TRANSFORM_MS,
  FADE_EASING,
} from "../../components/game/FlyAway";
import { getHasOnboarded } from "../../lib/onboarding-storage";
import {
  RoundStartProvider,
  useRoundStartState,
} from "../../lib/round-start-context";
import { colors } from "../../theme/colors";

// React Navigation's own compact bottom bar, plus whatever the device reserves
// below it. Read from its source rather than measured, because the bar is drawn
// by the navigator and never hands us an onLayout.
const TAB_BAR_HEIGHT = 49;

// The tab bar leaves last on the way out and comes back first on the way in.
const NAV_DELAY_AWAY = 120;
const NAV_DELAY_BACK = 0;
const NAV_DISTANCE = 1.25;

// The black layer, which the mockup runs slightly faster than everything else.
const FADE_MS = 280;

export default function MainTabsLayout() {
  const [isOnboared, setOnboarding] = useState<boolean | null>(null);
  const insets = useSafeAreaInsets();

  // Held here rather than in Home, because both things it drives — the tab bar
  // and the black layer — are outside Home.
  const round = useRoundStartState();

  const navTravel = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  useEffect(() => {
    getHasOnboarded().then(setOnboarding);
  }, []);

  useEffect(() => {
    const animation = Animated.timing(navTravel, {
      // The mockup travels 105% of its own height, just far enough to clear the
      // screen. Overshooting means it covers more ground in the same 620ms, and
      // that speed is the point — the bar should look thrown out, not walked.
      toValue: round.starting ? barHeight * NAV_DISTANCE : 0,
      duration: CHROME_TRANSFORM_MS,
      delay: round.starting ? NAV_DELAY_AWAY : NAV_DELAY_BACK,
      easing: CHROME_EASING,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [round.starting, barHeight, navTravel]);

  useEffect(() => {
    const animation = Animated.timing(fade, {
      toValue: round.fading ? 1 : 0,
      duration: FADE_MS,
      easing: FADE_EASING,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [round.fading, fade]);

  if (isOnboared === null) {
    return null;
  }

  if (!isOnboared) {
    return <Redirect href="/welcome" />;
  }

  return (
    <RoundStartProvider value={round}>
      <View className="flex-1">
        <Tabs
          screenOptions={{
            headerShown: false,
            // The bar's container is an Animated.View and `tabBarStyle` is the
            // last entry in its style array, so this transform replaces the
            // navigator's own. That one only exists to hide the bar behind the
            // keyboard, which is off, so nothing is lost.
            tabBarStyle: {
              transform: [{ translateY: navTravel }],
            },
          }}
          initialRouteName="home"
        >
          <Tabs.Screen name="home" />
          <Tabs.Screen name="profile" />
        </Tabs>

        {/* Above the tab bar, which is the reason it lives here. Blocks taps
            while it is up, so nothing can be pressed mid-navigation. */}
        <Animated.View
          pointerEvents={round.fading ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.bg, opacity: fade },
          ]}
        />
      </View>
    </RoundStartProvider>
  );
}
