import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { QuestionReviewSheet } from "../components/game/QuestionReviewSheet";
import { BobbingDots } from "../components/ui/BobbingDots";
import { Button } from "../components/ui/Button";
import { formatDuration } from "../lib/game-settings";
import { useToast } from "../lib/toast-context";
import { fetchQuizQuestions, type QuizQuestion } from "../lib/topics";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { colors } from "../theme/colors";

// The end of a round, drawn from the "Questions Result" mockup: the topic, the
// score out of 100, a chip per question, two figures, and the explanations for
// what went wrong.
//
// Points rather than a fraction — 100 spread over the round, so five questions
// are worth 20 each. The mockup counts ten questions at ten points; the
// database has five per topic and that is what the round asks.
//
// Nothing is saved. Without auth there is no session to save it to — RLS keys
// `speech_sessions` on auth.uid() — so the round is gone the moment you leave.
const TOTAL_POINTS = 100;

// The number counts up rather than appearing: an arriving figure is a result
// being counted out, a printed one is just a label. Same curve the ring had.
const COUNT_MS = 1400;
const COUNT_DELAY_MS = 220;

const CHIP_WIDTH = 44;
const CHIP_HEIGHT = 40;
const CHIP_RADIUS = 14;

// How long the save appears to take. THIS SAVES NOTHING — there is no account
// to save to yet, because without auth RLS keeps `speech_sessions` shut. It is
// here to hold the shape of the real thing, and it must not ship to real users
// in this state: it tells them their round was kept when it was not. When the
// session write exists, `saveRound` below is the only thing that changes.
const FAKE_SAVE_MS = 1800;

export default function QuizResult() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const toast = useToast();

  const { title, topicId, results, picks, seconds } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
    results?: string;
    picks?: string;
    seconds?: string;
  }>();

  // "10110" — one character per question. The screen is deep-linkable, so
  // anything that is not a run of 0s and 1s is treated as no round at all.
  const outcomes = (results ?? "").split("").filter((mark) => mark === "0" || mark === "1");
  const correct = outcomes.filter((mark) => mark === "1").length;
  const total = outcomes.length;
  const points = total > 0 ? Math.round((correct / total) * TOTAL_POINTS) : 0;

  // "0.2|1|3" — what was chosen per question, only needed once a chip is
  // tapped. A missing entry is an empty pick rather than a broken screen.
  const chosen = (picks ?? "")
    .split("|")
    .map((part) =>
      part
        .split(".")
        .map(Number)
        .filter((value) => Number.isInteger(value))
    );

  const elapsed = Number(seconds);

  // The questions themselves are re-fetched rather than pushed through the
  // navigation: five rows with their explanations do not belong in a route
  // param, and this screen is the only place the explanations are ever read.
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // The wait, and then the claim — read on Home rather than here, which is why
  // the toast lives above the navigator. In an effect rather than in the press
  // handler so leaving mid-save clears the timer instead of landing on a screen
  // that is gone; the real request will need exactly the same.
  useEffect(() => {
    if (!saving) return;

    const done = setTimeout(() => {
      toast.show("Round saved");
      router.replace("/home");
    }, FAKE_SAVE_MS);

    return () => clearTimeout(done);
  }, [saving, toast, router]);

  useEffect(() => {
    if (!topicId) return;

    let cancelled = false;

    fetchQuizQuestions(topicId)
      .then((rows) => {
        if (!cancelled) setQuestions(rows);
      })
      // Deliberately quiet: without them the screen loses the review section,
      // not the result.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [topicId]);

  const progress = useRef(new Animated.Value(0)).current;
  const [counted, setCounted] = useState(0);

  useEffect(() => {
    // React Native has no animated Text content, so the value is listened to
    // and rounded — a re-render only on the frames where the number changes.
    const id = progress.addListener(({ value }) => {
      const next = Math.round(value * points);
      setCounted((current) => (current === next ? current : next));
    });

    return () => progress.removeListener(id);
  }, [progress, points]);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);

    const count = Animated.sequence([
      Animated.delay(COUNT_DELAY_MS),
      Animated.timing(progress, {
        toValue: 1,
        duration: COUNT_MS,
        // Slow away, gathering pace, then a long glide into the value.
        easing: Easing.bezier(0.5, 0, 0.1, 1),
        useNativeDriver: false,
      }),
    ]);

    count.start();
    return () => count.stop();
  }, [progress, reduceMotion, points]);

  if (!title || total === 0) {
    return <Redirect href="/home" />;
  }

  const wrong = outcomes
    .map((mark, index) => (mark === "0" ? index : -1))
    .filter((index) => index >= 0);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 44 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="items-center px-6">
          <Text className="text-center text-h1 font-sans-extrabold uppercase text-text">
            {title}
          </Text>

          {/* Baseline-aligned so the small denominator sits on the same line as
              the number rather than in the middle of it. */}
          <View className="mt-4 flex-row items-baseline gap-2">
            <Text
              className="text-timer font-sans-extrabold text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {counted}
            </Text>
            <Text
              className="text-h3 font-sans-extrabold text-text-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              / {TOTAL_POINTS}
            </Text>
          </View>

          {/* One chip per question, in order, coloured by how it went. Wrapping
              rather than a fixed grid: the round is five questions today and
              the row should survive it being anything else. */}
          <View className="mt-6 flex-row flex-wrap justify-center gap-2.5">
            {outcomes.map((mark, index) => (
              <Pressable
                key={index}
                onPress={() => setOpenIndex(index)}
                // Nothing to open until the questions are back.
                disabled={!questions}
                accessibilityRole="button"
                accessibilityLabel={`Question ${index + 1}, ${
                  mark === "1" ? "correct" : "wrong"
                }. Open it.`}
                // No className on this one. NativeWind compiles className into
                // a style and hands React Native `[classStyle, style]` — and an
                // array cannot hold a function, so a `style={({pressed}) => …}`
                // sitting next to a className is dropped without a word. That
                // is what left the chips as bare numbers. Everything the chip
                // needs lives in the function instead.
                style={({ pressed }) => ({
                  width: CHIP_WIDTH,
                  height: CHIP_HEIGHT,
                  borderRadius: CHIP_RADIUS,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    mark === "1" ? colors.result.right : colors.result.wrong,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  className="text-h4 font-sans-extrabold text-text"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {index + 1}
                </Text>
              </Pressable>
            ))}
          </View>

          {questions ? (
            <Text className="mt-3.5 text-caption font-sans text-text-muted">
              Tap a number to see the question
            </Text>
          ) : null}
        </View>

        {/* Full-bleed, so the hairlines run edge to edge as they do in the
            mockup — which is why the padding sits on the cells, not here. */}
        {/* border-t and border-b rather than border-y: React Native has no
            block-axis border width, so the shorthand lands nowhere. */}
        <View className="mt-7 flex-row border-b border-t border-divider">
          <StatCell value={`${correct}/${total}`} label="Correct" />
          <StatCell
            value={
              Number.isFinite(elapsed) && elapsed > 0
                ? formatDuration(Math.round(elapsed))
                : "—"
            }
            label="Time"
            divided
          />
        </View>

        <View className="mt-7 gap-3.5 px-6">
          <View className="gap-1.5">
            <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
              What to review
            </Text>

            {/* What this section will be once the recording is real: a reading
                of what was actually said, not only of the questions missed.
                Said plainly rather than implied, so the thin version does not
                read as the finished one. */}
            <Text className="text-caption font-sans text-text-muted">
              From the questions for now — AI review of your talk is coming
              soon.
            </Text>
          </View>

          {wrong.length === 0 ? (
            <Text className="text-body font-sans text-text-strong">
              Nothing — every question was exactly right.
            </Text>
          ) : !questions ? (
            // Only while a request is actually in flight. Opened without a
            // topic — the dev shortcut on Home does exactly that — there is
            // nothing to wait for, and a permanent "Loading…" would be a lie.
            topicId ? (
              <Text className="text-body font-sans text-text-muted">
                Loading the explanations…
              </Text>
            ) : null
          ) : (
            wrong.map((index) => (
              <View key={index} className="flex-row gap-2.5">
                <View
                  className="mt-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: colors.result.wrong }}
                />
                <Text className="flex-1 text-body font-sans text-text-strong">
                  {questions[index]?.explanation ??
                    "No explanation was stored for this question."}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* The mockup leaves by the tab bar; this screen has none, so it carries
          its own way out — under the save while there is still something to
          save, and as the only action once there is not. */}
      <View
        className="gap-3.5 px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 30 }}
      >
        <Button label="Save round" onPress={() => setSaving(true)} />

        {/* Ghost, per design §4: one filled button to a screen, and leaving
            without saving should not look like the thing to do. */}
        <Pressable
          onPress={() => router.replace("/home")}
          accessibilityRole="button"
          accessibilityLabel="Back to home without saving"
          className="items-center py-1"
        >
          <Text className="text-body font-sans-bold text-text-muted">
            Back to home
          </Text>
        </Pressable>
      </View>

      <QuestionReviewSheet
        visible={openIndex !== null}
        index={openIndex ?? 0}
        question={
          openIndex !== null ? (questions?.[openIndex] ?? null) : null
        }
        picked={openIndex !== null ? (chosen[openIndex] ?? []) : []}
        onClose={() => setOpenIndex(null)}
      />

      {/* Last in the tree, so it covers the screen and the sheet alike. Opaque
          page background rather than a scrim: saving is a moment of its own,
          not something happening over the result. */}
      {saving ? (
        <View className="absolute inset-0 items-center justify-center gap-7 bg-bg">
          <BobbingDots />

          <Text
            className="text-eyebrow font-sans-extrabold uppercase text-text-faint"
            accessibilityLiveRegion="polite"
          >
            Saving your round
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// Two figures side by side, divided by a hairline. The divider belongs to the
// second cell rather than sitting between them, so a third can be added (XP,
// once there is an account to earn it) without moving anything.
function StatCell({
  value,
  label,
  divided,
}: {
  value: string;
  label: string;
  divided?: boolean;
}) {
  return (
    <View
      className={`flex-1 items-center gap-1.5 py-4 ${
        divided ? "border-l border-divider" : ""
      }`}
    >
      <Text
        className="text-h3 font-sans-extrabold text-text"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
        {label}
      </Text>
    </View>
  );
}
