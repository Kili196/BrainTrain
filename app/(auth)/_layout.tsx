import { Stack } from "expo-router";

// Layout for the auth route group — currently just `/login`, but grouped the
// same way `(onboarding)` is in case a second auth-only screen shows up later
// (e.g. a dedicated "link this guest account" step). The parentheses in the
// folder name make this a group: it shares this layout without adding "auth"
// to the URL.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
