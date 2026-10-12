// The app's web pages: the static HTML in docs/, served by GitHub Pages from
// main — there is no domain yet. When one comes, WEB_BASE is the only thing that
// changes (and the old address should redirect, since store listings and
// already-sent emails point at it too).
const WEB_BASE = "https://kili196.github.io/BrainTrain";

export const WEB_PAGES = {
  privacy: `${WEB_BASE}/privacy.html`,
  terms: `${WEB_BASE}/terms.html`,
  support: `${WEB_BASE}/support.html`,
  // Where the signup confirmation mail lands. Must also be on the Supabase
  // redirect allow list (Authentication → URL Configuration), or Supabase
  // ignores it and falls back to the Site URL.
  emailConfirmed: `${WEB_BASE}/confirmed.html`,
} as const;
