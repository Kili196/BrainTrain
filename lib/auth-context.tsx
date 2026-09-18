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
import { clearOnboarding } from "./onboarding-storage";
import { supabase } from "./supabase";

// The account, established once at startup and held for the whole app.
//
// Every user is signed in anonymously: Supabase creates a real row in
// auth.users and hands back a JWT, without asking for an email. That is what
// makes `auth.uid()` non-null, which is what row level security is built on —
// without it a round has no owner and cannot be saved at all.
//
// The provider gates the app. Until there is a session we render nothing, and
// if one cannot be established we render a retry screen instead of the app.
// The alternative — letting the app run without an account — is exactly the bug
// we are removing: everything looks fine and nothing is ever stored.
export type AuthStatus = "loading" | "ready" | "error";

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

export type AuthApi = {
  status: AuthStatus;
  // Null only while loading or after a failure; inside the app it is always set.
  userId: string | null;
  // Deletes the account in the database and leaves the app with a brand-new
  // anonymous one. Throws only when the deletion itself failed, in which case
  // nothing has changed and the caller can offer it again — see the comment on
  // the implementation for why the two halves are reported differently.
  deleteAccount: () => Promise<void>;
};

const Context = createContext<AuthApi | null>(null);

// Returns the id of the signed-in user, creating the anonymous account on the
// first launch. A stored session is reused, so this normally touches the
// network exactly once in the app's lifetime.
async function establishSession(): Promise<string> {
  // Reads the session out of SecureStore. Offline is fine here — that is the
  // whole point of persisting it — so a returning user never waits on a request.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session.user.id;

  const created = await supabase.auth.signInAnonymously();
  if (created.error) throw created.error;
  if (!created.data.session) {
    // Shouldn't happen: anonymous sign-in has no confirmation step, so a
    // success without a session would mean the provider is switched off.
    throw new Error("Anonymous sign-in returned no session.");
  }

  return created.data.session.user.id;
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

  // True while an account is being swapped for a fresh one. The listener below
  // has to ignore the sign-out that happens in the middle of it: `userId` going
  // null would make `useUserId()` throw in every screen still on the stack, and
  // dropping `status` back to loading would unmount the tree the delete was
  // started from. The old id stays until the new one is there.
  const resetting = useRef(false);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");

    establishSession()
      .then((id) => {
        if (cancelled) return;
        settled.current = true;
        setUserId(id);
        setStatus("ready");
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
      // either side of the sign-in above. Ignoring it until the first attempt
      // has answered keeps a null initial session from wiping a fresh id.
      if (!settled.current) return;
      if (resetting.current) return;

      setUserId(session?.user.id ?? null);
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

  // Account deletion, required by App Store Guideline 5.1.1(v). Two halves that
  // fail very differently, which is why only the first one throws:
  //
  //   1. The database call. Until it answers, nothing has happened — so a
  //      failure here is reported to the caller, which keeps the player on the
  //      settings screen with the row still there to press again.
  //   2. Becoming a new anonymous player. The account is gone by now, so there
  //      is nothing to return to and nothing for a screen to offer. A failure
  //      here goes to the startup screen, which already owns the retry.
  const deleteAccount = useCallback(async () => {
    // `delete_own_account` is a definer function that deletes the row in
    // auth.users; profiles and speech_sessions follow via cascade. It reads
    // auth.uid() itself, so there is nothing to pass and nothing to get wrong.
    const { error } = await supabase.rpc("delete_own_account");
    if (error) throw error;

    resetting.current = true;

    try {
      // The local profile is the "has onboarded" flag (see
      // `lib/onboarding-storage.ts`), so clearing it is what sends the player
      // back into onboarding rather than into a Home screen belonging to an
      // account that no longer exists.
      await clearOnboarding();

      // Local scope on purpose: the user row is already gone, so a server-side
      // logout would be a request signed by a deleted account — and deleting
      // the user took its refresh tokens with it, so there is nothing left to
      // revoke. Without this the dead session would still be in SecureStore.
      await supabase.auth.signOut({ scope: "local" });

      setUserId(await establishSession());
    } catch (failure) {
      console.warn("[auth] no new session after deleting the account:", failure);
      setFailure(describe(failure));
      setFailedOnce(true);
      setStatus("error");
    } finally {
      resetting.current = false;
    }
  }, []);

  const api = useMemo<AuthApi>(
    () => ({ status, userId, deleteAccount }),
    [status, userId, deleteAccount]
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
