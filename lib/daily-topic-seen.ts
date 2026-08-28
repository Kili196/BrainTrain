import AsyncStorage from "@react-native-async-storage/async-storage";

// Whether this device has already opened today's daily topic. Drives the red
// dot in the play menu — a "there is something new" marker, nothing more.
//
// Deliberately local: it is a per-device nudge, not a record of what was
// played. Real history belongs in speech_sessions once accounts exist.
const SEEN_KEY = "braintrain.dailyTopicSeen.v1";

// The UTC calendar day, matching what daily_topic() uses on the server. Reading
// the local date here would make the dot reappear or vanish at the wrong hour
// for anyone not on UTC.
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function hasSeenDailyTopic(): Promise<boolean> {
  return (await AsyncStorage.getItem(SEEN_KEY)) === utcToday();
}

// Storing the day rather than a flag means yesterday's value expires on its
// own — there is nothing to reset at midnight.
export async function markDailyTopicSeen(): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, utcToday());
}
