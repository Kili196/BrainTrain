import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import { CountryList } from "../components/onboarding/CountryList";
import { BobbingDots } from "../components/ui/BobbingDots";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { countries } from "../constants/countries";
import { useUserId } from "../lib/auth-context";
import { patchOnboarding } from "../lib/onboarding-storage";
import { fetchProfile, updateProfileDetails } from "../lib/profile";
import { useToast } from "../lib/toast-context";
import { colors } from "../theme/colors";

// The editable half of the profile, reached from Settings → Edit profile.
//
// The mockup has no such screen — it only has the row that would open one — so
// this is built out of the onboarding steps it replaces: the same centred text
// field from the name step, the same searchable country list from the country
// step. Deliberately NOT the onboarding scaffold itself: that shell owns a
// step progress bar and a 5-step flow, and this is one screen, not a flow.
//
// Age is missing on purpose. It is asked once during onboarding and nothing
// else in the app rewrites it (see `updateProfileDetails`).
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const userId = useUserId();

  // Null while the profile is being read. The fields cannot be rendered with
  // empty values first and filled in afterwards: a name that appears a moment
  // after the keyboard could is a field that overwrites what was just typed.
  const [name, setName] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);

    try {
      const profile = await fetchProfile(userId);

      // Supabase is the truth here, not the local copy: the local one exists so
      // that a cold start can decide where to route without the network, and it
      // is the copy that gets patched after a successful write.
      setName(profile?.display_name ?? "");
      setCountryCode(profile?.country_code ?? null);
    } catch (error) {
      console.warn("[profile] could not be loaded for editing:", error);
      setFailed(true);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    // A name and a country, the same two onboarding requires. The guard mirrors
    // the button's `disabled` below so a stray call can't slip past it.
    if (!name?.trim() || !countryCode) return;

    setSaving(true);

    try {
      await updateProfileDetails(userId, { name, countryCode });

      // Only after the write has succeeded, and only if there is a local copy
      // to patch — same order as onboarding, so "saved on this phone" can never
      // be true for something the database refused.
      await patchOnboarding({ name, countryCode });

      // The toast lives above the navigator, so it survives leaving the screen
      // and lands on the settings screen behind it.
      toast.show("Profile saved");
      router.back();
    } catch (error) {
      console.warn("[profile] could not be saved:", error);
      setSaving(false);
      toast.show("Couldn't save your profile — try again");
    }
  };

  const loading = name === null && !failed;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      // iOS lifts the whole view; on Android the system already resizes the
      // window, and adding padding on top of that pushes the list off screen.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        className="flex-1 px-5"
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          className="flex-row items-center gap-1.5 self-start"
        >
          <ArrowLeftIcon size={15} color={colors.text.secondary} />
          <Text className="text-body font-sans-bold text-text-secondary">
            Back
          </Text>
        </Pressable>

        <View className="gap-2.5 pt-7">
          <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
            Account
          </Text>
          <Text className="text-h1 font-sans-extrabold text-text">
            Edit profile
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <BobbingDots />
          </View>
        ) : failed ? (
          // Mirrors the profile screen: a first read with nothing to show is the
          // only thing that becomes an error state, and it offers the retry.
          <View className="flex-1 items-center justify-center gap-3.5">
            <Text className="text-center text-h3 font-sans-extrabold text-text">
              Couldn't load your profile
            </Text>
            <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
              Check your connection and try again.
            </Text>
            <View className="pt-1.5">
              <Button label="Try again" onPress={() => void load()} />
            </View>
          </View>
        ) : (
          <>
            <View className="pt-7">
              <TextField
                value={name ?? ""}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
                returnKeyType="done"
                accessibilityLabel="Your name"
              />
            </View>

            {/* The list fills what is left and scrolls itself — it is a
                FlatList, so it must not be nested inside a scroll view. */}
            <View className="flex-1 pt-5">
              <CountryList
                countries={countries}
                selectedCode={countryCode}
                onSelect={setCountryCode}
              />
            </View>

            <View className="pt-5">
              <Button
                label={saving ? "Saving…" : "Save"}
                // A name and a country are both required, the same as onboarding
                // (its name step keeps CONTINUE disabled until there is a name).
                // The column is nullable and the leaderboard has a "New player"
                // fallback, but that is for the gap before onboarding writes a
                // name — not a name a player is allowed to clear after the fact.
                disabled={!name?.trim() || !countryCode || saving}
                onPress={() => void save()}
              />
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
