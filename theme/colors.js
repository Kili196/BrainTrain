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
  //
  // Saturation raised across the palette on 2026-09-01: the original values were
  // read off a monitor running high saturation, and on a phone the same navy
  // came out grey-blue. Every hue and every role is unchanged — each colour was
  // pulled 45% of the way to full saturation, the blues lifted slightly in
  // lightness so they read brighter rather than merely deeper.
  accent: {
    DEFAULT: "#1b5ba7",
    shadow: "#113e75",
    light: "#6aa3ef",
    raised: "#2170c6",
    // the fill of a selected answer card (design §5). 20% of the accent, so the
    // card lifts without becoming a second primary button.
    wash: "rgba(27,91,167,0.20)",
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
    selected: "rgba(106,163,239,0.45)",
    control: "rgba(255,255,255,0.20)",
    // the rim of a selected onboarding country row — same idea as `selected`
    // above, but white rather than accent-tinted (design §6 "checkbox").
    selectedSoft: "rgba(255,255,255,0.45)",

    // the dashed rim of an empty-state placeholder (design §1 "border-empty").
    // Brighter than any other hairline on purpose: it has to read as a slot
    // waiting to be filled rather than as the edge of something.
    empty: "rgba(255,255,255,0.16)",
  },

  // stepper and icon-button fills (design §1 "inactive-fill")
  "inactive-fill": "rgba(255,255,255,0.06)",
  // dims the screen behind a sheet or dialog (design §12)
  scrim: "rgba(0,0,0,0.6)",
  // the same scrim, darkened further behind a destructive dialog (design §12)
  scrimStrong: "rgba(0,0,0,0.68)",
  // dims the round behind the 3·2·1 countdown, so the ring stays dimly visible
  // rather than being hidden by an opaque layer
  veil: "rgba(11,11,11,0.72)",
  // the one blurred shadow in the app, shared by every floating overlay —
  // modals, sheets, toasts (design §8 "Overlay")
  shadowOverlay: "0 24px 60px -20px rgba(0,0,0,0.9)",

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
  // The loudest pair in the app, and the only place green appears: these two
  // sit at full saturation where even the brightened status colours hold back.
  result: {
    right: "#22e06a",
    wrong: "#ff3b30",
    // 12% of each, for the reviewed answer rows — the same trick `accent.wash`
    // uses so a row can be tinted without becoming a coloured block.
    "right-wash": "rgba(34,224,106,0.12)",
    "wrong-wash": "rgba(255,59,48,0.12)",
  },

  // The three podium places on the leaderboard, and nowhere else (design §1).
  // Scoped the way `streak` and `result` are: these are the only three hues in
  // the app besides the accent, and they are readable precisely because they
  // appear on exactly one screen. Second place is the accent itself, which is
  // why the podium does not introduce a third blue.
  podium: {
    first: "#8459ea",
    second: "#1b5ba7",
    third: "#d76711",
  },

  // The onboarding flow, and nothing else. Its look is taken from the landing
  // page's own onboarding (offhand-landing), which Fabian chose over the app's
  // design system for this one flow on 2026-09-29 — white pill button, a
  // violet-to-blue gradient, and the six-colour subject arc. Scoped the way
  // `streak`, `result` and `podium` are: these must not leak into any other
  // screen, where the app's single-hue rule still holds.
  ob: {
    bg: "#0a0a0b",
    surface: "#141417", // the reply sheet
    raised: "#1c1c20", // tiles, cards, tracks, the back button
    border: "#26262b",
    text: "#f4f4f6",
    muted: "#86868f",
    // lit outlines, values and focus. Light only — never a fill behind text.
    bright: "#4795f5",
    // 16% of `bright` over the page: the ground of a chosen tile
    wash: "rgba(71,149,245,0.16)",
    // the far end of the gradient (bright is the near end)
    violet: "#9458f5",
    // the plan card's navy, and the spent days in the year grid
    navy: "#2c5382",
    spent: "#4d4d52",
    // "I can" / "…I can't" on the explain test, once chosen. Fabian's call
    // (2026-09-29): the two answers get the colours of yes and no.
    yes: "#22c55e",
    no: "#ef4444",
    // Each feed's own colours, for its tile once chosen — Fabian's call
    // (2026-09-29). Colour only: no logos, no wordmarks. The landing ruled
    // brand colours out as looking like an association; if App Review ever
    // objects, these are the lines to change.
    brand: {
      tiktok: ["#25f4ee", "#0a0a0b", "#fe2c55"],
      reels: ["#feda75", "#fa7e1e", "#d62976", "#962fbf", "#4f5bd5"],
      shorts: ["#ff4e45", "#ff0000", "#b30000"],
      x: ["#3a3d41", "#0a0a0b"],
      twitch: ["#a970ff", "#9146ff", "#6a2cd8"],
    },
    // the subject arc, teal through blue to violet
    subject: {
      science: "#2dd4bf",
      economy: "#38bdf8",
      politics: "#60a5fa",
      history: "#818cf8",
      culture: "#a78bfa",
      everyday: "#c084fc",
    },
    // Each country's flag colours, left to right as a gradient across the
    // chosen country row — Fabian's call (2026-09-30). Keyed by the ISO code in
    // constants/countries.ts; a country missing here falls back to the subject
    // arc. Stripes and emblems are flattened to their main colours in order.
    flag: {
      DE: ["#000000", "#dd0000", "#ffce00"],
      AT: ["#ed2939", "#ffffff", "#ed2939"],
      CH: ["#da291c", "#ffffff", "#da291c"],
      NL: ["#ae1c28", "#ffffff", "#21468b"],
      FR: ["#002395", "#ffffff", "#ed2939"],
      IT: ["#009246", "#ffffff", "#ce2b37"],
      ES: ["#aa151b", "#f1bf00", "#aa151b"],
      BE: ["#000000", "#fdda24", "#ef3340"],
      PT: ["#046a38", "#da291c"],
      IE: ["#169b62", "#ffffff", "#ff883e"],
      GB: ["#012169", "#ffffff", "#c8102e"],
      DK: ["#c8102e", "#ffffff", "#c8102e"],
      SE: ["#006aa7", "#fecc00", "#006aa7"],
      NO: ["#ba0c2f", "#ffffff", "#00205b"],
      FI: ["#ffffff", "#002f6c", "#ffffff"],
      PL: ["#ffffff", "#dc143c"],
      CZ: ["#ffffff", "#11457e", "#d7141a"],
      SK: ["#ffffff", "#0b4ea2", "#ee1c25"],
      HU: ["#ce2939", "#ffffff", "#477050"],
      RO: ["#002b7f", "#fcd116", "#ce1126"],
      BG: ["#ffffff", "#00966e", "#d62612"],
      GR: ["#0d5eaf", "#ffffff", "#0d5eaf"],
      HR: ["#ff0000", "#ffffff", "#171796"],
      SI: ["#ffffff", "#005da4", "#ed1c24"],
      RS: ["#c6363c", "#0c4076", "#ffffff"],
      UA: ["#0057b7", "#ffd700"],
      TR: ["#e30a17", "#ffffff", "#e30a17"],
      US: ["#b22234", "#ffffff", "#3c3b6e"],
      CA: ["#d52b1e", "#ffffff", "#d52b1e"],
      MX: ["#006847", "#ffffff", "#ce1126"],
      BR: ["#009c3b", "#ffdf00", "#002776"],
      AR: ["#74acdf", "#ffffff", "#74acdf"],
      AU: ["#012169", "#ffffff", "#e4002b"],
      NZ: ["#012169", "#ffffff", "#c8102e"],
      ZA: ["#007a4d", "#ffb612", "#de3831", "#002395"],
      IN: ["#ff9933", "#ffffff", "#138808"],
      JP: ["#ffffff", "#bc002d", "#ffffff"],
      CN: ["#de2910", "#ffde00", "#de2910"],
      KR: ["#ffffff", "#cd2e3a", "#0047a0"],
      SG: ["#ef3340", "#ffffff"],
    },
  },

  // status
  error: "#df4f4f",
  danger: {
    DEFAULT: "#ff3b30",
    // 12% of the same red, behind the REC pill while recording. Design §14:
    // a new state gets an opacity variant of an existing colour, never a new
    // hue. Deliberately its own token rather than borrowing
    // `result.wrong-wash`, which is the same value scoped to one screen.
    wash: "rgba(255,59,48,0.12)",
  },
  warning: "#d59922",
};

module.exports = { colors };
