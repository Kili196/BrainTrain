import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Where the Supabase auth session lives on the device.
//
// CLAUDE.md's ground rule is that the session token goes in secure storage:
// SecureStore keeps it in the iOS Keychain and in Android's encrypted shared
// preferences, where AsyncStorage would leave it in plain text on disk.
//
// The catch is size. SecureStore warns above 2048 bytes per value, and a
// Supabase session — access token, refresh token and the user object — is
// comfortably past that. So a value is written as numbered chunks with a count
// beside them and read back by joining them. CHUNK_SIZE counts characters
// rather than bytes and sits well under the limit, because a non-ASCII
// character costs more than one byte and the margin is cheaper than measuring.
const CHUNK_SIZE = 1500;

// AFTER_FIRST_UNLOCK rather than the WHEN_UNLOCKED default: the token has to be
// readable while the phone is locked, which is exactly when supabase-js wakes
// up to refresh it. iOS only — Android ignores it.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// SecureStore keys allow alphanumerics, ".", "-" and "_", so a dotted suffix is
// safe for every key supabase-js hands us (`sb-<ref>-auth-token`).
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key), OPTIONS);
  const count = Number(raw);

  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function deleteChunks(key: string, from: number, to: number): Promise<void> {
  for (let index = from; index < to; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index), OPTIONS);
  }
}

async function removeItem(key: string): Promise<void> {
  const count = await readCount(key);

  await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
  await deleteChunks(key, 0, count);
}

async function getItem(key: string): Promise<string | null> {
  const count = await readCount(key);
  if (count === 0) return null;

  const parts: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, index), OPTIONS);

    // A missing chunk means a half-written value. Throwing the whole thing away
    // costs the user one anonymous sign-in; returning truncated JSON would hand
    // supabase-js a session it cannot parse, on every launch from here on.
    if (part === null) {
      await removeItem(key);
      return null;
    }

    parts.push(part);
  }

  return parts.join("");
}

async function setItem(key: string, value: string): Promise<void> {
  const previous = await readCount(key);

  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += CHUNK_SIZE) {
    chunks.push(value.slice(start, start + CHUNK_SIZE));
  }
  // An empty value still has to survive the round trip as "" rather than come
  // back as null, which is what a count of 0 means.
  if (chunks.length === 0) chunks.push("");

  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(chunkKey(key, index), chunks[index], OPTIONS);
  }

  // The count is written last: until it is, a reader sees the old value whole
  // rather than the new one half-finished.
  await SecureStore.setItemAsync(countKey(key), String(chunks.length), OPTIONS);

  // A value shorter than last time leaves chunks behind, and those would be
  // read back as the tail of a later, longer value.
  await deleteChunks(key, chunks.length, previous);
}

// `npm run web` exists as a dev convenience and SecureStore has no web
// implementation. AsyncStorage falls back to localStorage in the browser, which
// is fine for a target we never ship.
const webStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

// Named `authStorage`, not `sessionStorage`: the latter is a browser global and
// react-native-web would put the two in the same scope.
export const authStorage =
  Platform.OS === "web" ? webStorage : { getItem, setItem, removeItem };
