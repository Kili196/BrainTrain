import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { Waveform } from "../components/game/Waveform";
import { MicIcon } from "../components/icons/MicIcon";
import { PauseIcon } from "../components/icons/PauseIcon";
import { PlayIcon } from "../components/icons/PlayIcon";
import { ProgressRing } from "../components/ui/ProgressRing";
import {
  DEFAULT_SETTINGS,
  formatDuration,
  loadGameSettings,
  type GameSettings,
} from "../lib/game-settings";
import { useCountdown } from "../lib/use-countdown";
import { useSpeechTranscript } from "../lib/use-speech-transcript";
import { colors } from "../theme/colors";

// The speaking phase, drawn from the "Recording Screen" mockup: the REC pill,
// the topic, a ring around the time, the waveform, and the pause disc.
//
// The microphone is now real: useSpeechTranscript runs the OS on-device speech
// recognizer, so what is said is transcribed live and shown at the bottom. No
// audio or transcript leaves the phone. The pause disc stops and resumes the
// recognizer along with the clock. Because it is a native module it does NOT
// run in Expo Go — a custom dev build is required.
//
// The waveform is still a fixed pattern rather than a real signal, and the
// transcript is shown for now but not yet saved or analysed — those come next.
const RING_SIZE = 230;
const RING_STROKE = 8;

// Design §4 sizes the app's large round buttons at 76–86px. This one carries
// the hard offset shadow every accent-filled button in the app has: the mockup
// draws the disc flat, but §14 is explicit that the press-down is never
// dropped, and the disc on quiz-intro sets the precedent.
const PAUSE_SIZE = 86;
const SHADOW_REST = 6;
const SHADOW_PRESS = 2;
const PRESS_TRAVEL = 4;

export default function Recording() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { title, topicId } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
  }>();

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Null until the stored speaking time arrives — the deadline cannot be set
  // before we know how long it is. See lib/use-countdown for why this is a
  // timestamp and not a counter.
  const [endsAt, setEndsAt] = useState<number | null>(null);

  // The seconds the clock was holding when it was paused, and the only place
  // that number lives while it is stopped. Non-null IS the paused state — a
  // separate boolean could disagree with it.
  const [held, setHeld] = useState<number | null>(null);

  const paused = held !== null;
  const secondsLeft = useCountdown(paused ? null : endsAt);

  // The live on-device transcript. `start` also requests the mic/speech
  // permission the first time it runs.
  const { transcript, status, errorMessage, start, stop } =
    useSpeechTranscript();

  // Begin listening as soon as the speaking phase mounts — the screen only ever
  // mounts in the running (not paused) state. `start` is stable, so this fires
  // once.
  useEffect(() => {
    start();
  }, [start]);

  // Falls back to the stored time until the countdown has its deadline, so the
  // number never flashes a placeholder on the way in.
  const remaining = held ?? secondsLeft ?? settings.speakingSeconds;

  useEffect(() => {
    loadGameSettings().then((stored) => {
      setSettings(stored);
      setEndsAt(Date.now() + stored.speakingSeconds * 1000);
    });
  }, []);

  // The ring runs on its own clock rather than on the countdown's. `secondsLeft`
  // arrives once a second, and an arc redrawn once a second ticks visibly — on
  // a 230px ring one second is several pixels of travel, so it reads as a
  // stutter rather than as time passing. This animates straight to empty over
  // whatever is actually left, and the digits keep their own second-by-second
  // rhythm underneath.
  const ring = useRef(new Animated.Value(1)).current;

  // So the transcript card can keep scrolling to the newest words as they land.
  const transcriptScroll = useRef<ScrollView>(null);

  useEffect(() => {
    // Paused returns before starting anything, so the cleanup of the previous
    // run has already stopped the arc and it holds exactly where it was.
    if (endsAt === null || paused) return;

    const total = settings.speakingSeconds * 1000;
    const left = Math.max(0, endsAt - Date.now());

    // Resuming picks up from the fraction that is left, not from full.
    ring.setValue(total > 0 ? left / total : 0);

    const run = Animated.timing(ring, {
      toValue: 0,
      duration: left,
      // Linear, because it is a clock. Any easing would make it lie.
      easing: Easing.linear,
      // strokeDashoffset is an SVG prop, not a transform — the native driver
      // cannot carry it.
      useNativeDriver: false,
    });

    run.start();
    return () => run.stop();
  }, [endsAt, paused, settings.speakingSeconds, ring]);

  const togglePause = useCallback(() => {
    if (held !== null) {
      // Resuming rebuilds the deadline out of what was left, rather than
      // reusing the old one — which by now is in the past by exactly the pause.
      setEndsAt(Date.now() + held * 1000);
      setHeld(null);
      // Resume listening; the transcript keeps appending to what was already said.
      start();
      return;
    }

    setHeld(secondsLeft ?? settings.speakingSeconds);
    // Pausing the clock pauses the mic too, so nothing is transcribed while stopped.
    stop();
  }, [held, secondsLeft, settings.speakingSeconds, start, stop]);

  const handOffToQuestions = useCallback(() => {
    // How long was actually spoken: the whole speaking time when the clock ran
    // out, less than that when it was cut short here. The intro screen shows it
    // back, and it is the only place that number survives.
    const spoken = settings.speakingSeconds - remaining;

    // replace, not push: a finished speaking phase is not somewhere to come
    // back to.
    router.replace({
      pathname: "/quiz-intro",
      params: { topicId, title, spoken: String(Math.max(0, spoken)) },
    });
  }, [router, topicId, title, settings.speakingSeconds, remaining]);

  // Time is up. The same hand-off the skip link makes: those are the only two
  // ways out of the speaking phase, and they end it identically.
  useEffect(() => {
    if (secondsLeft !== 0) return;
    handOffToQuestions();
  }, [secondsLeft, handOffToQuestions]);

  if (!title) {
    return <Redirect href="/home" />;
  }

  // What the transcript card shows before any words land — it doubles as where
  // a permission refusal or an unavailable recognizer is surfaced, since the
  // transcript is the one place the mic's state is visible.
  const transcriptPlaceholder =
    status === "denied"
      ? "Microphone access is off. Turn it on in Settings to see your words here."
      : status === "error"
        ? errorMessage ??
          "Speech recognition isn't available — this needs a dev build, not Expo Go."
        : "Listening… start speaking and your words will show up here.";

  return (
    <View
      className="flex-1 bg-bg px-6"
      style={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 20 }}
    >
      <View className="flex-row items-center justify-between">
        {/* Ghost, design §4 — leaving a round should not look like the thing to
            do. replace, so an abandoned round is not on the back stack. */}
        <Pressable
          onPress={() => router.replace("/home")}
          accessibilityRole="button"
          accessibilityLabel="Cancel the round and go back home"
          hitSlop={12}
          className="py-2"
        >
          <Text className="text-body font-sans-bold text-text-secondary">
            ← Cancel
          </Text>
        </Pressable>

        {/* The one red thing on the screen. Paused says the word rather than
            only going grey: state carried by colour alone is what §14 and the
            accessibility rules both rule out. */}
        <View
          className={`flex-row items-center gap-2 rounded-full px-3 py-1.5 ${
            paused ? "bg-inactive-fill" : "bg-danger-wash"
          }`}
        >
          <View
            className={`h-1.5 w-1.5 rounded-full ${
              paused ? "bg-text-muted" : "bg-danger"
            }`}
          />
          <Text
            className={`text-eyebrow font-sans-extrabold uppercase tracking-pill ${
              paused ? "text-text-muted" : "text-danger"
            }`}
          >
            {paused ? "Paused" : "Rec"}
          </Text>
        </View>
      </View>

      <View className="mt-7 gap-2.5">
        <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
          Your topic
        </Text>
        <Text className="text-h1 font-sans-extrabold text-text">{title}</Text>
      </View>

      {/* The three live things, spread through what is left of the screen: the
          ring, the waveform, the control. */}
      <View className="flex-1 items-center justify-evenly py-6">
        {/* Drains rather than fills: the ring shows the time that is left,
            which is the question anyone speaking is actually asking. */}
        <ProgressRing size={RING_SIZE} stroke={RING_STROKE} progress={ring}>
          <View className="items-center gap-1.5">
            <MicIcon size={24} color={colors.accent.light} />
            <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-accent-light">
              {paused ? "Paused" : "Recording"}
            </Text>
            <Text
              className="text-timer font-sans-extrabold text-text"
              // Without this the digits change width and the whole number
              // jitters once a second, which on a ring is impossible to miss.
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatDuration(remaining)}
            </Text>
          </View>
        </ProgressRing>

        <Waveform running={!paused} />

        <Pressable
          onPress={togglePause}
          accessibilityRole="button"
          accessibilityLabel={
            paused ? "Resume the speaking time" : "Pause the speaking time"
          }
          accessibilityState={{ selected: paused }}
          hitSlop={12}
        >
          {/* Children as a function — never style as a function: NativeWind's
              jsx runtime drops a function style on a device without a word. */}
          {({ pressed }) => (
            <View style={{ width: PAUSE_SIZE, height: PAUSE_SIZE }}>
              {/* The hard offset shadow as its own layer: React Native clips
                  box-shadow to the content box, so an offset shadow needs a
                  sibling it can slide independently of. */}
              <View
                className="absolute inset-x-0 rounded-full bg-accent-shadow"
                style={{
                  top: pressed ? SHADOW_PRESS : SHADOW_REST,
                  bottom: pressed ? -SHADOW_PRESS : -SHADOW_REST,
                }}
              />
              <View
                className="h-full w-full items-center justify-center rounded-full bg-accent"
                style={{
                  transform: [{ translateY: pressed ? PRESS_TRAVEL : 0 }],
                }}
              >
                {paused ? (
                  <PlayIcon size={30} color={colors.text.DEFAULT} />
                ) : (
                  <PauseIcon size={30} color={colors.text.DEFAULT} />
                )}
              </View>
            </View>
          )}
        </Pressable>
      </View>

      <View className="gap-3">
        {/* The live transcript. A bounded, scrollable card rather than a growing
            block — speech can run long, and letting it push the ring and control
            around would break the layout above it. */}
        <View
          className="gap-2 rounded-lg border bg-card px-4 py-3.5"
          style={{ maxHeight: 150 }}
        >
          <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-faint">
            Transcript
          </Text>
          <ScrollView
            // Keep the newest words in view as the transcript grows, the way a
            // caption track scrolls with speech.
            ref={transcriptScroll}
            onContentSizeChange={() =>
              transcriptScroll.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
          >
            <Text
              className={`text-body font-sans ${
                transcript ? "text-text" : "text-text-muted"
              }`}
            >
              {transcript || transcriptPlaceholder}
            </Text>
          </ScrollView>
        </View>

        {/* Without this the only way on is to sit out the whole speaking time,
            which makes the rest of the round untestable. */}
        <Pressable
          onPress={handOffToQuestions}
          accessibilityRole="button"
          accessibilityLabel="Skip the speaking time and go to the questions"
          hitSlop={12}
          className="items-center py-1"
        >
          <Text className="text-body font-sans-bold text-text-secondary">
            Skip to the questions
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
