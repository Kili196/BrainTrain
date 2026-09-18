import AsyncStorage from "@react-native-async-storage/async-storage";

// Local copy of the onboarding profile. Supabase holds the real one (see
// `lib/profile.ts`); this exists because `app/index.tsx` has to decide where to
// route on a cold start, and the presence of a saved profile IS the completed
// flag — one value, so the profile and the flag can never drift apart.
//
// Written only after the Supabase write has succeeded, so "onboarded on this
// phone" can never be true for a player who has no profile anywhere else.
const PROFILE_KEY = "braintrain.profile.v1";

export type OnboardingData = {
  name: string;
  birth: { day: string; month: string; year: string };
  countryCode: string;
};

export async function saveOnboarding(data: OnboardingData): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

export async function loadOnboarding(): Promise<OnboardingData | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingData;
  } catch {
    // Corrupt value — treat as not onboarded rather than crashing on launch.
    return null;
  }
}

export async function getHasOnboarded(): Promise<boolean> {
  return (await loadOnboarding()) !== null;
}

// Keeps the local copy in step with an edit made after onboarding (see
// `app/edit-profile.tsx`). A no-op when nothing is stored: this copy is written
// only once onboarding has finished, so its absence means there is no onboarded
// player on this device and therefore nothing to patch — writing one here would
// invent a completed flag out of a single edited field.
export async function patchOnboarding(
  patch: Partial<OnboardingData>
): Promise<void> {
  const current = await loadOnboarding();
  if (!current) return;

  await saveOnboarding({ ...current, ...patch });
}

// Clears the profile, so the flow shows again on the next launch. Handy while
// developing, and the real thing that makes account deletion complete: because
// this copy IS the completed flag, removing it is what turns the player back
// into someone the app has never seen (see `deleteAccount` in `auth-context`).
export async function clearOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
