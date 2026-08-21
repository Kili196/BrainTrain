import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { saveOnboarding, type OnboardingData } from "./onboarding-storage";

// Carries the answers across the onboarding steps so the Ready screen can show a
// summary and persist everything in one go. In-memory only during the flow;
// `persist()` writes it to device storage at the end.
type Birth = OnboardingData["birth"];

type OnboardingContextValue = {
  name: string;
  setName: (name: string) => void;
  birth: Birth;
  setBirth: (birth: Birth) => void;
  countryCode: string | null;
  setCountryCode: (code: string) => void;
  persist: () => Promise<void>;
};

const emptyBirth: Birth = { day: "", month: "", year: "" };

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  const [birth, setBirth] = useState<Birth>(emptyBirth);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const persist = useCallback(async () => {
    if (!countryCode) return;
    await saveOnboarding({ name: name.trim(), birth, countryCode });
  }, [name, birth, countryCode]);

  const value = useMemo(
    () => ({ name, setName, birth, setBirth, countryCode, setCountryCode, persist }),
    [name, birth, countryCode, persist]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
