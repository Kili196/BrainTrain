import { useRef, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";

import type { CommitmentStep } from "../../constants/onboarding-steps";
import { useOnboarding } from "../../lib/onboarding-context";
import { colors } from "../../theme/colors";
import { CloseIcon } from "../icons/CloseIcon";
import { PillButton } from "./PillButton";

// The player draws a check with their finger. The motor act is the whole point:
// tapping a button makes you someone who agreed, drawing the mark makes you
// someone who did something.
//
// The recognition is deliberately generous. This is a commitment, not a
// handwriting test: down and to the right, a corner, then up and further right.
// Anything stricter would reject honest attempts on a small screen.
export type CommitmentStepViewProps = {
  step: CommitmentStep;
};

type Point = { x: number; y: number };

// The pad's coordinate space. Points are stored in these units, so the stroke
// scales with the pad whatever its size on screen.
const VIEW_W = 100;
const VIEW_H = 40;

// The check drawn for anyone who pressed the button instead of drawing.
const CANONICAL = "M 22 21 L 42 32 L 78 9";

// Down to a corner, then up and to the right, covering some ground. Five loose
// conditions and no comparison against a reference shape — a template match
// would fail people whose check leans the other way.
function isCheck(points: readonly Point[]): boolean {
  if (points.length < 6) return false;

  const xs = points.map((p) => p.x);
  const corner = points.reduce((low, p) => (p.y > low.y ? p : low), points[0]);
  const cornerAt = points.indexOf(corner);
  const last = points[points.length - 1];

  return (
    Math.max(...xs) - Math.min(...xs) > 15 &&
    cornerAt > 0 &&
    cornerAt < points.length - 1 &&
    last.y < corner.y - 4 &&
    last.x > points[0].x
  );
}

export function CommitmentStepView({ step }: CommitmentStepViewProps) {
  const { answers, set } = useOnboarding();
  const committed = answers.committed;

  const [points, setPoints] = useState<readonly Point[]>([]);
  // The stroke they actually made, kept once it is accepted.
  const [drawn, setDrawn] = useState<string | null>(null);

  // The pad's size, for turning finger positions into pad units.
  const size = useRef({ width: 1, height: 1 });
  // The stroke in progress, outside React state so the release handler sees
  // every point — state set during the move would still be one render behind.
  const stroke = useRef<Point[]>([]);
  const locked = useRef(committed);
  locked.current = committed;

  const toPoint = (x: number, y: number): Point => ({
    x: Number(((x / size.current.width) * VIEW_W).toFixed(1)),
    y: Number(((y / size.current.height) * VIEW_H).toFixed(1)),
  });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked.current,
      onMoveShouldSetPanResponder: () => !locked.current,
      // Without this the first drag scrolls the step instead of drawing.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        stroke.current = [toPoint(event.nativeEvent.locationX, event.nativeEvent.locationY)];
        setPoints(stroke.current);
      },
      onPanResponderMove: (event) => {
        stroke.current = [
          ...stroke.current,
          toPoint(event.nativeEvent.locationX, event.nativeEvent.locationY),
        ];
        setPoints(stroke.current);
      },
      onPanResponderRelease: () => {
        const done = stroke.current;
        if (!isCheck(done)) {
          // Nothing scolds them: the ink simply clears and the hint stands.
          setPoints([]);
          return;
        }
        setDrawn(`M ${done.map((p) => `${p.x} ${p.y}`).join(" L ")}`);
        set("committed", true);
      },
      onPanResponderTerminate: () => setPoints([]),
    })
  ).current;

  const confirm = () => {
    if (committed) return;
    setDrawn(null);
    set("committed", true);
  };

  const clear = () => {
    setPoints([]);
    setDrawn(null);
    set("committed", false);
  };

  return (
    <View className="pt-8">
      <Text
        className="mb-4 text-center font-sans-semibold text-[11px] uppercase text-ob-muted"
        style={{ letterSpacing: 1.3 }}
      >
        {committed ? step.done : step.hint}
      </Text>

      <View
        className={`rounded-[14px] border bg-ob-raised p-4 ${
          committed ? "border-ob-bright" : "border-ob-border"
        }`}
      >
        <View
          {...responder.panHandlers}
          onLayout={(event) => {
            size.current = {
              width: Math.max(1, event.nativeEvent.layout.width),
              height: Math.max(1, event.nativeEvent.layout.height),
            };
          }}
          accessibilityRole="image"
          accessibilityLabel={step.hint}
          style={{ aspectRatio: VIEW_W / VIEW_H }}
        >
          {/* pointerEvents none, so the finger's location is always relative
              to the pad and never to the SVG drawn inside it. */}
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            pointerEvents="none"
          >
            {committed ? (
              <Path
                d={drawn ?? CANONICAL}
                fill="none"
                stroke={colors.ob.bright}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : points.length > 1 ? (
              <Polyline
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={colors.ob.bright}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>

        {committed || points.length > 1 ? (
          <Pressable
            onPress={clear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear and draw again"
            className="absolute left-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-ob-bg"
          >
            <CloseIcon size={16} color={colors.ob.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Not a fallback and not smaller print: the same commitment, reachable
          for anyone who cannot or does not want to draw. It sets exactly the
          same state, which is why drawing can never be the only way through. */}
      <View className="mt-4">
        <PillButton
          variant="quiet"
          label={committed ? step.done : step.confirm}
          lit={committed}
          onPress={confirm}
        />
      </View>
    </View>
  );
}
