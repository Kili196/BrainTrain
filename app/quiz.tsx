import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { AnswerCard } from "../components/game/AnswerCard";
import { QuestionSwap, useQuestionSwap } from "../components/game/QuestionSwap";
import { SegmentBar } from "../components/game/SegmentBar";
import { Button } from "../components/ui/Button";
import { fetchQuizQuestions, type QuizQuestion } from "../lib/topics";
import { useReduceMotion } from "../lib/use-reduce-motion";

// The questions, asked one at a time, after the speaking phase.
//
// Three rules the whole screen is built around:
//   · every question is answered with checkboxes, never a radio;
//   · the player is never told how many answers are correct;
//   · scoring is all-or-nothing — the exact set, or no point.
// Together they are why the control cannot change shape with the answer count,
// why nothing is marked right or wrong as you go, and why both the line under
// the question and the CTA are plural — that plural is the only warning the
// player gets that one tap may not be the whole answer.

// The line above the question. It has no column in the database, so it is
// derived from where you are in the round: an opener, a closer, and something
// to say in between. Written here rather than authored per question, which
// would mean 625 more strings to keep in tune.
function leadIn(index: number, total: number): string {
  if (index === 0) return "Let's start simple.";
  if (index === total - 1) return "Last one.";
  if (index === total - 2) return "Almost done.";
  return "Keep going.";
}

// All-or-nothing: same size, same members. Order is irrelevant — the options
// are a set on screen too, and the player picks them in whatever order.
function isExactlyRight(picked: number[], correct: number[]): boolean {
  return (
    picked.length === correct.length &&
    correct.every((index) => picked.includes(index))
  );
}

// The whole round, packed small enough to travel as route params — they are
// strings by the time they arrive, so anything structured has to be encoded.
// The result screen re-fetches the questions themselves by topic rather than
// having them pushed through here.
//   results — "10110", one character per question, in order.
//   picks   — "0.2|1|3|0.1|2", the options chosen, dots within a question.
function roundParams(
  answers: number[][],
  questions: QuizQuestion[],
  startedAt: number | null
) {
  return {
    results: answers
      .map((picked, index) =>
        isExactlyRight(picked, questions[index].correct_indexes) ? "1" : "0"
      )
      .join(""),
    picks: answers
      .map((picked) => [...picked].sort((a, b) => a - b).join("."))
      .join("|"),
    seconds: String(
      startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0
    ),
  };
}

export default function Quiz() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { topicId, title } = useLocalSearchParams<{
    topicId?: string;
    title?: string;
  }>();

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The questions fly in from the right and leave to the left; the exchange
  // itself happens at the midpoint, while nothing is on screen.
  const reduceMotion = useReduceMotion();
  const { progress, leave, enter } = useQuestionSwap(reduceMotion);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  // Every question's picks, in order. Kept rather than scored away, because the
  // result screen shows the round back question by question — which one went
  // wrong, what was chosen, and why it was wrong.
  const [answers, setAnswers] = useState<number[][]>([]);

  // When the first question appeared. The result screen shows how long the
  // round took, and this is the only place that can know.
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!topicId) return;

    let cancelled = false;

    fetchQuizQuestions(topicId)
      .then((rows) => {
        if (cancelled) return;
        setQuestions(rows);
        startedAt.current = Date.now();
        // The first question arrives like every one after it.
        enter();
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : "Could not load the questions."
        );
      });

    // The screen can be left mid-request — by the hardware back button, or by
    // a deep link somewhere else. Without this, the response lands on a screen
    // that is gone.
    return () => {
      cancelled = true;
    };
  }, [topicId, enter]);

  // Reachable by deep link, where there is no topic. Nothing here means
  // anything without one.
  if (!topicId || !title) {
    return <Redirect href="/home" />;
  }

  const toggle = (option: number) => {
    setPicked((current) =>
      current.includes(option)
        ? current.filter((entry) => entry !== option)
        : [...current, option]
    );
  };

  const advance = () => {
    if (!questions) return;

    // Banked on the way out, so the answer is kept before the question that
    // carried it leaves. `leave` also swallows a second tap while the block is
    // in flight, which would otherwise skip a question.
    const answered = [...answers, picked];

    leave(() => {
      if (index === questions.length - 1) {
        // The round leaves the way a question does — it is gone before what
        // comes next replaces it. replace, not push: an answered round is not
        // somewhere to come back to.
        //
        // Into the analysis rather than straight to the result: the score is
        // already decided here, and `analyzing` only holds it for a moment
        // before handing these same params on.
        router.replace({
          pathname: "/analyzing",
          params: {
            topicId,
            title,
            ...roundParams(answered, questions, startedAt.current),
          },
        });
        return;
      }

      setAnswers(answered);
      setIndex(index + 1);
      setPicked([]);
      enter();
    });
  };

  return (
    <View
      className="flex-1 bg-bg px-6"
      style={{
        paddingTop: insets.top + 44,
        paddingBottom: insets.bottom + 30,
      }}
    >
      {error ? (
        <Message text={error} tone="error" />
      ) : !questions ? (
        // Deliberately quiet: the request is fast and a spinner appearing for
        // 200ms is more noticeable than the wait itself.
        <Message text="Loading the questions…" />
      ) : questions.length === 0 ? (
        <Message text="This topic has no questions yet." />
      ) : (
        <Round
          questions={questions}
          index={index}
          picked={picked}
          progress={progress}
          onToggle={toggle}
          onAdvance={advance}
        />
      )}
    </View>
  );
}

function Round({
  questions,
  index,
  picked,
  progress,
  onToggle,
  onAdvance,
}: {
  questions: QuizQuestion[];
  index: number;
  picked: number[];
  progress: Animated.Value;
  onToggle: (option: number) => void;
  onAdvance: () => void;
}) {
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answered = picked.length > 0;

  return (
    <>
      <SegmentBar total={questions.length} currentIndex={index} />

      {/* The bar above stays put and simply advances — it is the frame. Only
          the question and its answers travel, and the answers are thrown a
          little further, which reads as the two sitting at different depths. */}
      <QuestionSwap progress={progress}>
        <View className="mt-6 gap-2.5">
          <Text className="text-body font-sans text-text-secondary">
            {leadIn(index, questions.length)}
          </Text>

          <Text className="text-h1 font-sans-extrabold text-text">
            {question.question}
          </Text>

          {/* The one thing that says a question can have more than one right
              answer. It never says how many, which is the rule — but without
              it, and with all-or-nothing scoring, someone answering as if these
              were radio buttons loses most of the round without knowing why. */}
          <Text className="text-caption font-sans text-text-muted">
            Pick everything that applies.
          </Text>
        </View>
      </QuestionSwap>

      <QuestionSwap progress={progress} depth={1.4}>
        <View className="mt-7 gap-2.5">
          {question.options.map((option, optionIndex) => (
            <AnswerCard
              // The index, not the text: two options could read the same, and
              // the index is what an answer actually is.
              key={optionIndex}
              title={option}
              selected={picked.includes(optionIndex)}
              onToggle={() => onToggle(optionIndex)}
            />
          ))}
        </View>
      </QuestionSwap>

      {/* Pushes the counter and the CTA to the bottom, so they sit in the same
          place on every question however tall the question above them is. */}
      <View className="flex-1" />

      <Text className="mb-4 text-center text-caption font-sans-medium text-accent-light">
        Question {index + 1} of {questions.length}
      </Text>

      <Button
        label={answered ? (isLast ? "Finish" : "Continue") : "Pick your answers"}
        onPress={onAdvance}
        disabled={!answered}
        // It spends most of the question disabled, so it steps out of the way
        // entirely rather than sitting there as a dimmed blue button.
        disabledStyle="muted"
        accessibilityLabel={
          answered
            ? isLast
              ? "Finish the round"
              : "Continue to the next question"
            : "Pick at least one answer to continue"
        }
      />
    </>
  );
}

function Message({ text, tone }: { text: string; tone?: "error" }) {
  return (
    <View className="flex-1 items-center justify-center">
      <Text
        className={`max-w-[270px] text-center text-body font-sans ${
          tone === "error" ? "text-error" : "text-text-secondary"
        }`}
      >
        {text}
      </Text>
    </View>
  );
}
