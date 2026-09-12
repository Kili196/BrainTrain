import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BobbingDots } from "../../components/ui/BobbingDots";
import { Button } from "../../components/ui/Button";
import { categoryName } from "../../constants/categories";
import { countries } from "../../constants/countries";
import { useUserId } from "../../lib/auth-context";
import { fetchProfile, type Profile } from "../../lib/profile";
import {
  fetchRoundStats,
  type FieldStat,
  type RoundStats,
} from "../../lib/speech-sessions";

// Design §12 lists a 140px avatar, and the mockup draws an arc plus a `LVL 12`
// badge around it. Both of those are level progress, XP does not exist yet, and
// a closed accent circle that tracks nothing would be decorative accent — which
// §14 forbids. So this is the disc alone; `ProgressRing` wraps it unchanged on
// the day there is a number to draw.
const AVATAR_SIZE = 140;

type Overview = {
  // Nullable because `fetchProfile` is: RLS can hide the row if the session
  // expires mid-read. The rounds are still worth showing when it does.
  profile: Profile | null;
  stats: RoundStats;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useUserId();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    // Cleared before the request, not after it: otherwise "Try again" leaves the
    // error on screen for the length of the read and reads as a dead button.
    setFailed(false);

    try {
      // Both at once. They are independent reads and the screen cannot draw
      // until it has both, so awaiting them in sequence would only add a round
      // trip to a screen that is already waiting on the network.
      const [profile, stats] = await Promise.all([
        fetchProfile(userId),
        fetchRoundStats(userId),
      ]);

      setOverview({ profile, stats });
    } catch {
      // A refresh that fails while numbers are already on screen leaves them
      // there, and says nothing. That is not a screen claiming something untrue:
      // those numbers were read from the database and nothing newer exists to
      // replace them with. Only a first read with nothing to show becomes the
      // error state below.
      setFailed(true);
    }
  }, [userId]);

  // On focus, not on mount: a tab stays mounted once it has been visited, so a
  // round finished after the first look at this screen would otherwise never
  // show up on it. The refresh deliberately keeps whatever is already drawn —
  // blanking correct numbers for the length of a request reads as a bug.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const waiting = overview === null && !failed;

  return (
    <ScrollView
      className="bg-bg"
      // 20px page padding, the same as Home (design §3 — one value per screen).
      contentContainerClassName="grow px-5"
      // Measured, so it cannot be a class. The bottom inset belongs to the tab
      // bar, which pads itself; this is the reserve above it.
      contentContainerStyle={{
        paddingTop: insets.top + 44,
        paddingBottom: insets.bottom + 30,
      }}
      showsVerticalScrollIndicator={false}
    >
      {waiting ? (
        <View className="flex-1 items-center justify-center">
          <BobbingDots />
        </View>
      ) : overview === null ? (
        <LoadFailed onRetry={() => void load()} />
      ) : (
        <Loaded overview={overview} onStart={() => router.navigate("/home")} />
      )}
    </ScrollView>
  );
}

function Loaded({
  overview,
  onStart,
}: {
  overview: Overview;
  onStart: () => void;
}) {
  const { profile, stats } = overview;
  const empty = stats.rounds === 0;

  return (
    <View className="gap-[34px]">
      <View className="items-center gap-4">
        <Avatar initial={initialOf(profile)} />

        {profile ? (
          <View className="items-center gap-2">
            {profile.display_name ? (
              <Text className="text-center text-h1 font-sans-extrabold text-text">
                {profile.display_name}
              </Text>
            ) : null}

            <MetaLine profile={profile} />
          </View>
        ) : null}
      </View>

      <View className="flex-row justify-center gap-[52px]">
        <Stat value={formatPoints(stats.points)} label="Points" dim={empty} />
        <Stat value={String(stats.rounds)} label="Rounds" dim={empty} />
      </View>

      <View className="gap-3.5">
        <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
          Strongest fields
        </Text>

        {stats.fields.length > 0 ? (
          <View className="gap-3.5">
            {stats.fields.map((field) => (
              <FieldRow key={field.category} field={field} />
            ))}
          </View>
        ) : (
          <EmptyFields />
        )}
      </View>

      {empty ? (
        // Design §12: the layout above stays, zeroed and dashed, and the
        // explanation sits under it rather than replacing it.
        <View className="items-center gap-2.5">
          <Text className="text-center text-h3 font-sans-extrabold text-text">
            No rounds yet
          </Text>

          <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
            Draw a topic, speak about it, then answer five questions. Your
            points and your strongest fields build up from there.
          </Text>

          <Button label="Start your first topic" onPress={onStart} />
        </View>
      ) : null}
    </View>
  );
}

function Avatar({ initial }: { initial: string }) {
  return (
    <View
      className="items-center justify-center rounded-full border border-border bg-card"
      // A design constant worth naming once rather than spelling out twice in a
      // class string.
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
    >
      <Text className="text-display font-sans-extrabold text-text">
        {initial}
      </Text>
    </View>
  );
}

function MetaLine({ profile }: { profile: Profile }) {
  const age = ageFrom(profile.birth_date);
  const country = countries.find((c) => c.code === profile.country_code);

  return (
    <Text className="text-center text-body font-sans text-text-secondary">
      {age !== null ? `${age}${SEPARATOR}` : ""}

      {country ? (
        <Text>
          {/* Dimmer and smaller than the country beside it, the way the mockup
              draws it: the code is a label on the name, not a fact of its own. */}
          <Text className="text-caption font-sans text-text-muted">
            {country.code}
          </Text>
          {` ${country.name}${SEPARATOR}`}
        </Text>
      ) : null}

      {`since ${monthAndYear(profile.created_at)}`}
    </Text>
  );
}

function Stat({
  value,
  label,
  dim,
}: {
  value: string;
  label: string;
  dim: boolean;
}) {
  return (
    <View className="items-center gap-2">
      <Text
        className={`text-stat font-sans-extrabold ${
          dim ? "text-text-disabled" : "text-text"
        }`}
        // Design §2: every number in the app is tabular, so a value that grows
        // cannot shift the digits around it.
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>

      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-muted">
        {label}
      </Text>
    </View>
  );
}

function FieldRow({ field }: { field: FieldStat }) {
  return (
    <View className="flex-row items-center justify-between gap-3.5">
      <Text className="text-h4 font-sans-bold text-text-strong">
        {categoryName(field.category)}
      </Text>

      <Text
        className="text-caption font-sans text-text-muted"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {field.topicCount === 1 ? "1 topic" : `${field.topicCount} topics`}
      </Text>
    </View>
  );
}

// Design §12: an empty state mirrors the real layout instead of replacing it,
// so these are field rows with the content taken out.
function EmptyFields() {
  return (
    <View className="gap-3.5">
      {[0, 1, 2].map((row) => (
        // Square on purpose. Android draws a dashed border as a solid one as
        // soon as the corners are rounded, so a radius here would quietly cost
        // the dashes on half the devices — and §7 files these with the divider
        // rows, which have no corners either.
        <View key={row} className="h-5 border border-dashed border-empty" />
      ))}
    </View>
  );
}

// A failed read is worth saying out loud rather than drawing as zeroes: "no
// rounds yet" and "we could not ask" look identical on screen, and a screen
// that quietly claims the wrong thing is the exact bug this project keeps
// removing.
function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-2.5">
      <Text className="text-center text-h3 font-sans-extrabold text-text">
        Could not load your profile
      </Text>

      <Text className="max-w-[270px] text-center text-body font-sans text-text-secondary">
        Check your connection and try again.
      </Text>

      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try loading your profile again"
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

// A bullet with air on both sides — design §3 asks for a 6–8px gap, written as
// spaces so the whole line stays one Text and keeps a single baseline.
const SEPARATOR = "  •  ";

function initialOf(profile: Profile | null): string {
  // An empty disc rather than a placeholder glyph. Onboarding cannot produce a
  // nameless profile (the name step keeps CONTINUE disabled until there is a
  // name), so this only covers a row nobody ever filled in — and inventing a
  // "?" for it would say more than we know.
  return profile?.display_name?.trim().charAt(0).toUpperCase() ?? "";
}

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;

  // Split rather than `new Date(birthDate)`: a bare ISO date parses as UTC
  // midnight, and reading the local month and day back off that lands a day
  // early for every player west of UTC. A birth date has no timezone — it is
  // three numbers.
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  const thisMonth = today.getMonth() + 1;

  const hadBirthday =
    thisMonth > month || (thisMonth === month && today.getDate() >= day);

  return today.getFullYear() - year - (hadBirthday ? 0 : 1);
}

// Written out rather than `toLocaleDateString`: Intl follows the phone's locale,
// which would drop a German month name into an otherwise English line.
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

function monthAndYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Grouped the way the mockup draws "2 480". `Intl.NumberFormat` would follow the
// phone's locale and put a German dot into an English UI; a narrow no-break
// space is also the one separator that cannot be misread as a decimal point.
function formatPoints(points: number): string {
  return String(points).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
