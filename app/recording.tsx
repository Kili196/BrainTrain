import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
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
import { colors } from "../theme/colors";

// The speaking phase, drawn from the "Recording Screen" mockup: the REC pill,
// the topic, a ring around the time, the waveform, and the pause disc.
//
// THE MICROPHONE IS NOT REAL. Nothing is captured, nothing is stored, and the
// waveform is a fixed pattern rather than a signal — the line at the bottom of
// the screen says so, and it must keep saying so until there is a recording
// behind it. What is real is the clock, the pause, and the hand-off.
//
// When the recording lands: expo-audio with permissions on both platforms, the
// pause disc pausing the take rather than only the clock, the waveform reading
// metering, and the audio staying on the device — only metadata goes to the
// server, per CLAUDE.md.
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
      return;
    }

    setHeld(secondsLeft ?? settings.speakingSeconds);
  }, [held, secondsLeft, settings.speakingSeconds]);

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

      <View className="items-center gap-3">
        <Text className="max-w-[290px] text-center text-caption font-sans text-text-muted">
          Demo mode — the microphone comes later. Only the clock is real.
        </Text>

        {/* Without this the only way on is to sit out the whole speaking time,
            which makes the rest of the round untestable. */}
        <Pressable
          onPress={handOffToQuestions}
          accessibilityRole="button"
          accessibilityLabel="Skip the speaking time and go to the questions"
          hitSlop={12}
          className="py-1"
        >
          <Text className="text-body font-sans-bold text-text-secondary">
            Skip to the questions
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
