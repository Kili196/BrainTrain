import { Pressable, Text, View } from "react-native";

// One answer. The whole card is the hit area (design §6) — the control on the
// right is a read-out, never the only thing you can hit.
//
// It toggles rather than selects: a question can have more than one correct
// answer, and the player is never told how many. That is also why the control
// is drawn identically no matter how many answers are right — the shape of it
// must not leak the count. It is the ring-and-dot from the mockup rather than
// the white-filled square of design §6, which costs nothing here: in this
// design system both controls are round anyway.
const CONTROL_SIZE = 22;
const DOT_SIZE = 10;

export type AnswerCardProps = {
  title: string;
  // The seeded questions are plain strings; the mockup draws a second line
  // under the title. Optional, so the card is right either way.
  subtitle?: string;
  selected: boolean;
  onToggle: () => void;
};

export function AnswerCard({
  title,
  subtitle,
  selected,
  onToggle,
}: AnswerCardProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      className={`w-full flex-row items-center gap-3.5 rounded-md border px-[18px] py-4 ${
        selected ? "border-selected bg-accent-wash" : "bg-card-quiet"
      }`}
    >
      <View className="flex-1 gap-1">
        <Text className="text-h4 font-sans-bold text-text">{title}</Text>

        {subtitle ? (
          <Text
            className={`text-body font-sans ${
              selected ? "text-accent-light" : "text-text-secondary"
            }`}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Ring, and a dot inside it once it is on. Both take the accent-light of
          design §6; the ring sits at 20% white until then. */}
      <View
        className={`items-center justify-center rounded-full border-[1.5px] ${
          selected ? "border-accent-light" : "border-control"
        }`}
        style={{ width: CONTROL_SIZE, height: CONTROL_SIZE }}
      >
        {selected ? (
          <View
            className="rounded-full bg-accent-light"
            style={{ width: DOT_SIZE, height: DOT_SIZE }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
