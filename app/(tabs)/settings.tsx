import { useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";

import { CategorySheet } from "../../components/game/CategorySheet";
import { SettingsSheet } from "../../components/game/SettingsSheet";
import { ChevronRightIcon } from "../../components/icons/ChevronRightIcon";
import { Dialog } from "../../components/ui/Dialog";
import type { CategoryKey } from "../../constants/categories";
import { useAuth } from "../../lib/auth-context";
import { useGameSettings } from "../../lib/use-game-settings";
import { useToast } from "../../lib/toast-context";
import { colors } from "../../theme/colors";

// The settings tab, from the "Settings" mockup — but carrying only what is
// true. The mockup draws four sections and eleven rows; three of those rows
// cannot exist yet, and a row that leads nowhere is worse than no row:
//
//   Change password  — only email accounts have a password, and there is no
//                      reset or change flow behind it yet.
//   Theme            — `theme/colors.js` is one dark palette; a switch with
//                      nothing behind it would be the analysing screen's lie
//                      in a different place.
//   Help & FAQ,      — no content exists. Privacy becomes an App Store
//   Privacy & terms    requirement before release, and gets a row then.
//
// Sign out came back with the login screen. It sits in the danger zone rather
// than under Account because for a guest it is still final: an anonymous
// account has no credentials to come back with, and its dialog says so.
//
// The three notification switches are not here either — they need
// `expo-notifications`, which is a dependency we have not taken on.
//
// What is left is the part that matters: a second, findable door to the round
// setup, and the first caller of `delete_own_account()`, which has been in the
// database unused since the init schema.

// The mockup prints "Aloud 1.0.4". That number is invented; this reads the
// real one out of app.json, so it cannot drift from what was built.
const VERSION = Constants.expoConfig?.version ?? "—";

// TODO: change before release. Kept as its own constant rather than inlined so
// there is one place to put a real address, and a dead mailto is visible here
// rather than hidden in a handler.
const FEEDBACK_EMAIL = "feedback@braintrain.app";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { signOut, deleteAccount } = useAuth();
  const { settings, update: updateSettings } = useGameSettings();

  // One value rather than a boolean per sheet, same as Home: the two are
  // mutually exclusive, and stacked modals are unreliable on Android.
  const [openSheet, setOpenSheet] = useState<"none" | "settings" | "category">(
    "none"
  );

  // Same shape for the two confirm dialogs and the work behind them: only one
  // of each can be open or running at a time.
  const [confirming, setConfirming] = useState<"none" | "sign-out" | "delete">(
    "none"
  );
  const [busy, setBusy] = useState<"none" | "sign-out" | "delete">("none");

  // Same rule as Home: picking a category is what switches the mode, so backing
  // out of the picker leaves the mode alone rather than arming a category draw
  // with no category.
  const selectCategory = (categoryKey: CategoryKey) => {
    updateSettings({ ...settings, topicMode: "category", categoryKey });
    setOpenSheet("settings");
  };

  const sendFeedback = () => {
    const url = `mailto:${FEEDBACK_EMAIL}?subject=Aloud%20${VERSION}`;

    // `openURL` rejects when no mail client is installed, which is common
    // enough on a simulator to be worth saying out loud rather than logging.
    Linking.openURL(url).catch(() => {
      toast.show("No mail app to send feedback with");
    });
  };

  // Both end with no session. The tabs layout already redirects to /login in
  // the same render that drops the user id; the replace onto "/" is the
  // belt to that, and leaves the decision about where a signed-out player
  // belongs in one place (`app/index.tsx`) instead of repeating it here.
  const confirmSignOut = async () => {
    setConfirming("none");
    setBusy("sign-out");

    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.warn("[settings] could not sign out:", error);
      setBusy("none");
      toast.show("Couldn't sign out — try again");
    }
  };

  const confirmDelete = async () => {
    setConfirming("none");
    setBusy("delete");

    try {
      await deleteAccount();
      router.replace("/");
    } catch (error) {
      // Only the database call can land here, and it changes nothing when it
      // fails — the account is still there and the row is still pressable.
      console.warn("[account] could not be deleted:", error);
      setBusy("none");
      toast.show("Couldn't delete your account — try again");
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 44,
          // The tab bar floats over the scroll view, so the last row needs room
          // to clear it (design §10 reserves ~88px).
          paddingBottom: insets.bottom + 88,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="px-5 text-h1 font-sans-extrabold text-text">
          Settings
        </Text>

        <Section label="Account">
          <Row
            title="Edit profile"
            subtitle="Name and country"
            onPress={() => router.push("/edit-profile")}
          />
          <Row
            title="Practice preferences"
            subtitle="Default categories, prep and speaking time"
            onPress={() => setOpenSheet("settings")}
            last
          />
        </Section>

        <Section label="Support">
          <Row
            title="Send feedback"
            subtitle="Tell us what is broken or missing"
            onPress={sendFeedback}
            last
          />
        </Section>

        <Section label="Danger zone">
          {/* Design §4: destruction is a red text row plus a confirm dialog,
              never a filled red button. */}
          <Pressable
            onPress={() => setConfirming("sign-out")}
            disabled={busy !== "none"}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ disabled: busy !== "none" }}
            className="border-t border-divider px-5 py-4 active:bg-card-quiet"
          >
            <Text
              className="text-h4 font-sans-bold"
              style={{
                color: busy !== "none" ? colors.text.faint : colors.danger.DEFAULT,
              }}
            >
              {busy === "sign-out" ? "Signing out…" : "Sign out"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirming("delete")}
            disabled={busy !== "none"}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityState={{ disabled: busy !== "none" }}
            className="border-b border-t border-divider px-5 py-4 active:bg-card-quiet"
          >
            <Text
              className="text-h4 font-sans-bold"
              style={{
                color: busy !== "none" ? colors.text.faint : colors.danger.DEFAULT,
              }}
            >
              {busy === "delete" ? "Deleting…" : "Delete account"}
            </Text>
          </Pressable>
        </Section>

        <Text className="mt-8 px-5 text-caption font-sans text-text-disabled">
          Aloud {VERSION}
        </Text>
      </ScrollView>

      <SettingsSheet
        visible={openSheet === "settings"}
        settings={settings}
        onChange={updateSettings}
        onPickCategory={() => setOpenSheet("category")}
        onClose={() => setOpenSheet("none")}
      />

      <CategorySheet
        visible={openSheet === "category"}
        selected={settings.categoryKey}
        onSelect={selectCategory}
        onClose={() => setOpenSheet("settings")}
      />

      <Dialog
        visible={confirming === "sign-out"}
        title="Sign out?"
        // Kili's copy from the login screen PR, minus Apple, which is switched
        // off and so not a way back in yet.
        body="You can sign back in with the same Google account or email. A guest account can't be recovered once you sign out of it."
        cancelLabel="Stay signed in"
        confirmLabel="Sign out"
        destructive
        onCancel={() => setConfirming("none")}
        onConfirm={() => void confirmSignOut()}
      />

      <Dialog
        visible={confirming === "delete"}
        title="Delete account?"
        // The mockup's words, and they are accurate: the rounds, the points and
        // the mastered topics all hang off the user row that the RPC deletes.
        body="Your streak, points and mastered topics will be permanently removed. This cannot be undone."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming("none")}
        onConfirm={() => void confirmDelete()}
      />
    </View>
  );
}

// Eyebrow plus its rows. The gap above each label is what separates one section
// from the next — design §3 puts 30–46px between sections, and the rows carry
// their own hairlines, so nothing here needs a margin of its own.
function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-8">
      <Text className="px-5 pb-2.5 text-eyebrow font-sans-extrabold uppercase text-text-faint">
        {label}
      </Text>
      {children}
    </View>
  );
}

// A divider row, not a card: design §5 prefers the hairline row for lists and
// reserves filled cards for one feature block per screen. `last` closes the
// group with a bottom hairline, so a section reads as a block rather than as
// rows that ran out.
function Row({
  title,
  subtitle,
  onPress,
  last = false,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      // 16px of vertical padding around two lines of text clears the 44pt
      // minimum touch target on its own.
      className={`flex-row items-center justify-between gap-3.5 border-t border-divider px-5 py-4 active:bg-card-quiet ${
        last ? "border-b" : ""
      }`}
    >
      <View className="flex-1 gap-1">
        <Text className="text-h4 font-sans-bold text-text-strong">{title}</Text>
        {subtitle ? (
          <Text className="text-caption font-sans text-text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRightIcon size={18} color={colors.text.disabled} />
    </Pressable>
  );
}
