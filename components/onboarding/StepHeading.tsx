import { Text, View } from "react-native";

import { colors } from "../../theme/colors";

// The two-line heading nearly every onboarding step shares: a quiet line that
// sets up and a loud one that lands. Same size, different weight and value —
// that is what makes the second one read as the point rather than as a
// continuation. Set in the landing's look: regular muted over bold, tight
// tracking.
//
// `hero` screens are showcases, so the heading is centred and set larger;
// working screens stay left-aligned, because a question with a control under
// it is read from the left edge like a form.
export type StepHeadingProps = {
  lead?: string;
  title: string;
  body?: string;
  hero?: boolean;
};

// Font size, line height (1.08) and tracking (-0.045em), per band.
const TYPE = {
  hero: { fontSize: 34, lineHeight: 37, letterSpacing: -1.5 },
  strip: { fontSize: 27, lineHeight: 29, letterSpacing: -1.2 },
} as const;

export function StepHeading({ lead, title, body, hero = false }: StepHeadingProps) {
  const align = hero ? "center" : "left";

  return (
    <View className="gap-4">
      {/* One Text with nested runs, so a screen reader reads it as one
          heading and the two lines wrap as one paragraph. */}
      <Text
        accessibilityRole="header"
        style={{ ...TYPE[hero ? "hero" : "strip"], textAlign: align }}
      >
        {lead ? (
          <Text className="font-sans" style={{ color: colors.ob.muted }}>
            {`${lead}\n`}
          </Text>
        ) : null}
        <Text className="font-sans-bold" style={{ color: colors.ob.text }}>
          {title}
        </Text>
      </Text>
      {body ? (
        <Text
          className="font-sans text-[17px] leading-[26px]"
          style={{ color: colors.ob.muted, textAlign: align }}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}
