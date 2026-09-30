import { useEffect, useRef } from "react";
import { PanResponder, Text, View, type GestureResponderEvent } from "react-native";

import type { SliderStep } from "../../constants/onboarding-steps";
import { useOnboarding } from "../../lib/onboarding-context";
import { colors } from "../../theme/colors";
import { Gradient } from "./Gradient";

// One question, one number, answered by dragging. The value is set large and
// lit above the track, because on this step it is the entire content.
//
// Built on PanResponder rather than a slider library: React Native has no
// slider of its own any more, and the community one is a native module — which
// would mean a new dev build for one control.
//
// The default is written into the answers as soon as the step opens. Otherwise
// someone whose honest answer is the default would have to jiggle the handle to
// prove it, and the flow would sit there refusing to continue.
export type SliderStepViewProps = {
  step: SliderStep;
};

const THUMB = 32;

export function SliderStepView({ step }: SliderStepViewProps) {
  const { answers, set } = useOnboarding();

  const max = step.max(answers);
  const value = answers[step.key] ?? step.initial(answers);
  const fraction = max - step.min <= 0 ? 0 : (value - step.min) / (max - step.min);

  useEffect(() => {
    if (answers[step.key] === null) set(step.key, step.initial(answers));
    // Only on entering the step: after that the value is the player's, so
    // the answers are deliberately not a dependency.
  }, [step.key]);

  // Where the track sits on screen, measured when a drag starts. Page
  // coordinates, because locationX is relative to whichever child the finger
  // happens to be over — the thumb, halfway through a drag.
  const track = useRef<View>(null);
  const box = useRef({ x: 0, width: 1 });

  // The latest values for the responder, which is created once.
  const latest = useRef({ step, max, set });
  latest.current = { step, max, set };

  const moveTo = (pageX: number) => {
    const { step: s, max: m, set: write } = latest.current;
    const t = Math.min(1, Math.max(0, (pageX - box.current.x) / box.current.width));
    const raw = s.min + t * (m - s.min);
    const snapped = Math.round(raw / s.step) * s.step;
    write(s.key, Math.min(m, Math.max(s.min, Number(snapped.toFixed(2)))));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Once dragging, the ScrollView around the step may not take the gesture
      // over — a slightly diagonal drag would otherwise start scrolling.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const pageX = event.nativeEvent.pageX;
        track.current?.measure((_x, _y, width, _h, px) => {
          box.current = { x: px, width: Math.max(1, width) };
          moveTo(pageX);
        });
      },
      onPanResponderMove: (event) => moveTo(event.nativeEvent.pageX),
    })
  ).current;

  const label = step.valueText(value);

  const nudge = (direction: 1 | -1) => {
    const next = Math.min(max, Math.max(step.min, value + direction * step.step));
    set(step.key, next);
  };

  return (
    <View className="flex-1 pt-12">
      <Text
        className="mb-8 text-center font-sans text-[28px] text-ob-bright"
        style={{ letterSpacing: -1.2 }}
      >
        {label}
      </Text>

      {/* The hit area is taller than the track, so the thumb is a 44pt
          target and a tap anywhere near the line lands. */}
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={typeof step.question === "string" ? step.question : undefined}
        accessibilityValue={{ text: label }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) =>
          nudge(event.nativeEvent.actionName === "increment" ? 1 : -1)
        }
        className="h-11 justify-center"
      >
        <View
          ref={track}
          className="h-2 overflow-hidden rounded-full bg-ob-raised"
        >
          {/* The fill is the track up to the value. */}
          <View
            className="h-full overflow-hidden rounded-full"
            style={{ width: `${fraction * 100}%` }}
          >
            <Gradient />
          </View>
        </View>
        <View
          pointerEvents="none"
          className="absolute rounded-full"
          style={{
            width: THUMB,
            height: THUMB,
            backgroundColor: colors.ob.text,
            top: (44 - THUMB) / 2,
            left: `${fraction * 100}%`,
            marginLeft: -THUMB * fraction,
          }}
        />
      </View>

      {step.hint ? (
        <Text
          className="mt-6 text-center font-sans-semibold text-[11px] uppercase text-ob-muted"
          style={{ letterSpacing: 1.3 }}
        >
          {step.hint}
        </Text>
      ) : null}

      {/* The return on the answer, updating as they drag. */}
      {step.readout ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-8 text-center font-sans text-[15px] leading-[23px] text-ob-text"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {step.readout(value)}
        </Text>
      ) : null}

      {/* Where the deal has to be said out loud rather than implied. */}
      {step.footnote ? (
        <Text className="mt-auto pt-8 text-center font-sans text-[13px] leading-[20px] text-ob-muted">
          {step.footnote}
        </Text>
      ) : null}
    </View>
  );
}
