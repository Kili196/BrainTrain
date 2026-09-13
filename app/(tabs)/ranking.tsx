import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BobbingDots } from "../../components/ui/BobbingDots";
import {
  displayNameOf,
  fetchLeaderboard,
  initialOf,
  type LeaderboardEntry,
} from "../../lib/leaderboard";
import { colors } from "../../theme/colors";

// The mockup draws an ALL TIME / DAILY toggle. There is no daily board — it was
// left out deliberately, not forgotten, so there is no segmented control here
// and the RPC has no notion of a day either. Everything on this screen is all
// time.

// The three podium discs. First place is larger and sits higher, which is the
// only thing on the screen that says "first" without a number.
const DISC_FIRST = 64;
const DISC_SIDE = 52;

// Pillar heights, in the mockup's proportions. They are blocks rather than
// bars: nothing about them is a measurement, they are the shape of a podium.
const PILLAR_FIRST = 92;
const PILLAR_SECOND = 72;
const PILLAR_THIRD = 56;

const PLACE_COLORS = [
  colors.podium.first,
  colors.podium.second,
  colors.podium.third,
];

export default function Ranking() {
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    // Cleared before the request rather than after, so "Try again" does not
    // leave the error sitting under a request that is already running.
    setFailed(false);

    try {
      setEntries(await fetchLeaderboard());
    } catch {
      // A refresh that fails while a board is already drawn leaves it drawn.
      // Those places were read from the database and nothing newer exists to
      // replace them with; only a first read with nothing to show becomes the
      // error state.
      setFailed(true);
    }
  }, []);

  // On focus, not on mount: tabs stay mounted once visited, and a round played
  // after the first look at this screen has to be able to move the board.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const waiting = entries === null && !failed;

  if (waiting) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <BobbingDots />
      </View>
    );
  }

  if (entries === null) {
    return <LoadFailed onRetry={() => void load()} />;
  }

  const podium = entries.filter((entry) => entry.place <= 3);
  const rest = entries.filter((entry) => entry.place > 3);

  return (
    <FlatList
      className="bg-bg"
      data={rest}
      keyExtractor={(entry) => String(entry.place)}
      // A list, not a `.map()` into a ScrollView — the board is capped at fifty
      // rows today, but the cap is a product decision and not something this
      // screen should depend on.
      contentContainerStyle={{
        paddingTop: insets.top + 44,
        paddingBottom: insets.bottom + 30,
      }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View className="gap-[30px] pb-2.5">
          <Title />
          {podium.length > 0 ? <Podium entries={podium} /> : null}
        </View>
      }
      ListEmptyComponent={
        podium.length === 0 ? <NobodyYet /> : <NobodyElseYet />
      }
      renderItem={({ item, index }) => (
        <>
          {/* A jump in the numbers means the caller's own row was appended from
              far down the board. Without this the list reads as if places were
              missing. */}
          {index > 0 && item.place > rest[index - 1].place + 1 ? (
            <Gap />
          ) : null}
          <Row entry={item} />
        </>
      )}
    />
  );
}

function Title() {
  return (
    <Text className="text-center text-display font-sans-extrabold text-text">
      Leader
      {/* The mockup splits the word across two colours. It is the only place in
          the app where the accent is used on type for decoration rather than
          for state — allowed here because it is the screen's own name, not a
          control pretending to be one. */}
      <Text className="text-accent-light">board</Text>
    </Text>
  );
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  // Second, first, third — the order they stand in, not the order they placed.
  const order = [2, 1, 3]
    .map((place) => entries.find((entry) => entry.place === place))
    .filter((entry): entry is LeaderboardEntry => entry !== undefined);

  return (
    <View className="flex-row items-end justify-center gap-2.5 px-5">
      {order.map((entry) => (
        <PodiumStep key={entry.place} entry={entry} />
      ))}
    </View>
  );
}

function PodiumStep({ entry }: { entry: LeaderboardEntry }) {
  const first = entry.place === 1;
  const color = PLACE_COLORS[entry.place - 1];
  const disc = first ? DISC_FIRST : DISC_SIDE;
  const pillar =
    entry.place === 1
      ? PILLAR_FIRST
      : entry.place === 2
        ? PILLAR_SECOND
        : PILLAR_THIRD;

  return (
    <View className="flex-1 items-center gap-2">
      <View className="items-center gap-2">
        <View>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: disc, height: disc, backgroundColor: color }}
          >
            <Text
              className={`font-sans-extrabold text-text ${
                first ? "text-h1" : "text-h2"
              }`}
            >
              {initialOf(entry)}
            </Text>
          </View>

          {/* The place badge overlaps the disc's lower right, the way the
              mockup draws it. Absolute because it has to sit on the edge. */}
          <View
            className="absolute -bottom-0.5 -right-0.5 h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-bg"
            style={{ backgroundColor: color }}
          >
            <Text
              className="text-caption font-sans-extrabold text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {entry.place}
            </Text>
          </View>
        </View>

        <Text
          className="text-center text-h4 font-sans-bold text-text"
          numberOfLines={1}
        >
          {displayNameOf(entry)}
        </Text>

        <PointsChip points={entry.points} color={color} />
      </View>

      {/* The step itself. A card fill and hairline, per design §5 — flat, and
          the number inside it is the only thing that carries weight. */}
      <View
        className="w-full items-center justify-center rounded-t-sm border border-b-0 border-border bg-card"
        style={{ height: pillar }}
      >
        <Text
          className="text-stat font-sans-extrabold text-text-disabled"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {entry.place}
        </Text>
      </View>
    </View>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const name = displayNameOf(entry);

  return (
    <View
      className={`flex-row items-center gap-3.5 border-t border-divider px-5 py-3.5 ${
        // The caller's own row, tinted the way a selected card is (design §5).
        // The word "You" carries the meaning on its own, so the tint is
        // emphasis rather than the thing that has to be read — design §14.
        entry.isYou ? "bg-accent-wash" : ""
      }`}
      accessibilityRole="text"
      accessibilityLabel={`Place ${entry.place}, ${
        entry.isYou ? "you" : name
      }, ${entry.points} points`}
    >
      <Text
        className="w-5 text-caption font-sans text-text-muted"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {entry.place}
      </Text>

      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          entry.isYou ? "bg-accent" : "bg-chip"
        }`}
      >
        <Text className="text-h4 font-sans-extrabold text-text">
          {entry.isYou ? "Y" : initialOf(entry)}
        </Text>
      </View>

      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center gap-1.5">
          {entry.countryCode ? (
            // The two-letter code rather than a flag emoji. CLAUDE.md allows
            // flags on this screen, but a great many Android builds ship no
            // flag glyphs and draw two letter boxes instead — and the profile
            // screen already labels a country this way.
            <Text className="text-caption font-sans text-text-muted">
              {entry.countryCode}
            </Text>
          ) : null}

          <Text
            className="text-h4 font-sans-bold text-text-strong"
            numberOfLines={1}
          >
            {entry.isYou ? "You" : name}
          </Text>
        </View>

        <PointsChip points={entry.points} color={colors.accent.light} />
      </View>
    </View>
  );
}

function PointsChip({ points, color }: { points: number; color: string }) {
  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-full bg-chip px-2.5 py-1">
      <View
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text
        className="text-caption font-sans-extrabold text-text"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {formatPoints(points)}
      </Text>
    </View>
  );
}

// Drawn where the place numbers skip, i.e. between the last of the top fifty
// and the caller's own row further down.
function Gap() {
  return (
    <View className="items-center py-2.5">
      <Text className="text-caption font-sans text-text-disabled">···</Text>
    </View>
  );
}

// Design §12: an empty state mirrors the real layout rather than replacing it,
// so the board keeps its title and says what would fill it.
function NobodyYet() {
  return (
    <View className="items-center gap-2.5 px-5 pt-[30px]">
      <Text className="text-center text-h3 font-sans-extrabold text-text">
        Nobody has played yet
      </Text>

      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        Finish a round and you will be the first name on this board.
      </Text>
    </View>
  );
}

// The podium is standing but there is no fourth place. Not an error and not
// really empty — just a board that has not filled up.
function NobodyElseYet() {
  return (
    <View className="items-center px-5 pt-[30px]">
      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        That is everyone so far. More players, more places.
      </Text>
    </View>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-2.5 bg-bg px-5">
      <Text className="text-center text-h3 font-sans-extrabold text-text">
        Could not load the leaderboard
      </Text>

      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        Check your connection and try again.
      </Text>

      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try loading the leaderboard again"
        // The ghost button of design §4 has no box of its own, so the padding
        // is what carries it to the 44pt touch target.
        className="px-5 py-3 active:opacity-60"
        hitSlop={10}
      >
        <Text className="text-h4 font-sans-bold text-accent-light">
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

// Thin spaces between thousands, the way the mockup writes "4 820" — the same
// rule the profile screen uses for the same number.
function formatPoints(points: number): string {
  return String(points).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
