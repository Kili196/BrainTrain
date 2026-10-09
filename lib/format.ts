// The handful of display formatters that more than one screen needs, kept in
// one place so the rule cannot drift between two copies of it. Each of these
// used to live inline on a screen with a comment pointing at the other copy —
// that cross-reference is what this file replaces.

// Thousands grouped with a narrow no-break space (U+202F), the way the mockups
// write "4 820". Deliberately NOT `Intl.NumberFormat`, which follows the phone's
// locale and would drop a German dot into an otherwise English UI; the narrow
// space is also the one separator that cannot be misread as a decimal point.
// The separator in the replacement below is that literal U+202F character.
// Used by the profile stat and every leaderboard points chip.
export function formatPoints(points: number): string {
  return String(points).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Written out rather than `toLocaleDateString`, for the same reason as above:
// Intl follows the phone's locale and would drop a German month name into an
// English line. Three-letter English months, used by both date formatters.
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

// "Oct 2026" — the profile's "since …" line. Empty string on an unparseable
// date rather than "Invalid Date".
export function monthAndYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "9 Oct 2026" — the date under each round on the Knowledge screen.
export function dayAndMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
