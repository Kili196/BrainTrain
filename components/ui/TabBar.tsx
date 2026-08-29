import { useEffect, useRef, useState, type ComponentType } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";

import { CHROME_EASING, CHROME_TRANSFORM_MS } from "../game/FlyAway";
import { GearIcon } from "../icons/GearIcon";
import { useRoundStart } from "../../lib/round-start-context";
import { colors } from "../../theme/colors";

// The bottom bar (design §12): five equal columns on the page background with a
// hairline above, an 18px icon area and a 9.5px label under it.
//
// Replaces React Navigation's default bar entirely, through the `tabBar` prop.
// That is what makes it stylable at all, and it also means the bar animates
// itself rather than being pushed around through `tabBarStyle` from the layout.
//
// It leaves last when a round starts and comes back first — the far end of the
// choreography the header and controls begin. Measuring its own height is what
// lets it travel just past the bottom edge rather than by a guessed amount.
const LEAVE_DELAY = 120;
const RETURN_DELAY = 0;
const LEAVE_DISTANCE = 1.25;

// Design §9: tab icons are NOT the app's stroke SVGs. They are built from small
// bars, rings and blocks so they take the active colour directly. Settings is
// the one exception — a gear cannot be assembled from bars, so it borrows the
// icon set.
const ICON_AREA = 18;

type Glyph = ComponentType<{ color: string }>;

type Tab = {
  label: string;
  href: string;
  Icon: Glyph;
};

export function TabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { starting } = useRoundStart();

  const [height, setHeight] = useState(0);
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(travel, {
      toValue: starting ? height * LEAVE_DISTANCE : 0,
      duration: CHROME_TRANSFORM_MS,
      delay: starting ? LEAVE_DELAY : RETURN_DELAY,
      easing: CHROME_EASING,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [starting, height, travel]);

  return (
    <Animated.View
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={{
        // Opaque, and on the page background rather than a lighter surface: the
        // chrome flying downwards passes behind it and must not show through.
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.border.divider,
        paddingBottom: insets.bottom,
        transform: [{ translateY: travel }],
      }}
    >
      <View className="flex-row">
        {TABS.map((tab) => (
          <TabItem
            key={tab.href}
            tab={tab}
            active={pathname === tab.href}
            onPress={() => router.navigate(tab.href)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function TabItem({
  tab,
  active,
  onPress,
}: {
  tab: Tab;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? colors.accent.DEFAULT : colors["nav-inactive"];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      className="flex-1 items-center gap-1.5 py-1"
    >
      {/* A fixed box, so glyphs of different heights still line their labels up. */}
      <View
        className="items-center justify-center"
        style={{ height: ICON_AREA }}
      >
        <tab.Icon color={color} />
      </View>

      <Text className="text-tab font-sans-semibold" style={{ color }}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

// --- the glyphs -------------------------------------------------------------
// Each is a handful of Views. They take `color` as a fill rather than inheriting
// it, since a View has nothing to inherit from.

function ProfileGlyph({ color }: { color: string }) {
  return (
    <View className="items-center gap-0.5">
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      {/* Shoulders: a bar rounded only along its top edge. */}
      <View
        style={{
          width: 14,
          height: 6,
          borderTopLeftRadius: 999,
          borderTopRightRadius: 999,
          borderWidth: 1.5,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
    </View>
  );
}

// A podium: second, first, third. The same three blocks the leaderboard is
// built from.
function PodiumGlyph({ color }: { color: string }) {
  return (
    <View className="flex-row items-end gap-0.5">
      {[8, 14, 10].map((barHeight, index) => (
        <View
          key={index}
          style={{
            width: 4,
            height: barHeight,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

function BarsGlyph({ color }: { color: string }) {
  return (
    <View className="gap-1">
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={{ width: 18, height: 3, borderRadius: 1, backgroundColor: color }}
        />
      ))}
    </View>
  );
}

// The knowledge net, reduced to its dots — design §9 names that grid as one of
// the deliberately filled shapes in the product.
function NetGlyph({ color }: { color: string }) {
  return (
    <View className="gap-1">
      {[0, 1, 2].map((row) => (
        <View key={row} className="flex-row gap-1">
          {[0, 1, 2].map((column) => (
            <View
              key={column}
              style={{
                width: 3,
                height: 3,
                borderRadius: 999,
                backgroundColor: color,
                // The middle of the grid is the node everything hangs off, so
                // the corners sit back a little.
                opacity: row === 1 && column === 1 ? 1 : 0.65,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function SettingsGlyph({ color }: { color: string }) {
  return <GearIcon size={17} color={color} />;
}

const TABS: Tab[] = [
  { label: "Profile", href: "/profile", Icon: ProfileGlyph },
  { label: "Ranking", href: "/ranking", Icon: PodiumGlyph },
  { label: "Home", href: "/home", Icon: BarsGlyph },
  { label: "Knowledge", href: "/knowledge", Icon: NetGlyph },
  { label: "Settings", href: "/settings", Icon: SettingsGlyph },
];
