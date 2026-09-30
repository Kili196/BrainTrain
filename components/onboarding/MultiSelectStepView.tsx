import { View } from "react-native";

import type { MultiSelectStep } from "../../constants/onboarding-steps";
import { useOnboarding } from "../../lib/onboarding-context";
import { ChoiceTile, arcFill } from "./ChoiceTile";

// Pick as many as are true. Two columns of tiles rather than a list of rows: at
// six options a grid is read as a set to choose from, while a stack of
// full-width rows is read as a form to work through.
//
// Nothing here is counted against the player. The answers steer nothing — they
// exist because saying where you notice it is part of deciding to do something
// about it.
export type MultiSelectStepViewProps = {
  step: MultiSelectStep;
};

export function MultiSelectStepView({ step }: MultiSelectStepViewProps) {
  const { answers, toggle } = useOnboarding();
  const chosen = answers[step.key];

  // Pairs, so each row is two equal flex children. flex-wrap with percentage
  // widths would need the gap subtracted by hand.
  const rows: (typeof step.options)[] = [];
  for (let i = 0; i < step.options.length; i += 2) {
    rows.push(step.options.slice(i, i + 2));
  }

  return (
    <View className="gap-3 pt-8">
      {rows.map((row) => (
        <View key={row[0].id} className="flex-row gap-3">
          {row.map((option) => {
            const on = chosen.includes(option.id);
            // The feeds bring their own colours; the symptoms take their
            // place along the subject arc.
            const fill =
              option.fill ?? arcFill(step.options.indexOf(option), step.options.length);
            return (
              <ChoiceTile
                key={option.id}
                label={option.label}
                on={on}
                onPress={() => toggle(step.key, option.id)}
                role="checkbox"
                fill={fill}
                className="min-h-[88px] flex-1"
              />
            );
          })}
          {/* An odd option out keeps its half width instead of stretching. */}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}
