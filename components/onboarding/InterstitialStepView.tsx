import { Text, View } from "react-native";

import type { InterstitialStep } from "../../constants/onboarding-steps";
import { withAlpha } from "../../lib/with-alpha";
import { colors } from "../../theme/colors";

// The step that gives something back. Nothing is asked here — the rule for the
// flow is that no two questions follow each other without a return in between,
// and this is the return.
//
// Two shapes, one component, because they differ only in what sits under the
// heading: a few named points, or the loop drawn as beads on a line.
export type InterstitialStepViewProps = {
  step: InterstitialStep;
};

// The subject arc in the order it already runs, one colour per point or bead.
const TINTS = Object.values(colors.ob.subject);
const tint = (index: number) => TINTS[index % TINTS.length];

export function InterstitialStepView({ step }: InterstitialStepViewProps) {
  const { points, loop } = step;

  return (
    <View>
      {points ? (
        <View className="gap-2 pt-4">
          {points.map((point, index) => (
            // A card each, because plain paragraphs read as one long one and
            // these are separate claims with separate names.
            <View
              key={point.title}
              className="flex-row items-center gap-4 rounded-[14px] border border-ob-border bg-ob-raised py-3 pl-3 pr-4"
            >
              <View className="h-10 w-2 rounded-full" style={{ backgroundColor: tint(index) }} />
              <View className="flex-1 gap-1">
                <Text className="font-sans-bold text-[15px] text-ob-text">{point.title}</Text>
                <Text className="font-sans text-[15px] leading-[22px] text-ob-muted">
                  {point.line}
                </Text>
                {/* The real name, small: something to go and look up. */}
                {point.source ? (
                  <Text className="font-sans text-[13px]" style={{ color: tint(index) }}>
                    {point.source}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {loop ? (
        // Drawn rather than listed: beads on a line, in the order they happen.
        // A bulleted list of the same words says "features"; a line of them
        // says "this comes round again".
        <View className="pt-8">
          {loop.map((stage, index) => {
            const last = index === loop.length - 1;
            return (
              <View key={stage} className="flex-row gap-4">
                <View className="items-center">
                  <View
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: withAlpha(tint(index), 0.22) }}
                  >
                    <Text
                      className="font-sans-semibold text-[13px]"
                      style={{ color: tint(index), fontVariant: ["tabular-nums"] }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  {/* The connector belongs to the bead above it, so the last
                      one has none. */}
                  {last ? null : (
                    <View
                      className="h-6 w-[2px]"
                      style={{ backgroundColor: withAlpha(tint(index), 0.5) }}
                    />
                  )}
                </View>
                <Text className="h-8 flex-1 font-sans text-[15px] leading-8 text-ob-text">
                  {stage}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
