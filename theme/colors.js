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
  chip: "rgba(255,255,255,0.08)",

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
  },

  // status
  error: "#c46a6a",
  danger: "#ff3b30",
  warning: "#a4823e",
};

module.exports = { colors };
