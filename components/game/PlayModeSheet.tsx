import { Pressable, Text, View } from "react-native";

import { CloseIcon } from "../icons/CloseIcon";
import { LockIcon } from "../icons/LockIcon";
import { Gradient } from "../onboarding/Gradient";
import { SheetSurface } from "../ui/Sheet";
import { colors } from "../../theme/colors";

// What PLAY opens: where this round's topic comes from.
//
//   Standard    — whatever the settings say (random, or a chosen category).
//   Daily topic — the one everybody gets today.
//
// Two full-width rows and a dismiss, nothing else. The choice starts the round
// immediately, so there is no confirm step and no default selection to argue
// with.
//
// A locked row stays pressable: Home sends that press to the paywall, so it is
// an answer, not an ambush. Two looks, because the two locks mean different
// things (Fabian, 2026-10-03):
//
//   Standard    — a Pro feature. Wears the paywall's violet-to-blue: a faint
//                 wash over the row and a PRO pill, so it reads as premium
//                 rather than broken.
//   Daily topic — free, just used up for today. Dimmed with a plain lock; the
//                 caption says when it comes back.
export type PlayModeSheetProps = {
  visible: boolean;
  // Marks today's daily topic as not yet opened on this device.
  dailyUnseen: boolean;
  // Free players: Standard is Pro only, and the daily topic once per day.
  standardLocked: boolean;
  dailyLocked: boolean;
  onStandard: () => void;
  onDaily: () => void;
  onClose: () => void;
};

export function PlayModeSheet({
  visible,
  dailyUnseen,
  standardLocked,
  dailyLocked,
  onStandard,
  onDaily,
  onClose,
}: PlayModeSheetProps) {
  return (
    <SheetSurface visible={visible} onClose={onClose} closeLabel="Close play menu">
      <Choice
        label="Standard"
        first
        onPress={onStandard}
        pro={standardLocked}
        caption={standardLocked ? "Any topic, any category" : undefined}
        accessibilityLabel={
          standardLocked ? "Standard, needs Pro" : "Standard"
        }
      />

      <View className="border-t border-divider">
        <Choice
          label="Daily topic"
          onPress={onDaily}
          // The dot means "new and playable" — on a used-up day it would
          // point at something the player cannot have.
          marked={dailyUnseen && !dailyLocked}
          locked={dailyLocked}
          caption={dailyLocked ? "Played today · back tomorrow" : undefined}
          // The dot and the lock are decoration for anyone who can see them;
          // for anyone who cannot, the label has to carry the same information.
          accessibilityLabel={
            dailyLocked
              ? "Daily topic, already played today, back tomorrow"
              : dailyUnseen
                ? "Daily topic, new today"
                : "Daily topic"
          }
        />
      </View>

      <View className="items-center border-t border-divider py-3">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full border border-modal"
        >
          <CloseIcon size={15} color={colors.text.secondary} />
        </Pressable>
      </View>
    </SheetSurface>
  );
}

function Choice({
  label,
  onPress,
  marked = false,
  pro = false,
  locked = false,
  first = false,
  caption,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  marked?: boolean;
  // Needs Pro: gradient wash and PRO pill.
  pro?: boolean;
  // Used up for now: dimmed, with a lock.
  locked?: boolean;
  // The top row, whose wash has to follow the sheet's rounded corners.
  first?: boolean;
  caption?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // Row-wide hit area with the label centred inside it — in a menu you aim
      // at the row, not at the word.
      //
      // The top row rounds its own corners rather than leaving that to the
      // sheet: on Android only a view's direct parent clips it, so a wash two
      // levels down ran square past the sheet's curve. 17px = the sheet's 18px
      // inside its 1px border.
      className={`items-center justify-center gap-1.5 overflow-hidden py-5 ${
        first ? "rounded-t-[17px]" : ""
      }`}
    >
      {pro ? (
        <Gradient fromOpacity={WASH_OPACITY} toOpacity={WASH_OPACITY} />
      ) : null}
      <View className="flex-row items-center gap-2.5">
        {locked ? <LockIcon size={15} color={colors.text.muted} /> : null}
        <Text
          className={`text-h3 font-sans-extrabold uppercase tracking-button ${
            locked ? "text-text-muted" : "text-text"
          }`}
        >
          {label}
        </Text>
        {pro ? <ProPill /> : null}
        {marked ? <View className="h-1.5 w-1.5 rounded-full bg-danger" /> : null}
      </View>
      {caption ? (
        // Full row width, centred inside it: measured to its own width,
        // Android cut "Any topic, any category" off after "any".
        <Text className="self-stretch text-center text-caption font-sans-semibold text-text-secondary">
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

// Strong enough to tint the row, faint enough that white text on it stays the
// sheet's own white.
const WASH_OPACITY = 0.22;

function ProPill() {
  return (
    <View className="flex-row items-center gap-1 overflow-hidden rounded-full px-2 py-1">
      <Gradient />
      <LockIcon size={11} color={colors.text.DEFAULT} />
      <Text
        className="font-sans-extrabold text-[9.5px] uppercase tracking-pill text-text"
      >
        Pro
      </Text>
    </View>
  );
}
