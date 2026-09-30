import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

import type { WelcomeStep } from "../../constants/onboarding-steps";
import { mixHex } from "../../lib/mix-hex";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// The front door. The app's name is the loudest thing on it — Fabian wanted it
// to stand out (2026-09-29) — so it is set large, in the flow's gradient, and
// it moves: the letters drop in one after another, then a slow wave runs
// through them every few seconds for as long as the step is open.
//
// Gradient TEXT would need a masked view, which is a native module and a new
// dev build. Instead each letter is its own Text, coloured at its place along
// the violet-to-blue line — the same gradient, cut into letters.
export type WelcomeStepViewProps = {
  step: WelcomeStep;
};

const STAGGER = 55; // ms between letters, arriving and in the wave
const WAVE_EVERY = 3200; // ms between waves

export function WelcomeStepView({ step }: WelcomeStepViewProps) {
  const reduceMotion = useReduceMotion();
  const letters = step.appName.split("");

  // Per letter: arrival (0 → 1) and the wave's lift (0 → 1 → 0).
  const arrive = useRef(letters.map(() => new Animated.Value(reduceMotion ? 1 : 0))).current;
  const lift = useRef(letters.map(() => new Animated.Value(0))).current;
  // The rest of the copy follows once the name has landed.
  const rest = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const entrance = Animated.sequence([
      Animated.stagger(
        STAGGER,
        arrive.map((value) =>
          Animated.spring(value, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true })
        )
      ),
      Animated.timing(rest, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    const wave = Animated.loop(
      Animated.sequence([
        Animated.delay(WAVE_EVERY),
        Animated.stagger(
          STAGGER,
          lift.map((value) =>
            Animated.sequence([
              Animated.timing(value, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(value, {
                toValue: 0,
                duration: 260,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
            ])
          )
        ),
      ])
    );

    entrance.start(() => wave.start());
    return () => {
      entrance.stop();
      wave.stop();
    };
  }, [arrive, lift, rest, reduceMotion]);

  return (
    <View className="items-center">
      <Text className="font-sans text-[22px] text-ob-muted">{step.greeting}</Text>

      {/* One element for a screen reader, which would otherwise spell the
          name out letter by letter. */}
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={step.appName}
        className="mt-1 flex-row"
      >
        {letters.map((letter, index) => (
          <Animated.Text
            key={`${letter}-${index}`}
            // Style, not className, throughout the animated parts: NativeWind's
            // className does not reach Animated components.
            style={{
              fontFamily: "Archivo_800ExtraBold",
              fontSize: 52,
              lineHeight: 60,
              letterSpacing: -1.5,
              color: mixHex(
                colors.ob.violet,
                colors.ob.bright,
                letters.length === 1 ? 0 : index / (letters.length - 1)
              ),
              opacity: arrive[index],
              transform: [
                {
                  translateY: Animated.add(
                    arrive[index].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
                    lift[index].interpolate({ inputRange: [0, 1], outputRange: [0, -8] })
                  ),
                },
              ],
            }}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>

      <Animated.View
        style={{
          marginTop: 24,
          alignItems: "center",
          gap: 16,
          opacity: rest,
          transform: [
            { translateY: rest.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        }}
      >
        <Text
          className="text-center font-sans-bold text-ob-text"
          style={{ fontSize: 30, lineHeight: 33, letterSpacing: -1.3 }}
        >
          {step.headline}
        </Text>
        <Text className="text-center font-sans text-[17px] leading-[26px] text-ob-muted">
          {step.body}
        </Text>
      </Animated.View>
    </View>
  );
}
