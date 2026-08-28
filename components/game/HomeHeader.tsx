import { Pressable, Text, View } from "react-native";

import { StreakFlame } from "./StreakFlame";

// The top of Home: the wordmark, and a row of the three things that carry
// progress — achievements, the streak, challenges.
//
// The row is three equal cells rather than a space-between, so the flame sits
// on the exact centre of the screen no matter how long the two labels are. It
// is the only coloured thing up here and it has to line up with the topic on
// the stage below it.
export type HomeHeaderProps = {
  streakDays: number;
  hasNewChallenge: boolean;
};

export function HomeHeader({ streakDays, hasNewChallenge }: HomeHeaderProps) {
  return (
    <View className="gap-6 border-b border-divider pb-6">
      {/* Two colours in one line of text, so it stays one word: BRAIN in
          white, TRAIN in the accent. */}
      <Text
        className="text-center text-h3 font-sans-extrabold uppercase text-text"
        style={{ letterSpacing: 2.4 }}
      >
        Brain
        <Text className="text-accent-light">Train</Text>
      </Text>

      <View className="flex-row items-center">
        <View className="flex-1 items-start">
          <NavLabel label="Achievements" />
        </View>

        <View className="flex-1 items-center">
          <StreakFlame days={streakDays} />
        </View>

        <View className="flex-1 items-end">
          <NavLabel label="Challenges" marked={hasNewChallenge} />
        </View>
      </View>
    </View>
  );
}

function NavLabel({ label, marked = false }: { label: string; marked?: boolean }) {
  return (
    <Pressable
      // Neither screen exists yet. Same call as START on the round: the control
      // is drawn in full and waits, rather than navigating somewhere that isn't
      // there.
      onPress={() => {}}
      accessibilityRole="button"
      // The dot is decoration for anyone who can see it; for anyone who cannot,
      // the label has to carry the same information.
      accessibilityLabel={marked ? `${label}, new` : label}
      hitSlop={10}
    >
      <View>
        <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
          {label}
        </Text>
        {marked ? (
          <View className="absolute -right-2.5 -top-1 h-1.5 w-1.5 rounded-full bg-danger" />
        ) : null}
      </View>
    </Pressable>
  );
}
