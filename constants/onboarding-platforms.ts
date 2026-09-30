import { colors } from "../theme/colors";

// Where the evening goes, and how to say it in a sentence. Ported verbatim from
// offhand-landing's onboarding, which is the reference for this flow.
//
// Its own file because both ends of the flow need it and neither may import the
// other: the step list needs the options to offer, and the onboarding context
// needs the phrasing for `platformLabel`, which is read back into copy later.
//
// NAMING PLATFORMS IS ALLOWED, AND THERE IS EXACTLY ONE LINE. Calling them by
// name is descriptive use. What is not allowed is anything that looks like
// association: no logos, no brand colours, no wordmark styling. Text, in the
// app's own typeface, and nothing else.
export type Platform = {
  id: string;
  // Shown on the option.
  label: string;
  // Used inside a sentence, where a capitalised label would read as a shout.
  // Falls back to the label when the two are the same.
  phrase?: string;
  // The tile once chosen: the feed's own colours, label in white. Colour only —
  // see `ob.brand` in theme/colors.js for why that line is drawn there.
  fill: { colors: readonly string[]; ink: string };
};

const onBrand = (brand: readonly string[]) => ({ colors: brand, ink: colors.ob.text });

export const PLATFORMS: readonly Platform[] = [
  { id: "tiktok", label: "TikTok", fill: onBrand(colors.ob.brand.tiktok) },
  { id: "reels", label: "Reels", fill: onBrand(colors.ob.brand.reels) },
  { id: "shorts", label: "Shorts", fill: onBrand(colors.ob.brand.shorts) },
  { id: "x", label: "X", fill: onBrand(colors.ob.brand.x) },
  { id: "twitch", label: "Twitch", fill: onBrand(colors.ob.brand.twitch) },
  // No brand to borrow, so the flow's own gradient.
  {
    id: "other",
    label: "Something else",
    phrase: "the rest of it",
    fill: onBrand([colors.ob.violet, colors.ob.bright]),
  },
];

// The first two picked, as a phrase: "TikTok and Reels". Two, not all of them,
// because the copy this lands in is a sentence and a list of six is not.
// Selection order rather than option order — it is the player's ranking, not
// ours. Nothing picked reads as "your feed", which is true of everybody.
export function platformLabel(ids: readonly string[]): string {
  const named = ids
    .map((id) => PLATFORMS.find((platform) => platform.id === id))
    .filter((platform): platform is Platform => platform !== undefined)
    .slice(0, 2)
    .map((platform) => platform.phrase ?? platform.label);

  if (named.length === 0) return "your feed";
  return named.length === 1 ? named[0] : `${named[0]} and ${named[1]}`;
}
