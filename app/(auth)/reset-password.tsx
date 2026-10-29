import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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

// Supabase's "Email OTP Length" is set to 6 in the dashboard. If that setting
// changes, this has to follow, or the field cuts the code short.
const CODE_LENGTH = 6;

// Password reset, pushed on top of /login by its "Forgot password?" link.
// One screen, two phases: ask for the email and mail a code, then take the
// code plus the new password. Keeping both on one screen means the typed
// email survives into phase two without a route param round trip.
//
// Like login and signup, it never navigates on success itself. A correct code
// signs the player in, status flips to "ready", and the effect below sends them
// to "/" — which can happen before `resetPassword` has even returned. That is
// why the new password is validated before the code is sent: an error found
// afterwards might have no screen left to show it on.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { status, requestPasswordReset, resetPassword } = useAuth();
  // Login passes along whatever was already typed in its email field.
  const params = useLocalSearchParams<{ email?: string }>();

  const [phase, setPhase] = useState<"email" | "code">("email");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "ready") {
      router.replace("/");
    }
  }, [status, router]);

  // Returns whether a code went out, so "Send a new code" can stay in phase two
  // and the first send can move on to it.
  const sendCode = async (): Promise<boolean> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.show("Enter your email", "error");
      return false;
    }

    const result = await requestPasswordReset(trimmedEmail);
    if (result.outcome === "sent") {
      // Said the same way whether or not the address has an account — see the
      // comment on PasswordResetRequestResult.
      toast.show("If that email has an account, a code is on its way", "info");
      return true;
    }
    if (result.outcome === "invalid-email") {
      toast.show("That email address doesn't look right.", "error");
    } else if (result.outcome === "rate-limited") {
      toast.show("Too many codes sent — try again in a few minutes.", "error");
    } else {
      console.warn("[auth] password reset request failed:", result.detail);
      toast.show("Couldn't send the code — try again", "error");
    }
    return false;
  };

  const onSendCode = async () => {
    if (pending) return;
    setPending(true);
    try {
      if (await sendCode()) setPhase("code");
    } finally {
      setPending(false);
    }
  };

  const onResend = async () => {
    if (pending) return;
    setPending(true);
    try {
      await sendCode();
    } finally {
      setPending(false);
    }
  };

  const onSetPassword = async () => {
    if (pending) return;

    if (code.length !== CODE_LENGTH) {
      toast.show(`Enter the ${CODE_LENGTH}-digit code from the email`, "error");
      return;
    }
    // Checked here, not left to Supabase: see the header comment.
    if (password.length < 6) {
      toast.show("Password must be at least 6 characters", "error");
      return;
    }

    setPending(true);
    try {
      const result = await resetPassword(email.trim(), code, password);
      if (result.outcome === "success") {
        // The toast lives above the router, so it still shows once this screen
        // has been replaced by home.
        toast.show("Password updated", "success");
      } else if (result.outcome === "wrong-code") {
        toast.show("That code is wrong or has expired", "error");
      } else {
        console.warn("[auth] password reset failed:", result.detail);
        toast.show("Couldn't set the new password — try again", "error");
      }
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
              {phase === "email" ? "Forgot password" : "Check your inbox"}
            </Text>
            <Text className="text-h1 font-sans-extrabold text-text">
              {phase === "email" ? "Reset your password" : "Enter your code"}
            </Text>
            <Text className="text-body font-sans text-text-secondary">
              {phase === "email"
                ? "We'll email you a code to set a new one."
                : `We sent a ${CODE_LENGTH}-digit code to ${email.trim()}. It expires in one hour.`}
            </Text>
          </View>

          {phase === "email" ? (
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
            </View>
          ) : (
            <View className="mt-7 gap-3">
              <TextField
                value={code}
                // Digits only: a code pasted from the mail can carry spaces.
                onChangeText={(text) => setCode(text.replace(/\D/g, ""))}
                placeholder="Code"
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                // iOS reads the code out of a freshly arrived mail and offers it
                // above the keyboard. Android has no equivalent for email codes.
                textContentType="oneTimeCode"
                autoFocus
                textAlign="left"
                accessibilityLabel="Code from the email"
              />
              <TextField
                value={password}
                onChangeText={setPassword}
                placeholder="New password (min. 6 characters)"
                secureTextEntry
                autoCapitalize="none"
                // Same as signup: the OS offers to generate and store a new one
                // instead of autofilling the forgotten one.
                autoComplete="new-password"
                textContentType="newPassword"
                textAlign="left"
                accessibilityLabel="New password"
              />
            </View>
          )}

          <View className="mt-6">
            {phase === "email" ? (
              <Button
                label={pending ? "Sending…" : "Send code"}
                onPress={onSendCode}
                disabled={pending}
              />
            ) : (
              <Button
                label={pending ? "Saving…" : "Set password"}
                onPress={onSetPassword}
                disabled={pending}
              />
            )}
          </View>

          {phase === "code" ? (
            <Pressable
              onPress={onResend}
              accessibilityRole="button"
              accessibilityLabel="Send a new code"
              className="mt-5 self-center active:opacity-60"
              hitSlop={8}
            >
              <Text className="text-caption font-sans-semibold text-text-secondary">
                Send a new code
              </Text>
            </Pressable>
          ) : null}

          {/* Pushes the way back to the bottom. */}
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
                Remembered it?{" "}
                <Text className="font-sans-bold text-accent-light">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
