import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";

// Five topic labels circling the one on the stage, ported from the mockup.
//
// The whole model is a single fractional number, `pos`. It advances
// continuously and feeds the angle through `pos * 0.5`, so the ring turns as
// the position grows.
//
// Which title each label shows is derived from its own angle rather than from
// `Math.round(pos)` as in the mockup. There, all five swap words at the same
// instant; the mockup gets away with it because its labels carry a 1.2–2.6px
// blur that smears the change. React Native cannot blur text, so that same
// swap is a visible pop every 1.7 seconds. Tying it to the angle instead means
// each label changes as it passes the back of the ellipse — at its smallest and
// faintest, which is the one moment nobody is looking at it.
const DRIFT_PER_SECOND = 0.6;

// Committing state 60 times a second re-renders five text nodes for a ring that
// turns 0.3 radians per second — invisible work. Half that is still far smoother
// than the motion itself.
const FRAME_MS = 1000 / 30;

// A backgrounded screen would otherwise hand back one huge delta and make the
// ring jump on return.
const MAX_STEP_SECONDS = 0.25;

// Per-label irregularity, straight from the mockup: without the wobble and the
// radius offsets the five sit on a machine-drawn circle and it shows.
const WOBBLE = [0, 0.12, -0.1, 0.08, -0.14];
const RADIUS_X = [118, 126, 112, 124, 110];
const RADIUS_Y = [120, 112, 128, 114, 130];
const COUNT = WOBBLE.length;

// How many titles the screen fetches for the ring to cycle through. More than
// the five on screen, so the labels actually change as the ring turns.
export const ORBIT_POOL_SIZE = 12;

// Negative positions have to wrap too, hence the double modulo.
function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function TopicOrbit({ titles }: { titles: string[] }) {
  const [pos, setPos] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    let frame = 0;
    let carried = 0;
    last.current = Date.now();

    const step = () => {
      const now = Date.now();
      const dt = Math.min(MAX_STEP_SECONDS, (now - last.current) / 1000);
      last.current = now;
      carried += dt;

      if (carried * 1000 >= FRAME_MS) {
        const advanced = carried;
        carried = 0;
        setPos((current) => current + DRIFT_PER_SECOND * advanced);
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (titles.length === 0) return null;

  return (
    <View
      // Decoration: it must never intercept a tap meant for the button
      // underneath, and five half-visible words are noise to a screen reader.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {WOBBLE.map((wobble, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + pos * 0.5 + wobble;
        const x = Math.cos(angle) * RADIUS_X[i];
        const y = Math.sin(angle) * RADIUS_Y[i];

        // 0 at the top of the ellipse, 1 at the bottom. Size and opacity follow
        // it, so the labels at the front are the largest and brightest — and
        // even those top out at 0.34, so the topic in the middle always wins.
        const depth = (Math.sin(angle) + 1) / 2;
        const fontSize = 12.5 + depth * 3.5;

        // How many times this label has passed the back of the ellipse. The
        // count ticks over exactly at sin(angle) = -1, where depth is 0 — so
        // the word changes at minimum size and opacity, and the five never
        // change together.
        const turns = Math.floor((angle + Math.PI / 2) / (Math.PI * 2));

        // `turns * COUNT` rather than `turns`: each revolution moves the whole
        // ring on by five, so the labels can never land on the same title as
        // one of their neighbours mid-turn.
        const title = titles[wrap(turns * COUNT + i, titles.length)];

        return (
          <Text
            key={i}
            numberOfLines={1}
            className="font-sans-medium uppercase"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              // Full width plus centred text places a label by its middle
              // without measuring how wide it is.
              textAlign: "center",
              fontSize,
              lineHeight: fontSize,
              letterSpacing: fontSize * 0.05,
              color: colors.text.DEFAULT,
              opacity: 0.14 + depth * 0.2,
              transform: [{ translateX: x }, { translateY: y - fontSize / 2 }],
            }}
          >
            {title}
          </Text>
        );
      })}
    </View>
  );
}
