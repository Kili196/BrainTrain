import { useEffect, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, Text, View } from "react-native";

import type { CarouselStep } from "../../constants/onboarding-steps";
import { useReduceMotion } from "../../lib/use-reduce-motion";

// The hook: three panels, swiped through, nothing asked for. The one step that
// carries its own headings, because it has three of them.
//
// CONTROLLED by the shell, which holds the current panel — so the forward button
// can walk the panels one at a time ("Next") instead of jumping past them.
//
// Not a ScrollView. The first version paged a horizontal ScrollView and moved it
// with scrollTo() when the button was pressed; that animation belongs to the
// platform, can't be given a curve, and stuttered (Fabian, 2026-09-29: "der
// übergang hakt sehr"). Here the rail is one Animated value, in panels, and the
// same value is driven by the finger while swiping and by a timing on the
// native driver when it settles — so a button press and a swipe end on the
// same smooth curve.
export type CarouselStepViewProps = {
  step: CarouselStep;
  page: number;
  onPageChange: (page: number) => void;
};

// A page turn: the app's own "ease out" — quick away, long soft landing.
const TURN_MS = 520;
const TURN_EASING = Easing.bezier(0.25, 0.8, 0.35, 1);
// How far (fraction of a panel) or how fast a swipe has to go to turn a page.
const TURN_DISTANCE = 0.22;
const TURN_VELOCITY = 0.35;

export function CarouselStepView({ step, page, onPageChange }: CarouselStepViewProps) {
  const reduceMotion = useReduceMotion();
  const count = step.panels.length;
  // React Native cannot translate by a percentage, so the rail measures itself.
  const [width, setWidth] = useState(0);

  // Where the rail is, in panels: 0 is the first, 1.5 is halfway to the third.
  const position = useRef(new Animated.Value(page)).current;

  const settle = (to: number) => {
    Animated.timing(position, {
      toValue: to,
      duration: reduceMotion ? 0 : TURN_MS,
      easing: TURN_EASING,
      useNativeDriver: true,
    }).start();
  };

  // The shell moved the page (the Next button, or a swipe reported back).
  useEffect(() => {
    settle(page);
    // `settle` is recreated each render; the page is what matters.
  }, [page]);

  // The latest values for the responder, which is created once.
  const latest = useRef({ page, width, count, onPageChange });
  latest.current = { page, width, count, onPageChange };

  const responder = useRef(
    PanResponder.create({
      // Only a mostly-sideways drag is a swipe; anything else is left alone.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => position.stopAnimation(),
      onPanResponderMove: (_, g) => {
        const { page: p, width: w, count: n } = latest.current;
        if (w === 0) return;
        let at = p - g.dx / w;
        // Past either end the rail gives a little and pulls back, instead of
        // stopping dead.
        if (at < 0) at = at * 0.3;
        if (at > n - 1) at = n - 1 + (at - (n - 1)) * 0.3;
        position.setValue(at);
      },
      onPanResponderRelease: (_, g) => {
        const { page: p, width: w, count: n, onPageChange: report } = latest.current;
        const moved = w === 0 ? 0 : -g.dx / w;
        let to = p;
        if (moved > TURN_DISTANCE || -g.vx > TURN_VELOCITY) to = p + 1;
        if (moved < -TURN_DISTANCE || g.vx > TURN_VELOCITY) to = p - 1;
        to = Math.max(0, Math.min(n - 1, to));
        if (to === p) settle(p);
        else report(to);
      },
      onPanResponderTerminate: () => settle(latest.current.page),
    })
  ).current;

  // A nudge on arrival: the rail leans a little way towards the next panel and
  // back, once, so its edge shows. The gesture's own hint.
  useEffect(() => {
    if (reduceMotion || width === 0) return;
    const hint = Animated.sequence([
      Animated.delay(900),
      Animated.timing(position, {
        toValue: 0.14,
        duration: 420,
        easing: TURN_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(position, {
        toValue: 0,
        duration: 520,
        easing: TURN_EASING,
        useNativeDriver: true,
      }),
    ]);
    hint.start();
    return () => hint.stop();
    // Once, when the rail has a width.
  }, [reduceMotion, width]);

  const last = page === count - 1;

  return (
    <View className="flex-1">
      <View
        className="flex-1 overflow-hidden"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        {width === 0 ? null : (
          <Animated.View
            style={{
              flex: 1,
              flexDirection: "row",
              width: width * count,
              transform: [
                {
                  translateX: position.interpolate({
                    inputRange: [0, count - 1],
                    outputRange: [0, -width * (count - 1)],
                    extrapolate: "extend",
                  }),
                },
              ],
            }}
          >
            {step.panels.map((panel, index) => (
              <Animated.View
                key={panel.title}
                accessibilityElementsHidden={index !== page}
                importantForAccessibility={index === page ? "auto" : "no-hide-descendants"}
                style={{
                  width,
                  justifyContent: "center",
                  // The panel on its way out dims, the one coming in brightens —
                  // so the turn reads as one panel handing over to the next.
                  opacity: position.interpolate({
                    inputRange: [index - 1, index, index + 1],
                    outputRange: [0.25, 1, 0.25],
                    extrapolate: "clamp",
                  }),
                }}
              >
                <View className="gap-6">
                  <Text
                    accessibilityRole="header"
                    className="text-center"
                    style={{ fontSize: 34, lineHeight: 37, letterSpacing: -1.5 }}
                  >
                    <Text className="font-sans text-ob-muted">{`${panel.lead}\n`}</Text>
                    <Text className="font-sans-bold text-ob-text">{panel.title}</Text>
                  </Text>
                  <Text className="text-center font-sans text-[17px] leading-[26px] text-ob-muted">
                    {panel.body}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </View>

      {/* Directly above the button: the last thing read before the thing
          pressed. The current one is a wider capsule rather than only a
          brighter dot — shape reads faster than value. */}
      <View className="items-center gap-3 pt-6">
        <View className="flex-row justify-center gap-2">
          {step.panels.map((panel, index) => (
            <Pressable
              key={panel.title}
              onPress={() => onPageChange(index)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Show ${panel.title}`}
              accessibilityState={{ selected: index === page }}
            >
              <View
                className={`h-2 rounded-full ${
                  index === page ? "w-8 bg-ob-text" : "w-2 bg-ob-raised"
                }`}
              />
            </Pressable>
          ))}
        </View>
        {/* Said in words as well, until the last panel is reached. */}
        <Text
          className="font-sans-semibold text-[11px] uppercase text-ob-muted"
          style={{ letterSpacing: 1.3, opacity: last ? 0 : 1 }}
        >
          Swipe
        </Text>
      </View>
    </View>
  );
}
