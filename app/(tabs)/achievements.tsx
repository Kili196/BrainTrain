import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementGlyph } from "../../components/icons/AchievementGlyph";
import { CheckIcon } from "../../components/icons/CheckIcon";
import { BobbingDots } from "../../components/ui/BobbingDots";
import {
  fetchAchievements,
  type AchievementProgress,
  type AchievementSummary,
} from "../../lib/achievements";
import { useUserId } from "../../lib/auth-context";
import { colors } from "../../theme/colors";

// The achievements list (mockups/ACHIEVEMENTS-SCREEN-SPEC.md): a count, two
// tiles, then one divider row per achievement. No primary button, no filter,
// nothing animated — the only interaction is scrolling.
//
// It lives in `(tabs)` without a tab of its own, which is what gives it the tab
// bar for free. `TabBar` keeps Profile lit while it is open (spec §2.5): it is
// reached from Home, but it belongs to the profile branch of the app.

// Design §5: badges are the single exception to "nothing is square", and it is
// what makes them read as awards rather than as UI chips.
const BADGE_SIZE = 44;
const DONE_BUTTON_SIZE = 32;

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useUserId();

  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);

    try {
      setSummary(await fetchAchievements(userId));
    } catch {
      // Same rule as the profile: a refresh that fails while the list is
      // already drawn leaves it there. Those numbers came from the database and
      // nothing newer exists to replace them with. Only a first read with
      // nothing to show becomes the error state.
      setFailed(true);
    }
  }, [userId]);

  // On focus, not on mount: the tab stays mounted once visited, so a round
  // played after the first look would otherwise never move a bar.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const waiting = summary === null && !failed;

  if (waiting || summary === null) {
    return (
      <View
        className="flex-1 items-center justify-center bg-bg px-5"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {waiting ? <BobbingDots /> : <LoadFailed onRetry={() => void load()} />}
      </View>
    );
  }

  return (
    // The page colour sits on a wrapper rather than on the list: a `className`
    // on a FlatList reaches its outer style, which stops at the end of the
    // content, and a short list would leave the screen behind it unpainted.
    <View className="flex-1 bg-bg">
      <FlatList
        data={summary.rows}
        keyExtractor={(row) => row.achievement.key}
        renderItem={({ item }) => <AchievementRow progress={item} />}
        ListHeaderComponent={
          <Header summary={summary} onDone={() => router.navigate("/home")} />
        }
        // Measured, so it cannot be a class. The tab bar pads itself for the
        // home indicator; this is the reserve above it.
        contentContainerStyle={{
          paddingTop: insets.top + 44,
          paddingBottom: insets.bottom + 30,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Header({
  summary,
  onDone,
}: {
  summary: AchievementSummary;
  onDone: () => void;
}) {
  return (
    // The rows are full-bleed so their dividers reach the frame edge, so the
    // 20px page padding (design §3) sits on the header rather than on the list.
    // 32px of air below it, then the first divider.
    <View className="mb-8 gap-[22px] px-5">
      <View className="flex-row items-start justify-between gap-4">
        <View className="gap-2">
          <Text
            className="text-stat font-sans-extrabold text-text"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {`${summary.completed} / ${summary.total}`}
          </Text>

          {/* "Completed", not "unlocked": the number counts rows whose last
              level is reached, and the two words count different things. */}
          <Text className="text-body font-sans text-text-secondary">
            Achievements completed
          </Text>
        </View>

        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Done"
          className="items-center justify-center rounded-full border-[1.5px] border-text active:opacity-60"
          style={{ width: DONE_BUTTON_SIZE, height: DONE_BUTTON_SIZE }}
          // The button is 32px, below the 44pt target, and the mockup draws it
          // that size — the slop makes up the difference.
          hitSlop={10}
        >
          <CheckIcon size={13} color={colors.text.DEFAULT} />
        </Pressable>
      </View>

      <View className="flex-row gap-2.5">
        <Tile value={String(summary.streakDays)} label="Day streak" />
        <Tile value={formatDuration(summary.spokenMs)} label="Time spent" />
      </View>
    </View>
  );
}

// Border only, no fill — the one place on this screen that is a box rather than
// a divider row, and even it stays hollow (design §5).
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 gap-[7px] rounded-md border border-border px-[15px] py-3.5">
      <Text
        className="text-h2 font-sans-extrabold text-text"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>

      <Text className="text-caption font-sans text-text-secondary">
        {label}
      </Text>
    </View>
  );
}

function AchievementRow({ progress }: { progress: AchievementProgress }) {
  const { achievement, target, done } = progress;

  // One flag drives the whole row (spec §2.4). With the levels gone there are
  // exactly two states left: earned, or on the way there.
  const percent = Math.min(100, (progress.value / target) * 100);

  return (
    <View
      className={`flex-row items-center gap-3.5 border-t border-divider px-5 py-4 ${
        done ? "bg-card-quiet" : ""
      }`}
      // Nothing here is pressable, so the row is one label rather than five
      // fragments — and the label says "locked", because design §14 does not
      // allow colour to carry that on its own.
      accessible
      accessibilityLabel={[
        achievement.title,
        done ? "earned" : "not earned yet",
        achievement.description,
        `${formatValue(progress)} of ${formatAmount(target, achievement.unit)}`,
      ].join(", ")}
    >
      <View
        className={`items-center justify-center rounded-none ${
          done ? "bg-accent" : "border border-border bg-inactive-fill"
        }`}
        style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
      >
        {done ? (
          <AchievementGlyph glyph={achievement.glyph} />
        ) : (
          // Only the shape is withheld — the title, the description and the
          // target are all on screen. Nothing on this screen is secret.
          <Text className="text-h3 font-sans-extrabold text-nav-inactive">?</Text>
        )}
      </View>

      <View className="flex-1 gap-1">
        <Text
          className={`text-h4 font-sans-bold ${
            done ? "text-text" : "text-text-strong"
          }`}
        >
          {achievement.title}
        </Text>

        <Text className="text-caption font-sans text-text-secondary">
          {achievement.description}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-3">
          <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
            <View
              className={`h-1.5 rounded-full ${
                done ? "bg-accent" : "bg-nav-inactive"
              }`}
              // A measured width, which is the one thing Tailwind cannot
              // express here.
              style={{ width: `${percent}%` }}
            />
          </View>

          <Text
            className={`text-caption font-sans-bold ${
              done ? "text-text" : "text-text-muted"
            }`}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {`${formatValue(progress)}/${formatAmount(target, achievement.unit)}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-center gap-2.5">
      <Text className="text-center text-h3 font-sans-extrabold text-text">
        Could not load your achievements
      </Text>

      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        Check your connection and try again.
      </Text>

      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try loading your achievements again"
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

// The counter's left half, capped at the target: a row that reads "312/250"
// looks like a bug, not like an achievement finished long ago.
function formatValue(progress: AchievementProgress): string {
  return formatAmount(
    Math.min(progress.value, progress.target),
    progress.achievement.unit
  );
}

function formatAmount(amount: number, unit: "count" | "ms"): string {
  return unit === "ms" ? formatDuration(amount) : String(amount);
}

// "3h 41m" / "12m" / "45s" — the largest unit that fits, plus the next one down
// when it is not zero. Written out rather than `Intl.RelativeTimeFormat`, which
// follows the phone's locale and would drop "Std." into an English UI.
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

  const remainder = seconds % 60;
  if (minutes > 0) {
    return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}
