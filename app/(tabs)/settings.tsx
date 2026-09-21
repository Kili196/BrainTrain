import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Dialog } from "../../components/ui/Dialog";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast-context";

// Settings itself is still a placeholder (see PlaceholderScreen, shared with
// Ranking and Knowledge) — but "sign out" has to live somewhere real now that
// signing in is a choice instead of something that happens automatically at
// startup, so this one screen breaks from the shared placeholder to make room
// for it rather than teaching PlaceholderScreen about a footer just for this
// one caller.
export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const toast = useToast();

  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setConfirming(false);
    setSigningOut(true);

    try {
      await signOut();
      // Signing out flips `useAuth().status` to "signed-out", but that alone
      // doesn't move anyone off a tab they're already standing on — only
      // `app/index.tsx` reads `status` to redirect, and it isn't mounted
      // right now. Sending the player back to "/" re-runs that gate fresh,
      // the same way `ready.tsx` replaces onto "/home" once onboarding is
      // done, rather than assuming a background listener will carry them.
      router.replace("/");
    } catch (error: unknown) {
      console.warn("[settings] could not sign out:", error);
      setSigningOut(false);
      toast.show("Couldn't sign out — try again");
    }
  };

  return (
    <View
      // 20px page padding and the same top/bottom offsets as PlaceholderScreen,
      // so this still reads as the same tab as Ranking and Knowledge.
      className="flex-1 bg-bg px-5"
      style={{ paddingTop: insets.top + 44, paddingBottom: insets.bottom + 30 }}
    >
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
        Settings
      </Text>

      <View className="flex-1 items-center justify-center gap-2.5">
        <Text className="text-center text-h3 font-sans-extrabold text-text">
          Settings are coming
        </Text>

        <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
          Account, notifications and language. Round settings stay on Home,
          next to Play.
        </Text>
      </View>

      {/* Destructive actions are red text plus a confirm dialog, never a
          filled button (design §4/§14) — this is the one row on the tab that
          isn't waiting on the rest of Settings to be built. */}
      <Pressable
        onPress={() => setConfirming(true)}
        disabled={signingOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        className="border-t border-divider py-4 active:opacity-60"
        style={signingOut ? { opacity: 0.35 } : undefined}
      >
        <Text className="text-center text-h4 font-sans-bold text-danger">
          {signingOut ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>

      <Dialog
        visible={confirming}
        title="Sign out?"
        body="You can sign back in with the same Google or Apple account. A guest account can't be recovered once you sign out of it."
        cancelLabel="Stay signed in"
        confirmLabel="Sign out"
        onCancel={() => setConfirming(false)}
        onConfirm={handleSignOut}
        destructive
      />
    </View>
  );
}
