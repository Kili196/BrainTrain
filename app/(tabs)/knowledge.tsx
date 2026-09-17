import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeHeader } from "../../components/game/HomeHeader";
import { ListIcon } from "../../components/icons/ListIcon";
import { NetIcon } from "../../components/icons/NetIcon";
import { CategoryTopicsSheet } from "../../components/knowledge/CategoryTopicsSheet";
import { KnowledgeNet } from "../../components/knowledge/KnowledgeNet";
import { BobbingDots } from "../../components/ui/BobbingDots";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useUserId } from "../../lib/auth-context";
import {
  fetchKnowledge,
  type KnowledgeCategory,
  type KnowledgeRound,
  type KnowledgeSummary,
} from "../../lib/knowledge";
import { layoutNet } from "../../lib/knowledge-layout";
import { colors } from "../../theme/colors";

// The Knowledge screen (mockups/Knowledge Screen.dc.html): the whole topic pool
// as a net of dots, the same thing as a list of five categories, and the
// player's own rounds underneath, searchable.
//
// It carries the Home header, mockup and all — which means it carries the
// streak flame. Wanting a real number under it here is what retired
// `PLACEHOLDER_STREAK_DAYS` on Home as well: the rounds could always answer
// "how many days", nothing had ever asked them.

// The two views of one fact. The net is the character of the screen and the
// list is the one you use when you want an answer, so the net opens first and
// the toggle is a quiet icon button rather than a segmented control.
type ViewMode = "net" | "list";

export default function KnowledgeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useUserId();

  const [summary, setSummary] = useState<KnowledgeSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<ViewMode>("net");
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed(false);

    try {
      setSummary(await fetchKnowledge(userId));
    } catch {
      // Same rule as the profile and the achievements: a refresh that fails
      // while the screen is already drawn leaves it drawn. Only a first read
      // with nothing to show becomes the error state.
      setFailed(true);
    }
  }, [userId]);

  // On focus, not on mount: the tab stays mounted once visited, so a round
  // played afterwards would otherwise never light a dot.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // The layout is pure and the pool is 125 topics, but it runs trigonometry per
  // dot and the search box re-renders this component on every keystroke.
  const layout = useMemo(
    () => (summary ? layoutNet(summary.categories) : null),
    [summary]
  );

  const rounds = useMemo(
    () => matching(summary?.rounds ?? [], query),
    [summary, query]
  );

  const waiting = summary === null && !failed;

  if (summary === null || layout === null) {
    return (
      <View
        className="flex-1 items-center justify-center bg-bg px-5"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {waiting ? <BobbingDots /> : <LoadFailed onRetry={() => void load()} />}
      </View>
    );
  }

  const category =
    summary.categories.find((entry) => entry.key === openCategory) ?? null;

  return (
    // The page colour sits on the wrapper, not the list: a `className` on a
    // FlatList reaches its outer style, which ends with the content, and a
    // short list would leave the rest of the screen unpainted.
    <View className="flex-1 bg-bg">
      {/* Above the list, not inside its header. A `TextInput` in a
          `ListHeaderComponent` is inside a virtualized tree, and this list's
          `data` changes with every keystroke — the header gets torn down and
          rebuilt mid-word, which takes the keyboard with it. Out here it is an
          ordinary view that nothing re-renders, and the search stays reachable
          once the net has been scrolled past. */}
      <View
        className="gap-[18px] px-5 pb-[18px]"
        style={{ paddingTop: insets.top + 44 }}
      >
        <Header
          summary={summary}
          mode={mode}
          query={query}
          onToggleMode={() => setMode(mode === "net" ? "list" : "net")}
          onQuery={setQuery}
        />
      </View>

      <FlatList
        data={rounds}
        keyExtractor={(round) => round.id}
        renderItem={({ item }) => <RoundRow round={item} />}
        ListHeaderComponent={
          <View className="gap-[22px] pb-2.5">
            {mode === "net" ? (
              <KnowledgeNet layout={layout} onSelectCategory={setOpenCategory} />
            ) : (
              <CategoryList
                categories={summary.categories}
                onSelect={setOpenCategory}
              />
            )}

            {summary.rounds.length > 0 ? (
              <Text className="px-5 text-eyebrow font-sans-extrabold uppercase tracking-pill text-text-faint">
                Your rounds
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          summary.rounds.length === 0 ? (
            <FirstRun onPlay={() => router.navigate("/home")} />
          ) : (
            <NoMatch query={query} />
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
        // Dragging the list puts the keyboard away rather than fighting it.
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />

      <CategoryTopicsSheet
        category={category}
        onClose={() => setOpenCategory(null)}
      />
    </View>
  );
}

function Header({
  summary,
  mode,
  query,
  onToggleMode,
  onQuery,
}: {
  summary: KnowledgeSummary;
  mode: ViewMode;
  query: string;
  onToggleMode: () => void;
  onQuery: (next: string) => void;
}) {
  return (
    <>
      {/* The real streak, where Home's used to be a constant — both read it off
          the rounds now. `hasNewChallenge` stays false and unwired: there is no
          Challenges screen to have news. */}
      <HomeHeader streakDays={summary.streakDays} hasNewChallenge={false} />

      <View className="flex-row items-start gap-2.5">
        <Text className="flex-1 text-center text-body font-sans leading-5 text-text-secondary">
          {intro(summary)}
        </Text>

        <Pressable
          onPress={onToggleMode}
          accessibilityRole="button"
          accessibilityLabel={
            mode === "net" ? "Show the category list" : "Show the net"
          }
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full border border-modal active:opacity-60"
        >
          {mode === "net" ? (
            <ListIcon size={15} color={colors.text.secondary} />
          ) : (
            <NetIcon size={15} color={colors.text.secondary} />
          )}
        </Pressable>
      </View>

      {/* The app's own search field (design §6), not a second one built here —
          it already owns the magnifier, the focus ring and the padding a
          `TextInput` needs on Android. */}
      <TextField
        variant="search"
        value={query}
        onChangeText={onQuery}
        placeholder="Search your topics"
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search your saved rounds"
      />
    </>
  );
}

// The sentence the mockup puts at the top. Its own numbers were invented — 160
// topics against a pool of 125 — so it is written from the summary instead.
function intro(summary: KnowledgeSummary): string {
  if (summary.rounds.length === 0) {
    return `This is the brain you're training — ${summary.topicCount} topics waiting. Tap a dot to explore a category.`;
  }

  return `This is the brain you're training — ${summary.masteredCount} of ${summary.topicCount} topics mastered so far. Tap a dot to explore a category.`;
}

function CategoryList({
  categories,
  onSelect,
}: {
  categories: KnowledgeCategory[];
  onSelect: (key: string) => void;
}) {
  return (
    <View>
      {categories.map((category) => (
        <Pressable
          key={category.key}
          onPress={() => onSelect(category.key)}
          accessibilityRole="button"
          accessibilityLabel={`${category.name}, ${category.mastered} of ${category.total} mastered`}
          className="gap-2.5 border-t border-divider px-5 py-3.5 active:bg-card-quiet"
        >
          <View className="flex-row items-baseline justify-between gap-3.5">
            <Text className="text-h4 font-sans-bold text-text">
              {category.name}
            </Text>
            <Text
              className="text-caption font-sans-bold text-text-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {category.mastered}/{category.total}
            </Text>
          </View>

          {/* Design §12: 3px track, accent fill. The bar is the mastered share,
              with the merely-played part behind it in a dimmer blue, so one row
              shows effort and result without a second bar. */}
          <View className="h-[3px] w-full overflow-hidden rounded-xs bg-track">
            <View
              className="h-full rounded-xs bg-accent"
              style={{ width: `${share(category.spoken, category.total)}%` }}
            >
              <View
                className="h-full rounded-xs bg-accent-light"
                style={{
                  width: `${share(category.mastered, Math.max(category.spoken, 1))}%`,
                }}
              />
            </View>
          </View>
        </Pressable>
      ))}

      <View className="border-t border-divider" />
    </View>
  );
}

function RoundRow({ round }: { round: KnowledgeRound }) {
  return (
    <View
      className="flex-row items-center justify-between gap-3.5 border-t border-divider px-5 py-3.5"
      accessibilityRole="text"
      accessibilityLabel={`${round.title}, ${dayAndMonth(round.startedAt)}, ${
        round.score === null ? "quiz skipped" : `${round.score} points`
      }`}
    >
      <View className="flex-1 gap-1.5">
        <Text className="text-h4 font-sans-bold text-text" numberOfLines={1}>
          {round.title}
        </Text>
        <Text className="text-caption font-sans text-text-muted">
          {dayAndMonth(round.startedAt)}
        </Text>
      </View>

      {round.score === null ? (
        <Text className="text-caption font-sans text-text-disabled">
          No quiz
        </Text>
      ) : (
        <Text
          className="text-h3 font-sans-extrabold text-text"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {round.score}
        </Text>
      )}
    </View>
  );
}

// Design §12: the empty state mirrors the real layout instead of replacing it,
// so the net above stays on screen — 125 unlit dots are exactly what "nothing
// yet" looks like here — and this sits under it.
function FirstRun({ onPlay }: { onPlay: () => void }) {
  return (
    <View className="items-center gap-2.5 px-5 pt-[30px]">
      <Text className="text-center text-h3 font-sans-extrabold text-text">
        No rounds yet
      </Text>

      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        Every topic you explain is saved here with its score, and its dot lights
        up in the net above.
      </Text>

      <View className="pt-2.5">
        <Button label="Draw your first topic" onPress={onPlay} />
      </View>
    </View>
  );
}

function NoMatch({ query }: { query: string }) {
  return (
    <View className="items-center px-5 pt-[30px]">
      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        No saved rounds match “{query.trim()}”
      </Text>
    </View>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-center gap-2.5">
      <Text className="text-center text-h3 font-sans-extrabold text-text">
        Could not load your topics
      </Text>

      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        Check your connection and try again.
      </Text>

      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try loading your topics again"
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

// Matching on the title the row actually shows, so a search never hides a row
// for a reason the player cannot see on it.
function matching(
  rounds: readonly KnowledgeRound[],
  query: string
): KnowledgeRound[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...rounds];

  return rounds.filter((round) =>
    round.title.toLowerCase().includes(needle)
  );
}

function share(part: number, whole: number): number {
  if (whole <= 0) return 0;

  return Math.round((part / whole) * 100);
}

// Written out rather than `toLocaleDateString`, for the same reason
// `profile.tsx` writes its own: Intl follows the phone's locale and would drop
// a German month into an otherwise English line.
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function dayAndMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
