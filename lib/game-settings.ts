import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CategoryKey } from "../constants/categories";
import { categories } from "../constants/categories";

// What the player configures before a round: where the topic comes from, how
// long they prepare, how long they speak. Persisted locally in the same place
// and style as the onboarding profile — once auth exists this is a candidate to
// move to `profiles`, so the settings follow the account instead of the device.
const SETTINGS_KEY = "braintrain.gameSettings.v1";

export type TopicMode = "random" | "category";

export type GameSettings = {
  topicMode: TopicMode;
  // Only meaningful while topicMode is "category". Kept when switching back to
  // random so the previous pick is still there on the way forward.
  categoryKey: CategoryKey | null;
  prepSeconds: number;
  speakingSeconds: number;
};

// Both durations are stored in SECONDS, not minutes: speaking time steps in
// half minutes, and the UI renders m:ss. Minutes would force a fraction the
// moment the stepper moves.
export const PREP_TIME = {
  min: 0,
  max: 30 * 60,
  step: 60,
} as const;

export const SPEAKING_TIME = {
  min: 30,
  max: 10 * 60,
  step: 30,
} as const;

export const DEFAULT_SETTINGS: GameSettings = {
  topicMode: "random",
  categoryKey: null,
  prepSeconds: 15 * 60,
  speakingSeconds: 2 * 60,
};

// One stepper press. Clamping here rather than in the screen means the buttons
// can be pressed freely and the value simply stops at the end of its range.
export function stepDuration(
  seconds: number,
  bounds: { min: number; max: number; step: number },
  direction: 1 | -1
): number {
  const next = seconds + direction * bounds.step;
  return Math.min(bounds.max, Math.max(bounds.min, next));
}

// m:ss — 15 minutes reads as "15:00", ninety seconds as "1:30". Minutes are not
// zero-padded (the design shows "2:00", not "02:00"), seconds always are.
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export async function saveGameSettings(settings: GameSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadGameSettings(): Promise<GameSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    return sanitize(JSON.parse(raw));
  } catch {
    // Corrupt value — start from the defaults rather than crash on launch.
    return DEFAULT_SETTINGS;
  }
}

const CATEGORY_KEYS = new Set<string>(categories.map((entry) => entry.key));

// Anything read back from storage was written by an older build and is not to be
// trusted: bounds may have changed, a category may have been retired, the shape
// may predate a field. Every value is checked against what this build accepts,
// and whatever fails falls back to its default — so a stale value can never put
// the UI into a state its own controls cannot leave.
function sanitize(value: unknown): GameSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;

  const stored = value as Partial<GameSettings>;

  const categoryKey =
    typeof stored.categoryKey === "string" && CATEGORY_KEYS.has(stored.categoryKey)
      ? (stored.categoryKey as CategoryKey)
      : null;

  return {
    // A "category" mode without a valid category would draw from nothing, so it
    // degrades to random rather than showing an empty round.
    topicMode:
      stored.topicMode === "category" && categoryKey !== null
        ? "category"
        : "random",
    categoryKey,
    prepSeconds: clampToStep(stored.prepSeconds, PREP_TIME, DEFAULT_SETTINGS.prepSeconds),
    speakingSeconds: clampToStep(
      stored.speakingSeconds,
      SPEAKING_TIME,
      DEFAULT_SETTINGS.speakingSeconds
    ),
  };
}

function clampToStep(
  value: unknown,
  bounds: { min: number; max: number; step: number },
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  // Snap to the grid the stepper works on. A value of 137s from an older build
  // would otherwise stay off-grid forever, since every press adds a full step.
  const snapped = Math.round(value / bounds.step) * bounds.step;
  return Math.min(bounds.max, Math.max(bounds.min, snapped));
}
