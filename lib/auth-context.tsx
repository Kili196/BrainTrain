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

  const api = useMemo<AuthApi>(() => ({ status, userId }), [status, userId]);

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
