import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";

import { FADE_EASING } from "../../components/game/FlyAway";
import { TabBar } from "../../components/ui/TabBar";
import { useAuth } from "../../lib/auth-context";
import { getHasOnboarded } from "../../lib/onboarding-storage";
import {
  RoundStartProvider,
  useRoundStartState,
} from "../../lib/round-start-context";
import { colors } from "../../theme/colors";

// The black layer, which the mockup runs slightly faster than everything else.
const FADE_MS = 280;

export default function MainTabsLayout() {
  const { status } = useAuth();
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

  // Signing out has to take the tabs down with it, not just point a link at
  // the login screen. `settings.tsx` navigates once `signOut()` resolves, but
  // the session is gone before that and every screen still mounted re-renders
  // first — `useUserId()` throws for all of them (profile, achievements,
  // knowledge, use-streak-days). A layout renders before its children, so
  // deciding it here is what makes the tab tree disappear in the same render
  // that drops the id, instead of one render too late.
  if (status === "signed-out") {
    return <Redirect href="/login" />;
  }

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
          {/* No tab of its own — it is reached from the Home header and keeps
              Profile lit while it is open. Listed here so the navigator knows
              it belongs to this group, which is what lends it the tab bar. */}
          <Tabs.Screen name="achievements" />
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
