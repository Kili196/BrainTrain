import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";

// The stage: five topic labels circling whatever is placed in the middle, and
// the surface that lets you push the ring around.
//
// The whole model is a single fractional number. `pos` is where the ring has
// come to rest, `spinOff` is the distance it still has to glide after a flick,
// and the two are added for rendering. `pos * 0.5` feeds the angle, so the ring
// turns as the position grows.
//
// The centre is passed in as `children` rather than rendered by the caller
// alongside this component, because React Native's responder system only walks
// *upwards* from whatever was touched. A sibling could never hand its touches
// to the drag surface, so the word in the middle has to sit inside it.
// The mockup drifts at 0.6, which on a real screen reads as the background
// pulling at the eye. A third of that is still clearly alive without competing
// with the topic on the stage.
const DRIFT_PER_SECOND = 0.22;

// Committing state 60 times a second re-renders five text nodes for a ring that
// turns 0.3 radians per second — invisible work. Half that is still far smoother
// than the motion itself.
const FRAME_MS = 1000 / 30;

// A backgrounded screen would otherwise hand back one huge delta and make the
// ring jump on return.
const MAX_STEP_SECONDS = 0.25;

// 120px of vertical drag is one topic, and a flick is worth at most five.
// Velocity arrives in px/ms, the same unit the mockup measures by hand between
// two pointer events, so its 3.4 multiplier carries over unchanged.
const DRAG_PX_PER_TOPIC = 120;
const FLICK_TOPICS_PER_VELOCITY = 3.4;
const MAX_FLICK_TOPICS = 5;

// The casino stop: the remaining distance loses 38% every 85ms until it is
// close enough to zero to drop. Deliberately coarse — roughly twelve steps and
// a second of glide for the longest flick, not a 60fps curve.
const DECAY_FACTOR = 0.62;
const DECAY_INTERVAL_MS = 85;
const DECAY_EPSILON = 0.02;

// Tall enough for the labels at their widest swing (±130px plus type) without
// the ellipse reaching the button below it.
const STAGE_HEIGHT = 300;

// Per-label irregularity, straight from the mockup: without the wobble and the
// radius offsets they sit on a machine-drawn circle and it shows.
//
// Four labels rather than the mockup's five. Evenly spaced labels pass each
// other closest where the ellipse flattens out, at the top and the bottom, and
// the gap there is 2·rx·sin(π/n) — 139px at five, 167px at four. That extra
// 28px is the difference between labels grazing each other every turn and
// clearing.
const WOBBLE = [0, 0.12, -0.1, 0.08];
const RADIUS_X = [118, 126, 112, 124];
const RADIUS_Y = [120, 112, 128, 114];
const COUNT = WOBBLE.length;

// How many titles the screen fetches for the ring to cycle through. More than
// the four on screen, so the labels actually change as the ring turns.
export const ORBIT_POOL_SIZE = 12;

// Negative positions have to wrap too, hence the double modulo.
function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export type TopicOrbitProps = {
  titles: string[];
  // Freezes the drift and refuses the gesture while a topic is being drawn. The
  // ring standing dead still against the racing word in the middle is what
  // sells the draw.
  locked?: boolean;
  children?: ReactNode;
};

export function TopicOrbit({
  titles,
  locked = false,
  children,
}: TopicOrbitProps) {
  const [pos, setPosState] = useState(0);
  const [spinOff, setSpinOffState] = useState(0);

  // Mirrors of the two rendered values. The gesture handlers and the frame loop
  // are built once and never rebuilt, so they cannot read state directly — but
  // refs and the setState functions are stable, which is what makes capturing
  // them once safe.
  const posRef = useRef(0);
  const spinOffRef = useRef(0);

  const setPos = useCallback((value: number) => {
    posRef.current = value;
    setPosState(value);
  }, []);

  const setSpinOff = useCallback((value: number) => {
    spinOffRef.current = value;
    setSpinOffState(value);
  }, []);

  const dragging = useRef(false);
  const basePos = useRef(0);
  const lastFrame = useRef(0);
  const lastDecay = useRef(0);
  const carried = useRef(0);
  const lockedRef = useRef(locked);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    let frame = 0;
    lastFrame.current = Date.now();

    const step = () => {
      const now = Date.now();
      const dt = Math.min(MAX_STEP_SECONDS, (now - lastFrame.current) / 1000);
      // Advanced before every branch below, so a paused one cannot bank time
      // and release it as a jump.
      lastFrame.current = now;

      if (dt <= 0) {
        // Two frames inside the same millisecond. Nothing has happened, and
        // clearing the banked time here would quietly eat it.
      } else if (dragging.current) {
        carried.current = 0;
      } else if (spinOffRef.current !== 0) {
        carried.current = 0;

        if (now - lastDecay.current >= DECAY_INTERVAL_MS) {
          lastDecay.current = now;
          const next = spinOffRef.current * DECAY_FACTOR;
          setSpinOff(Math.abs(next) < DECAY_EPSILON ? 0 : next);
        }
      } else if (lockedRef.current) {
        carried.current = 0;
      } else {
        carried.current += dt;

        if (carried.current * 1000 >= FRAME_MS) {
          setPos(posRef.current + DRIFT_PER_SECOND * carried.current);
          carried.current = 0;
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [setPos, setSpinOff]);

  // Ends a drag. `velocityY` is positive downwards and dragging down turns the
  // ring backwards, so the sign flips.
  const settle = useCallback(
    (velocityY: number) => {
      if (!dragging.current) return;
      dragging.current = false;

      const flick = Math.max(
        -MAX_FLICK_TOPICS,
        Math.min(
          MAX_FLICK_TOPICS,
          Math.round(-velocityY * FLICK_TOPICS_PER_VELOCITY)
        )
      );

      const from = posRef.current;
      const target = Math.round(from + flick);

      // The ring must never rest between two words. `pos` lands on the whole
      // number immediately and `spinOff` holds the distance still to travel, so
      // nothing moves at this instant — the glide is entirely the decay.
      //
      // The mockup's own onUp snaps here and zeroes spinOff, which leaves its
      // decay branch unreachable. Its section 2.1 describes the glide that
      // decay was written for, and a ring that otherwise creeps at 0.6 topics a
      // second cannot teleport five of them without reading as a glitch.
      setPos(target);
      setSpinOff(from - target);
      lastDecay.current = Date.now();
    },
    [setPos, setSpinOff]
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !lockedRef.current,
      onMoveShouldSetPanResponder: () => !lockedRef.current,
      // The ring is the only thing under the finger here; nothing above it has
      // a better claim on the gesture.
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        dragging.current = true;
        // Fold a glide still in flight into the base, so grabbing the ring
        // mid-flick picks it up where it looks, not where it was headed.
        basePos.current = posRef.current + spinOffRef.current;
        setSpinOff(0);
      },

      onPanResponderMove: (_event, gesture) => {
        setPos(basePos.current - gesture.dy / DRAG_PX_PER_TOPIC);
      },

      onPanResponderRelease: (_event, gesture) => settle(gesture.vy),
      onPanResponderTerminate: (_event, gesture) => settle(gesture.vy),
    })
  ).current;

  const position = pos + spinOff;

  return (
    <View
      style={{ alignSelf: "stretch", height: STAGE_HEIGHT, overflow: "hidden" }}
      {...pan.panHandlers}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        // Decoration: five half-visible words are noise to a screen reader, and
        // they must not become the touch target instead of the drag surface.
        // In the style, not as a prop — react-native-web ignores the prop.
        style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      >
        {titles.length > 0
          ? WOBBLE.map((wobble, i) => {
              const angle = (i / COUNT) * Math.PI * 2 + position * 0.5 + wobble;
              const x = Math.cos(angle) * RADIUS_X[i];
              const y = Math.sin(angle) * RADIUS_Y[i];

              // 0 at the top of the ellipse, 1 at the bottom. Size and opacity
              // follow it, so the labels at the front are the largest and
              // brightest.
              //
              // The mockup runs 12.5–16px at 0.14–0.34 opacity and softens the
              // ring with blur on the same curve, 2.6px down to 1.2px. React
              // Native cannot blur text, so that third channel is gone and the
              // labels arrive far harder than they were drawn. Taking size and
              // opacity down is what stands in for it: 9–11px at 0.07–0.18 is
              // texture behind the stage rather than a second row of headlines.
              const depth = (Math.sin(angle) + 1) / 2;
              const fontSize = 9 + depth * 2;

              // Which title a label shows is derived from its own angle rather
              // than from Math.round(pos) as in the mockup. There, all five swap
              // words at the same instant and the blur smears the change;
              // without blur that is a visible pop every 1.7 seconds. Counting
              // turns instead means each label changes as it passes the back of
              // the ellipse — at its smallest and faintest, the one moment
              // nobody is looking at it. Dragging still changes the words,
              // because the angle carries the drag; they change staggered
              // rather than all together.
              const turns = Math.floor((angle + Math.PI / 2) / (Math.PI * 2));

              // `turns * COUNT` rather than `turns`: each revolution moves the
              // whole ring on by five, so the labels can never land on the same
              // title as one of their neighbours mid-turn.
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
                    opacity: 0.07 + depth * 0.11,
                    transform: [
                      { translateX: x },
                      { translateY: y - fontSize / 2 },
                    ],
                  }}
                >
                  {title}
                </Text>
              );
            })
          : null}
      </View>

      {children}
    </View>
  );
}
