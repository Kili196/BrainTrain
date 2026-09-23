import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import { supabase } from "./supabase";

// Native sign-in for Google and Apple. Kept out of the auth context and the
// login screen on purpose — both of those only need to know whether it
// worked, not which native SDK made that happen (auth-context.tsx's rule
// against calling other supabase methods from inside onAuthStateChange also
// doesn't apply here: these run before a session exists, never inside that
// listener).

// True inside Expo Go, where neither native module is linked — only a custom
// dev build has them (see README). `appOwnership` is deprecated in favour of
// `executionEnvironment`, but the replacement collapses Expo Go and a dev
// client into the same "storeClient" value, which is exactly the distinction
// we need: a dev build DOES have the module, Expo Go never does.
const isExpoGo = Constants.appOwnership === "expo";

type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin");

// Loaded with `require`, not a static `import` — a static import is hoisted
// and evaluated unconditionally at module load, and the Google module throws
// the instant it's required when its native side isn't linked (it reaches for
// the native module at the top of its own file, not lazily inside a
// function). A static import would take the login screen down with it the
// moment it mounted inside Expo Go.
let googleSignin: GoogleSigninModule | null = null;

if (!isExpoGo) {
  try {
    googleSignin = require("@react-native-google-signin/google-signin");
  } catch {
    googleSignin = null;
  }
}

if (googleSignin) {
  // Configured once at module load, not before each sign-in: GoogleSignin has
  // no per-call configuration, so calling it again would just repeat the same
  // values. This is the WEB client ID from Google Cloud Console, not the iOS
  // one — Supabase's Google provider checks the ID token's audience against
  // it, so it has to be a client Supabase was told to trust (.env.example).
  googleSignin.GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

// Read by login.tsx to hide/disable the Google button and explain why,
// instead of letting a tap on it fail with a cryptic native error.
export const isGoogleSignInAvailable = googleSignin !== null;

// What every sign-in call below resolves to. "cancelled" is deliberately not
// "error" — closing the native sheet is the single most common outcome, and
// login.tsx stays silent on it, only toasting for a real failure.
export type SignInResult =
  | { outcome: "success" }
  | { outcome: "cancelled" }
  | { outcome: "error"; detail: string };

function errorResult(error: unknown): SignInResult {
  const detail = error instanceof Error ? error.message : String(error);
  return { outcome: "error", detail };
}

// Narrows an unknown rejection to one carrying a string `.code`, the shape
// Apple's SDK rejects with. Written as a type guard instead of an `as` cast —
// after `"code" in error`, TypeScript already knows `error` has a `code`
// property, so the `typeof` check below narrows it the rest of the way.
function hasStringCode(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

export async function signInWithGoogleIdToken(): Promise<SignInResult> {
  if (!googleSignin) {
    // login.tsx is expected to hide the button in this case (see
    // `isGoogleSignInAvailable`); this only guards a caller that didn't.
    return {
      outcome: "error",
      detail: "Google sign-in needs a custom dev build — it isn't available in Expo Go.",
    };
  }

  const { GoogleSignin, isCancelledResponse, isSuccessResponse } = googleSignin;

  try {
    // Play Services is what actually renders the native sheet on Android.
    // Asking first turns a missing/outdated install into one clear prompt
    // instead of the sign-in call failing deeper down with a native message.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return { outcome: "cancelled" };
    }
    if (!isSuccessResponse(response)) {
      // The classic sign-in flow only ever resolves "success" or "cancelled"
      // — this branch exists so the check above is total, not because it can
      // be reached.
      return {
        outcome: "error",
        detail: "Unexpected response from Google sign-in.",
      };
    }

    const { idToken } = response.data;
    if (!idToken) {
      // Google only issues an ID token when it recognises the audience it's
      // signing in for — a missing token almost always means webClientId is
      // unset or doesn't match a client Supabase trusts.
      return {
        outcome: "error",
        detail:
          "Google did not return an ID token — check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
      };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) return errorResult(error);

    return { outcome: "success" };
  } catch (error: unknown) {
    return errorResult(error);
  }
}

// Not gated on Expo Go the way Google is above: `expo-apple-authentication`
// falls back to a stub (`isAvailableAsync` resolving `false`) instead of
// throwing when its native side is missing, so a static import is safe here.
// Reaching this function at all already requires `FEATURES.appleSignIn` and
// `Platform.OS === "ios"` — see login.tsx — so the stub is only ever a
// concern if that flag is turned on before a dev build exists to back it.
export async function signInWithAppleIdToken(): Promise<SignInResult> {
  try {
    // A random value we keep, plus its SHA-256 hash sent to Apple as `nonce`.
    // Apple embeds the hash it was given inside the identity token; Supabase
    // hashes the raw value we send it and compares the two. That round trip
    // is what stops a captured identity token from being replayed by someone
    // who was never part of this sign-in.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const { identityToken } = credential;
    if (!identityToken) {
      return {
        outcome: "error",
        detail: "Apple did not return an identity token.",
      };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
      nonce: rawNonce,
    });
    if (error) return errorResult(error);

    return { outcome: "success" };
  } catch (error: unknown) {
    // Cancelling the Apple sheet rejects the promise (unlike the Google SDK's
    // response object above) with this code rather than throwing a distinct
    // error type.
    if (hasStringCode(error) && error.code === "ERR_REQUEST_CANCELED") {
      return { outcome: "cancelled" };
    }
    return errorResult(error);
  }
}
