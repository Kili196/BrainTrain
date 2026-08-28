// Stand-ins for data the app does not have yet.
//
// Achievements, streaks and challenges are all designed and none of them are
// built — there is no table behind any of them and no auth to hang them on.
// Rather than leave the header half-drawn, it renders these constants, so the
// layout, the colour thresholds and the notification dot are all real and only
// the numbers are not.
//
// Everything here is temporary by definition: when a feature lands, its entry
// leaves this file. Nothing outside a placeholder should ever be added here.

// 34 days puts the flame past the 30-day mark, so it renders violet rather than
// orange — the state worth looking at while building it.
export const PLACEHOLDER_STREAK_DAYS = 34;

// Drives the red dot on CHALLENGES.
export const PLACEHOLDER_HAS_NEW_CHALLENGE = true;
