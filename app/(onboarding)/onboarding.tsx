import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArrowLeftIcon } from "../../components/icons/ArrowLeftIcon";
import {
  CHROME_EASING,
  CHROME_OPACITY_MS,
  CHROME_TRANSFORM_MS,
  FADE_EASING,
} from "../../components/game/FlyAway";
import { CarouselStepView } from "../../components/onboarding/CarouselStepView";
import { BinaryStepView, ScaleStepView } from "../../components/onboarding/ChoiceStepViews";
import { CommitmentStepView } from "../../components/onboarding/CommitmentStepView";
import {
  CountryStepView,
  DateStepView,
  TextStepView,
} from "../../components/onboarding/FieldStepViews";
import { GoalsStepView } from "../../components/onboarding/GoalsStepView";
import { Gradient } from "../../components/onboarding/Gradient";
import { InterstitialStepView } from "../../components/onboarding/InterstitialStepView";
import { MultiSelectStepView } from "../../components/onboarding/MultiSelectStepView";
import { OutroStepView } from "../../components/onboarding/OutroStepView";
import { PillButton } from "../../components/onboarding/PillButton";
import { SliderStepView } from "../../components/onboarding/SliderStepView";
import { StepHeading } from "../../components/onboarding/StepHeading";
import { TrialStepView } from "../../components/onboarding/TrialStepView";
import { WelcomeStepView } from "../../components/onboarding/WelcomeStepView";
import { YearGridStepView } from "../../components/onboarding/YearGridStepView";
import {
  ONBOARDING_STEPS,
  resolve,
  type OnboardingStep,
  type StepKind,
} from "../../constants/onboarding-steps";
import { useUserId } from "../../lib/auth-context";
import { useOnboarding } from "../../lib/onboarding-context";
import { saveProfile } from "../../lib/profile";
import { useToast } from "../../lib/toast-context";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// The frame every onboarding step is shown in.
//
// ONE screen for the whole flow, with the current step held in state — not a
// route per step. In expo-router every route push mounts a new screen on the
// stack, so the header would be torn down and rebuilt on each step: the
// progress bar would jump instead of sliding, and twenty screens would pile up
// behind the last one. Keeping one screen alive is what the landing gets from
// Angular reusing its component; here it has to be done on purpose.
//
// Three rows that never move — back + progress, the step itself, one button at
// the bottom — so every step lands its controls in the same place.
//
// The look is the landing's, not the app's design system (Fabian's call,
// 2026-09-29): its colours live in `colors.ob` and nowhere else.

// Every step arrives in two beats: the content rises in, then the forward
// button follows. The button is not there — and cannot be pressed — until its
// beat has landed, which is what stops the flow being tapped straight through
// (Fabian, 2026-09-29: "ich kann einfach die buttons spamen bis ich durch
// bin"). A first try greyed the button out for a timed "dwell"; that read as
// the app holding the player back. An entrance reads as the screen arriving.
//
// When the button comes in, per step: the welcome waits for its name to finish
// landing, showcase steps give their copy a beat longer than working steps.
function buttonDelay(step: OnboardingStep): number {
  if (step.kind === "welcome") return 1400;
  return step.band === "hero" ? 650 : 400;
}
const CONTENT_MS = 320;
// The pill arrives the way the round chrome comes back when a game ends
// (components/game/FlyAway.tsx): travel and fade as two timings on the native
// driver — the move on the app's snap curve, the fade quicker — so it is fully
// visible while still gliding into place. Fabian asked for it to feel like
// those animations rather than the springy first try.
const BUTTON_TRAVEL = 96;
// A tap counts once the pill is most of the way home.
const BUTTON_READY_MS = CHROME_TRANSFORM_MS * 0.6;
// A page turn in the carousel (its TURN_MS), so two quick taps turn one page
// each rather than skipping one.
const PAGE_TURN_MS = 520;

// Steps that must not sit inside the vertical ScrollView. The carousel pages
// sideways and the country list is a FlatList of its own. The slider and the
// check pad are dragged: inside a ScrollView the native scroll gesture wins on
// iOS, so drawing the check scrolled the page along with the finger. Their
// content fits a screen, so they simply get no ScrollView at all.
const SELF_SCROLLING: ReadonlySet<StepKind> = new Set<StepKind>([
  "carousel",
  "country",
  "slider",
  "commitment",
]);

// The loud line of the heading. Welcome, carousel and year grid carry their own.
function titleOf(step: OnboardingStep) {
  switch (step.kind) {
    case "welcome":
    case "carousel":
    case "year-grid":
      return null;
    case "slider":
    case "multi-select":
    case "text":
    case "date":
    case "country":
    case "scale":
    case "goals":
      return step.question;
    default:
      return step.headline;
  }
}

function bodyOf(step: OnboardingStep) {
  return "body" in step ? step.body : undefined;
}

type StepContentProps = {
  step: OnboardingStep;
  onSubmit: () => void;
  page: number;
  onPageChange: (page: number) => void;
};

function StepContent({ step, onSubmit, page, onPageChange }: StepContentProps) {
  switch (step.kind) {
    case "welcome":
      return <WelcomeStepView step={step} />;
    case "carousel":
      return <CarouselStepView step={step} page={page} onPageChange={onPageChange} />;
    case "slider":
      return <SliderStepView step={step} />;
    case "interstitial":
      return <InterstitialStepView step={step} />;
    case "year-grid":
      return <YearGridStepView step={step} />;
    case "binary":
      return <BinaryStepView step={step} />;
    case "multi-select":
      return <MultiSelectStepView step={step} />;
    case "text":
      return <TextStepView step={step} onSubmit={onSubmit} />;
    case "date":
      return <DateStepView step={step} />;
    case "country":
      return <CountryStepView step={step} />;
    case "scale":
      return <ScaleStepView step={step} />;
    case "commitment":
      return <CommitmentStepView step={step} />;
    case "trial":
      return <TrialStepView step={step} />;
    case "goals":
      return <GoalsStepView step={step} />;
    case "outro":
      return <OutroStepView />;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const userId = useUserId();
  const reduceMotion = useReduceMotion();
  const { answers, derived, persist } = useOnboarding();

  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  // Which carousel panel is showing. Lives here, not in the carousel, so the
  // forward button can walk the panels one by one.
  const [page, setPage] = useState(0);
  // Taps on the forward button are ignored until this time (ms since epoch).
  // A ref, not state: it gates a handler and never needs a render.
  const busyUntil = useRef(0);

  const step = ONBOARDING_STEPS[index];
  const isLast = index === ONBOARDING_STEPS.length - 1;
  const hero = step.band === "hero";
  const onLastPanel = step.kind !== "carousel" || page >= step.panels.length - 1;
  const answered = step.answered === undefined || step.answered(answers);

  // How many are chosen, riding in the button where the arrow would be.
  const chosen =
    step.kind === "multi-select"
      ? answers[step.key].length
      : step.kind === "goals"
        ? answers.goals.length
        : 0;

  // --- progress ------------------------------------------------------------
  // Width can't run on the native driver, so this animates on JS — fine for a
  // bar that moves once per tap.
  const progress = useRef(new Animated.Value(1 / ONBOARDING_STEPS.length)).current;
  useEffect(() => {
    const to = (index + 1) / ONBOARDING_STEPS.length;
    if (reduceMotion) {
      progress.setValue(to);
      return;
    }
    Animated.timing(progress, {
      toValue: to,
      duration: 420,
      easing: Easing.bezier(0.25, 0.8, 0.35, 1),
      useNativeDriver: false,
    }).start();
  }, [index, progress, reduceMotion]);

  // --- step change: content rises in, then the button follows ----------
  const enter = useRef(new Animated.Value(1)).current;
  // 0 = in place, 1 = below. Two values, see BUTTON_TRAVEL.
  const buttonAway = useRef(new Animated.Value(0)).current;
  const buttonShown = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const delay = buttonDelay(step);
    if (reduceMotion) {
      // No movement, but the same short pause before a tap counts — a double
      // tap should still move one step, not two.
      busyUntil.current = Date.now() + 300;
      return;
    }
    busyUntil.current = Date.now() + delay + BUTTON_READY_MS;
    enter.setValue(0);
    buttonAway.setValue(1);
    buttonShown.setValue(0);
    const entrance = Animated.parallel([
      Animated.timing(enter, {
        toValue: 1,
        duration: CONTENT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAway, {
        toValue: 0,
        delay,
        duration: CHROME_TRANSFORM_MS,
        easing: CHROME_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(buttonShown, {
        toValue: 1,
        delay,
        duration: CHROME_OPACITY_MS,
        easing: FADE_EASING,
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
    // Per step only; `step` follows from `index`.
  }, [index, enter, buttonAway, buttonShown, reduceMotion]);

  // --- Android hardware back ---------------------------------------------
  // Without this, back would leave the whole flow from any step, because the
  // flow is one screen. It walks one step back instead; on the first step it
  // falls through to the system.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (index === 0) return false;
      setPage(0);
      setIndex(index - 1);
      return true;
    });
    return () => sub.remove();
  }, [index]);

  const finish = async () => {
    if (!answers.countryCode) return;
    setSaving(true);

    try {
      // Supabase first, device storage second. The local copy is what
      // `app/index.tsx` reads to decide whether onboarding is done, so writing
      // it first would mean a player through the flow on this phone with no
      // profile anywhere else.
      await saveProfile(userId, {
        name: answers.name.trim(),
        birth: answers.birth,
        countryCode: answers.countryCode,
      });
      await persist();
    } catch (error: unknown) {
      // Stay, say so, leave the button. Nothing is lost — the answers are still
      // in the context one tap away.
      console.warn("[onboarding] could not save the profile:", error);
      setSaving(false);
      toast.show("Couldn't save your profile — try again");
      return;
    }

    // Replace, so back from home cannot land inside the flow.
    router.replace("/home");
  };

  const next = () => {
    if (saving || Date.now() < busyUntil.current) return;
    // The carousel's button pages through the panels before it leaves them.
    if (!onLastPanel) {
      busyUntil.current = Date.now() + PAGE_TURN_MS;
      setPage(page + 1);
      return;
    }
    if (!answered) return;
    if (isLast) {
      void finish();
      return;
    }
    setPage(0);
    setIndex(index + 1);
  };

  const back = () => {
    if (index > 0) {
      setPage(0);
      setIndex(index - 1);
    }
  };

  const title = titleOf(step);

  const heading =
    title === null ? null : (
      <StepHeading
        hero={hero}
        lead={resolve(step.lead, answers, derived)}
        title={resolve(title, answers, derived)}
        body={resolve(bodyOf(step), answers, derived)}
      />
    );

  const content = (
    <StepContent step={step} onSubmit={next} page={page} onPageChange={setPage} />
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-ob-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        className="flex-1 px-6"
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
      >
        {/* --- the bar --- */}
        <View className="h-11 flex-row items-center gap-4">
          {/* Kept in the layout on the first step instead of removed, so the
              progress bar does not jump sideways when a way back appears. */}
          <Pressable
            onPress={back}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityElementsHidden={index === 0}
            importantForAccessibility={index === 0 ? "no-hide-descendants" : "auto"}
            className="h-11 w-11 items-center justify-center rounded-full bg-ob-raised active:opacity-70"
            style={{ opacity: index === 0 ? 0 : 1 }}
          >
            <ArrowLeftIcon size={20} color={colors.ob.text} />
          </Pressable>

          <View
            className="h-[6px] flex-1 overflow-hidden rounded-full bg-ob-raised"
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}
            accessibilityValue={{ min: 1, max: ONBOARDING_STEPS.length, now: index + 1 }}
          >
            {/* Style, not className: NativeWind's className does not reach an
                Animated.View. */}
            <Animated.View
              style={{
                height: "100%",
                borderRadius: 999,
                overflow: "hidden",
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              }}
            >
              <Gradient />
            </Animated.View>
          </View>
        </View>

        {/* --- the step --- */}
        <Animated.View
          style={{
            flex: 1,
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          }}
        >
          {SELF_SCROLLING.has(step.kind) ? (
            <View className="flex-1 pt-4">
              {heading}
              {content}
            </View>
          ) : (
            <ScrollView
              // A new ScrollView per step, so a step scrolled halfway down does
              // not hand its offset to the next one.
              key={step.id}
              className="flex-1"
              contentContainerStyle={{
                flexGrow: 1,
                paddingTop: 16,
                // Showcase steps sit in the middle of what is left; working
                // steps start at the top, so their controls stay put.
                justifyContent: hero ? "center" : "flex-start",
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {heading}
              {content}
            </ScrollView>
          )}
        </Animated.View>

        {/* --- the pill: the second beat --- */}
        <Animated.View
          style={{
            gap: 12,
            paddingTop: 16,
            opacity: buttonShown,
            transform: [
              {
                translateY: buttonAway.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, BUTTON_TRAVEL],
                }),
              },
            ],
          }}
        >
          <PillButton
            label={onLastPanel ? (step.cta ?? "Continue") : "Next"}
            variant={onLastPanel && step.ctaGradient ? "gradient" : "primary"}
            onPress={next}
            disabled={(onLastPanel && !answered) || saving}
            badge={chosen > 0 ? chosen : null}
          />
          {step.fine ? (
            <Text className="text-center font-sans text-[13px] leading-[18px] text-ob-muted">
              {step.fine}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}
