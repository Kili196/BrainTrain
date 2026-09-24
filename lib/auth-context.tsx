import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { isAuthApiError } from "@supabase/supabase-js";

import { StartupError } from "../components/ui/StartupError";
import {
  signInWithAppleIdToken,
  signInWithGoogleIdToken,
  type SignInResult,
} from "./auth-providers";
import { clearOnboarding } from "./onboarding-storage";
import { supabase } from "./supabase";

// The account, established once at startup and held for the whole app.
//
// A session is either resumed from SecureStore or built by signing in — with
// Google, with Apple, or as a guest (an anonymous Supabase user: a real row in
// auth.users and a JWT, without asking for an email). Whichever it is, that is
// what makes `auth.uid()` non-null, which is what row level security is built
// on — without it a round has no owner and cannot be saved at all.
//
// The provider gates the app. Until the startup check has answered we render
// nothing; a signed-out result renders the app anyway, so `app/index.tsx` can
// redirect to `/login`; a session (of any of the three kinds above) renders
// the app for real; and a startup failure renders a retry screen instead of
// any of that. The one thing we never do is let a screen mount without the
// question answered at all — that is the silent-non-saving bug this file
// used to be about, and signed-out has to be a real, visible state rather
// than something a screen has to remember to check for itself.
export type AuthStatus = "loading" | "signed-out" | "ready" | "error";

// Two very different failures wear the same "it didn't work" on screen unless
// they are told apart. `isAuthApiError` is true only when Supabase answered with
// a status — a disabled anonymous provider, a rate limit — as opposed to the
// request never getting there. Anything else is treated as offline, which is
// what a fetch failure and a timeout both look like.
type Failure = { kind: "offline" | "rejected"; detail: string };

function describe(error: unknown): Failure {
  const detail =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  return { kind: isAuthApiError(error) ? "rejected" : "offline", detail };
}

// Email sign-up has an outcome the OAuth flows and guest don't: the account can
// be created but not yet usable, because the project requires email
// confirmation. That is a success, not an error — the screen just says "check
// your inbox" instead of navigating — so it gets its own outcome rather than
// being folded into SignInResult.
export type EmailSignUpResult =
  | { outcome: "signed-in" }
  | { outcome: "confirm-email" }
  | { outcome: "exists" }
  | { outcome: "invalid-email" }
  | { outcome: "rate-limited" }
  | { outcome: "error"; detail: string };

// Email sign-in likewise has two failures the player can act on, and neither
// is "try again": the password is wrong (or no such account exists — Supabase
// answers both with the same `invalid_credentials`, on purpose, so nobody can
// probe which addresses are registered), or the account exists but its
// confirmation link hasn't been clicked yet. Everything else — offline, rate
// limit — stays a plain `error`.
export type EmailSignInResult =
  | { outcome: "success" }
  | { outcome: "wrong-credentials" }
  | { outcome: "unconfirmed" }
  | { outcome: "error"; detail: string };

export type AuthApi = {
  status: AuthStatus;
  // Null only while loading, signed out, or after a failure; inside the app
  // it is always set.
  userId: string | null;
  // The ways a session comes to exist. None of these touch `userId` or
  // `status` themselves — the `onAuthStateChange` listener below does, for
  // all of them the same way, since Supabase raises SIGNED_IN for each.
  signInWithGoogle: () => Promise<SignInResult>;
  signInWithApple: () => Promise<SignInResult>;
  continueAsGuest: () => Promise<SignInResult>;
  // Email/password. Sign-in mirrors the OAuth calls (success | error — there is
  // no "cancelled" without a native sheet). Sign-up carries the extra
  // confirm-email outcome above.
  signInWithEmail: (email: string, password: string) => Promise<EmailSignInResult>;
  signUpWithEmail: (email: string, password: string) => Promise<EmailSignUpResult>;
  // Ends the session and clears the device-local onboarding flag, so the next
  // guest re-onboards instead of the app assuming the last player's profile.
  signOut: () => Promise<void>;
};

const Context = createContext<AuthApi | null>(null);

// The id of the session already sitting in SecureStore, or null if there is
// none to resume. Never creates one — that used to be this function's job,
// but signing in anonymously by default is exactly the assumption a login
// screen exists to remove. Reading it is enough to answer "loading" vs.
// "signed-out" vs. "ready" at startup; the how of getting signed in — guest,
// Google, Apple — is now a screen's job (`app/(auth)/login.tsx`), not this
// effect's.
async function establishSession(): Promise<string | null> {
  // Reads the session out of SecureStore. Offline is fine here — that is the
  // whole point of persisting it — so a returning user never waits on a request.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

// The "Continue as guest" choice on the login screen. Word for word what
// `establishSession` used to do automatically for every player: a real
// anonymous Supabase user (a JWT, no email, still what makes `auth.uid()`
// non-null for RLS) rather than an actual guest mode with no account at all.
//
// Deliberately NOT linked to a Google/Apple identity later: signing in with
// Google after this creates a second, separate account, and this guest
// account's rounds do not follow. The fix is `supabase.auth.linkIdentity` —
// upgrading the anonymous session in place instead of replacing it — but that
// is a deliberate choice for later, not an oversight here.
async function continueAsGuest(): Promise<SignInResult> {
  const created = await supabase.auth.signInAnonymously();
  if (created.error) {
    return { outcome: "error", detail: describe(created.error).detail };
  }
  if (!created.data.session) {
    // Shouldn't happen: anonymous sign-in has no confirmation step, so a
    // success without a session would mean the provider is switched off.
    return {
      outcome: "error",
      detail: "Anonymous sign-in returned no session.",
    };
  }

  return { outcome: "success" };
}

// Email/password sign-in. No native SDK and no ID token round trip — just
// Supabase — so this lives here beside `continueAsGuest` rather than in
// auth-providers.ts (which exists specifically to isolate the native modules).
// Trimming is the caller's job. The error is read by its `code`, not its
// message: the code is the stable part of the API, the wording is not.
async function signInWithEmail(
  email: string,
  password: string
): Promise<EmailSignInResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return { outcome: "success" };
  if (error.code === "invalid_credentials") return { outcome: "wrong-credentials" };
  if (error.code === "email_not_confirmed") return { outcome: "unconfirmed" };
  return { outcome: "error", detail: describe(error).detail };
}

// Email/password sign-up. Whether the new account is immediately usable is a
// project setting, not something this call chooses: with "Confirm email" off,
// signUp returns a session (onAuthStateChange has already flipped us to ready);
// with it on, there is a user but no session — the account exists but can't act
// until the emailed link is clicked. Presence of a session is exactly that
// distinction, so we branch on it rather than guessing from config.
async function signUpWithEmail(
  email: string,
  password: string
): Promise<EmailSignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  // Supabase refuses a malformed address with `validation_failed` and a
  // well-formed but blocked one (test@…, example.com) with
  // `email_address_invalid` — to the player both mean "fix the address".
  if (error?.code === "validation_failed" || error?.code === "email_address_invalid") {
    return { outcome: "invalid-email" };
  }
  // The built-in mailer sends only a handful of mails an hour for the whole
  // project, so this is a wait, not a failure.
  if (error?.code === "over_email_send_rate_limit") {
    return { outcome: "rate-limited" };
  }
  if (error) return { outcome: "error", detail: describe(error).detail };
  // An address that is already registered and confirmed is not an error here:
  // with "Confirm email" on, Supabase answers with a look-alike success, so the
  // response can't be used to probe which addresses exist — and sends no mail.
  // The one tell is a user with no identities. We read it anyway, because
  // "check your inbox" for a mail that never comes is worse than the leak.
  // (An unconfirmed address still gets its identity and a fresh link.)
  if (data.user && data.user.identities?.length === 0) {
    return { outcome: "exists" };
  }
  return data.session
    ? { outcome: "signed-in" }
    : { outcome: "confirm-email" };
}

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // The flag `app/index.tsx` reads to skip onboarding is device-local and
  // profile-shaped — it must not outlive the account it was written for, or
  // the next guest on this phone would sail past onboarding with no profile
  // of their own underneath it.
  await clearOnboarding();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);

  // Bumped to re-run the effect below. A counter rather than a bare function
  // call, so a retry cancels the attempt still in flight instead of racing it.
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Once an attempt has failed the retry screen stays up through the next one,
  // with its button busy. Dropping back to a black screen and returning half a
  // second later reads as a glitch, and offline the next attempt fails at once.
  const [failedOnce, setFailedOnce] = useState(false);

  // What went wrong last time, so the screen can say which of the two it was.
  const [failure, setFailure] = useState<Failure | null>(null);

  // Until the first attempt has answered, it owns `userId` — see the listener.
  const settled = useRef(false);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");

    establishSession()
      .then((id) => {
        if (cancelled) return;
        settled.current = true;
        setUserId(id);
        setStatus(id ? "ready" : "signed-out");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Nearly always "Network request failed" on a first launch without
        // internet. Logged rather than shown: the screen says what to do, and
        // the message itself would mean nothing to the user.
        console.warn("[auth] could not establish a session:", error);
        settled.current = true;
        setFailure(describe(error));
        setFailedOnce(true);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // The listener fires INITIAL_SESSION on subscribe, and that can land
      // either side of the check above. Ignoring it until the first attempt
      // has answered keeps a null initial session from wiping a fresh id.
      if (!settled.current) return;

      // The one place `status` reacts to a session appearing or disappearing
      // after startup — so signing in with Google, with Apple, as a guest, or
      // signing out all flow through here the same way, instead of each of
      // those four call sites setting state for itself. That is also why
      // `signInWithGoogle` etc. never touch `userId` directly: Supabase
      // raises SIGNED_IN/SIGNED_OUT for every one of them, and this already
      // catches it.
      if (session) {
        setUserId(session.user.id);
        setStatus("ready");
      } else {
        setUserId(null);
        setStatus("signed-out");
      }
    });

    // Never call other supabase methods inside that callback — supabase-js
    // holds a lock while it runs and would deadlock. Setting state is safe.
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // supabase-js refreshes the access token on a timer, but on React Native it
    // has no idea the app was backgrounded — it only knows about browser tab
    // visibility. Without this the timer keeps firing requests in the
    // background, and worse, a token that expired while the app slept is not
    // refreshed on the way back in.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      status,
      userId,
      // Stable module-level functions — none of them close over component
      // state, so there is nothing for this memo to actually recompute when
      // they're "added" on every render.
      signInWithGoogle: signInWithGoogleIdToken,
      signInWithApple: signInWithAppleIdToken,
      continueAsGuest,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [status, userId]
  );

  if (status === "error" || (status === "loading" && failedOnce)) {
    return (
      <StartupError
        onRetry={retry}
        busy={status === "loading"}
        kind={failure?.kind ?? "offline"}
        detail={failure?.detail ?? null}
      />
    );
  }

  if (status === "loading") {
    // The root layout already holds the screen black while fonts load, so this
    // reads as part of the same startup rather than as a flash.
    return null;
  }

  return <Context.Provider value={api}>{children}</Context.Provider>;
}

export function useAuth(): AuthApi {
  const value = useContext(Context);

  if (!value) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return value;
}

// For the common case: inside the app the account always exists, and callers
// that need it for an insert shouldn't have to narrow away a null.
export function useUserId(): string {
  const { userId } = useAuth();

  if (!userId) {
    throw new Error("useUserId was called without a session");
  }

  return userId;
}
