// "#2dd4bf" at 20% → "rgba(45,212,191,0.2)". For washes of a colour that is
// data rather than a token (the onboarding's subject tints), so a second set of
// hand-written rgba values cannot drift from the hex they came from.
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
