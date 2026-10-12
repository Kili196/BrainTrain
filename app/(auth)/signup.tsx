import { useEffect, useState } from "react";
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
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast-context";

// Create-account screen, pushed on top of /login by its "Create an account"
// link. Only email/password lives here — Google, Apple and guest are one tap on
// the login screen and need no separate signup.
//
// Like the login screen, it never navigates on success itself. With "Confirm
// email" OFF, sign-up returns a session, `onAuthStateChange` flips status to
// "ready", and the effect below sends the player to "/". With it ON there is no
// session yet — the account exists but can't act until the emailed link is
// clicked — so we say so and go back to /login to wait. Either way the gate at
// "/" still decides onboarding vs. home, so a brand-new account gets onboarded.
export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { status, signUpWithEmail } = useAuth();

  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "ready") {
      router.replace("/");
    }
  }, [status, router]);

  const onCreate = async () => {
    if (pending) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.show("Enter an email and password");
      return;
    }
    // Supabase rejects passwords shorter than its minimum (6 by default), but a
    // local check makes that instant feedback instead of a round trip.
    if (password.length < 6) {
      toast.show("Password must be at least 6 characters");
      return;
    }

    setPending(true);
    try {
      const result = await signUpWithEmail(trimmedEmail, password);
      if (result.outcome === "error") {
        console.warn("[auth] email sign-up failed:", result.detail);
        toast.show("Couldn't create your account — try again");
      } else if (result.outcome === "confirm-email") {
        // No session yet: the account exists but is dormant until the link is
        // clicked. Send them back to sign in once they've confirmed.
        toast.show("Check your inbox to confirm your email");
        router.back();
      } else if (result.outcome === "exists") {
        // Back to /login, where signing in with that address is one step.
        toast.show("An account with this email already exists — sign in instead.");
        router.back();
      } else if (result.outcome === "invalid-email") {
        toast.show("That email address doesn't look right.");
      } else if (result.outcome === "rate-limited") {
        toast.show("Too many sign-ups right now — try again in a few minutes.");
      }
      // "signed-in" is handled by the effect above.
    } finally {
      setPending(false);
    }
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
          {/* Wordmark — one word, two colours, same as the login header. */}
          <Text
            className="text-center text-h3 font-sans-extrabold uppercase text-text"
            style={{ letterSpacing: 2.4 }}
          >
            A
            <Text className="text-accent-light">loud</Text>
          </Text>

          {/* Eyebrow + heading, left-aligned (design §10). */}
          <View className="mt-12 gap-2">
            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
              Get started
            </Text>
            <Text className="text-h1 font-sans-extrabold text-text">
              Create your account
            </Text>
          </View>

          <View className="mt-7 gap-3">
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
              placeholder="Password (min. 6 characters)"
              secureTextEntry
              autoCapitalize="none"
              // newPassword drives the OS to offer a strong password and store
              // it, rather than trying to autofill an existing one.
              autoComplete="new-password"
              textContentType="newPassword"
              textAlign="left"
              accessibilityLabel="Password"
            />
          </View>

          <View className="mt-6">
            <Button
              label={pending ? "Creating…" : "Create account"}
              onPress={onCreate}
              disabled={pending}
            />
          </View>

          {/* Pushes the "already have an account" link to the bottom. */}
          <View className="flex-1" />

          <View className="mt-10 items-center">
            <Pressable
              onPress={() => {
                if (pending) return;
                router.back();
              }}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              className="active:opacity-60"
              hitSlop={8}
            >
              <Text className="text-body font-sans text-text-secondary">
                Already have an account?{" "}
                <Text className="font-sans-bold text-accent-light">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
