import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "./Button";

// The one screen that stands in front of the app.
//
// Shown when the account could not be established at startup, which in practice
// means the very first launch happened without internet. Blocking is deliberate:
// the app would otherwise look like it works while nothing is ever saved, and
// that silent non-saving is the exact bug this whole branch removes.
//
// It borrows the empty-state recipe (design §12) — centred headline, one
// explaining sentence — with the retry as the screen's single primary button at
// the bottom (design §4).
export type StartupErrorProps = {
  onRetry: () => void;
  // True while an attempt is in flight. The screen stays up rather than
  // flashing back to black, so the button has to say it is working.
  busy?: boolean;
  // Which of the two failures this is. "offline" means the request never
  // arrived; "rejected" means Supabase answered and said no — a misconfigured
  // project, most likely. Telling the user to check their connection when the
  // connection is fine sends them hunting in the wrong place.
  kind?: "offline" | "rejected";
  // The underlying message, shown in development only. It is the difference
  // between reading the cause off the phone and going looking for it.
  detail?: string | null;
};

const COPY = {
  offline: {
    headline: "No connection",
    body: "BrainTrain needs the internet once, to set up your account. After that it remembers you.",
  },
  rejected: {
    headline: "Can't start",
    body: "Your account could not be set up. This is on our side — please try again in a moment.",
  },
} as const;

export function StartupError({
  onRetry,
  busy = false,
  kind = "offline",
  detail = null,
}: StartupErrorProps) {
  const insets = useSafeAreaInsets();
  const copy = COPY[kind];

  return (
    <View
      // 24px page padding — this screen has no lists and no tab bar, so it takes
      // the wider of the two (design §3) and holds it for both blocks.
      className="flex-1 bg-bg px-6"
      style={{
        paddingTop: insets.top + 44,
        // The button must clear the home indicator on iOS and the gesture bar on
        // Android, both of which live in the bottom inset.
        paddingBottom: insets.bottom + 30,
      }}
    >
      <View className="flex-1 items-center justify-center gap-2.5">
        <Text
          // Announced when the screen appears, so it isn't a silent dead end for
          // a screen reader — this is the only thing on screen.
          accessibilityRole="header"
          className="text-center text-h3 font-sans-extrabold text-text"
        >
          {copy.headline}
        </Text>

        <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
          {copy.body}
        </Text>

        {/* Stripped from a release build by the bundler, so this is a debug
            affordance that cannot ship. */}
        {__DEV__ && detail ? (
          <Text className="mt-4 max-w-[270px] text-center text-caption font-sans text-text-muted">
            {detail}
          </Text>
        ) : null}
      </View>

      <Button
        label={busy ? "Connecting…" : "Try again"}
        onPress={onRetry}
        disabled={busy}
        // Muted rather than dimmed: a faded blue button still reads as the thing
        // to press, and this one is briefly not pressable (design §4).
        disabledStyle="muted"
        accessibilityLabel={busy ? "Connecting" : "Try again"}
      />
    </View>
  );
}
