import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ChevronDownIcon } from "../icons/ChevronDownIcon";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// The rules of a round, folded away under a single label.
//
// They never change from round to round, which is exactly why they are closed
// by default: after the second round they are noise, but they have to be
// somewhere for the first one, and for the moment someone wonders whether
// looking something up is allowed.
//
// Written as a lead and a sentence rather than a heading and a paragraph — five
// headings would take the whole screen, and none of these needs more than a
// line to land.
const RULES: { lead: string; body: string }[] = [
  {
    lead: "No AI.",
    body: "Work the topic out yourself. The round measures what you can retrieve, not what a model can.",
  },
  {
    lead: "Wikipedia is a start, not a source.",
    body: "Follow it to where the claim came from, and use that instead.",
  },
  {
    lead: "Notes by hand.",
    body: "Writing them out is slower on purpose — it is what makes the topic stick. Photograph the page afterwards to have it marked.",
  },
  {
    lead: "Speak from your notes, don't read them.",
    body: "An answer read out word for word is recital, not recall.",
  },
  {
    lead: "Name your sources as you go.",
    body: "A claim you cannot attribute is a guess, however confident it sounds.",
  },
];

// Design §12's overlay timing: this is a disclosure, not a screen change.
const OPEN_MS = 220;
const CLOSE_MS = 180;

// The panel never grows past this, whatever the rules add up to — the screen
// below it is finite and there is no scrolling on this route. Past it the list
// scrolls inside itself instead of pushing START off the bottom.
const MAX_PANEL_HEIGHT = 260;

export function RulesPanel() {
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  // Measured from the content itself, because an animated height needs a number
  // and the rules are text: their height depends on the font and the width.
  const [contentHeight, setContentHeight] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(open ? 1 : 0);
      return;
    }

    const fold = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: Easing.bezier(0.3, 0.8, 0.3, 1),
      // Height and rotation are neither transform nor opacity, so this one
      // cannot run on the native driver.
      useNativeDriver: false,
    });

    fold.start();
    return () => fold.stop();
  }, [open, reduceMotion, progress]);

  const panelHeight = Math.min(contentHeight, MAX_PANEL_HEIGHT);

  return (
    <View>
      {/* A pill, not a bare label: design §4 gives the outline pill to every
          toggle in the app, so the shape alone says this can be pressed. Drawn
          in white rather than the eyebrow grey — a section label and a control
          cannot look the same. */}
      <Pressable
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel="Rules"
        accessibilityState={{ expanded: open }}
        hitSlop={12}
        // A plain object, never a function. Babel routes every element through
        // NativeWind's jsx runtime, and a function style is dropped there on a
        // device — the pill loses its rim and its padding and reads as a bare
        // word. Press feedback comes from `active:` instead.
        className="active:opacity-70"
        style={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 999,
          borderWidth: 1,
          // Brighter rim while open, so the pill carries the state as well as
          // the chevron does.
          borderColor: open ? colors.border.control : colors.border.modal,
        }}
      >
        <Text className="text-eyebrow font-sans-extrabold uppercase tracking-pill text-text">
          Rules
        </Text>
        <Animated.View
          style={{
            transform: [
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                }),
              },
            ],
          }}
        >
          <ChevronDownIcon size={15} color={colors.text.DEFAULT} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={{
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, panelHeight],
          }),
          opacity: progress,
          // What actually hides the rules while the height animates.
          overflow: "hidden",
        }}
      >
        <ScrollView
          // Only ever scrolls in the case the cap above is reached; otherwise
          // the content is shorter than its box and this does nothing.
          scrollEnabled={contentHeight > MAX_PANEL_HEIGHT}
          showsVerticalScrollIndicator={false}
          style={{ height: panelHeight }}
        >
          <View
            className="pt-3"
            onLayout={(event) =>
              setContentHeight(event.nativeEvent.layout.height)
            }
          >
            {RULES.map((rule) => (
              // Divider rows, not cards: design §5 asks for exactly this on a
              // list, and the screen already spends its one filled block on the
              // two timer tiles.
              <View
                key={rule.lead}
                className="border-t border-divider py-2.5"
              >
                <Text className="text-body font-sans text-text-secondary">
                  <Text className="font-sans-bold text-text">
                    {rule.lead}
                  </Text>{" "}
                  {rule.body}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
