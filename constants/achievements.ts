// The 24 achievements: what they are called and what it takes to earn one.
//
// Deliberately free of any measurement logic — this file says *what* is
// rewarded, `lib/achievements.ts` says *how* it is counted. Keeping them apart
// is what lets the wording and the targets be argued about without touching a
// single query.
//
// One target per achievement, not a ladder. The mockup draws levels inside each
// row ("LEVEL 2", a bar running to the next of four thresholds) and this list
// was built that way first; it was flattened on 2026-09-16 because the level
// label explained nothing on a phone that the badge and the bar did not already
// say. What a row promises is now a single sentence with a single number in it.
//
// Two rules the list follows, both learned the hard way while writing it:
//
//  1. **Every metric may only ever rise.** An achievement that can be lost is
//     not an achievement. That rules out "50 rounds without ever scoring 0"
//     (one bad round destroys it forever) and anything about the leaderboard (a
//     place drops when somebody else plays, and "best place ever" is stored
//     nowhere).
//  2. **Nothing is secret.** A row that has not been earned still shows its
//     title, its description and its target; only the badge glyph is withheld,
//     as a `?`.
//
// The titles come from the 50 generated candidates, not from the mockup's six
// examples, and each keeps the number the generated description gave it. Where
// the old ladder had four steps, the step whose name survived is the one that
// is still worth playing for — "Thirty straight", not "Century run".

export type AchievementFamily =
  | "volume"
  | "accuracy"
  | "breadth"
  | "depth"
  | "streak"
  | "rhythm"
  | "endurance"
  | "ritual";

// A shape name, not the character itself. The mockup writes the badges as
// Unicode geometry (◆ ▲ ●), but Archivo contains none of those glyphs, so every
// device would fall back to a different system font and the badges would not
// match between iOS and Android. They are drawn as SVG instead (design §9), and
// this is the name of the shape to draw.
//
// One shape per family, so the badges group the list visually the way the
// families group it logically.
export type AchievementGlyph =
  | "circle"
  | "diamond"
  | "star"
  | "chevrons"
  | "triangle"
  | "ring"
  | "bar"
  | "hexagon";

export type Achievement = {
  key: string;
  // Sentence case, the way the mockup sets them ("Clean sheet", not "Clean
  // Sheet"). Short enough to stay on one line next to a 44px badge.
  title: string;
  // An imperative phrase with no full stop, and it carries the number: with no
  // levels left, the description is the only place the target is spelled out in
  // words. The counter under it repeats it as a figure.
  description: string;
  family: AchievementFamily;
  glyph: AchievementGlyph;
  // What the metric has to reach. Earned is `value >= target`, and there is
  // nothing in between.
  target: number;
  // What the target is counted in. "ms" targets are formatted as a duration
  // ("30m") rather than as a raw number.
  unit: "count" | "ms";
};

const MINUTE = 60 * 1000;

// `as const satisfies` rather than a plain annotation: it keeps the literal key
// strings, which is what makes `AchievementKey` below a union of exactly these
// 24 names — so the evaluator in `lib/achievements.ts` cannot forget one
// without failing to compile.
const DEFINITIONS = [
  // ---- volume: how much, and for how long -------------------------------
  {
    key: "rounds_played",
    title: "Long haul",
    description: "Finish 250 speaking rounds",
    family: "volume",
    glyph: "circle",
    target: 250,
    unit: "count",
  },
  {
    key: "play_days",
    title: "Thirty sittings",
    description: "Play on 30 separate days",
    family: "volume",
    glyph: "circle",
    target: 30,
    unit: "count",
  },
  {
    key: "fast_start",
    title: "Fast start",
    description: "Finish 10 rounds in your first week",
    family: "volume",
    glyph: "circle",
    target: 10,
    unit: "count",
  },
  {
    key: "year_one",
    title: "Year one",
    description: "Still be here a year after signing up",
    family: "volume",
    glyph: "circle",
    target: 1,
    unit: "count",
  },

  // ---- accuracy: the quiz --------------------------------------------------
  {
    key: "perfect_rounds",
    title: "Clean sheet",
    description: "Answer all five questions right",
    family: "accuracy",
    glyph: "diamond",
    target: 1,
    unit: "count",
  },
  {
    key: "perfect_streak",
    title: "Five straight",
    description: "Score 100 in five rounds in a row",
    family: "accuracy",
    glyph: "diamond",
    target: 5,
    unit: "count",
  },
  {
    key: "high_floor",
    title: "No slips",
    description: "Stay at 60 or better for 20 rounds",
    family: "accuracy",
    glyph: "diamond",
    target: 20,
    unit: "count",
  },
  {
    key: "rebound",
    title: "Rebound",
    description: "Follow a zero with a hundred",
    family: "accuracy",
    glyph: "diamond",
    target: 1,
    unit: "count",
  },

  // ---- breadth: how much of the pool has been touched ----------------------
  {
    key: "distinct_topics",
    title: "Wide net",
    description: "Speak on 30 different topics",
    family: "breadth",
    glyph: "star",
    // The generated list also carries "Whole library" at all 125 published
    // topics. Drawing at random that is a coupon-collector problem — roughly
    // 680 rounds — and with one target per row rather than a ladder, a row
    // nobody can finish is a row nobody reads. 30 is the same idea, playable.
    target: 30,
    unit: "count",
  },
  {
    key: "all_categories",
    title: "All five",
    description: "Speak on a topic in every area",
    family: "breadth",
    glyph: "star",
    target: 5,
    unit: "count",
  },
  {
    key: "category_complete",
    title: "Full shelf",
    description: "Cover all 25 topics of one area",
    family: "breadth",
    glyph: "star",
    // 25 is a whole category. `constants/categories.ts` holds five of them and
    // the pool carries exactly 25 published topics each.
    target: 25,
    unit: "count",
  },
  {
    key: "grand_tour",
    title: "Grand tour",
    description: "Touch all five areas in one day",
    family: "breadth",
    glyph: "star",
    target: 5,
    unit: "count",
  },

  // ---- depth: going back to the same ground --------------------------------
  {
    key: "home_turf",
    title: "Home turf",
    description: "Play 50 rounds in a single area",
    family: "depth",
    glyph: "chevrons",
    target: 50,
    unit: "count",
  },
  {
    key: "specialist",
    title: "Specialist",
    description: "Average 80 across five rounds in one area",
    family: "depth",
    glyph: "chevrons",
    // Counts areas that have cleared the bar, so the target is one of them. An
    // average cannot be a target on its own, because it falls as easily as it
    // rises — `lib/achievements.ts` walks the history for the moment it first
    // stood at 80.
    target: 1,
    unit: "count",
  },
  {
    key: "second_pass",
    title: "Second pass",
    description: "Beat your own earlier score five times",
    family: "depth",
    glyph: "chevrons",
    target: 5,
    unit: "count",
  },

  // ---- streak: consecutive days --------------------------------------------
  {
    key: "streak",
    title: "Thirty straight",
    description: "Play on 30 consecutive days",
    family: "streak",
    glyph: "triangle",
    target: 30,
    unit: "count",
  },
  {
    key: "heavy_week",
    title: "Heavy week",
    description: "Three rounds a day, seven days running",
    family: "streak",
    glyph: "triangle",
    target: 7,
    unit: "count",
  },

  // ---- rhythm: when the rounds happen --------------------------------------
  {
    key: "night_shift",
    title: "Night shift",
    description: "Finish a round between midnight and 4am",
    family: "rhythm",
    glyph: "ring",
    target: 1,
    unit: "count",
  },
  {
    key: "big_day",
    title: "Big day",
    description: "Finish eight rounds in one day",
    family: "rhythm",
    glyph: "ring",
    target: 8,
    unit: "count",
  },
  {
    key: "clock_face",
    title: "Clock face",
    description: "Start rounds in 12 different hours",
    family: "rhythm",
    glyph: "ring",
    target: 12,
    unit: "count",
  },
  {
    key: "all_weekdays",
    title: "All seven",
    description: "Play at least one round on every weekday",
    family: "rhythm",
    glyph: "ring",
    target: 7,
    unit: "count",
  },

  // ---- endurance: time actually spent speaking -----------------------------
  {
    key: "time_spent",
    title: "Half hour",
    description: "Speak for 30 minutes in total",
    family: "endurance",
    glyph: "bar",
    target: 30 * MINUTE,
    unit: "ms",
  },
  {
    key: "long_round",
    title: "Three minutes",
    description: "Speak for three minutes in one round",
    family: "endurance",
    glyph: "bar",
    // A round can never run longer than the speaking time set on the device,
    // and the default is 2:00 — so this one asks the player to raise that
    // setting before it can be earned at all. That is the point of it: it is
    // the only row in the list that is about the length of a single round.
    target: 3 * MINUTE,
    unit: "ms",
  },

  // ---- ritual: the daily topic ---------------------------------------------
  {
    key: "daily_topic",
    title: "Daily draw",
    description: "Play the daily topic",
    family: "ritual",
    glyph: "hexagon",
    target: 1,
    unit: "count",
  },
] as const satisfies readonly Achievement[];

export type AchievementKey = (typeof DEFINITIONS)[number]["key"];

// Typed with the narrowed key rather than as `readonly Achievement[]`: a plain
// `Achievement` has `key: string`, and widening it here would force every
// consumer to assert the key back into the union it never left.
//
// Source order is display order, the way `constants/categories.ts` works: the
// screen renders this list top to bottom and never sorts it, so the order is
// decided here, once, rather than by however the data happened to arrive.
export const achievements: readonly (Achievement & {
  key: AchievementKey;
})[] = DEFINITIONS;
