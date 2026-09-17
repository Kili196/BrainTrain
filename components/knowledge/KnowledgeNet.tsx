import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from "react-native-svg";

import {
  CENTRE_X,
  CENTRE_Y,
  RINGS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type NetLayout,
} from "../../lib/knowledge-layout";
import { useReduceMotion } from "../../lib/use-reduce-motion";
import { colors } from "../../theme/colors";

// The knowledge net: the player's whole topic pool as one field of dots.
//
// It is drawn in two layers, and which half goes in which is the one real
// decision in this file.
//
// The **static** layer carries everything that means something: the rings, the
// centre, the five category hubs, the threads, and every topic that has been
// spoken about. The **drifting** layer carries only the untouched topics — the
// dust. So what the player has built stands still and what they have not yet
// touched moves around it.
//
// That split started as an engineering problem and turned out to be the better
// picture. A native-driven rotation moves a view on the UI thread without
// telling the JS side, so anything inside it can be drawn in one place and
// touchable in another — a tap target that drifts away from the thing it
// belongs to over a two-minute turn. Keeping every hub static removes that
// entirely: nothing interactive ever moves.
//
// Design §13 allows exactly four looping animations in the app. This is a
// fifth, agreed on 2026-09-17 as the character of the screen.

// One turn every 140 seconds, from the mockup. Slow enough that it reads as
// alive rather than as motion.
const DRIFT_MS = 140000;

// The five hubs are the only touchable things here, and a 6px dot is nowhere
// near the 44pt minimum, so the hit area is grown around them instead of the
// dot being drawn bigger than it should be.
const HUB_TOUCH = 44;

// Two words of a category name at eyebrow size. Wide enough for "Universe &",
// which is the longest first line in the pool.
const LABEL_WIDTH = 78;

// How far past the hub the name sits, measured out from the centre so the five
// labels splay outwards rather than stacking over the rings.
const LABEL_OFFSET = 30;

export type KnowledgeNetProps = {
  layout: NetLayout;
  onSelectCategory: (key: string) => void;
};

export function KnowledgeNet({ layout, onSelectCategory }: KnowledgeNetProps) {
  const reduceMotion = useReduceMotion();

  // The field is laid out in the mockup's 390x430 coordinates and drawn at
  // whatever width the screen gives it, so the hub hit areas — which are real
  // views, not SVG — need the ratio between the two.
  const [width, setWidth] = useState(0);
  const scale = width / VIEW_WIDTH;
  const height = width * (VIEW_HEIGHT / VIEW_WIDTH);

  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const turn = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: DRIFT_MS,
        // Linear, or the dust would visibly speed up and slow down once a
        // turn, which is the one thing a drift must not do.
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    turn.start();

    return () => turn.stop();
  }, [spin, reduceMotion]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // The dust and the rest are split here rather than in the layout, because it
  // is a drawing decision: `layoutNet` says where every dot is, this says which
  // of them moves.
  const dust = layout.nodes.filter((node) => node.state === "untouched");
  const lit = layout.nodes.filter((node) => node.state !== "untouched");

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: width === 0 ? undefined : height }}
      className="w-full"
      // The net is decoration around the five hubs below it: every dot it draws
      // is also a row in the list view, and a screen reader walking 125 unnamed
      // circles would be walking past the same information twice.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <>
          <Svg
            width={width}
            height={height}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop
                  offset="0%"
                  stopColor={colors.accent.DEFAULT}
                  stopOpacity={0.2}
                />
                <Stop
                  offset="100%"
                  stopColor={colors.accent.DEFAULT}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>

            <Circle cx={CENTRE_X} cy={CENTRE_Y} r={185} fill="url(#halo)" />

            {RINGS.map((radius) => (
              <Circle
                key={radius}
                cx={CENTRE_X}
                cy={CENTRE_Y}
                r={radius}
                stroke={colors.text.DEFAULT}
                strokeOpacity={0.05}
                fill="none"
              />
            ))}

            {layout.links.map((link) => (
              <Line
                key={link.id}
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
                stroke={colors.text.DEFAULT}
                strokeOpacity={link.o}
                strokeWidth={0.5}
              />
            ))}

            {lit.map((node) => (
              <Circle
                key={node.slug}
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill={colors.text.DEFAULT}
                fillOpacity={node.o}
              />
            ))}

            {layout.hubs.map((hub) => (
              <Circle
                key={hub.key}
                cx={hub.x}
                cy={hub.y}
                r={hub.r}
                fill={colors.accent.light}
                fillOpacity={hub.o}
              />
            ))}

            {/* The player, in the middle of their own net. The only filled
                accent dot on the screen. */}
            <Circle
              cx={layout.centre.x}
              cy={layout.centre.y}
              r={layout.centre.r}
              fill={colors.accent.light}
            />
          </Svg>

          <Animated.View
            style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}
            pointerEvents="none"
          >
            <Svg
              width={width}
              height={height}
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            >
              {dust.map((node) => (
                <Circle
                  key={node.slug}
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={colors.text.DEFAULT}
                  fillOpacity={node.o}
                />
              ))}
            </Svg>
          </Animated.View>

          {/* The affordance is the name, and nothing else.

              A ring was drawn around each hub first and it was too much — five
              outlined circles in a field of dots read as a second kind of
              decoration rather than as controls. The name does the same work
              quietly: a dot with a word beside it is plainly a thing, where a
              dot alone is scenery. It also answers which direction is which
              category without anyone having to tap to find out.

              Both halves press: the dot carries the 44pt target, the name is
              its own, because a name next to a dot is the thing a hand reaches
              for first. */}
          {layout.hubs.map((hub) => {
            const label = labelPosition(hub, scale);

            return (
              <View key={hub.key}>
                <Pressable
                  onPress={() => onSelectCategory(hub.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${hub.name}, show topics`}
                  style={{
                    position: "absolute",
                    left: hub.x * scale - HUB_TOUCH / 2,
                    top: hub.y * scale - HUB_TOUCH / 2,
                    width: HUB_TOUCH,
                    height: HUB_TOUCH,
                  }}
                />

                <Pressable
                  onPress={() => onSelectCategory(hub.key)}
                  // The dot above already announces this category; a second
                  // button saying the same thing would be read out twice.
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    position: "absolute",
                    left: label.left,
                    top: label.top,
                    width: LABEL_WIDTH,
                  }}
                  className="active:opacity-60"
                >
                  <Text
                    className="text-center text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-faint"
                    numberOfLines={2}
                  >
                    {hub.name}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

// Where a hub's name goes: straight outwards from the centre, past the ring.
// Computed in the mockup's coordinates and then scaled, the same way the hit
// areas are, so the label follows its hub on every screen width.
function labelPosition(
  hub: { x: number; y: number },
  scale: number
): { left: number; top: number } {
  const dx = hub.x - CENTRE_X;
  const dy = hub.y - CENTRE_Y;
  const distance = Math.hypot(dx, dy) || 1;

  const x = CENTRE_X + (dx / distance) * (distance + LABEL_OFFSET);
  const y = CENTRE_Y + (dy / distance) * (distance + LABEL_OFFSET);

  return {
    left: x * scale - LABEL_WIDTH / 2,
    // Half of two eyebrow lines, so the name is centred on the point rather
    // than hanging off it.
    top: y * scale - 12,
  };
}
