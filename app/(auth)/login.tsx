import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { LoginBackdrop } from "../../components/ui/LoginBackdrop";
import { TextField } from "../../components/ui/TextField";
import { AppleIcon } from "../../components/icons/AppleIcon";
import { GoogleIcon } from "../../components/icons/GoogleIcon";
import { useAuth } from "../../lib/auth-context";
import { isGoogleSignInAvailable, type SignInResult } from "../../lib/auth-providers";
import { FEATURES } from "../../lib/features";
import { useToast } from "../../lib/toast-context";
import { colors } from "../../theme/colors";

// The one screen a signed-out player can reach — `app/index.tsx` redirects
// here whenever `useAuth().status === "signed-out"`.
//
// Google, Apple, "continue as guest" and now email/password all sign in here.
// "Create an account" pushes the sibling /signup screen. The one control still
// standing in for an unbuilt flow is "Forgot password?", which explains itself
// with a toast rather than pretending to work — password reset is a separate
// screen with its own emailed-link handling, deferred for now.
//
// This screen never navigates on success. Signing in flips `status` to "ready"
// through the `onAuthStateChange` listener in auth-context.tsx, and the effect
// below reacts by sending the player back to "/" — the same gate that decides
// between onboarding and home, so a fresh account still gets onboarded and a
// returning one still lands on home.
type Pending = "google" | "apple" | "guest" | "email" | null;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {
    status,
    signInWithGoogle,
    signInWithApple,
    continueAsGuest,
    signInWithEmail,
  } = useAuth();

  const [pending, setPending] = useState<Pending>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "ready") {
      router.replace("/");
    }
  }, [status, router]);

  const busy = pending !== null;

  const run = async (
    kind: Exclude<Pending, null>,
    action: () => Promise<SignInResult>
  ) => {
    // A tap while one attempt is already in flight would otherwise start a
    // second native sheet on top of the first.
    if (busy) return;

    setPending(kind);
    try {
      const result = await action();

      if (result.outcome === "error") {
        // Logged for the same reason auth-context.tsx logs a startup failure:
        // the message is a debugging detail, not something a player can act on.
        console.warn(`[auth] ${kind} sign-in failed:`, result.detail);
        toast.show(
          kind === "guest"
            ? "Couldn't continue as guest — try again"
            : "Couldn't sign in — try again"
        );
      }
      // "cancelled" needs no feedback: closing the native sheet is a choice,
      // not a failure. "success" is handled by the effect above.
    } finally {
      setPending(null);
    }
  };

  // The native "Sign in with Apple" sheet is an iOS-only capability — it simply
  // doesn't exist on Android — so the Apple button is only rendered there. On
  // iOS it shows even before FEATURES.appleSignIn is switched on (the design
  // pairs it with Google); until that flag flips, a tap explains it isn't
  // available yet rather than crashing the native module.
  const showApple = Platform.OS === "ios";
  const appleAvailable = FEATURES.appleSignIn && showApple;

  // Google is hidden on iOS, for two reasons that point the same way. The iOS
  // OAuth flow needs a reversed client ID in app.json that isn't set yet (the
  // `iosUrlScheme` TODO), without which the sign-in sheet can't hand control
  // back to the app; and App Store Guideline 4.8 won't allow a third-party
  // login like Google unless Sign in with Apple is offered alongside it, which
  // is still behind FEATURES.appleSignIn. Until both are resolved, iOS signs in
  // with Apple (once enabled), email or guest; Android keeps Google. Off iOS the
  // button still shows even when the native module is absent (Expo Go), where a
  // tap explains it needs a custom dev build.
  const showGoogle = Platform.OS !== "ios";

  const onApple = () => {
    if (busy) return;
    if (!appleAvailable) {
      toast.show("Apple sign-in isn't available yet");
      return;
    }
    run("apple", signInWithApple);
  };

  const onGoogle = () => {
    if (busy) return;
    if (!isGoogleSignInAvailable) {
      toast.show("Google sign-in needs a custom dev build");
      return;
    }
    run("google", signInWithGoogle);
  };

  // Email/password sign-in. Not routed through `run` above: that helper's
  // generic "Couldn't sign in — try again" is wrong for the case that matters
  // most here — a wrong password, or an unconfirmed address — so this reports
  // each in the terms the player can act on. Success still needs no handling; the effect above navigates.
  const onSignIn = async () => {
    if (busy) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.show("Enter your email and password");
      return;
    }

    setPending("email");
    try {
      const result = await signInWithEmail(trimmedEmail, password);
      if (result.outcome === "wrong-credentials") {
        // Also what a player sees who never signed up — Supabase won't say
        // which — so the way to sign-up rides along in the same line. Not
        // "check your email": that reads as "check your inbox", and people
        // then wait for a mail sign-in never sends.
        toast.show("Wrong email or password. New here? Create an account below.");
      } else if (result.outcome === "unconfirmed") {
        toast.show("Confirm your email first — the link is in your inbox.");
      } else if (result.outcome === "error") {
        console.warn("[auth] email sign-in failed:", result.detail);
        toast.show("Couldn't sign in — try again");
      }
    } finally {
      setPending(null);
    }
  };

  // The one visual-only control left (Forgot password?) lands here: no auth,
  // just an honest toast.
  const comingSoon = (message: string) => () => {
    if (busy) return;
    toast.show(message);
  };

  return (
    <View className="flex-1 bg-bg">
      <LoginBackdrop />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 20,
            // 24px, held for every block on the screen (design §3).
            paddingHorizontal: 24,
          }}
        >
          {/* Wordmark — one word, two colours, same as the Home header. */}
          <Text
            className="text-center text-h3 font-sans-extrabold uppercase text-text"
            style={{ letterSpacing: 2.4 }}
          >
            Brain
            <Text className="text-accent-light">Train</Text>
          </Text>

          {/* Eyebrow + heading, left-aligned (design §10). */}
          <View className="mt-12 gap-2">
            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
              Welcome
            </Text>
            <Text className="text-h1 font-sans-extrabold text-text">
              Sign in and start speaking
            </Text>
          </View>

          {/* One provider button, filling the row: Apple on iOS, Google on
              Android. They're mutually exclusive now — Apple is an iOS-only
              capability, and Google is hidden on iOS (see showGoogle above) —
              so the row holds exactly one, and its flex-1 child spans it. */}
          <View className="mt-7 flex-row gap-3">
            {showApple ? (
              <ProviderButton
                icon={<AppleIcon size={18} color={colors.text.DEFAULT} />}
                label="Apple"
                busyLabel="Signing in…"
                pending={pending === "apple"}
                dimmed={busy || !appleAvailable}
                onPress={onApple}
              />
            ) : null}
            {showGoogle ? (
              <ProviderButton
                icon={<GoogleIcon size={17} color={colors.text.DEFAULT} />}
                label="Google"
                busyLabel="Signing in…"
                pending={pending === "google"}
                dimmed={busy || !isGoogleSignInAvailable}
                onPress={onGoogle}
              />
            ) : null}
          </View>

          {/* OR EMAIL divider. */}
          <View className="mt-6 flex-row items-center gap-3">
            <View className="flex-1" style={{ height: 1, backgroundColor: colors.border.divider }} />
            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
              or email
            </Text>
            <View className="flex-1" style={{ height: 1, backgroundColor: colors.border.divider }} />
          </View>

          {/* Email + password. Visual only — see the header comment. */}
          <View className="mt-6 gap-3">
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              textAlign="left"
              accessibilityLabel="Email"
            />
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              textAlign="left"
              accessibilityLabel="Password"
            />
          </View>

          <Pressable
            onPress={comingSoon("Password reset is coming soon")}
            accessibilityRole="button"
            accessibilityLabel="Forgot password?"
            className="mt-3 self-end active:opacity-60"
            hitSlop={8}
          >
            <Text className="text-caption font-sans-semibold text-text-secondary">
              Forgot password?
            </Text>
          </Pressable>

          <View className="mt-5">
            <Button
              label={pending === "email" ? "Signing in…" : "Sign in"}
              onPress={onSignIn}
              disabled={busy}
            />
          </View>

          {/* Pushes the guest + create-account block to the bottom of the screen. */}
          <View className="flex-1" />

          <View className="mt-10 items-center gap-4">
            <Pressable
              onPress={() => run("guest", continueAsGuest)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
              // The pill/outline secondary of design §4: bordered, no fill, no
              // shadow. hitSlop carries the short pill to the 44pt touch target.
              className="flex-row items-center justify-center rounded-full border border-border px-5 py-3 active:opacity-70"
              hitSlop={10}
              style={busy ? { opacity: 0.35 } : undefined}
            >
              <Text
                className="text-caption font-sans-extrabold uppercase text-text-secondary"
                style={{ letterSpacing: 1.5 }}
              >
                {pending === "guest" ? "Continuing…" : "Continue as guest"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (busy) return;
                router.push("/signup");
              }}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
              className="active:opacity-60"
              hitSlop={8}
            >
              <Text className="text-body font-sans text-text-secondary">
                New here?{" "}
                <Text className="font-sans-bold text-accent-light">
                  Create an account
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// One of the two side-by-side sign-in buttons. Bordered, unfilled — a clearly
// secondary shape next to the filled primary below, and the same treatment the
// design's §4 "secondary/outline" describes. The icon is dropped while pending
// so the narrow column doesn't have to fit both it and "Signing in…".
type ProviderButtonProps = {
  icon: ReactNode;
  label: string;
  busyLabel: string;
  pending: boolean;
  dimmed: boolean;
  onPress: () => void;
};

function ProviderButton({
  icon,
  label,
  busyLabel,
  pending,
  dimmed,
  onPress,
}: ProviderButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 flex-row items-center justify-center gap-2.5 rounded-lg border border-border px-4 py-4 active:opacity-70"
      style={dimmed ? { opacity: 0.5 } : undefined}
    >
      {pending ? null : icon}
      <Text className="text-h4 font-sans-bold text-text">
        {pending ? busyLabel : label}
      </Text>
    </Pressable>
  );
}
