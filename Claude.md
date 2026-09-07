# CLAUDE.md

Guidance for Claude Code in this repo. Keep it short — add a rule here only once we've actually settled on it. Sections marked _(fill in ...)_ are placeholders to complete as the project takes shape.

## Project

A cross-platform mobile app for **iOS and Android**, built with **React Native + Expo** in **TypeScript**.

- **App name:** BrainTrain
- **What it does:** A speaking-and-knowledge trainer — you draw a topic, get prep time, record yourself speaking about it, then answer a 5-question quiz; the app analyses and scores the round.

## Stack (confirmed)

These were open questions; the code has since settled them. Match what's here — don't
swap one out without agreeing first.

- **Expo** (managed workflow) + **React Native** + **TypeScript** (`strict` on).
- **Supabase** for database, auth, and file storage. One shared client in `lib/supabase.ts`.
- **Navigation:** **expo-router** (file-based). Routes live in `app/`; each folder is a
  route group with its own `_layout.tsx`. No React Navigation config by hand.
- **Styling:** **NativeWind v4** (Tailwind classes). Design tokens live in `theme/colors.js`
  and `tailwind.config.js` — reference them as classes (`bg-bg`, `text-text-secondary`,
  `rounded-lg`, `font-sans-extrabold`). **Never hardcode a hex value** in a component; add
  it to `theme/colors.js`. When you need a token inside a `style` object, import `colors`
  from `theme/colors.js` (same source the Tailwind config reads).
- **State management:** **React Context**, one file per concern in `lib/*-context.tsx`
  (`onboarding-context`, `round-start-context`, `toast-context`). Providers are mounted in
  the relevant `_layout.tsx`. No Redux/Zustand.
- **Data-fetching:** direct `supabase-js` calls wrapped in typed helpers in `lib/`
  (`fetchTopics`, `fetchTopicBySlug`, `fetchQuizQuestions`). No query library — don't add
  React Query etc. without agreeing first.
- **Fonts:** Archivo, loaded per-weight in `app/_layout.tsx`; each weight is its own family
  (`font-sans`, `font-sans-extrabold`, …) because RN doesn't synthesise weight.

Still open — **ask before choosing**: testing setup.

## Getting started

Full setup (prerequisites, env vars, Supabase access, running on a device/simulator) lives
in **`README.md`** — follow it there rather than duplicating it here. Short version:
`npm install`, copy `.env.example` to `.env` and fill in the two `EXPO_PUBLIC_SUPABASE_*`
values, then `npm start`. After any `.env` change, restart Metro with `npx expo start -c`
(the `EXPO_PUBLIC_*` values are inlined at build time).

## Commands

Always use these scripts rather than raw commands.

| Command | Does |
|---|---|
| `npm start` | Metro + QR code (press `i` / `a`, or scan with Expo Go) |
| `npm run ios` / `npm run android` / `npm run web` | Straight into that target |
| `npm run db:push` | Apply `supabase/migrations/` to the linked project |
| `npm run db:types` | Regenerate `lib/database.types.ts` from the live schema |
| `npm run db:seed` / `npm run db:seed:questions` | Compile content markdown/JSON into a seed migration |

No lint/typecheck/test scripts exist yet. TypeScript is `strict` — rely on the editor /
`npx tsc --noEmit`.

## Project structure

```
app/            expo-router routes (file = screen). Groups: (onboarding), (tabs);
                standalone screens: play, recording, quiz, quiz-intro, quiz-result,
                analyzing. Each group has a _layout.tsx; the root _layout.tsx wraps every route.
components/     ui/          reusable primitives (Button, Dialog, Sheet, TextField, TabBar…)
                game/        round/gameplay pieces (StageTopic, RulesPanel, Waveform…)
                onboarding/  onboarding-flow pieces
                icons/       hand-written SVG icon components (see Design System §9)
constants/      static data (categories, countries, placeholders)
lib/            Supabase client, typed data helpers, contexts, hooks (use-*), storage
theme/          colors.js — the single colour source of truth (JS so both TS and Tailwind read it)
supabase/       migrations/  timestamped SQL, applied in order
                content/     source markdown/JSON + generators for seed migrations
```

Put new files where their neighbours already live. Ask before inventing a new top-level folder.

## Data model

Schema and RLS live in `supabase/migrations/` (timestamped SQL, source of truth); types are
generated into `lib/database.types.ts` (`npm run db:types`) — never edit that by hand. Tables:

- **`topics`** — content, read-only to clients. `slug` is the stable key the app uses;
  `status` gates publishing (RLS only exposes `published`).
- **`quiz_questions`** — belongs to a topic; `options` (jsonb array), `correct_index`,
  optional `explanation`, `sort_order`.
- **`profiles`** — 1:1 with `auth.users` (shared PK), created by a signup trigger.
- **`speech_sessions`** — strictly private per user (RLS on `user_id`); audio stays on the
  device, only metadata is stored. `client_id` makes upload idempotent.

Content is maintained through the `service_role` key (which bypasses RLS), not from the app.
Edit the markdown/JSON in `supabase/content/` and regenerate the seed migration — **never
hand-patch generated SQL**.

## Coding conventions

Match the existing code. The patterns already in use:

- **Files:** `PascalCase.tsx` for components; `kebab-case.ts(x)` for `lib/` (contexts, hooks,
  helpers). Hooks are `use-*.ts`. Route files under `app/` follow expo-router naming.
- **Exports:** components and helpers are **named exports** (`export function Button`).
  The exception is expo-router route/layout files, which must `export default`.
- **Props:** an exported `type XProps = { … }` above the component; no inline prop types.
- **Context pattern:** a `XProvider` plus a `useX()` hook that throws if called outside its
  provider — copy `lib/onboarding-context.tsx`.
- **Comments explain *why*, not *what*.** This codebase leans on generous "why" comments for
  any non-obvious mobile/Expo decision (see `Button.tsx`, `supabase.ts`). Keep that up.
- **Styling:** NativeWind `className` for layout/colour; drop to a `style` object only for
  what Tailwind can't express (animated transforms, measured values). Colours always come
  from tokens — class or imported `colors`, never a literal hex.
- **No `any` / no `as` to silence the compiler** — fix the type instead.

## Testing

No test framework is set up yet — **ask before adding one**. Until then, "done" means it
typechecks and you've exercised the change on a device/simulator (both platforms for
anything touching layout, gestures, keyboard, or permissions).

## Deployment

Not set up yet (no EAS config). Ask before adding build/submit profiles or a release process.

## Ground rules

- **Both platforms matter.** Anything touching layout, keyboard, gestures, or permissions must work on iOS *and* Android — flag when you've only checked one.
- **No secrets in source.** Supabase anon key is fine in the client; the `service_role` key must never ship. Keep secrets in `.env` (never committed) and the user's session token in secure storage.
- **Prefer Expo packages** (`expo-*`) over bare native modules when an equivalent exists. Don't eject to bare workflow without agreeing first.
- **Add dependencies deliberately** — tell me what you're adding and why before pulling one in.
- **TypeScript is the safety net** — don't silence it with `any` or `as` to make something pass; fix the cause.

## Design guidelines

- **Respect safe areas** on every screen (notches, home indicator, status bar) via `react-native-safe-area-context`.
- **Support light and dark mode** — no hardcoded colors; drive them from a theme so both work.
- **Touch targets** at least 44×44pt, with clear pressed/disabled states.
- **Accessibility:** give touchables an `accessibilityLabel`/`accessibilityRole`; don't rely on color alone to convey meaning.
- **Keyboard-aware forms** so inputs aren't hidden behind the keyboard (behavior differs per platform).
- **Performant lists:** use `FlatList` (or `FlashList`) for long lists, never `.map()` into a `ScrollView`.
- **Consistent spacing/typography** — reuse a small set of spacing and text sizes rather than one-off values.
- **Follow platform feel** — native-looking navigation, gestures, and feedback rather than fighting the OS.

## Design System

# UI / Visual Design System

Source of truth for all future UI work in BrainTrain. Reverse-engineered from the
existing screens (`*.dc.html`). Do not invent new values — everything below is
taken from the shipped design.

Reference files: `Home Screen.dc.html`, `Play Screen.dc.html`, `Recording Screen.dc.html`,
`Notes Write Screen.dc.html`, `Notes Result Screen.dc.html`, `Topic Detail Screen.dc.html`,
`Questions Ask Screen.dc.html`, `Questions Result Screen.dc.html`, `Analyzing Screen.dc.html`,
`Knowledge Screen.dc.html`, `Leaderboard Screen.dc.html`, `Profile Screen.dc.html`,
`Challenges Screen.dc.html`, `Achievements Screen.dc.html`, `Settings Screen.dc.html`,
`Onboarding Screen.dc.html`.

---

## 1. Colors

The palette is a near-black dark theme with exactly one hue (a saturated navy blue)
carrying all interaction. There are no gradients as surface decoration — the only
gradient-like effects are radial SVG halos in the Knowledge net and the Analyzing orbit.

**Saturation, raised 2026-09-01.** The values below are one generation on from the
mockups. The originals were judged on a monitor running high saturation and came out
grey-blue on a phone, so every chromatic token was pulled 45% of the way to full
saturation, with the blues lifted a little in lightness so they read brighter rather
than merely deeper. Hues and roles are unchanged. **The phone is the reference for
colour, never the desktop preview** — and the source of truth for these values is
`theme/colors.js`, not this table.

### Backgrounds & surfaces

| Token | Value | RGB | Usage |
|---|---|---|---|
| `bg` | `#0b0b0b` | 11,11,11 | Page background, phone frame, all screens. Also used as the exit/enter veil. |
| `surface` | `#141414` | 20,20,20 | Modals, bottom sheets, popovers, image-slot wells. The only opaque surface above the page. |
| `card` | `rgba(255,255,255,0.045)` | — | Default card fill (score card, stat tiles). Deliberately barely lighter than the page. |
| `card-alt` | `rgba(255,255,255,0.05)` | — | Search field, audio player row, mic disc (idle). |
| `card-quiet` | `rgba(255,255,255,0.04)` | — | Row hover, unselected answer cards, Play-screen stat tiles. |
| `chip` | `rgba(255,255,255,0.08)` | — | Point chips, avatar backgrounds for non-self rows. |
| `inactive-fill` | `rgba(255,255,255,0.06–0.07)` | — | Disabled CTA background, locked achievement badges. |

### Brand & accent

| Token | Value | RGB | Usage |
|---|---|---|---|
| `accent` | `#1b5ba7` | 27,91,167 | THE primary. Every primary button, active tab, active pill, filled progress, selected avatar, unlocked badge. |
| `accent-shadow` | `#113e75` | 17,62,117 | Hard offset shadow under every primary button. Never used as a fill. |
| `accent-light` | `#6aa3ef` | 106,163,239 | Text-level accent: score rings, metric bars, radio dots, confirm-button labels, secondary links, current progress segment. |
| `accent-raised` | `#2170c6` | 33,112,198 | Only the Home PLAY button (one step brighter to make it the loudest element in the app). |
| `accent-wash` | `rgba(27,91,167,0.20)` | — | Selected answer card fill. |
| `accent-glow` | `rgba(106,163,239,0.22)` | — | Mic pulse halo. |

### Text

| Token | Value | Usage |
|---|---|---|
| `text` | `#ffffff` | Headlines, values, active labels, button text. |
| `text-strong` | `#e8e8e8` / `#d4d4d4` / `#cfcfcf` | List item titles, leaderboard names. |
| `text-secondary` | `#8a8a8a` | Body copy, descriptions, subtitles, inactive nav labels. |
| `text-muted` | `#6a6a6a` / `#6f6f6f` | Counters, helper text, stat labels. |
| `text-faint` | `#5f5f5f` | Eyebrows, section labels, disabled button text. |
| `text-disabled` | `#4f4f4f` | Empty-state numbers, placeholder text. |
| `nav-inactive` | `rgba(255,255,255,0.30)` | Inactive tab icons and labels. |

### Borders & dividers

| Token | Value | Usage |
|---|---|---|
| `border` | `1px solid rgba(255,255,255,0.09)` | Default card border. |
| `border-soft` | `1px solid rgba(255,255,255,0.08)` | Dividers between list rows (`border-top`), stat tiles. |
| `border-frame` | `1px solid rgba(255,255,255,0.10)` | Phone frame, image slots. |
| `border-modal` | `1px solid rgba(255,255,255,0.12–0.14)` | Sheets and dialogs. |
| `border-emphasis` | `2px solid rgba(255,255,255,0.18)` | Knowledge category popover only. |
| `border-empty` | `1px dashed rgba(255,255,255,0.16)` | Empty-state placeholders. |
| `track` | `rgba(255,255,255,0.09–0.12)` | Unfilled progress bars, switch off-state. |

### Status

| Token | Value | Usage |
|---|---|---|
| `error` / `wrong` | `#df4f4f` (fill), `#ee7c7c` (text) | WRONG badge, low-time timer, destructive text. |
| `danger` | `#ff3b30` | „Delete account", recording indicator, notification dot. |
| `danger-wash` | `rgba(255,59,48,0.12)` | Behind the REC pill while recording, and nothing else. |
| `warning` / `imprecise` | `#d59922` | IMPRECISE badge. |
| `neutral` / `unsourced` | `#8a8a8a` | UNSOURCED badge. |
| `success` | `#6aa3ef` | Positive states (high scores, correct answers, mastered nodes) are shown in `accent-light`. |
| `result` | `#22e06a` (right), `#ff3b30` (wrong), 12% washes of each | Right and wrong on the quiz result screen, and nowhere else — the question chips, the reviewed answer rows, the review bullets. The Questions Result mockup draws green and red chips, which is why the no-green rule below carries this exception. The loudest pair in the app: full saturation, where even the brightened status colours hold back. |
| `streak` | `rgba(255,110,20,…)` orange, `rgba(150,80,255,…)` violett ab 30 Tagen, grau wenn 0 | Streak flame only. |

### Podium (Leaderboard, exclusive)

`1 → #8459ea`, `2 → #1b5ba7`, `3 → #d76711`. These three colors appear nowhere else.

---

## 2. Typography

**Font:** `'Archivo', system-ui, sans-serif` (Google Fonts, weights 400/500/600/700/800).
Loaded per screen with `<link rel="preconnect">` + stylesheet. Buttons and inputs
always inherit with `font-family: inherit`.

The hierarchy is driven by **weight and letter-spacing far more than by size**. There is
very little type in the 18–22 px range: the design jumps from ~14 px body straight to
24–34 px display.

| Role | Size / Weight / Line-height / Tracking | Where |
|---|---|---|
| Display (topic on stage) | 34px / 800 / 1.08 / -0.02em | Home main topic |
| H1 (screen topic) | 24–26px / 800 / 1.14 / -0.015em | Play, Notes Write, Topic Detail, Profile name |
| H2 (section title) | 19–22px / 800 / 1.15 / -0.01em | Daily topic, dialog headline, question text |
| H3 (card title) | 16–17px / 800 / 1.3 / normal | Empty-state headline, dialog title, metric value |
| H4 / list item | 14–15px / 700 / 1.4 / -0.01em | Session rows, answer card title, category rows |
| Body | 12.5–13px / 400–500 / 1.55–1.6 | Descriptions, intro copy, dialog copy |
| Body small | 11.5–12px / 400–600 / 1.5 | Helper text, subtitles under settings rows |
| Caption | 11px / 400–600 | Counters („Question 3 of 5"), chips |
| **Eyebrow / section label** | 9.5–10px / 800 / `letter-spacing:0.20–0.22em` / UPPERCASE | Every section heading in the app. The single most recognisable type element. |
| Button label | 13–15px / 800 / `letter-spacing:0.06–0.16em` / usually UPPERCASE | See §4 |
| Big button (PLAY, START) | 19–20px / 800 / `letter-spacing:0.14–0.16em` | Home, Play, Recording ANALYSE |
| Tab label | 9.5px / 600 | Bottom nav |
| Statistic (large) | 30px / 800 / line-height 1 | Profile POINTS/ROUNDS |
| Statistic (score ring) | 34px / 800 | Score card |
| Timer / clock | 22px / 800 | Notes Write, Challenges countdown |

**Numbers always get `font-variant-numeric: tabular-nums`** — scores, points, timers,
counters, XP. Non-negotiable, it is what keeps the counters from jittering.

**`text-wrap: pretty`** on all multi-line headlines and body paragraphs.

---

## 3. Spacing

Base unit is **2px**, but the design in practice uses a coarse scale. Observed values:

```
4 · 6 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 30 · 34 · 44 · 46 · 52
```

| Context | Value |
|---|---|
| Screen horizontal padding | **20px** (Home, Knowledge, Leaderboard, Notes Write) or **24px** (result screens, Topic Detail) — pick one per screen and hold it |
| Screen top padding | 44–50px (below status bar) |
| Screen bottom padding | 30–40px, plus ~88px reserve above the tab bar |
| Card inner padding | 26px 22px (score card), 18px 20px (sheet header), 14px 16px (compact rows) |
| List row padding | 14–18px vertical, screen padding horizontal |
| Gap between sibling controls | 6px (pills), 8–10px (chips, slots), 13–14px (row content), 16px (metric stack) |
| Section-to-section | 30–46px `margin-top` |
| Label-to-value | 7–9px |
| Heading-to-body | 9–12px |
| Eyebrow-to-heading | 8–10px |
| Button-to-content above | 20–34px |

Layout uses **flex/grid with `gap`** throughout — never margins on siblings.

---

## 4. Buttons

The signature: **flat blue fill with a hard offset shadow, no blur.** The button
physically depresses on press by shifting down and shrinking its shadow. This is the
one piece of skeuomorphism in an otherwise flat UI, and it must never be replaced by a
soft/blurred shadow.

### Primary

```
background:      #1b5ba7
color:           #ffffff
padding:         16–20px (full-width) · 16px 28px (auto-width)
border:          none
border-radius:   14px (compact) · 16px (full-width, tall)
font:            13–15px / 800 / letter-spacing 0.12em / UPPERCASE
box-shadow:      0 6px 0 0 #113e75   (0 7px for 18–20px tall buttons)
transition:      transform 90ms ease, box-shadow 90ms ease, filter 150ms ease
```

* **Hover:** `filter: brightness(1.08)`
* **Active:** `transform: translateY(4px); box-shadow: 0 2px 0 0 #113e75` (5px/2px for the 7px variant)
* **Disabled:** `opacity: 0.35; pointer-events: none; cursor: default` (Onboarding CTA), or `background: rgba(255,255,255,0.06); color: #5f5f5f; box-shadow: none` (Questions CTA)
* **Focus:** Not determined from existing design — no explicit focus ring is defined.

Width: full-width inside content padding for the main action of a screen; auto-width
(`padding: 16px 28px`) for empty-state CTAs.

### Hero (Home PLAY only)

```
background:    #2170c6
box-shadow:    0 7px 0 0 #113e75,
               0 22px 40px -18px rgba(33,112,198,0.85),
               inset 0 1px 0 rgba(255,255,255,0.28)
font:          20px / 800 / letter-spacing 0.14em
```
Plus a skewed white shimmer sweep (`rgba(255,255,255,0.55)`, 26% width, `skewX(-18deg)`,
`3.4s ease-in-out infinite`). Exactly one such button exists per screen, and only on Home
and Play (START).

### Secondary / outline (pill toggle)

```
padding:        8–10px 15px
border-radius:  999px
border:         1px solid rgba(255,255,255,0.12)   (transparent when active)
background:     transparent → #1b5ba7 when active
color:          #8a8a8a → #ffffff when active
font:           9.5px / 800 / letter-spacing 0.16em
transition:     background 150ms ease, color 150ms ease
```
Used for ALL TIME/DAILY, mode selection, segmented controls. No shadow.

### Ghost / tertiary (text button)

```
background: none; border: none; padding: 0;
font:  11.5–13px / 700
color: #9a9a9a  (or #6aa3ef for affirmative links)
hover: color → #ffffff
```
Used for „I'm ready", „EDIT PROFILE", „+ Add second page", dialog „Cancel".

### Icon button (round)

28px (view switch) / 34–40px (back, close) / 76–86px (pause, ANALYSE).
`border-radius: 999px`, transparent or `rgba(255,255,255,0.06)` fill,
`1px solid rgba(255,255,255,0.12)` border, icon in `currentColor` at `#8a8a8a`,
hover → `#ffffff` and border → `rgba(255,255,255,0.24)`.

### Destructive

There is no filled destructive button. Destruction is a **red text row**
(`#ff3b30`, 14px/700) that opens a confirm dialog; inside the dialog the confirming
button is likewise text-only in `#ff3b30`.

### Hierarchy rule

Per screen: **one** primary blue button, at the bottom. Everything else is pill,
ghost or icon. Two blue buttons on one screen is a design error.

---

## 5. Cards

Cards are **flat and bordered, never elevated.** They are separated from the page by a
~4.5% white overlay plus a 9% white hairline — the contrast is intentionally low, so the
content, not the container, reads first.

```
background:     rgba(255,255,255,0.045)
border:         1px solid rgba(255,255,255,0.09)
border-radius:  22px (large feature card) · 14–16px (compact card / tile)
padding:        26px 22px (large) · 17–18px 18px (medium) · 14px 16px (compact)
box-shadow:     none
```

* Internal structure: eyebrow → 8–10px → title → 14–22px → content.
* **Hover:** cards that are links get `background: rgba(255,255,255,0.04)` on the row, no lift, no shadow.
* **Selected:** `background: rgba(27,91,167,0.20)`, border → `rgba(106,163,239,0.45)`.
* Many "cards" are actually **divider rows**: no fill, no radius, just
  `border-top: 1px solid rgba(255,255,255,0.08)` and generous padding. Prefer this for
  long lists (sessions, issues, settings, categories); reserve filled cards for a single
  hero block per screen.

---

## 6. Inputs & form elements

### Text input / date field (Onboarding)

```
width:          100%
padding:        17px 18px
border-radius:  14px
background:     rgba(255,255,255,0.045)
border:         1px solid rgba(255,255,255,0.12)
color:          #ffffff
font:           17px / 600
text-align:     center          ← inputs are centre-aligned in onboarding
outline:        none
```
Placeholder `#4f4f4f`. Date is three separate fields (DD / MM / YYYY) in a row with gap.

### Search field

```
wrapper: display flex; align-items center; gap 10px;
         padding 11px 14px; border-radius 12px;
         background rgba(255,255,255,0.05);
         border 1px solid rgba(255,255,255,0.09)
icon:    15px magnifier, stroke #6a6a6a, stroke-width 2, left of input
input:   transparent, no border, no outline, 13px, #ffffff
```

### Textarea

`padding 18px; border-radius 18px; background #141414; border 1px solid rgba(255,255,255,0.09); font-size 14.5px; line-height 1.65; resize: none;` scrollbar hidden.

### Radio (answer cards)

Full-width card as the hit area, radio dot on the right:
outer `22px` circle, `1.5px solid rgba(255,255,255,0.20)` → `#6aa3ef` when on;
inner `10px` dot, transparent → `#6aa3ef`. Transition `160ms ease`.

### Checkbox (multi-select list)

`18px` square-ish circle: `border-radius 999px`, `1px solid rgba(255,255,255,0.22)`,
when checked `background #ffffff` with `box-shadow: inset 0 0 0 3.5px #141414`.

### Switch

`track 44 × 26px, border-radius 999px, background rgba(255,255,255,0.12) → #1b5ba7`;
`knob 20 × 20px white, top 3px, left 3px → 21px`, transition
`left 180ms cubic-bezier(.3,.8,.3,1)`.

### Stepper (prep / speaking time)

`−` and `+` round buttons flanking a tabular-nums value; buttons
`rgba(255,255,255,0.06)` fill, `999px` radius.

### Labels & helper text

Label = eyebrow style (9.5–10px / 800 / 0.2em / uppercase / `#5f5f5f`).
Helper text = 11.5px / `#6a6a6a`, placed under the control, right-aligned when it is a
counter, left-aligned when it is guidance.

Error state on inputs: Not determined from existing design (validation is expressed by
disabling the CTA, not by recolouring the field).

---

## 7. Border radius

| Token | Value | Used by |
|---|---|---|
| `xs` | 1–3px | Progress bar fills, tab-bar icon glyphs |
| `sm` | 9–12px | Segmented control segments, search field, podium pillar tops (`10px 10px 0 0`) |
| `md` | **14px** | Default: cards, inputs, compact buttons, answer cards |
| `lg` | **16px** | Full-width primary buttons, image slots, tiles |
| `xl` | **18px** | Modals, sheets, popovers, textarea |
| `2xl` | 22px | The one large feature card (score card) |
| `frame` | 38px | Phone frame only |
| `pill` | 999px | Toggles, chips, avatars, switches, icon buttons, dots |

Nothing in the product has square corners except the achievement badge
(`border-radius: 0`) and divider rows.

---

## 8. Shadows & elevation

Only three shadow uses exist. Blurred shadows are reserved for things that float.

| Level | Value | Used by |
|---|---|---|
| Buttons (not elevation — physical) | `0 6px 0 0 #113e75` / `0 7px 0 0 #113e75`, pressed `0 2px 0 0 #113e75` | Primary buttons |
| Hero glow | `0 22px 40px -18px rgba(33,112,198,0.85)` + `inset 0 1px 0 rgba(255,255,255,0.28)` | Home PLAY only |
| Overlay | `0 24px 60px -20px rgba(0,0,0,0.9)` | Modals, sheets, popovers |

**Cards cast no shadow.** Elevation hierarchy: page (`#0b0b0b`) → card
(translucent white, border only) → scrim (`rgba(0,0,0,0.6–0.68)`) → sheet/modal
(`#141414` + border + the overlay shadow).

---

## 9. Icons

* **No icon library.** Every icon is a hand-written inline `<svg>` with a `24×24` viewBox.
* **Stroke style**, `stroke="currentColor"`, `fill="none"`, `stroke-width: 1.7–2`,
  `stroke-linecap: round`. Exceptions that are filled: the neural-net toggle dot grid,
  radio inner dots, the recording indicator.
* Sizes: **14–15px** inline/in-button · **18–20px** in rows · **22–28px** standalone ·
  40–56px feature (microphone).
* Color inherits from the parent (`currentColor`), so an icon in a `#8a8a8a` row is grey
  and turns `#ffffff` on hover with the text.
* Icon-to-text gap: **10px** in rows, 6–9px inside buttons.
* Placement: leading for search and status, trailing for chevrons/disclosure, centred for
  icon-only round buttons.
* Tab bar icons are **not SVG** — they are built from small styled `<span>` bars and dots
  (3px bars, 11px ring, 5px podium blocks) so they inherit the active color directly.

---

## 10. Layout

* **Frame:** every screen is `390 × 844px`, `background #0b0b0b`,
  `border 1px solid rgba(255,255,255,0.10)`, `border-radius 38px`, `overflow hidden`,
  centred on a `#0b0b0b` page with 24px padding.
* **Max content width:** the frame itself. No wider container exists.
* **Scroll:** an absolutely positioned `inset: 0` scroll container (`.sv`) with
  `overflow-y: auto` and hidden scrollbars (`::-webkit-scrollbar{width:0}`).
* **Vertical rhythm:** eyebrow → title → body → content block, sections separated by
  30–46px. Screens open with 44–50px of top padding.
* **Alignment:** left-aligned for lists, result content and settings; **centre-aligned**
  for onboarding, empty states, timers and anything built around a ring.
* **Density:** low. One idea per vertical band, large type, wide breathing room. Lists get
  dense (14–18px rows) because they are scanned, not read.
* Bottom tab bar is fixed at the bottom of the frame; scroll content reserves ~88px.

---

## 11. Responsive behaviour

The product is a **fixed 390 × 844 mobile frame**; there is no desktop or tablet layout,
no breakpoint, no fluid grid. Screens adapt only vertically, by scrolling.

Desktop/tablet behaviour: **Not determined from existing design.**

---

## 12. Component visual specs

### Bottom tab bar
5 equal columns (Profile · Ranking · Home · Knowledge · Settings), each a transparent
button with `padding: 4px 0`, an 18px icon area and a 9.5px/600 label, gap ~5px.
Active `#1b5ba7`, inactive `rgba(255,255,255,0.30)`. Sits on the page background with a
`border-top: 1px solid rgba(255,255,255,0.08)`.

### Modal / dialog
```
position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%)
width: 300px
background: #141414
border: 1px solid rgba(255,255,255,0.12–0.14)
border-radius: 18px
box-shadow: 0 24px 60px -20px rgba(0,0,0,0.9)
overflow: hidden
animation: popIn 170–180ms cubic-bezier(.3,.8,.3,1)
```
Structure: title `padding 20–22px 22px 6px`, 16–17px/800 white → body
`padding 0 22px 20px`, 12.5px/1.55 `#8a8a8a` → footer as a flex row of two text buttons
divided by `border-top` and a vertical `border-right`, each `padding: 15px`.
Cancel is `#9a9a9a`, confirm is `#6aa3ef` (or `#ff3b30` when destructive). **No close X.**

### Bottom sheet / popover
Same surface as the modal, but `left: 26px; right: 26px` (full width minus margin) and
rows separated by `border-top: 1px solid rgba(255,255,255,0.08)`.

### Scrim
`position: absolute; inset: 0; background: rgba(0,0,0,0.6)` (0.68 for destructive
dialogs). Clicking it closes the overlay.

### Progress bar
`height: 3px` (thin/segmented) or `6px` (metrics), `border-radius: 3–6px`,
track `rgba(255,255,255,0.09–0.12)`, fill `#1b5ba7` or `#6aa3ef`,
`transition: width 1s linear` for timers.

### Progress ring
SVG circle, `stroke-width: 3` (timer, XP) or `8` (score), track
`rgba(255,255,255,0.09)`, fill `#6aa3ef` / `#1b5ba7`, `stroke-linecap: round`,
`transform: rotate(-90 cx cy)`. Sizes: 118px score, 140px avatar, 230px timer.

### Chip / pill
`display: inline-flex; align-items: center; gap: 5px; padding: 3–4px 9–10px;
border-radius: 999px; background: rgba(255,255,255,0.08); font: 11px/800; color: #ffffff`,
optionally with a 6px coloured dot leading.

### Status badge (WRONG / IMPRECISE / UNSOURCED)
Uppercase 9–9.5px/800 with `letter-spacing: 0.14em`, coloured text on a 12–14% tint of
the same hue, small radius. Colour only — no icons.

### Empty state
Always the same recipe: dim or emptied version of the real content (0 values in
`#4f4f4f`, dashed placeholders, no animation), then a centred block —
16px/800 white headline → 12.5px/1.6 `#8a8a8a` explanation, `max-width ~270px` →
auto-width primary button. Never a blank screen, never an illustration.

### Screen transition
Every screen mounts with a black veil fading out:
`animation: veilOut 240ms ease both` on a full-bleed `#0b0b0b` layer at `z-index: 50`.
Screens that navigate away fade **in** to black (`veilIn 300ms`) and navigate after
~420–620ms.

---

## 13. Visual personality

**Dark, restrained, quietly game-like.** Concretely:

* **Near-black canvas with translucent white surfaces.** Nothing is a lighter grey box;
  containers are 4–5% white overlays with a 9% hairline. That makes the UI read as one
  continuous dark field rather than a stack of panels — calm, premium, low-noise.
* **One hue, used sparingly.** A single saturated navy carries every action. Because
  nothing else is coloured, the eye goes straight to the one thing that is. Status colours
  are clear rather than alarm-bright — a warm red and an amber, loud enough to be seen on
  a phone, restrained enough that a correction still feels like feedback, not failure.
* **Typography does the shouting.** Weight 800, tight tracking on headlines and very wide
  tracking on tiny uppercase eyebrows creates strong hierarchy without rules, boxes or
  colour. Uppercase micro-labels give it a technical, instrument-panel feel.
* **One playful detail: the button.** The hard offset shadow and the physical press are
  borrowed from game UI and are the reason the app feels like a trainer rather than a
  dashboard. Everything around it stays flat, which is what keeps that detail from
  reading as cheap.
* **Motion is short and functional.** 90–260ms for state, 170–180ms pop for overlays,
  240–300ms veils between screens. Only four things loop: the streak flame, the PLAY
  shimmer, the analysis orbit, and the waveform on the recording screen — each marks
  something alive, and nothing else in the app is allowed to.
* **Generous, not sparse.** Big type, wide margins, one idea per band. Lists tighten up
  because they are scanned; everything else breathes.

---

## 14. Design rules

- Use `#1b5ba7` **only** for the single primary action, active states and filled progress. Never as a background or decorative fill.
- **One primary button per screen**, at the bottom. Everything else is pill, ghost or icon.
- Never replace the button's hard `0 6px 0 0 #113e75` shadow with a blurred one, and never remove the press-down (`translateY(4–5px)` + `0 2px 0 0`).
- Cards are flat: translucent white fill + 1px hairline. **No shadows on cards, ever.** Blur is reserved for floating overlays.
- Prefer a divider row (`border-top: 1px solid rgba(255,255,255,0.08)`) over a filled card for lists. At most one filled feature card per screen.
- Every section starts with an eyebrow: 9.5–10px / 800 / `letter-spacing: 0.2em` / UPPERCASE / `#5f5f5f`.
- All numbers use `font-variant-numeric: tabular-nums`.
- **No green**, with exactly one exception: the quiz result screen, where right and wrong are `result.right` / `result.wrong` (its own mockup draws them that way). Every other positive or successful state uses `#6aa3ef`. Like the streak scale, those two belong to that screen and must not be borrowed.
- No emoji except country flags in leaderboard and profile.
- Do not introduce a new hue. If a new state needs a colour, use an opacity variant of an existing one.
- Icons are hand-written 24-viewBox stroke SVGs at `stroke-width: 1.7–2` in `currentColor`. Do not add an icon library and do not mix filled and stroked icons in one row.
- Radius: 14px default, 16px for full-width buttons and media, 18px for overlays, 999px for anything toggle-shaped.
- Lay out sibling groups with flex/grid + `gap`. Never space siblings with margins.
- Screen padding is 20px or 24px — pick one per screen and use it for every block.
- Every screen mounts with the 240ms black veil; every navigation fades to black first.
- Empty states mirror the real layout in a dimmed/zeroed form plus a centred headline, one explaining sentence and one auto-width primary button.
- Destructive actions are red text (`#ff3b30`) plus a confirm dialog — never a red filled button.

---

## 15. Design tokens (quick reference)

```
COLORS
bg              #0b0b0b
surface         #141414
card            rgba(255,255,255,0.045)
card-hover      rgba(255,255,255,0.04)
chip            rgba(255,255,255,0.08)
accent          #1b5ba7
accent-shadow   #113e75
accent-light    #6aa3ef
accent-raised   #2170c6   (Home PLAY only)
text            #ffffff
text-secondary  #8a8a8a
text-muted      #6a6a6a
text-faint      #5f5f5f
text-disabled   #4f4f4f
border          rgba(255,255,255,0.09)
divider         rgba(255,255,255,0.08)
border-modal    rgba(255,255,255,0.12)
scrim           rgba(0,0,0,0.6)
error           #df4f4f / text #ee7c7c
danger          #ff3b30
warning         #d59922
success         #6aa3ef   (green only in result.right, see §1)
result.right    #22e06a   (quiz result screen only)
result.wrong    #ff3b30   (quiz result screen only)

TYPOGRAPHY   Archivo, system-ui, sans-serif · 400/500/600/700/800
display      34px / 800 / 1.08 / -0.02em
h1           24-26px / 800 / 1.14 / -0.015em
h2           19-22px / 800 / 1.15 / -0.01em
h3           16-17px / 800
body         12.5-13px / 400-500 / 1.6
small        11.5px / 400-600
eyebrow      9.5-10px / 800 / 0.2em / UPPERCASE
button       13-15px / 800 / 0.12em / UPPERCASE
stat         30-34px / 800 / tabular-nums
tab label    9.5px / 600

SPACING      4 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 30 · 34 · 46
page-x       20px or 24px
page-top     44-50px
card-pad     26px 22px (large) · 17px 18px (medium) · 14px 16px (compact)
section-gap  30-46px

RADIUS
xs 3px · sm 12px · md 14px · lg 16px · xl 18px · 2xl 22px · pill 999px · frame 38px

SHADOWS
button       0 6px 0 0 #113e75   (pressed: 0 2px 0 0 #113e75)
button-tall  0 7px 0 0 #113e75
overlay      0 24px 60px -20px rgba(0,0,0,0.9)
card         none

MOTION
state        90-180ms ease
toggle       160-260ms ease
overlay      170-180ms cubic-bezier(.3,.8,.3,1)
veil         240ms out / 300ms in
```


## Working style

- Small, focused changes. If scope grows, tell me before expanding.
- On real tradeoffs, give a recommendation with one line of reasoning — not a survey.
- I'm building this to learn, so briefly explain non-obvious Expo/mobile decisions as you make them.
- Don't commit unless I ask.
