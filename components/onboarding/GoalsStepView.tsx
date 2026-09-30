import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { GoalsStep } from "../../constants/onboarding-steps";
import { useOnboarding } from "../../lib/onboarding-context";
import { withAlpha } from "../../lib/with-alpha";
import { colors } from "../../theme/colors";

// The player assembles the plan themselves, which is the point: what a person
// puts together they rate higher than what they were handed. (The landing asks
// for a preparation time here as well; the app leaves that to the round
// settings.)
//
// A chosen row is filled with its own colour and sets its text in the page's
// black: on a near-black page the lit thing is the light thing, and dark text on
// a bright fill reads where white text on this teal would not.
export type GoalsStepViewProps = {
  step: GoalsStep;
};

// The page black at 22%, for the circles inside a filled row.
const HOLE = withAlpha(colors.ob.bg, 0.22);

function Glyph({ d, color, size = 18 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={d}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GoalsStepView({ step }: GoalsStepViewProps) {
  const { answers, toggle } = useOnboarding();

  return (
    <View className="gap-2 pt-6">
      {step.options.map((option) => {
        const on = answers.goals.includes(option.id);
        const ink = on ? colors.ob.bg : option.tint;
        return (
          <Pressable
            key={option.id}
            onPress={() => toggle("goals", option.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${option.label}, ${option.hint}`}
            className="flex-row items-center gap-3 rounded-[14px] border px-3 py-2 active:opacity-80"
            style={{
              borderColor: on ? option.tint : colors.ob.border,
              backgroundColor: on ? option.tint : colors.ob.raised,
            }}
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: on ? HOLE : withAlpha(option.tint, 0.2) }}
            >
              <Glyph d={option.icon} color={ink} />
            </View>

            <View className="flex-1">
              <Text
                className="font-sans-bold text-[15px]"
                style={{ color: on ? colors.ob.bg : colors.ob.text }}
              >
                {option.label}
              </Text>
              <Text
                className="font-sans text-[13px]"
                style={{ color: on ? withAlpha(colors.ob.bg, 0.7) : colors.ob.muted }}
              >
                {option.hint}
              </Text>
            </View>

            <View
              className="h-6 w-6 items-center justify-center rounded-full"
              style={{
                borderWidth: on ? 0 : 1,
                borderColor: colors.ob.border,
                backgroundColor: on ? HOLE : "transparent",
              }}
            >
              {on ? <Glyph d="M5 13 L10 18 L19 7" color={colors.ob.bg} size={14} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
