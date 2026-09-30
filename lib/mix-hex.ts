// A colour `t` of the way from `a` to `b` (both "#rrggbb"), as "#rrggbb".
// Lets one gradient be spread across separate pieces — letters of a word, dots
// of a grid — without a mask or a native gradient module.
export function mixHex(a: string, b: string, t: number): string {
  const from = parseInt(a.slice(1), 16);
  const to = parseInt(b.slice(1), 16);
  const channel = (shift: number) => {
    const x = (from >> shift) & 255;
    const y = (to >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  const value = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${value.toString(16).padStart(6, "0")}`;
}
