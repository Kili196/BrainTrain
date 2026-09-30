import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import type { YearGridStep } from "../../constants/onboarding-steps";
import { useOnboarding } from "../../lib/onboarding-context";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// Their year, drawn. Three hundred and sixty-five dots, their own figure of them
// burnt out. Nothing here is a new claim: it is the same `daysPerYear`, in a
// form that does not invite anyone to recalculate it — a number you are shown
// how to get is a number you were going to get anyway.
//
// The grid is hidden from screen readers (365 announcements); the figure above
// it carries the same information as one sentence.
export type YearGridStepViewProps = {
  step: YearGridStep;
};

const DAYS = 365;
// Twenty-five across keeps the grid short enough that the footnote stays on a
// phone screen, and a dot is still a dot.
const COLUMNS = 25;
const ROWS = Math.ceil(DAYS / COLUMNS);

// The subject arc laid across the year, January teal to December violet — the
// same six colours the rest of the flow is built from, not a new palette.
const ARC = Object.values(colors.ob.subject);

function tintFor(day: number): string {
  return ARC[Math.min(ARC.length - 1, Math.floor((day / DAYS) * ARC.length))];
}

export function YearGridStepView({ step }: YearGridStepViewProps) {
  const { derived } = useOnboarding();
  const reduceMotion = useReduceMotion();
  const spent = derived.daysPerYear ?? 0;

  // The landing lands every dot on its own delay. 365 animated values is too
  // many for a phone's JS thread, so the grid arrives a row at a time — fifteen
  // values, same impression.
  const rows = useRef(
    Array.from({ length: ROWS }, () => new Animated.Value(reduceMotion ? 1 : 0))
  ).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.stagger(
      60,
      rows.map((row) =>
        Animated.timing(row, { toValue: 1, duration: 400, useNativeDriver: true })
      )
    ).start();
  }, [rows, reduceMotion]);

  return (
    <View className="items-center">
      {/* One element for a screen reader, carrying the sentence the grid
          draws. */}
      <View
        accessible
        accessibilityLabel={`${spent} of the 365 days in a year, spent on ${derived.platformLabel}.`}
        className="items-center"
      >
        <Text
          className="font-sans-extrabold text-[56px] text-ob-text"
          style={{ lineHeight: 52, letterSpacing: -2.5, fontVariant: ["tabular-nums"] }}
        >
          {spent.toLocaleString("en-US")}
        </Text>
        <Text className="mt-2 font-sans-semibold text-[20px] text-ob-bright">{step.unit}</Text>
        <Text className="mt-1 font-sans text-[15px] text-ob-muted">
          on {derived.platformLabel}
        </Text>
      </View>

      <View
        className="mt-6 w-full gap-[3px]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {rows.map((opacity, row) => (
          <Animated.View key={row} style={{ flexDirection: "row", gap: 3, opacity }}>
            {Array.from({ length: COLUMNS }, (_, col) => {
              const day = row * COLUMNS + col;
              // The last row is short; empty cells keep the columns aligned.
              if (day >= DAYS) return <View key={col} style={{ flex: 1 }} />;
              return (
                <View
                  key={col}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 2,
                    // Spent days are matte — no tint. Gone should not look
                    // decorative.
                    backgroundColor: day < spent ? colors.ob.spent : tintFor(day),
                  }}
                />
              );
            })}
          </Animated.View>
        ))}
      </View>

      <Text className="mt-4 text-center font-sans text-[13px] text-ob-muted">
        {step.footnote}
      </Text>
    </View>
  );
}
