// A birthdate as the three fields the player typed, not as a Date: half a date
// is a normal state while typing, and a Date cannot hold one.
export type BirthParts = {
  day: string;
  month: string;
  year: string;
};

export const EMPTY_BIRTH: BirthParts = { day: "", month: "", year: "" };

// True only for a real calendar date with a plausible birth year. Impossible
// days (31 February) are rejected by round-tripping through Date, which rolls
// them over into the next month.
export function isValidBirth({ day, month, year }: BirthParts): boolean {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!day || !month || !year) return false;
  if (y < 1900 || y > new Date().getFullYear()) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// Whether all three fields hold something — the point at which an invalid date
// is worth saying out loud rather than just keeping the button disabled.
export function isBirthFilled({ day, month, year }: BirthParts): boolean {
  return Boolean(day && month && year);
}
