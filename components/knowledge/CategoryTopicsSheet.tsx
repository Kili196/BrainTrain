import { ScrollView, Text, View } from "react-native";

import { Sheet, SheetRow } from "../ui/Sheet";
import type { KnowledgeCategory, KnowledgeTopic } from "../../lib/knowledge";

// What one category holds, opened by tapping its hub in the net or its row in
// the list. Named for the Knowledge screen rather than called `CategorySheet`,
// which already exists and picks a category to *play* — two sheets about
// categories that answer completely different questions.
//
// It lists every topic, not only the ones that have been played: the point of
// the screen is what is left as much as what is done, and a sheet that hid the
// untouched ones would turn a map into a trophy case.
export type CategoryTopicsSheetProps = {
  category: KnowledgeCategory | null;
  onClose: () => void;
};

export function CategoryTopicsSheet({
  category,
  onClose,
}: CategoryTopicsSheetProps) {
  return (
    <Sheet
      visible={category !== null}
      title={category?.name ?? ""}
      onClose={onClose}
    >
      <Text className="px-5 pb-3 text-body font-sans text-text-secondary">
        {category ? summaryOf(category) : ""}
      </Text>

      {/* 25 rows per category is past a phone's height, so the sheet scrolls
          inside itself rather than growing past the screen. Not a FlatList: the
          list is bounded by the content pool at 25 and already in memory. */}
      <ScrollView
        style={{ maxHeight: 340 }}
        showsVerticalScrollIndicator={false}
      >
        {(category?.topics ?? []).map((topic) => (
          <SheetRow key={topic.slug}>
            <Text
              className={`flex-1 text-h4 ${
                topic.state === "untouched"
                  ? "font-sans text-text-muted"
                  : "font-sans-bold text-text"
              }`}
              numberOfLines={1}
            >
              {topic.title}
            </Text>

            <Mark topic={topic} />
          </SheetRow>
        ))}
      </ScrollView>
    </Sheet>
  );
}

// The right-hand mark: a score once there is one, a dash when there is not.
// Words and numbers rather than a coloured dot, per design §14 — the state has
// to survive being read by someone who cannot tell the colours apart.
function Mark({ topic }: { topic: KnowledgeTopic }) {
  if (topic.state === "untouched") {
    return (
      <Text className="text-caption font-sans text-text-disabled">
        Not played
      </Text>
    );
  }

  if (topic.bestScore === null) {
    // Spoken about, but every quiz on it was skipped. "Played" is the honest
    // word: there is no score to show and inventing a 0 would be a judgement
    // the player never earned.
    return (
      <Text className="text-caption font-sans text-text-muted">Played</Text>
    );
  }

  return (
    <Text
      className={`text-h4 font-sans-extrabold ${
        topic.state === "mastered" ? "text-accent-light" : "text-text-muted"
      }`}
      style={{ fontVariant: ["tabular-nums"] }}
    >
      {topic.bestScore}
    </Text>
  );
}

function summaryOf(category: KnowledgeCategory): string {
  if (category.spoken === 0) {
    return `${category.total} topics waiting. None played yet.`;
  }

  return `${category.mastered} of ${category.total} mastered · ${category.spoken} played`;
}
