import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { mixHex } from "../../lib/mix-hex";
import { withAlpha } from "../../lib/with-alpha";
import { colors } from "../../theme/colors";
import { ArrowRightIcon } from "../icons/ArrowRightIcon";
import { Gradient } from "../onboarding/Gradient";
import { Shimmer } from "../ui/Button";

// The paywall's one button, from Fabian's design: the app's hard-shadow press
// (design §4), taller and rounder than the primary Button, with an arrow after
// the label, the hero shimmer across its face and a soft glow beneath — the
// hero button's recipe, one screen over.
//
// The face is the onboarding's violet-to-blue gradient rather than the
// design's steel blue (Fabian, 2026-09-30 — it should look like the thing you
// want to press). The hard shadow is the same gradient taken halfway to
// black, so the edge under the face reads as its own darker side.
//
// Its own component rather than a Button variant, because every number in it
// differs and it exists on exactly one screen.
export type PaywallButtonProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
};

const SHADOW_FROM = mixHex(colors.ob.violet, colors.ob.bg, 0.5);
const SHADOW_TO = mixHex(colors.ob.bright, colors.ob.bg, 0.5);
const GLOW = `0 22px 40px -18px ${withAlpha(colors.ob.violet, 0.85)}`;
const REST = 7;
const PRESSED = 2;
const TRAVEL = 5;

export function PaywallButton({ label, onPress, busy = false }: PaywallButtonProps) {
  const [width, setWidth] = useState(0);

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
    >
      {({ pressed }) => {
        const down = pressed && !busy;
        const offset = down ? PRESSED : REST;

        return (
          <View className="relative w-full">
            {/* The hard shadow, as its own layer — see Button for why a real
                box-shadow cannot do this. The glow is a real one: it is soft
                and does not move. */}
            <View
              className="absolute inset-x-0 rounded-[20px]"
              style={{ top: offset, bottom: -offset, boxShadow: GLOW }}
            >
              <View className="flex-1 overflow-hidden rounded-[20px]">
                <Gradient from={SHADOW_FROM} to={SHADOW_TO} />
              </View>
            </View>
            <View
              className="w-full flex-row items-center justify-center gap-3 overflow-hidden rounded-[20px] pb-5 pt-[18px]"
              style={{ transform: [{ translateY: down ? TRAVEL : 0 }] }}
              onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            >
              <Gradient />
              {busy ? (
                <ActivityIndicator color={colors.text.DEFAULT} />
              ) : (
                <>
                  <Text
                    className="font-sans-extrabold text-[16px] uppercase text-text"
                    style={{ letterSpacing: 2.2 }}
                  >
                    {label}
                  </Text>
                  <ArrowRightIcon size={19} color={colors.text.DEFAULT} />
                </>
              )}
              <Shimmer width={width} />
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}
