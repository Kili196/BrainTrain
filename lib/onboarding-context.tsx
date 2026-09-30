import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { platformLabel } from "../constants/onboarding-platforms";
import { EMPTY_BIRTH, type BirthParts } from "./birthdate";
import { DEFAULT_SETTINGS } from "./game-settings";
import { saveOnboarding } from "./onboarding-storage";

// Carries the answers across the onboarding steps, and everything computed from
// them. In memory only during the flow; `persist()` writes the three that
// outlive it (name, birth, country) to device storage at the end. The rest —
// platforms, hours, symptoms — exist to make the flow speak to the player and
// are not kept afterwards.

export type TrialOutcome = "done";

// Everything the player told us, and nothing derived from it.
export type Answers = {
  // Where the evening goes. Ids from PLATFORMS, in the order they were picked.
  platforms: readonly string[];
  // Hours a day spent in feeds. The one number every other number grows from.
  feedHours: number | null;
  // Whether they reckon they could explain something seen yesterday. Not a
  // score and not checked — taken at face value in both directions.
  canExplain: boolean | null;
  symptoms: readonly string[];
  // 1..5 on the scale question.
  pressure: number | null;
  committed: boolean;
  // Minutes a day they want back. Capped by feedHours, never above it.
  reclaimMinutes: number | null;
  trial: TrialOutcome | null;
  // Category keys. Plain strings so one `toggle` serves every multi-select.
  goals: readonly string[];
  name: string;
  birth: BirthParts;
  // ISO 3166-1 alpha-2. Null until picked.
  countryCode: string | null;
};

// Every number the flow is allowed to show, and where each one comes from.
// A screen that needs a figure gets it from here or it does not get one — that
// is the whole mechanism behind the rule that nothing may be invented.
export type Derived = {
  // "TikTok and Reels", or "your feed" when none were named.
  platformLabel: string;
  // feedHours × 365 ÷ 24, rounded. Plain arithmetic, no source needed.
  daysPerYear: number | null;
  // What one topic actually costs: the preparation set, plus the minute spoken,
  // plus a minute for the check at the end.
  sessionMinutes: number;
  // How many whole sessions fit in the minutes set aside. At least one.
  dailyTopics: number | null;
  topicsPerYear: number | null;
  // reclaimMinutes × 365, in hours — the second counter on the last screen.
  hoursPerYear: number | null;
};

type MultiKey = "platforms" | "symptoms" | "goals";

type OnboardingContextValue = {
  answers: Answers;
  derived: Derived;
  set: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  // Adds or removes one id from a multi-select answer.
  toggle: (key: MultiKey, id: string) => void;
  persist: () => Promise<void>;
};

const EMPTY: Answers = {
  platforms: [],
  feedHours: null,
  canExplain: null,
  symptoms: [],
  pressure: null,
  committed: false,
  reclaimMinutes: null,
  trial: null,
  goals: [],
  name: "",
  birth: EMPTY_BIRTH,
  countryCode: null,
};

// What one topic costs, from the app's own defaults: the preparation time, the
// minute spoken and the minute the quiz takes. The flow used to ask for the
// preparation time; Fabian cut that question (2026-09-29), so the default
// stands in for it — the player changes it in the round settings.
const PREP_MINUTES = DEFAULT_SETTINGS.prepSeconds / 60;
const SPEAKING_MINUTES = DEFAULT_SETTINGS.speakingSeconds / 60;
const CHECKING_MINUTES = 1;

function derive(a: Answers): Derived {
  const sessionMinutes = PREP_MINUTES + SPEAKING_MINUTES + CHECKING_MINUTES;

  // At least one, because half a topic is not a thing you can be given.
  const dailyTopics =
    a.reclaimMinutes === null
      ? null
      : Math.max(1, Math.floor(a.reclaimMinutes / sessionMinutes));

  return {
    platformLabel: platformLabel(a.platforms),
    daysPerYear: a.feedHours === null ? null : Math.round((a.feedHours * 365) / 24),
    sessionMinutes,
    dailyTopics,
    topicsPerYear: dailyTopics === null ? null : dailyTopics * 365,
    hoursPerYear:
      a.reclaimMinutes === null ? null : Math.round((a.reclaimMinutes * 365) / 60),
  };
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<Answers>(EMPTY);

  const set = useCallback(<K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  }, []);

  const toggle = useCallback((key: MultiKey, id: string) => {
    setAnswers((a) => {
      const list = a[key];
      return {
        ...a,
        [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });
  }, []);

  const persist = useCallback(async () => {
    if (!answers.countryCode) return;
    await saveOnboarding({
      name: answers.name.trim(),
      birth: answers.birth,
      countryCode: answers.countryCode,
    });
  }, [answers]);

  const derived = useMemo(() => derive(answers), [answers]);

  const value = useMemo(
    () => ({ answers, derived, set, toggle, persist }),
    [answers, derived, set, toggle, persist]
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
