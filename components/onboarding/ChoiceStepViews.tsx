import { useState } from "react";
import { Text, View } from "react-native";

import type { BinaryStep, ScaleStep } from "../../constants/onboarding-steps";
import { useOnboarding } from "../../lib/onboarding-context";
import { colors } from "../../theme/colors";
import { ChoiceTile, arcFill, type ChoiceFill } from "./ChoiceTile";
import { ReplySheet } from "./ReplySheet";

// The two steps that answer back: pick something, and a sheet slides up with a
// reaction. Never a verdict — no score, no percentile, no comparison.
//
// The sheet answers a choice; it does not greet an answer that was already
// there. Coming back to the step with it filled in would otherwise slide the
// reaction up again at a moment when nobody chose anything — so `open` is
// local state set by the tap, not derived from the answer.

// Dark text on the green, white on the red: each reads best that way round.
const YES: ChoiceFill = { colors: [colors.ob.yes], ink: colors.ob.bg };
const NO: ChoiceFill = { colors: [colors.ob.no], ink: colors.ob.text };

export type BinaryStepViewProps = {
  step: BinaryStep;
};

// The explain test. BOTH ANSWERS ARE REAL ANSWERS: they carry the same weight on
// screen and both move the flow on. An onboarding that only works if the player
// admits a failure is a trap, not a question.
export function BinaryStepView({ step }: BinaryStepViewProps) {
  const { answers, set } = useOnboarding();
  const answer = answers[step.key];
  const [open, setOpen] = useState(false);

  const choose = (value: boolean) => {
    set(step.key, value);
    setOpen(true);
  };

  // Held on the last answer, so the sheet has something to say on the way down.
  const reply = answer === false ? step.replies.no : step.replies.yes;

  return (
    <View className="flex-row gap-3 pt-12" accessibilityRole="radiogroup">
      {([true, false] as const).map((value) => {
        const on = answer === value;
        const label = value ? step.yes : step.no;
        return (
          // Two tiles of the same size and weight. The moment one is quieter,
          // the screen is telling them which answer it wants. Chosen, they
          // take the colours of yes and no — the size stays equal, only the
          // answer given lights up.
          <ChoiceTile
            key={label}
            label={label}
            on={on}
            onPress={() => choose(value)}
            role="radio"
            fill={value ? YES : NO}
            className="min-h-[72px] flex-1"
          />
        );
      })}

      <ReplySheet
        open={open}
        title={reply.title}
        body={reply.body}
        onDismiss={() => setOpen(false)}
      />
    </View>
  );
}

export type ScaleStepViewProps = {
  step: ScaleStep;
};

const POINTS = [1, 2, 3, 4, 5] as const;

// Five points, and an answer back the moment one is picked.
export function ScaleStepView({ step }: ScaleStepViewProps) {
  const { answers, set } = useOnboarding();
  const value = answers.pressure;
  const [open, setOpen] = useState(false);

  const choose = (point: number) => {
    set("pressure", point);
    setOpen(true);
  };

  const describe = (point: number) =>
    point === 1 ? step.low : point === 5 ? step.high : `${point} of 5`;

  return (
    <View className="pt-12">
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {POINTS.map((point) => {
          const on = value === point;
          return (
            <ChoiceTile
              key={point}
              label={String(point)}
              on={on}
              onPress={() => choose(point)}
              role="radio"
              accessibilityLabel={describe(point)}
              // 1 to 5 runs along the subject arc, teal to violet.
              fill={arcFill(point - 1, POINTS.length)}
              className="aspect-square flex-1 px-0 py-0"
              numeric
              tick={false}
            />
          );
        })}
      </View>

      <View className="mt-3 flex-row justify-between" importantForAccessibility="no-hide-descendants">
        <Text className="font-sans text-[13px] text-ob-muted">{step.low}</Text>
        <Text className="font-sans text-[13px] text-ob-muted">{step.high}</Text>
      </View>

      <ReplySheet
        open={open}
        body={value === null ? "" : step.responses[value - 1]}
        onDismiss={() => setOpen(false)}
      />
    </View>
  );
}
