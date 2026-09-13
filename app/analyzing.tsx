import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { useUserId } from "../lib/auth-context";
import { parseOutcomes, scoreFromOutcomes } from "../lib/quiz-score";
import { useRoundSession } from "../lib/round-session";
import { isFinished, saveSpeechSession } from "../lib/speech-sessions";
import { useToast } from "../lib/toast-context";
import { useReduceMotion } from "../lib/use-reduce-motion";

// The beat between the last answer and the result, drawn from the "Analyzing"
// mockup: a number counting up and a line saying what is happening.
//
// It used to claim four things — transcribing the recording, measuring delivery,
// checking facts against sources, writing feedback — and do none of them. There
// was no analysis behind it: the steps were a 5.2s timer with labels on, and the
// result had been decided before the screen mounted.
//
// There is no AI in the MVP, so the four steps were not replaced with four
// truer-sounding ones. Exactly one real thing happens between the quiz and the
// result, and it is this screen that now waits for it: the round is written to
// `speech_sessions`. A list of one is not a list, so the list is gone.
//
// What is left is the number counting up. There is deliberately no ring around
// it: an arc over a network write of unknown length is a lie — nothing can know
// it is 43% done — and drawing the arc to the score instead made it a decoration
// on a number that was already legible. The count itself stays, because the
// score arriving is the point of the screen, and it gives the write a floor to
// finish inside.
const COUNT_MS = 1400;

// Reduced motion still gets the count — the number arriving is the point of the
// screen — but it is over in a beat rather than held.
const COUNT_REDUCED_MS = 400;

// `pending` until the write answers. Both other outcomes leave this screen; the
// difference is whether `quiz-result` still has to offer a retry.
type SaveOutcome = "pending" | "stored" | "unsaved";

export default function Analyzing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const toast = useToast();
  const userId = useUserId();
  const { round, clear } = useRoundSession();

  // The round as it stood when this screen mounted, held still for the write
  // below. It has to be a ref: the write clears the session on success, so an
  // effect that depended on `round` would re-run against an empty one, find
  // nothing to save, and mark the round it had just written as unsaved — the
  // success undoing itself, and the result screen then offering a retry it had
  // no round left to make. One mount is one round here (both the way in and the
  // way out are `router.replace`), so reading it once is the whole guarantee.
  const roundRef = useRef(round);

  // Everything the result screen needs, carried through untouched. This screen
  // reads the title and the marks; the rest it only passes on.
  const { title, topicId, results, picks, seconds } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
    results?: string;
    picks?: string;
    seconds?: string;
  }>();

  const outcomes = parseOutcomes(results);
  const points = scoreFromOutcomes(outcomes);

  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  const [counted, setCounted] = useState(false);
  const [outcome, setOutcome] = useState<SaveOutcome>("pending");

  // The write. In an effect rather than behind a button: a round the player
  // spoke and answered is theirs, and it used to be kept only if they
  // remembered to press "Save round" on the next screen — which the profile
  // screen then counted, or did not.
  useEffect(() => {
    const started = roundRef.current;

    if (!isFinished(started)) {
      // No round to write. In a real round there is always one; the only way
      // here without one is the __DEV__ shortcut on Home.
      setOutcome("unsaved");
      return;
    }

    let cancelled = false;

    saveSpeechSession(started, userId, points)
      .then(() => {
        if (cancelled) return;
        // So the round cannot be written a second time from the result screen.
        // The upsert would collapse it onto the same row anyway; this is the
        // cheaper half of that guarantee.
        clear();
        setOutcome("stored");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // The round stays in memory, so the result screen can still offer the
        // write as a button. Losing the round needs leaving that screen.
        console.warn("[round] could not be saved:", error);
        toast.show("Couldn't save your round — try again");
        setOutcome("unsaved");
      });

    return () => {
      cancelled = true;
    };
  }, [userId, points, clear, toast]);

  useEffect(() => {
    // React Native has no animated Text content, so the value is listened to
    // and rounded — a re-render only on the frames where the number changes.
    const id = progress.addListener(({ value }) => {
      const next = Math.round(value);
      setShown((current) => (current === next ? current : next));
    });

    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    const run = Animated.timing(progress, {
      // Straight to the score: with the ring gone there is no 0–1 arc to drive,
      // so the value counts in points rather than in a fraction of them.
      toValue: points,
      duration: reduceMotion ? COUNT_REDUCED_MS : COUNT_MS,
      // Eased out: a result lands, it does not arrive at constant speed.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    run.start(({ finished }) => {
      if (finished) setCounted(true);
    });

    return () => run.stop();
  }, [progress, points, reduceMotion]);

  useEffect(() => {
    // Both have to be done: the count is the floor, the write is the reason.
    // A write that outlasts the count holds the screen at the score, which is
    // the wait being shown rather than padded.
    if (!counted || outcome === "pending") return;

    // replace, not push: a round that is over is not somewhere to come back to,
    // and the result must not be reachable by going back to a full ring.
    router.replace({
      pathname: "/quiz-result",
      params: {
        topicId,
        title,
        results,
        picks,
        seconds,
        saved: outcome === "stored" ? "1" : "0",
      },
    });
  }, [counted, outcome, router, topicId, title, results, picks, seconds]);

  if (!title || outcomes.length === 0) {
    return <Redirect href="/home" />;
  }

  return (
    <View
      className="flex-1 bg-bg px-6"
      style={{ paddingTop: insets.top + 44, paddingBottom: insets.bottom + 30 }}
    >
      <View className="items-center gap-2.5">
        <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-faint">
          Scoring
        </Text>
        <Text className="text-center text-h1 font-sans-extrabold text-text">
          {title}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <View className="items-center gap-1.5">
          <Text
            className="text-timer font-sans-extrabold text-text"
            style={{ fontVariant: ["tabular-nums"] }}
            // Read out once it has settled rather than counted aloud: the label
            // below names it, so the number needs no sentence of its own.
            accessibilityLabel={`${points} points`}
          >
            {shown}
          </Text>
          <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-faint">
            Points
          </Text>
        </View>
      </View>

      <Text
        className="text-center text-caption font-sans text-text-muted"
        accessibilityLiveRegion="polite"
      >
        {outcome === "pending"
          ? "Saving your round."
          : outcome === "stored"
            ? "Round saved."
            : "Round not saved."}
      </Text>
    </View>
  );
}
