import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { getHasOnboarded } from "../lib/onboarding-storage";

// Entry gate for "/". Checks device storage for a completed profile and routes
// accordingly: finished users go to home, everyone else into onboarding. While
// the async check runs we render nothing (the root layout already holds the
// splash until fonts load, so there's no visible flash).
export default function Index() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getHasOnboarded().then(setHasOnboarded);
  }, []);

  if (hasOnboarded === null) {
    return null;
  }

  return <Redirect href={hasOnboarded ? "/home" : "/welcome"} />;
}
