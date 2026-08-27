import { Pressable, Text, View } from "react-native";

import { Sheet, SheetRow } from "../ui/Sheet";
import { Stepper } from "../ui/Stepper";
import {
  PREP_TIME,
  SPEAKING_TIME,
  formatDuration,
  stepDuration,
  type GameSettings,
} from "../../lib/game-settings";

// The round setup, opened by the gear on Home.
//
// Controlled from the outside: the sheet never holds a copy of the settings, it
// renders what it is handed and reports every change immediately. That means
// there is no "unsaved" state to lose when the sheet is dismissed.
export type SettingsSheetProps = {
  visible: boolean;
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  // Picking a category needs its own sheet, which Home owns — this only asks
  // for it. Two stacked modals are fragile on Android, so Home swaps one for
  // the other instead of layering them.
  onPickCategory: () => void;
  onClose: () => void;
};

export function SettingsSheet({
  visible,
  settings,
  onChange,
  onPickCategory,
  onClose,
}: SettingsSheetProps) {
  return (
    <Sheet visible={visible} title="Settings" onClose={onClose}>
      <SheetRow>
        <Label>Topic</Label>
        <View className="flex-row items-center gap-4">
          <TopicMode
            label="Random"
            active={settings.topicMode === "random"}
            onPress={() => onChange({ ...settings, topicMode: "random" })}
          />
          {/* Does not switch the mode itself: a category mode without a chosen
              category would draw from nothing. Selecting one in the picker is
              what flips it. */}
          <TopicMode
            label="By category"
            active={settings.topicMode === "category"}
            onPress={onPickCategory}
          />
        </View>
      </SheetRow>

      <SheetRow>
        <Label>Prep time</Label>
        <Stepper
          label="prep time"
          value={formatDuration(settings.prepSeconds)}
          canDecrease={settings.prepSeconds > PREP_TIME.min}
          canIncrease={settings.prepSeconds < PREP_TIME.max}
          onStep={(direction) =>
            onChange({
              ...settings,
              prepSeconds: stepDuration(
                settings.prepSeconds,
                PREP_TIME,
                direction
              ),
            })
          }
        />
      </SheetRow>

      <SheetRow>
        <Label>Speaking time</Label>
        <Stepper
          label="speaking time"
          value={formatDuration(settings.speakingSeconds)}
          canDecrease={settings.speakingSeconds > SPEAKING_TIME.min}
          canIncrease={settings.speakingSeconds < SPEAKING_TIME.max}
          onStep={(direction) =>
            onChange({
              ...settings,
              speakingSeconds: stepDuration(
                settings.speakingSeconds,
                SPEAKING_TIME,
                direction
              ),
            })
          }
        />
      </SheetRow>
    </Sheet>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text className="text-body font-sans-medium text-text-secondary">
      {children}
    </Text>
  );
}

// The two-option switch on the Topic row. The active one is white with a rule
// under it — an underline drawn as a border rather than textDecorationLine,
// which sits at a different height on iOS than on Android.
function TopicMode({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      // `selected` is what a screen reader announces here; without it both
      // options read identically and the active one is invisible to it.
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Text
        className={`text-body ${
          active ? "font-sans-bold text-text" : "font-sans-medium text-text-secondary"
        }`}
      >
        {label}
      </Text>
      {active ? <View className="mt-1 h-[1.5px] w-full bg-text" /> : null}
    </Pressable>
  );
}
