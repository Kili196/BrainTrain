import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ConstellationBackdrop } from "../components/game/ConstellationBackdrop";
import { CountdownOverlay } from "../components/game/CountdownOverlay";
import { FlyAway } from "../components/game/FlyAway";
import { PrepTimer } from "../components/game/PrepTimer";
import { RulesPanel } from "../components/game/RulesPanel";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import {
  DEFAULT_SETTINGS,
  formatDuration,
  loadGameSettings,
  type GameSettings,
} from "../lib/game-settings";
import { useCountdown } from "../lib/use-countdown";
import { colors } from "../theme/colors";

// The round: first what is about to happen, then the preparation running.
//
// Both are one screen rather than two routes, because the topic has to stay
// exactly where it is while everything around it changes. Navigating would
// remount it and it would jump.
//
// Sits at the root of the stack rather than inside (tabs) — a round is a flow,
// not a destination, and it has no tab bar.
//
// The topic arrives as a route param because it was drawn on Home. The two
// durations do not: they are read from the stored round settings, so a route
// param can never disagree with the settings sheet.
type Phase = "ready" | "prep";

// The two phases swap inside a box of their own, so the topic above it does not
// shift when a taller block replaces a shorter one. Tall enough for the 230px
// ring plus its ghost button, which is the larger of the two.
const PHASE_HEIGHT = 290;

// Down and out, like the controls on Home.
const CHROME_DISTANCE = 1.7;
const BACK_DISTANCE = -1.6;

// How long 0:00 is held before the countdown starts, so the ring is seen to
// complete rather than being cut off by the overlay.
const RING_COMPLETE_MS = 400;

export default function Play() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // The title is what the screen shows; `topicId` is only passed along, and is
  // what the round will need once there is one to save.
  const { title, topicId } = useLocalSearchParams<{
    title?: string;
    topicId?: string;
  }>();

  // Same as Home: render the defaults for a frame rather than block the screen
  // on a disk read. The two numbers settle before anyone can act on them.
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("ready");
  const [askSkip, setAskSkip] = useState(false);
  const [counting, setCounting] = useState(false);

  // A deadline rather than a duration, set once when preparation begins. See
  // useCountdown for why it is a timestamp.
  const [prepEndsAt, setPrepEndsAt] = useState<number | null>(null);
  const secondsLeft = useCountdown(prepEndsAt);

  // Where the ring stopped when preparation ended, so it holds that reading
  // behind the countdown instead of jumping back to the full duration.
  const [frozenSeconds, setFrozenSeconds] = useState<number | null>(null);

  useEffect(() => {
    loadGameSettings().then(setSettings);
  }, []);

  // The only way out of preparation — reached by the clock running out or by
  // skipping. Both end at the 3·2·1 countdown.
  //
  // The ring stops where it stands rather than being cleared: it stays visible
  // behind the countdown's dimmed overlay, so the screen the round started on
  // is still there underneath.
  const beginSpeaking = (holdMs: number) => {
    setAskSkip(false);
    setFrozenSeconds(secondsLeft ?? 0);
    setPrepEndsAt(null);

    if (holdMs === 0) {
      setCounting(true);
      return;
    }

    setTimeout(() => setCounting(true), holdMs);
  };

  useEffect(() => {
    if (phase !== "prep" || secondsLeft === null || secondsLeft > 0) return;
    // A beat on 0:00 before the countdown, so the ring is seen to finish. The
    // skip path deliberately has none — there the player has just said they are
    // done waiting.
    beginSpeaking(RING_COMPLETE_MS);
  }, [phase, secondsLeft]);

  const start = () => {
    // Zero preparation is a setting the stepper allows. There is nothing to
    // prepare, so the ring is skipped rather than shown for an instant.
    if (settings.prepSeconds === 0) {
      setPhase("prep");
      beginSpeaking(0);
      return;
    }

    setPhase("prep");
    setPrepEndsAt(Date.now() + settings.prepSeconds * 1000);
  };

  const handOffToRecording = () => {
    // replace, not push: a finished countdown is not somewhere to come back to.
    router.replace({
      pathname: "/recording",
      params: { topicId, title },
    });
  };

  // Reachable by deep link, where there is no topic to play. Nothing on this
  // screen means anything without one, so it hands back to the draw.
  if (!title) {
    return <Redirect href="/home" />;
  }

  const preparing = phase === "prep";

  return (
    // overflow-hidden is what the departing chrome is clipped by; the transforms
    // move it outside the frame, nothing else would cut it off.
    <View className="flex-1 overflow-hidden bg-bg">
      <ConstellationBackdrop />

      <View
        className="flex-1 justify-center gap-8 px-6"
        style={{ paddingBottom: insets.bottom + 30 }}
      >
        {/* The one thing both phases share, and the reason they are one screen. */}
        <View className="items-center gap-2.5">
          <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
            Your topic
          </Text>
          <Text className="text-center text-h1 font-sans-extrabold text-text">
            {title}
          </Text>
        </View>

        <View style={{ height: PHASE_HEIGHT }}>
          {/* Both phases fill the same box. A transform does not change layout,
              so the departing block keeps its space and nothing below it moves
              while it leaves. */}
          {/* justify-center without items-center on purpose: the tiles are
              flex-1 and the button is full width, and both need this column to
              stay the full width rather than shrink to its content. */}
          <View style={StyleSheet.absoluteFill} className="justify-center">
            <FlyAway
              away={preparing}
              distance={CHROME_DISTANCE}
              delayAway={60}
              delayBack={60}
            >
              <View className="gap-8">
                {/* The mockup reads "Speak freely — AI analyzes your spoken
                    response". The MVP has no analysis behind it, so the promise
                    is dropped and only the instruction is left. */}
                <Text className="text-center text-body font-sans text-accent-light">
                  Speak freely
                </Text>

                <View className="flex-row gap-3">
                  <StatTile
                    label="Prep"
                    value={formatDuration(settings.prepSeconds)}
                  />
                  <StatTile
                    label="Speak"
                    value={formatDuration(settings.speakingSeconds)}
                  />
                </View>

                <Button
                  label="Start"
                  variant="hero"
                  onPress={start}
                  accessibilityLabel="Start the round"
                />
              </View>
            </FlyAway>
          </View>

          <View
            className="justify-center"
            // In the style, not as a prop: react-native-web ignores the prop
            // entirely, and this layer sits on top of the one below it — as a
            // prop it swallowed every press on START.
            style={[
              StyleSheet.absoluteFill,
              { pointerEvents: preparing ? "auto" : "none" },
            ]}
          >
            <PrepTimer
              visible={preparing}
              secondsLeft={frozenSeconds ?? secondsLeft ?? settings.prepSeconds}
              totalSeconds={settings.prepSeconds}
              onReady={() => setAskSkip(true)}
            />
          </View>
        </View>

        {/* Below the phase box rather than inside it: the box is a fixed height
            the two phases share, and a panel that grows would have nowhere to
            grow into. Leaves with the rest of the chrome — once the clock runs,
            reading the rules is no longer the job. */}
        <FlyAway
          away={preparing}
          distance={CHROME_DISTANCE}
          delayAway={60}
          delayBack={60}
        >
          <RulesPanel />
        </FlyAway>
      </View>

      {/* Leaves upwards when preparation starts: there is no going back out of
          a running clock, only forward through it or past it. */}
      <View style={{ position: "absolute", top: insets.top + 16, left: 24 }}>
        <FlyAway
          away={preparing}
          distance={BACK_DISTANCE}
          delayAway={0}
          delayBack={120}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            className="flex-row items-center gap-1.5"
          >
            <ArrowLeftIcon size={15} color={colors.text.secondary} />
            <Text className="text-body font-sans-bold text-text-secondary">
              Back
            </Text>
          </Pressable>
        </FlyAway>
      </View>

      <Dialog
        visible={askSkip}
        title="Skip preparation?"
        // Naming the time left is what makes this worth asking at all — the
        // whole point is that the player may not realise how much they are
        // giving up.
        body={`You still have ${formatDuration(
          secondsLeft ?? 0
        )} left. Once you skip, the speaking phase starts right away.`}
        cancelLabel="Keep preparing"
        confirmLabel="Skip"
        onCancel={() => setAskSkip(false)}
        onConfirm={() => beginSpeaking(0)}
      />

      {/* Last in the tree so it paints above everything, the dialog aside. */}
      <CountdownOverlay running={counting} onFinish={handOffToRecording} />
    </View>
  );
}

// Two of these sit side by side under the topic. A filled card rather than a
// divider row, because there are exactly two and they are the screen's only
// data — design §5 allows one filled block per screen and this pair is it.
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-2 rounded-lg border bg-card py-5">
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-secondary">
        {label}
      </Text>
      <Text
        className="text-stat font-sans-extrabold text-text"
        // Non-negotiable on every number in the app: without it the digits
        // change width and a running timer jitters.
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}
