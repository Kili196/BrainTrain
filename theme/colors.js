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
  // unselected answer cards and row hover (design §1 "card-quiet"). A shade
  // below `card`, so a selected card reads as lit rather than the rest as dimmed.
  "card-quiet": "rgba(255,255,255,0.04)",
  chip: "rgba(255,255,255,0.08)",
  // unfilled progress track / switch off-state (design §1 "track")
  track: "rgba(255,255,255,0.10)",

  // accent — the one hue; actions & active states only. Base = accent.DEFAULT.
  accent: {
    DEFAULT: "#2c5382",
    shadow: "#1e3d63",
    light: "#6f9fe0",
    raised: "#36679c",
    // the fill of a selected answer card (design §5). 20% of the accent, so the
    // card lifts without becoming a second primary button.
    wash: "rgba(44,83,130,0.20)",
  },

  // text
  text: {
    DEFAULT: "#ffffff",
    // list item titles and body copy that has to stay readable rather than
    // recede (design §1 "text-strong")
    strong: "#cfcfcf",
    secondary: "#8a8a8a",
    muted: "#6a6a6a",
    faint: "#5f5f5f",
    disabled: "#4f4f4f", // placeholder text, empty-state numbers
  },

  // the shimmer band sweeping across the hero button (design §4)
  shimmer: "rgba(255,255,255,0.55)",

  // inactive tab icons and labels (design §1). Dimmer than any text colour —
  // the bar is meant to recede until it is looked for.
  "nav-inactive": "rgba(255,255,255,0.30)",

  // hairlines (design §1). tailwind.config.js feeds `borderColor` from these,
  // so `border-divider` in a className and `colors.border.divider` in a style
  // object are the same value — which the tab bar needs, since it draws its top
  // border on an Animated.View and NativeWind's className does not reach those.
  border: {
    DEFAULT: "rgba(255,255,255,0.09)",
    divider: "rgba(255,255,255,0.08)",
    modal: "rgba(255,255,255,0.12)",
    // the rim of a selected answer card (design §5), and the ring of an
    // unchecked answer control (design §6).
    selected: "rgba(111,159,224,0.45)",
    control: "rgba(255,255,255,0.20)",
  },

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

  // Right and wrong on the quiz result screen, and nowhere else. CLAUDE.md §14
  // said there is no green in this product; the Questions Result mockup uses
  // green and red chips, so the rule now carries this one exception. Scoped the
  // way the streak scale is — these belong to that screen and must not be
  // borrowed for any other "good"/"bad" state.
  //
  // Deliberately saturated where every status colour is muted: this is the one
  // loud moment in the app, and it lasts as long as one screen.
  result: {
    right: "#22e06a",
    wrong: "#ff3b30",
    // 12% of each, for the reviewed answer rows — the same trick `accent.wash`
    // uses so a row can be tinted without becoming a coloured block.
    "right-wash": "rgba(34,224,106,0.12)",
    "wrong-wash": "rgba(255,59,48,0.12)",
  },

  // status
  error: "#c46a6a",
  danger: "#ff3b30",
  warning: "#a4823e",
};

module.exports = { colors };
