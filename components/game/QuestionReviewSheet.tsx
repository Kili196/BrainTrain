import { Text, View } from "react-native";

import { Sheet } from "../ui/Sheet";
import type { QuizQuestion } from "../../lib/topics";
import { colors } from "../../theme/colors";

// One question, opened from its chip on the result screen. The only place in
// the app where the player is ever told what was actually right.
//
// Every row says what it is in words as well as in colour ("Correct", "You
// picked"), because colour alone may not carry meaning — and here it would be
// carrying the entire point of the screen.
export type QuestionReviewSheetProps = {
  visible: boolean;
  index: number;
  question: QuizQuestion | null;
  picked: number[];
  onClose: () => void;
};

export function QuestionReviewSheet({
  visible,
  index,
  question,
  picked,
  onClose,
}: QuestionReviewSheetProps) {
  return (
    <Sheet
      visible={visible && question !== null}
      title={`Question ${index + 1}`}
      onClose={onClose}
    >
      {question ? (
        <View className="gap-4 px-5 pb-5">
          <Text className="text-h4 font-sans-bold text-text">
            {question.question}
          </Text>

          <View className="gap-2">
            {question.options.map((option, optionIndex) => (
              <OptionRow
                key={optionIndex}
                option={option}
                right={question.correct_indexes.includes(optionIndex)}
                chosen={picked.includes(optionIndex)}
              />
            ))}
          </View>

          {question.explanation ? (
            <View className="gap-2">
              <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
                Why
              </Text>
              <Text className="text-body font-sans text-text-secondary">
                {question.explanation}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

function OptionRow({
  option,
  right,
  chosen,
}: {
  option: string;
  right: boolean;
  chosen: boolean;
}) {
  // Four states, three of which are worth marking: right, wrongly picked, and
  // right-and-picked. An option that was neither stays plain — it is only there
  // for context.
  const tone = right ? "right" : chosen ? "wrong" : null;

  const label = right
    ? chosen
      ? "Correct · you picked it"
      : "Correct"
    : chosen
      ? "You picked this"
      : null;

  return (
    <View
      className="gap-1.5 rounded-md border px-4 py-3"
      style={{
        borderColor:
          tone === "right"
            ? colors.result.right
            : tone === "wrong"
              ? colors.result.wrong
              : colors.border.DEFAULT,
        backgroundColor:
          tone === "right"
            ? colors.result["right-wash"]
            : tone === "wrong"
              ? colors.result["wrong-wash"]
              : colors["card-quiet"],
      }}
    >
      <Text className="text-body font-sans text-text">{option}</Text>

      {label ? (
        <Text
          className="text-eyebrow font-sans-extrabold uppercase"
          style={{
            color: tone === "right" ? colors.result.right : colors.result.wrong,
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
