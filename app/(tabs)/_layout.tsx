import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";

import { FADE_EASING } from "../../components/game/FlyAway";
import { TabBar } from "../../components/ui/TabBar";
import { getHasOnboarded } from "../../lib/onboarding-storage";
import {
  RoundStartProvider,
  useRoundStartState,
} from "../../lib/round-start-context";
import { colors } from "../../theme/colors";

// The black layer, which the mockup runs slightly faster than everything else.
const FADE_MS = 280;

export default function MainTabsLayout() {
  const [isOnboared, setOnboarding] = useState<boolean | null>(null);

  // Held here rather than in Home, because both things it drives — the tab bar
  // and the black layer — are outside Home.
  const round = useRoundStartState();

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getHasOnboarded().then(setOnboarding);
  }, []);

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
          // Our own bar (design §12) replaces React Navigation's entirely. It
          // also carries its own fly-away: it measures its height through
          // onLayout, so it travels just past the bottom edge instead of by the
          // 49px the navigator's bar used to be guessed at.
          tabBar={() => <TabBar />}
          screenOptions={{ headerShown: false }}
          initialRouteName="home"
        >
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="ranking" />
          <Tabs.Screen name="home" />
          <Tabs.Screen name="knowledge" />
          <Tabs.Screen name="settings" />
        </Tabs>

        {/* Above the tab bar, which is the reason it lives here. Blocks taps
            while it is up, so nothing can be pressed mid-navigation. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              // In the style, not as a prop — react-native-web ignores the
              // prop, and this layer covers the whole screen.
              pointerEvents: round.fading ? "auto" : "none",
              backgroundColor: colors.bg,
              opacity: fade,
            },
          ]}
        />
      </View>
    </RoundStartProvider>
  );
}
