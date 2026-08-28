// Single source of truth for every color in the app (values from CLAUDE.md).
//
// Used two ways:
//   1. tailwind.config.js imports this → gives you classNames: bg-accent, text-text-secondary…
//   2. Components import this → gives you raw color strings for props that aren't classNames:
//        import { colors } from "../theme/colors";
//        <ActivityIndicator color={colors.accent.DEFAULT} />
//        <StatusBar backgroundColor={colors.bg} />
//        <Svg stroke={colors.text.secondary} />
//
// Change a color here and it updates both places at once.

const colors = {
  // backgrounds & surfaces
  bg: "#0b0b0b",
  surface: "#141414",
  card: "rgba(255,255,255,0.045)",
  "card-alt": "rgba(255,255,255,0.05)",
  chip: "rgba(255,255,255,0.08)",
  // unfilled progress track / switch off-state (design §1 "track")
  track: "rgba(255,255,255,0.10)",

  // accent — the one hue; actions & active states only. Base = accent.DEFAULT.
  accent: {
    DEFAULT: "#2c5382",
    shadow: "#1e3d63",
    light: "#6f9fe0",
    raised: "#36679c",
  },

  // text
  text: {
    DEFAULT: "#ffffff",
    secondary: "#8a8a8a",
    muted: "#6a6a6a",
    faint: "#5f5f5f",
    disabled: "#4f4f4f", // placeholder text, empty-state numbers
  },

  // the shimmer band sweeping across the hero button (design §4)
  shimmer: "rgba(255,255,255,0.55)",

  // stepper and icon-button fills (design §1 "inactive-fill")
  "inactive-fill": "rgba(255,255,255,0.06)",
  // dims the screen behind a sheet or dialog (design §12)
  scrim: "rgba(0,0,0,0.6)",

  // the streak flame, and nothing else (design §1). Grey at zero, orange while
  // a streak is running, violet once it passes 30 days — the colour is the
  // reward, so it must never be borrowed for anything that is not the streak.
  streak: {
    idle: "#6a6a6a",
    flame: "#ff6e14", // rgba(255,110,20)
    long: "#9650ff", // rgba(150,80,255)
  },

  // status
  error: "#c46a6a",
  danger: "#ff3b30",
  warning: "#a4823e",
};

module.exports = { colors };
