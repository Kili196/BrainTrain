import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import { useReduceMotion } from "../../lib/use-reduce-motion";
import { withAlpha } from "../../lib/with-alpha";
import { colors } from "../../theme/colors";
import { Gradient } from "../onboarding/Gradient";

// One subscription option on the paywall, as Fabian designed it: a hairline
// card that fills and glows once chosen, a radio on the left, the price on the
// right, and — on the plan worth pointing at — a badge riding the top edge.
//
// Chosen = the onboarding's violet-to-blue gradient (Fabian, 2026-09-30: the
// paywall should look like the flow it follows, the design's flat electric
// blue did not). The glow is a real blurred box-shadow in the same two
// colours. The design system keeps blur for things that float; this card is
// the paywall's one exception, by design.
export type PlanCardProps = {
  name: string;
  sub: string;
  price: string;
  on: boolean;
  onPress: () => void;
  // Shown on the card's top edge when set.
  badge?: string;
};

const P = colors.paywall;

// Three glows stacked, tight to wide — the design's three, in the gradient's
// colours: violet close in, blue further out.
const GLOW = `0 0 4px ${colors.ob.violet}, 0 0 14px ${withAlpha(
  colors.ob.violet,
  0.55
)}, 0 0 30px ${withAlpha(colors.ob.bright, 0.3)}`;
const TEXT_GLOW = { textShadowColor: P.planTextGlow, textShadowRadius: 4 };

// The badge's colours, repeated so a stripe twice the badge's width can slide
// by one badge-width and land exactly where it started — a seamless loop.
const BADGE_STOPS = [...P.badge, ...P.badge, P.badge[0]];
const BADGE_MS = 4000;

function Badge({ label }: { label: string }) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (width === 0 || reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration: BADGE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [slide, width, reduceMotion]);

  return (
    <View
      className="absolute -top-2.5 right-3.5 overflow-hidden rounded-full px-2.5 py-1"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: width * 2,
            transform: [
              {
                translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, -width] }),
              },
            ],
          }}
        >
          <Gradient stops={BADGE_STOPS} />
        </Animated.View>
      ) : null}
      <Text
        className="font-sans-extrabold text-[9.5px] uppercase text-text"
        style={{ letterSpacing: 0.95 }}
      >
        {label}
      </Text>
    </View>
  );
}

export function PlanCard({ name, sub, price, on, onPress, badge }: PlanCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${name}, ${price}, ${sub}`}
      className="flex-row items-center gap-3.5 rounded-lg px-5 py-3.5"
      style={{
        borderWidth: 1,
        borderColor: on ? "transparent" : P.planIdle,
        boxShadow: on ? GLOW : undefined,
      }}
    >
      {/* The fill on its own clipped layer: clipping the card itself would
          clip its glow on iOS, and the badge that sits over its top edge. */}
      {on ? (
        <View className="absolute -inset-px overflow-hidden rounded-lg">
          <Gradient />
        </View>
      ) : null}

      {badge ? <Badge label={badge} /> : null}

      <View
        className="h-[22px] w-[22px] items-center justify-center rounded-full"
        style={{ borderWidth: 1.5, borderColor: on ? colors.text.DEFAULT : P.planIdle }}
      >
        {on ? <View className="h-2.5 w-2.5 rounded-full bg-text" /> : null}
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <Text
          className="font-sans-extrabold text-[14px] uppercase"
          style={{
            letterSpacing: 1.4,
            color: on ? colors.text.DEFAULT : P.planIdle,
            ...(on ? TEXT_GLOW : null),
          }}
        >
          {name}
        </Text>
        <Text
          className="font-sans-medium text-[11px]"
          style={{ color: on ? P.planSub : P.planIdle }}
        >
          {sub}
        </Text>
      </View>

      <Text
        className="font-sans-extrabold"
        style={{
          fontSize: on ? 17 : 14,
          fontVariant: ["tabular-nums"],
          color: on ? colors.text.DEFAULT : P.planIdle,
          ...(on ? TEXT_GLOW : null),
        }}
      >
        {price}
      </Text>
    </Pressable>
  );
}
