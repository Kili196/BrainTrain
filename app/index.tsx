import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { useAuth } from "../lib/auth-context";
import { hasCompletedOnboarding } from "../lib/profile";

// Entry gate for "/". Three-way split: no session sends a player to sign in,
// a session with no completed profile sends them into onboarding, and a
// session with one sends them straight to home. While the async checks run we
// render nothing (the root layout already holds the splash until fonts load,
// so there's no visible flash).
//
// `status` can only be "ready" or "signed-out" here — AuthProvider renders
// nothing at all while it's "loading" and a retry screen while it's "error",
// so this component never mounts during either.
export default function Index() {
  const { status, userId } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  // Resolves against Supabase when this device has no local profile, so a
  // returning account on a new phone — whose profile already lives on the
  // server — lands on home with its synced stats instead of re-onboarding.
  // Only runs with a session; signed-out is redirected below. Re-runs if the
  // account changes so the answer never belongs to the previous user.
  useEffect(() => {
    if (status !== "ready" || !userId) return;

    let cancelled = false;
    hasCompletedOnboarding(userId)
      .then((done) => {
        if (!cancelled) setHasOnboarded(done);
      })
      .catch((error: unknown) => {
        // The server check failed (offline right after login is the realistic
        // case). Fall back to onboarding rather than a blank screen; a profile
        // that already exists is simply re-saved over its own values.
        console.warn("[onboarding] could not resolve profile:", error);
        if (!cancelled) setHasOnboarded(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  if (status === "signed-out") {
    return <Redirect href="/login" />;
  }

  if (hasOnboarded === null) {
    return null;
  }

  // TODO: the local onboarded flag is one value for the whole device (see
  // lib/onboarding-storage.ts), not per account — so a second account signing
  // in on a phone that already has a cached profile skips straight to home on
  // that stale flag. The server check above only runs when nothing is cached,
  // so it doesn't yet cover this; flagged for whenever more than one real
  // account per device matters.
  return <Redirect href={hasOnboarded ? "/home" : "/onboarding"} />;
}
