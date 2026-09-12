import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { CategorySheet } from "../../components/game/CategorySheet";
import { PlayModeSheet } from "../../components/game/PlayModeSheet";
import { SettingsSheet } from "../../components/game/SettingsSheet";
import { ConstellationBackdrop } from "../../components/game/ConstellationBackdrop";
import { FlyAway } from "../../components/game/FlyAway";
import { HomeHeader } from "../../components/game/HomeHeader";
import { StageTopic } from "../../components/game/StageTopic";
import { ORBIT_POOL_SIZE, TopicOrbit } from "../../components/game/TopicOrbit";
import { GearIcon } from "../../components/icons/GearIcon";
import { Button } from "../../components/ui/Button";
import {
  DEFAULT_SETTINGS,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from "../../lib/game-settings";
import type { CategoryKey } from "../../constants/categories";
import {
  PLACEHOLDER_HAS_NEW_CHALLENGE,
  PLACEHOLDER_STREAK_DAYS,
} from "../../constants/placeholders";
import {
  hasSeenDailyTopic,
  markDailyTopicSeen,
} from "../../lib/daily-topic-seen";
import { clearOnboarding } from "../../lib/onboarding-storage";
import { useRoundSession } from "../../lib/round-session";
import { useRoundStart } from "../../lib/round-start-context";
import {
  fetchDailyTopic,
  fetchRandomTopic,
  fetchRandomTopics,
} from "../../lib/topics";
import { useTopicDraw } from "../../lib/use-topic-draw";
import { colors } from "../../theme/colors";

// The end of a draw, from the mockup: hold the landed topic for 300ms, then
// fade to black, and navigate at 620ms — 280ms of fade plus 40ms of margin, so
// the round opens onto a screen that is already black.
const FADE_START_MS = 300;
const HANDOFF_DELAY_MS = 620;

// The stage does not leave with the chrome, it grows.
const STAGE_FOCUS_SCALE = 1.1;
const STAGE_MS = 720;
const STAGE_EASING = Easing.bezier(0.5, 0, 0.2, 1);

// Home: a topic on the stage, a constellation of other topics behind it, and
// PLAY, which asks where this round's topic should come from. The wordmark, the
// achievements/challenges row and the mode pills are deliberately not here yet.
export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // The titles drifting behind the stage. Drawn once on mount and then left
  // alone: they are scenery, and re-rolling them on every PLAY would turn the
  // background into a second thing competing for attention. They double as the
  // reel the draw spins through.
  const [backdrop, setBackdrop] = useState<string[]>([]);

  // The y of the hairline under the header, measured rather than guessed: the
  // header's height depends on the streak, the notification dot and the type
  // the OS hands us. The star field starts there — see below.
  const [headerBottom, setHeaderBottom] = useState(0);

  const { topic, title, isDrawing, error, draw } = useTopicDraw(backdrop);

  // Owned by the tab layout, because the black layer has to cover the tab bar
  // and the tab bar has to slide with everything else.
  const { starting, setStarting, setFading } = useRoundStart();
  const { begin } = useRoundSession();

  const stageScale = useRef(new Animated.Value(1)).current;

  // Starts from the defaults and swaps in the stored values once they arrive.
  // Rendering defaults for one frame beats blocking the screen on a disk read —
  // the settings are not visible until the sheet opens anyway.
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // One value rather than a boolean per sheet: the two are mutually exclusive
  // by construction, so there is no state in which both are open. Stacked
  // modals are unreliable on Android anyway.
  const [openSheet, setOpenSheet] = useState<
    "none" | "mode" | "settings" | "category"
  >("none");

  // Drives the red dot on the daily entry: true until today's topic has been
  // opened on this device.
  const [isDailyUnseen, setDailyUnseen] = useState(false);

  useEffect(() => {
    loadGameSettings().then(setSettings);

    hasSeenDailyTopic().then((seen) => setDailyUnseen(!seen));

    // Twice as many as the ring needs, keeping the shortest half.
    //
    // The mockup's ellipse was drawn around 13–19 character labels. Our topics
    // run to 42 ("Incognito mode does not make you anonymous"), and a label
    // wider than the ellipse itself sits across its neighbours permanently — no
    // radius or spacing fixes that, only narrower words. Sorting a random draw
    // by length keeps the labels inside the geometry while still handing the
    // ring different topics on every mount.
    fetchRandomTopics(ORBIT_POOL_SIZE * 2)
      .then((topics) =>
        setBackdrop(
          topics
            .map((entry) => entry.title)
            .sort((a, b) => a.length - b.length)
            .slice(0, ORBIT_POOL_SIZE)
        )
      )
      // Scenery failing is not worth telling the user about — the screen works
      // perfectly well without it.
      .catch(() => setBackdrop([]));
  }, []);

  // The reel has landed: hold the topic on the stage for a beat, raise the
  // black layer, and leave once it is opaque. The pause is the mockup's —
  // without it the screen goes before the word that was just drawn can be read.
  //
  // Keyed on the topic rather than on a callback out of the draw, because a
  // topic can only ever appear here by being drawn. Redrawing during the pause
  // cancels both timers and starts the wait again.
  useEffect(() => {
    if (!topic) return;

    const toBlack = setTimeout(() => setFading(true), FADE_START_MS);
    const handoff = setTimeout(() => {
      // Here rather than on /play, because this is the last place the whole
      // topic exists: the navigation carries the id and the title, and the
      // table needs the slug.
      begin(topic);

      router.push({
        pathname: "/play",
        params: { topicId: topic.id, title: topic.title },
      });
    }, HANDOFF_DELAY_MS);

    return () => {
      clearTimeout(toBlack);
      clearTimeout(handoff);
    };
  }, [topic, router, setFading, begin]);

  // A draw that ends without a topic — a failed request, or a pool with nothing
  // left in it — never reaches the hand-off above, so the chrome would stay off
  // screen and take the PLAY button with it. Every draw ends either with a new
  // topic or with an error, so this is the other half of that pair.
  useEffect(() => {
    if (error) setStarting(false);
  }, [error, setStarting]);

  // Coming back from a round. Clearing both flags flies the chrome in again —
  // with the delays reversed, so the way back is not the way out rewound.
  useFocusEffect(
    useCallback(() => {
      setStarting(false);
      setFading(false);
    }, [setStarting, setFading])
  );

  // The stage grows while the chrome leaves: a slower curve and a gentler
  // easing than the chrome, so one settles while the other snaps.
  useEffect(() => {
    const animation = Animated.timing(stageScale, {
      toValue: starting ? STAGE_FOCUS_SCALE : 1,
      duration: STAGE_MS,
      easing: STAGE_EASING,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [starting, stageScale]);

  // Write on every press rather than on close: the sheet has no Cancel, so
  // there is nothing to roll back, and closing it by tapping the scrim must not
  // be able to lose a change.
  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    void saveGameSettings(next);
  };

  // Choosing a category is what switches the mode — the "By category" label
  // only opens this picker. Closing it without a choice therefore leaves the
  // mode alone instead of arming a category draw with no category.
  const selectCategory = (categoryKey: CategoryKey) => {
    updateSettings({ ...settings, topicMode: "category", categoryKey });
    setOpenSheet("settings");
  };

  // Both modes share the same shape: fetch, spin the reel onto the result, and
  // say something useful when there is nothing to show. Only where the topic
  // comes from differs, so that is the one thing passed in.
  // Both modes fly the chrome away: it is the same round beginning, and the
  // draw only differs in where the topic comes from.
  const drawStandard = () => {
    setOpenSheet("none");
    setStarting(true);
    draw(
      // Random mode passes nothing and draws from the whole pool; category mode
      // passes the chosen key. `categoryKey` is only ever non-null once a
      // category was actually picked, so the mode check is the only guard.
      () =>
        fetchRandomTopic(
          settings.topicMode === "category" ? settings.categoryKey : null
        ),
      "No topics available yet."
    );
  };

  const drawDaily = () => {
    setOpenSheet("none");
    setStarting(true);
    draw(async () => {
      const daily = await fetchDailyTopic();

      // Only counts as seen once one actually arrived — an exhausted pool or a
      // failed request must not clear the dot.
      if (daily) {
        setDailyUnseen(false);
        void markDailyTopicSeen();
      }

      return daily;
    }, "You have learned every topic there is. Nothing new for today.");
  };

  const reset = async () => {
    await clearOnboarding();
    router.replace("/welcome");
  };

  return (
    // Two layers: the star field edge to edge, and the padded content on top of
    // it. The backdrop sits outside the padding on purpose — Yoga insets
    // absolutely positioned children by the parent's padding, so from inside it
    // the field would stop short of the screen edges.
    <View className="flex-1 bg-bg">
      {/* Home is the one screen that starts the field below its header: the
          achievements, streak and challenges row needs a clean ground, and a
          star behind that row is noise rather than atmosphere. Every other
          screen gets the whole field. */}
      <ConstellationBackdrop top={headerBottom} />

      <View
        className="flex-1 px-5"
        style={{
          paddingTop: insets.top + 44,
          paddingBottom: insets.bottom + 30,
        }}
      >
        {/* Leaves upwards, and is the first to go. */}
        <FlyAway away={starting} distance={-1.6} delayAway={0} delayBack={120}>
          <View
            // y is already measured from the top of the screen — Yoga reports a
            // child's position inside the parent's border box, so the padding
            // above is included. The fly-away's transform is not, which is what
            // we want: the field must not follow the header off-screen.
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setHeaderBottom(y + height);
            }}
          >
            <HomeHeader
              streakDays={PLACEHOLDER_STREAK_DAYS}
              hasNewChallenge={PLACEHOLDER_HAS_NEW_CHALLENGE}
            />
          </View>
        </FlyAway>

        {/* The stage never leaves — it grows, on a slower curve than the chrome,
            so it reads as settling into place while everything else snaps away. */}
        <Animated.View
          // Plain styles rather than classes: NativeWind's className is not wired
          // through Animated components.
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: stageScale }],
          }}
        >
          {/* The topic lives inside the ring, not beside it — the ring is the
              drag surface, and touches only ever travel up the tree. */}
          <TopicOrbit titles={backdrop} locked={isDrawing}>
            <StageTopic title={title ?? "Your topic"} />
          </TopicOrbit>

          {/* Caption under the stage. Fixed height so landing a draw cannot shift
              the ring above it; the tracking is the mockup's 0.12em at 10px,
              which sits between the eyebrow and button tokens. */}
          <View className="mt-1.5 h-6 justify-center">
            <Text
              className={`text-center text-eyebrow font-sans-bold uppercase ${
                isDrawing ? "text-accent" : "text-text-muted"
              }`}
              style={{ letterSpacing: 1.2 }}
            >
              {isDrawing ? "Topic drawn" : ""}
            </Text>
          </View>

          {error ? (
            <Text className="mt-4 text-center text-body font-sans text-error">
              {error}
            </Text>
          ) : null}
        </Animated.View>

        {/* Everything below the stage leaves as one block, downwards, just after
            the header starts up. */}
        <FlyAway away={starting} distance={2.05} delayAway={60} delayBack={60}>
          <View className="items-center gap-4">
            <Pressable
              onPress={() => setOpenSheet("settings")}
              accessibilityRole="button"
              accessibilityLabel="Round settings"
              hitSlop={12}
            >
              <GearIcon size={20} color={colors.text.muted} />
            </Pressable>

            <Button
              // The label stays put during a draw — the reel and the caption
              // already say what is happening, and the hero button reflowing
              // mid-spin would pull the eye away from the one place it should be.
              label="Play"
              onPress={() => setOpenSheet("mode")}
              disabled={isDrawing}
              variant="hero"
              accessibilityLabel="Play — choose where the topic comes from"
            />

            {/* Dev convenience: re-run onboarding without reinstalling. Ghost
                styling on purpose — the screen may only ever have one filled
                button. Behind __DEV__, like the shortcut below it: this has no
                business in a build either. */}
            {__DEV__ ? (
              <Pressable
                onPress={reset}
                accessibilityRole="button"
                className="py-2"
              >
                <Text className="text-body font-sans-bold text-text-muted">
                  Reset onboarding
                </Text>
              </Pressable>
            ) : null}

            {/* The result screen otherwise costs a whole round to look at. Behind
                __DEV__, unlike the row above it: that one is a convenience, this
                one is a shortcut straight past the game and has no business in a
                build.

                It draws a real topic on the way, because the result screen
                re-fetches its questions by id: without one, `questions` stays
                null, the chips are disabled and the review section has nothing to
                show — two thirds of the screen this shortcut exists to look at.
                The outcomes stay invented; only the topic is real. */}
            {__DEV__ ? (
              <Pressable
                onPress={async () => {
                  // Quiet on failure: a shortcut that lands without explanations
                  // is still worth more than one that does nothing.
                  const topic = await fetchRandomTopic().catch(() => null);

                  router.push({
                    pathname: "/quiz-result",
                    params: {
                      ...(topic ? { topicId: topic.id } : {}),
                      title: topic?.title ?? "Test round",
                      results: "10110",
                      picks: "0|1.2|0|2|3",
                      seconds: "192",
                    },
                  });
                }}
                accessibilityRole="button"
                className="py-2"
              >
                <Text className="text-body font-sans-bold text-text-muted">
                  Show a round result
                </Text>
              </Pressable>
            ) : null}
          </View>
        </FlyAway>

        {/* Sheets are Modals, so where they sit in the tree does not affect the
            layout — and the fly-away cannot catch them. */}
        <PlayModeSheet
          visible={openSheet === "mode"}
          dailyUnseen={isDailyUnseen}
          onStandard={drawStandard}
          onDaily={drawDaily}
          onClose={() => setOpenSheet("none")}
        />

        <SettingsSheet
          visible={openSheet === "settings"}
          settings={settings}
          onChange={updateSettings}
          onPickCategory={() => setOpenSheet("category")}
          onClose={() => setOpenSheet("none")}
        />

        <CategorySheet
          visible={openSheet === "category"}
          selected={settings.categoryKey}
          onSelect={selectCategory}
          // Backing out returns to the settings sheet rather than to the screen,
          // so the picker behaves like a step inside it and not like a detour.
          onClose={() => setOpenSheet("settings")}
        />
      </View>
    </View>
  );
}
