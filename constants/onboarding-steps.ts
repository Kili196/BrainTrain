import type { CategoryKey } from "./categories";
import { PLATFORMS } from "./onboarding-platforms";
import { isValidBirth } from "../lib/birthdate";
import { colors } from "../theme/colors";
import type { Answers, Derived } from "../lib/onboarding-context";

// The whole onboarding, as data. Ported from offhand-landing's
// `onboarding-steps.ts`, copy verbatim unless a comment below says otherwise.
//
// The order in ONBOARDING_STEPS is the flow. Nothing in a screen component knows
// what comes before or after it, so a screen can be moved, added or cut by
// editing this array alone — the progress bar, the gate and the running order
// all derive from it.
//
// WHAT MAY NOT BE WRITTEN HERE:
//
// - No invented figure. Every number comes out of `Derived`, which is arithmetic
//   on the player's own answers — but the arithmetic itself is not shown.
// - No score, no percentile, no comparison with an average.
// - Brainrot, doomscrolling, dopamine and platform names are allowed, and are
//   the register this is written in. They may describe how something feels.
//   They may not assert what happens in a body. The moment a sentence sounds
//   like a study it needs one, or it goes.
// - Platforms by name only. No logos, no brand colours.
// - No AI, no transcription, no judgement of how well they spoke.
// - The axis is wasted potential, never shame.

// A line of copy, or a line that needs an answer to finish itself. Both forms
// exist because some screens address the player with something they told us,
// and a function filled in at render time is the only way to write that
// sentence once.
export type Copy = string | ((a: Answers, d: Derived) => string);

export function resolve(copy: Copy | undefined, a: Answers, d: Derived): string {
  return typeof copy === "function" ? copy(a, d) : (copy ?? "");
}

type Common = {
  id: string;
  // 'hero' is a showcase: copy centred in the frame and set larger, because it
  // is the whole picture. 'strip' is a working screen — left aligned, starting
  // at the top, so a question and the control under it are in the same place
  // from one screen to the next.
  band: "hero" | "strip";
  // The quiet first line, set in muted grey above the loud one.
  lead?: Copy;
  // Forward button label. Absent means "Continue".
  cta?: string;
  // The forward button in the flow's gradient instead of the white pill. Only
  // for the very last step, so the one button that ends the flow is the one
  // that looks different.
  ctaGradient?: boolean;
  // Small print under the button. Used where a promise needs a limit.
  fine?: string;
  // Whether the flow may move past this screen. Absent means always.
  answered?: (a: Answers) => boolean;
};

// The app's own front door, not in the landing: the name set large and
// animated, then the promise.
export type WelcomeStep = Common & {
  kind: "welcome";
  greeting: string;
  appName: string;
  headline: string;
  body: string;
};

export type CarouselStep = Common & {
  kind: "carousel";
  panels: readonly { lead: string; title: string; body: string }[];
};

export type SliderStep = Common & {
  kind: "slider";
  key: "feedHours" | "reclaimMinutes";
  question: Copy;
  body?: Copy;
  min: number;
  max: (a: Answers) => number;
  step: number;
  initial: (a: Answers) => number;
  // Spoken form, for the label above the thumb and for the screen reader.
  valueText: (v: number) => string;
  // Two words under the track, telling them what to do with it.
  hint?: string;
  // The immediate return on the answer, under the track.
  readout?: (v: number) => string;
  // One line at the bottom, where the deal needs saying out loud.
  footnote?: string;
};

export type InterstitialStep = Common & {
  kind: "interstitial";
  headline: Copy;
  body: Copy;
  points?: readonly {
    title: string;
    line: string;
    // The real name of the effect, small, under the card — something the
    // player can look up. Only the mechanism step has one.
    source?: string;
  }[];
  // The loop, drawn rather than listed.
  loop?: readonly string[];
};

export type YearGridStep = Common & {
  // A year, drawn. The scale is looked at instead of worked out.
  kind: "year-grid";
  unit: string;
  footnote: string;
};

export type BinaryStep = Common & {
  // Two answers, both true, both moving on.
  kind: "binary";
  key: "canExplain";
  headline: Copy;
  body: Copy;
  yes: string;
  no: string;
  replies: {
    yes: { title: string; body: string };
    no: { title: string; body: string };
  };
};

export type MultiSelectStep = Common & {
  kind: "multi-select";
  key: "symptoms" | "platforms";
  question: Copy;
  body?: Copy;
  // `fill` colours the tile once chosen; without one, the view takes the next
  // colour along the subject arc.
  options: readonly {
    id: string;
    label: string;
    fill?: { colors: readonly string[]; ink: string };
  }[];
};

// The three the app itself asks for. Separate kinds rather than one generic
// 'field' because each is a different control with a different rule for being
// done.
export type TextStep = Common & {
  kind: "text";
  key: "name";
  question: Copy;
  body: Copy;
  placeholder: string;
};

export type DateStep = Common & {
  kind: "date";
  key: "birth";
  question: Copy;
  body: Copy;
  // Shown once all three fields are filled and they still are not a date.
  invalid: string;
};

export type CountryStep = Common & {
  kind: "country";
  key: "countryCode";
  question: Copy;
  body: Copy;
};

export type ScaleStep = Common & {
  kind: "scale";
  question: Copy;
  low: string;
  high: string;
  // One per point on the scale, index-aligned. Reactions, not verdicts.
  responses: readonly string[];
};

export type CommitmentStep = Common & {
  kind: "commitment";
  headline: Copy;
  body?: Copy;
  hint: string;
  confirm: string;
  done: string;
};

export type TrialStep = Common & {
  kind: "trial";
  headline: Copy;
  body: Copy;
  topic: string;
  seconds: number;
};

export type GoalsStep = Common & {
  kind: "goals";
  question: Copy;
  body?: Copy;
  // The app's own five categories, not the landing's six subjects — the topics
  // come from these, so offering anything else would promise topics that do
  // not exist.
  options: readonly {
    id: CategoryKey;
    label: string;
    hint: string;
    // A colour from the subject arc (theme/colors.js `ob.subject`).
    tint: string;
    // One SVG path in a 24x24 box. Abstract marks, never emoji.
    icon: string;
  }[];
};

export type OutroStep = Common & {
  kind: "outro";
  headline: Copy;
  body: Copy;
};

export type OnboardingStep =
  | WelcomeStep
  | CarouselStep
  | SliderStep
  | InterstitialStep
  | YearGridStep
  | BinaryStep
  | MultiSelectStep
  | TextStep
  | DateStep
  | CountryStep
  | ScaleStep
  | CommitmentStep
  | TrialStep
  | GoalsStep
  | OutroStep;

export type StepKind = OnboardingStep["kind"];

// Grouped digits, with the locale named so every phone formats the same way.
const n = (value: number): string => value.toLocaleString("en-US");

const hours = (v: number): string => (v === 1 ? "1 hour a day" : `${v} hours a day`);

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  // Not in the landing. The app opens straight after sign-in, so it gets a
  // front door of its own before the hook starts asking anything — Fabian's
  // addition, 2026-09-29.
  {
    id: "welcome",
    kind: "welcome",
    band: "hero",
    cta: "Let's go",
    greeting: "Welcome to",
    appName: "Aloud",
    headline: "The brainrot stops now.",
    body: "One topic a day, sixty seconds out loud. Setting it up takes two minutes.",
  },

  {
    id: "hook",
    kind: "carousel",
    band: "hero",
    cta: "Continue",
    // The landing says "No account, no card, nothing to cancel." In the app the
    // player has just signed in to get here, so "no account" would be false.
    fine: "No card, nothing to cancel.",
    // By the end of the third panel they know what the app does.
    panels: [
      {
        lead: "Think about what you scrolled through yesterday.",
        title: "Name one thing from it.",
        body: "Take your time. Most people can't get to three.",
      },
      {
        lead: "Brainrot isn't stupidity.",
        title: "It's zero retention.",
        body: "You saw four hundred things. You kept none of them. That is not a you problem — that is what the format does.",
      },
      {
        lead: "So here's the deal.",
        title: "Sixty seconds out loud.",
        body: "One topic. You explain it. You hear yourself. That is the whole app.",
      },
    ],
  },

  {
    id: "where",
    kind: "multi-select",
    key: "platforms",
    band: "strip",
    lead: "Let us start with where the time goes.",
    question: "Which apps do you scroll?",
    body: "Short-form video and endless feeds — the ones you open without deciding to.",
    options: PLATFORMS.map((platform) => ({
      id: platform.id,
      label: platform.label,
      fill: platform.fill,
    })),
    answered: (a) => a.platforms.length > 0,
  },

  {
    id: "feed-hours",
    kind: "slider",
    key: "feedHours",
    band: "strip",
    cta: "Continue",
    lead: "Be honest, nobody is watching.",
    question: "How many hours a day go into those apps?",
    min: 0.5,
    max: () => 8,
    step: 0.5,
    initial: (a) => a.feedHours ?? 2,
    valueText: hours,
    hint: "Drag it",
    answered: (a) => a.feedHours !== null,
  },

  {
    id: "year-grid",
    kind: "year-grid",
    band: "hero",
    cta: "Go on",
    unit: "days a year",
    footnote: "Every dot is a day. The dark ones are already spent.",
  },

  {
    id: "explain-test",
    kind: "binary",
    key: "canExplain",
    band: "strip",
    cta: "Continue",
    lead: "One quick thing.",
    headline:
      "Think of one video from yesterday. Could you explain it out loud for twenty seconds?",
    body: "Do not actually do it. Just decide whether you could.",
    yes: "I can",
    no: "…I can’t",
    // Both answers are taken at face value. Neither is scored, and neither is
    // checked.
    replies: {
      no: {
        title: "That's not a memory problem.",
        body: "Watching isn't learning. Explaining is. That's the entire difference.",
      },
      yes: {
        title: "Good. That's rarer than you'd think.",
        body: "Now do it every day and it compounds.",
      },
    },
    answered: (a) => a.canExplain !== null,
  },

  {
    id: "symptoms",
    kind: "multi-select",
    key: "symptoms",
    band: "strip",
    lead: "After an evening of scrolling.",
    question: "Which of these do you recognise?",
    // Specific rather than clinical: recognition is the entire purpose, and
    // nobody recognises "reduced attention span".
    options: [
      { id: "phone", label: "Checking your phone during a video" },
      { id: "rewatch", label: "Rewatching stuff you've already seen" },
      { id: "undecided", label: "Opening the app without deciding to" },
      { id: "twice", label: "Reading a page twice, getting nothing" },
      { id: "bored", label: "Bored the second nothing moves" },
      { id: "blank", label: "Can't remember what you watched last night" },
    ],
    answered: (a) => a.symptoms.length > 0,
  },

  {
    id: "pressure",
    kind: "scale",
    band: "strip",
    cta: "Go on",
    lead: "Away from the phone.",
    question: "How often does somebody ask you something and nothing comes?",
    low: "Almost never",
    high: "Most weeks",
    responses: [
      "Then this is practice rather than repair. That is the easier place to start from.",
      "Rare enough to forget about, often enough to remember afterwards.",
      "Common. It is a skill, and skills answer to repetition rather than to nerve.",
      "That is a lot of moments you would rather have had words for.",
      "Then you already know exactly which situation this was built around.",
    ],
    answered: (a) => a.pressure !== null,
  },

  {
    id: "commitment",
    kind: "commitment",
    band: "strip",
    cta: "Continue",
    lead: "Draw a check to commit.",
    headline: "I want my attention back.",
    hint: "Draw here",
    confirm: "I am in",
    done: "Committed.",
    answered: (a) => a.committed,
  },

  {
    id: "your-number",
    kind: "interstitial",
    band: "hero",
    cta: "Continue",
    // The screen where the app undersells itself on purpose. Everything before
    // it points at a large number; this one refuses to promise that number
    // back. The refusal is the most credible thing in the flow.
    lead: (_, d) =>
      `You're not getting ${d.daysPerYear === null ? "those" : n(d.daysPerYear)} days back.`,
    headline: "Take twenty minutes.",
    body: (_, d) =>
      `Anyone promising you the whole year is selling something. Twenty minutes a day, actually used, is more than you got from ${d.platformLabel} all year.`,
  },

  {
    id: "reclaim",
    kind: "slider",
    key: "reclaimMinutes",
    band: "strip",
    cta: "Continue",
    lead: "Your call.",
    question: "How many minutes a day do you want back?",
    min: 1,
    // Capped by what they actually have: the slider cannot offer more minutes
    // than they said they spend.
    max: (a) => Math.min(60, Math.max(1, Math.round((a.feedHours ?? 1) * 60))),
    step: 1,
    initial: (a) => Math.min(20, Math.max(1, Math.round((a.feedHours ?? 1) * 60))),
    valueText: (v) => (v === 1 ? "1 minute a day" : `${v} minutes a day`),
    readout: (v) => `${v} a day. ${n(v * 365)} a year.`,
    footnote:
      "Your feed pays out every eight seconds. This pays out once, at the end. Worse dopamine, better recall.",
    answered: (a) => a.reclaimMinutes !== null,
  },

  {
    id: "brain-back",
    kind: "interstitial",
    band: "hero",
    cta: "Continue",
    // Sits here because `reclaim` ends on how much they get back without ever
    // saying what for. Without this the flow answers "why does it work"
    // (mechanism) before it has answered "why would I".
    lead: "That is what the minutes are for.",
    headline: "Start using your brain again.",
    body: "Your feed asks nothing of you. This asks for a minute of thinking out loud — and gives you something back that you keep.",
    // Outcomes in their life, not learning effects: `mechanism` is the very
    // next screen and already carries the effects.
    points: [
      {
        title: "Speak without a script",
        line: "The moment you get put on the spot stops being the one you dread.",
      },
      {
        title: "Hold your ground",
        line: "Opinions are cheap. Being able to back one up is not.",
      },
      {
        title: "Notice your own gaps",
        line: "You find out what you only thought you understood.",
      },
      // Kept to what is defensible: "daily practice grows your brain" is a
      // claim this product cannot back.
      {
        title: "Cover new ground every day",
        line: "A different subject each time — and the more you already carry, the faster anything new finds a place to sit.",
      },
    ],
  },

  {
    id: "mechanism",
    kind: "interstitial",
    band: "strip",
    cta: "Continue",
    lead: "Three things make this work.",
    headline: "And none of them are new.",
    body: "",
    // The real name of each effect, small, under the card. Something they can
    // look up — which is what a citation is for.
    points: [
      {
        title: "Say it and you keep it",
        line: "Producing an answer burns it in far deeper than reading one.",
        source: "generation effect",
      },
      {
        title: "Teaching is the cheat code",
        line: "Explaining to someone forces the gaps into the open.",
        source: "protégé effect",
      },
      {
        title: "Pull, don't push",
        line: "Retrieving beats reviewing, every time.",
        source: "active recall",
      },
    ],
  },

  {
    id: "the-loop",
    kind: "interstitial",
    band: "hero",
    cta: "Try it",
    lead: "Four steps,",
    headline: "once a day.",
    body: "That is the whole app. No feed to fall into, nobody listening, nothing to keep up with.",
    loop: [
      "A topic you did not pick",
      "Time to prepare",
      "Sixty seconds out loud",
      "Listen back",
      "Check yourself",
    ],
  },

  {
    id: "trial",
    kind: "trial",
    band: "strip",
    // Calls back to the explain test, in whichever direction they answered it.
    lead: (a) =>
      a.canExplain
        ? "You said you could explain something."
        : "Remember the thing you couldn't explain?",
    headline: (a) => (a.canExplain ? "Prove it on this one." : "Try this one instead."),
    body: "Twenty seconds. Nobody hears it but you.",
    topic: "Why coffee wakes you up",
    seconds: 20,
  },

  {
    id: "goals",
    kind: "goals",
    band: "strip",
    cta: "Continue",
    lead: "Your plan",
    question: "Which subjects should the topics come from?",
    body: "Pick as many as you like. This is changeable later.",
    options: [
      // Tints run along the subject arc in list order, teal to violet.
      {
        id: "mind",
        label: "Mind & Behaviour",
        hint: "Why people do what they do",
        tint: colors.ob.subject.science,
        icon: "M9 18 h6 M10 21 h4 M12 3 a6 6 0 0 0 -3.5 10.9 V16 h7 v-2.1 A6 6 0 0 0 12 3",
      },
      {
        id: "physics",
        label: "Universe & Physics",
        hint: "How things work",
        tint: colors.ob.subject.economy,
        icon: "M5 15 C9 5, 15 5, 19 15",
      },
      {
        id: "nature",
        label: "Earth & Life",
        hint: "The living planet",
        tint: colors.ob.subject.politics,
        icon: "M5 19 C5 10, 10 5, 19 5 C19 14, 14 19, 5 19 M5 19 L13 11",
      },
      {
        id: "history",
        label: "History",
        hint: "How we got here",
        tint: colors.ob.subject.history,
        icon: "M12 7 v5 l3 2 M21 12 a9 9 0 1 1 -18 0 a9 9 0 0 1 18 0",
      },
      {
        id: "technology",
        label: "Technology",
        hint: "The things we built",
        tint: colors.ob.subject.culture,
        icon: "M7 7 h10 v10 H7 Z M10 4 v3 M14 4 v3 M10 17 v3 M14 17 v3 M4 10 h3 M4 14 h3 M17 10 h3 M17 14 h3",
      },
    ],
    // The landing asks for a preparation time here too. Cut in the app: the
    // round settings already own that dial.
    answered: (a) => a.goals.length > 0,
  },

  // The three the app asks for. They sit after the subjects and before the
  // plan, because everything before this is about the player in the abstract,
  // and because `plan` leads straight into the finish.
  {
    id: "name",
    kind: "text",
    key: "name",
    band: "strip",
    cta: "Continue",
    lead: "Almost there.",
    question: "What should we call you?",
    body: "Shown on the leaderboard. A first name or a handle is enough.",
    placeholder: "Your name",
    answered: (a) => a.name.trim().length > 0,
  },

  {
    id: "birthdate",
    kind: "date",
    key: "birth",
    band: "strip",
    cta: "Continue",
    lead: "Two more.",
    question: "When were you born?",
    body: "Used to compare your scores against speakers in your age group.",
    invalid: "That date looks off.",
    answered: (a) => isValidBirth(a.birth),
  },

  {
    id: "country",
    kind: "country",
    key: "countryCode",
    band: "strip",
    cta: "Continue",
    lead: "Last one.",
    question: "Where are you from?",
    body: "Sets your regional leaderboard and the language of your daily topics.",
    answered: (a) => a.countryCode !== null,
  },

  // The landing's "Your plan" reveal stood here — a date card and blurred
  // placeholder topics. Removed 2026-09-30 (Fabian): the topics had nothing
  // to do with the subjects picked, and the last screen already says what
  // the plan adds up to.

  {
    id: "finish",
    kind: "outro",
    // The landing ends on a waitlist and three placeholder plans. Neither
    // exists in the app: there is nothing to wait for, and showing prices that
    // cannot be bought is an App Review risk. The paywall is its own screen
    // (`app/paywall.tsx`) and follows this step.
    // Centred like the welcome: the flow opens and closes on a showcase.
    band: "hero",
    cta: "Start",
    ctaGradient: true,
    lead: "Ready",
    headline: "That is the setup done.",
    body: "Your first topic is waiting. Sixty seconds out loud is all it takes.",
  },
];
