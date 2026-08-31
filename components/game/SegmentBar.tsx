import { View } from "react-native";

// The row of segments across the top of the quiz — one per question.
//
// It is progress, not a score: a segment behind you says "answered", never
// "answered correctly". Scoring is all-or-nothing and only revealed at the end,
// and a bar that coloured itself right or wrong would give that away one
// question at a time.
//
// Three states, and the middle one is why this is not a plain progress bar:
// design §1 reserves `accent-light` for the *current* segment, so the segment
// you are on is a step brighter than the ones you have done.
const SEGMENT_HEIGHT = 3;

export type SegmentBarProps = {
  total: number;
  // Zero-based, so it is the same index the questions are addressed by.
  currentIndex: number;
};

export function SegmentBar({ total, currentIndex }: SegmentBarProps) {
  return (
    <View
      className="flex-row gap-1.5"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: currentIndex + 1 }}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          className={`flex-1 rounded-xs ${
            index === currentIndex
              ? "bg-accent-light"
              : index < currentIndex
                ? "bg-accent"
                : "bg-track"
          }`}
          style={{ height: SEGMENT_HEIGHT }}
        />
      ))}
    </View>
  );
}
