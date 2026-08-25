import { useEffect, useState } from "react";
import { getHasOnboarded } from "../../lib/onboarding-storage";
import { Redirect, Tabs } from "expo-router";

export default function MainTabsLayout() {
  const [isOnboared, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getHasOnboarded().then(setOnboarding);
  }, []);

  if (isOnboared === null) {
    return null;
  }

  if (!isOnboared) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }} initialRouteName="home">
      <Tabs.Screen name="home" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
