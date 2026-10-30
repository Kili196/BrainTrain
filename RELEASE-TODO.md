# Aloud — Release Todo

Audit of `main` @ `16ced32`, 2026-10-19. Re-check anything marked _verified_ before
relying on it; this is a snapshot.

## Status: NOT READY

The code itself is in decent shape: `npx tsc --noEmit` is clean, RLS is on every
table, account deletion exists (Apple 5.1.1(v)), and the paywall has a restore
button. What blocks the release is almost entirely **outside the code**: no
production build has ever been made, and with today's configuration one would
crash on launch. The store accounts don't exist yet, the legal pages are offline,
and the app icon is still Expo's template.

**Not verified in this audit:**
- A real production build (`eas build --profile production`) — impossible without
  store accounts and env vars.
- Anything on iOS since the rename to Aloud.
- Tests — the project has none (by design so far, see CLAUDE.md).

### Dependency order

Most items hang off three external things. Start those first, because they have
lead time:

```
Gewerbe ──► Google Play account ──► closed test (12 testers × 14 days) ──► Play release
        └─► Apple Developer account ──► Sign in with Apple, iOS build, TestFlight ──► App Review
                                    └─► RevenueCat store apps + real keys (both stores)
Kili enables GitHub Pages ──► legal URLs live ──► store listings can reference them
```

Owner legend: **F** = Fabian, **K** = Kili, **C** = Claude (code change, on request).

---

## 🔴 P0 — Release blockers

### [ ] 1. Production env vars on EAS — **F** (+ C for the RevenueCat part, see #2)

> **2026-10-26:** Supabase URL, anon key and Google web client ID created on EAS
> for `preview` **and** `production`; `eas.json` names the environment per profile.
> Still missing: the two RevenueCat store keys (after #3).

**Problem.** `npx eas-cli env:list --environment production` returns
"No variables found for this environment" _(verified 2026-10-19)_. `.env` is
gitignored (`.gitignore:45`), so an EAS cloud build never sees it.

**Why it blocks.** The `EXPO_PUBLIC_*` values are inlined at bundle time. In a
production build they would be `undefined`, and `lib/supabase.ts:20` throws
"Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY" on startup —
the app never gets past launch. Dev builds only worked because they load JS from
the local Metro, which reads `.env`.

**Fix.**
1. For each variable, run
   `npx eas-cli env:create --environment production --name <NAME> --value <VALUE> --visibility plaintext`
   (all of these are public by design — `.env.example` explains why):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - the RevenueCat store keys from #2
2. Add `"environment": "production"` to the `production` profile in `eas.json` if
   EAS doesn't pick it up by profile name.
3. Never add the `service_role` key here.

**Done when** a production build launches past the startup screen.

---

### [ ] 2. RevenueCat: real store keys, not the Test Store key — **F** (dashboard) + **C** (code)

> **2026-10-26: code part (step 3) done.** `lib/purchases-context.tsx` uses the test
> key only when `__DEV__`, otherwise `EXPO_PUBLIC_REVENUECAT_IOS_KEY` /
> `_ANDROID_KEY`. Without them a release build runs with purchases "unavailable"
> (no crash, free limit lifted). Remaining: steps 1, 2, 4 after #3.

**Problem.** `lib/purchases-context.tsx` only reads
`EXPO_PUBLIC_REVENUECAT_TEST_KEY` (a `test_…` key).

**Why it blocks.** RevenueCat deliberately crashes release builds that use a Test
Store key (noted in `.env.example`). Purchases can't work in production either.

**Fix.**
1. **F:** In RevenueCat, add an App Store app and a Play Store app for
   `com.aloud.app`. Link the real store products (yearly + monthly) to the
   existing entitlement `braintrain_premium` (keep that id — the code checks it)
   and to the `default` offering.
2. **F:** Set up the 3-day free trial on the yearly product in **App Store Connect
   and Play Console** (the Test Store couldn't do intro offers, which is why it
   never showed).
3. **C:** Pick the key by platform:
   `Platform.OS === "ios" ? EXPO_PUBLIC_REVENUECAT_IOS_KEY : EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`,
   keeping the test key for dev builds only. Update `.env.example`.
4. Real-device test on both stores: offering loads with real prices, sandbox
   purchase grants premium, restore works, cancel shows no error.

**Depends on** #3.

---

### [ ] 3. Gewerbe + store accounts — **F**

**Why it blocks.** No account means no production build signing, no purchases, no
submission.

**Fix, in this order (agreed 2026-10-04):**
1. Register the Gewerbe. Add Gewerbe/UID details to the Impressum in
   `docs/terms.html` / `docs/privacy.html`.
2. Google Play Console ($25). **Start early:** new personal accounts need a
   closed test with ~12 testers for 14 days before production access (check the
   current numbers when you sign up). Line up the testers now.
3. Apple Developer Program ($99).

---

### [ ] 4. Legal pages online — **K**

**Problem.** `https://kili196.github.io/BrainTrain/{privacy,terms,support,confirmed}.html`
all return **404** _(verified 2026-10-19)_. GitHub Pages isn't enabled.

**Why it blocks.** Both stores require a reachable privacy policy URL. The paywall
links (`lib/web-pages.ts`, used in `app/paywall.tsx`) and the link in the signup
confirmation mail (`emailConfirmed`) currently go nowhere.

**Fix.**
1. **K:** Repo Settings → Pages → Source: `main`, folder `/docs`.
2. **F/C:** `curl` all four URLs → expect 200.
3. **F:** Tap the paywall links on a device; do one real signup and click the
   confirmation link.

---

### [x] 5. Replace the placeholder support email in `docs/` — **C**

> **Done 2026-10-28** — all four links now `support.aloud@gmail.com`, TODO comments
> and the `.todo` rule gone. Settings' `FEEDBACK_EMAIL` lowercased to match. Pages
> still off, so not yet checked live.

**Problem.** `support@example.com (placeholder)` with the orange `.todo` style in:
- `docs/privacy.html:41-42`
- `docs/support.html:28-29` and `:92-93`
- `docs/terms.html:143-144`

**Why it blocks.** The privacy policy has to name a working contact (GDPR), and
store review reads these pages.

**Fix.** Replace with `support.aloud@gmail.com` (already correct in
`app/(tabs)/settings.tsx:46`). Remove the `TODO` comments, and drop the `.todo`
rule from `docs/style.css:177` once nothing uses it. ~10 min.

---

### [ ] 7. iOS sign-in — **F** (consoles) + **C** (config)

> **2026-10-26: steps 1–2 done.** iOS client "Aloud iOS" (bundle `com.aloud.app`)
> created and added to Supabase's Google client IDs; `iosUrlScheme` set in
> `app.json`; `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env` + EAS (preview,
> production) and passed as `iosClientId` in `lib/auth-providers.ts`. The Google
> button stays hidden on iOS until Apple sign-in is on (`login.tsx`). Remaining:
> steps 3–6 after #3.

**Problem A.** `app.json:51`:
`"iosUrlScheme": "com.googleusercontent.apps.TODO-REPLACE-WITH-REVERSED-IOS-CLIENT-ID"`.
Google sign-in can't hand control back to the app on iOS.

**Problem B.** `lib/features.ts`: `appleSignIn: false`. App Store guideline 4.8
requires Sign in with Apple (or an equivalent privacy-focused login) when an app
offers a third-party login like Google. Review rejects otherwise.

**Fix.**
1. **F:** Google Cloud Console → new **iOS** OAuth client, bundle ID `com.aloud.app`.
2. **C:** Put its reversed client ID into `iosUrlScheme`.
3. **F:** (after #3) Apple Developer → enable the Sign in with Apple capability
   for `com.aloud.app`. Supabase → Auth → Providers → Apple: add `com.aloud.app`
   as an authorized client ID.
4. **C:** Flip `FEATURES.appleSignIn` to `true`.
5. Test both logins on an iPhone with a fresh build.
6. Housekeeping: delete the old Google client "BrainTrain Android" (still pending
   from 2026-10-15).

---

## 🟠 P1 — Important before release

### [x] 8. Leaderboard can be faked — **C**

> **Done 2026-10-26** — `20261026190000_guard_speech_sessions.sql`, pushed to the
> live DB. Server-set `created_at`; max 30 rounds per player per UTC day; a saved
> round's score/identity/dates can't be updated (upsert retries with identical
> values still pass). Tested as a real user in a rolled-back transaction: retry
> ok, score bump rejected, 31st round rejected, backdated `created_at` overwritten.
> A real round from the preview build saved afterwards. Residual: delete + re-insert
> still allows up to 30×100 points/day — bounded, not prevented.

**Problem.** Leaderboard points are `sum(coalesce(quiz_score, 0))` over
`speech_sessions` (`supabase/migrations/20260913180000_add_leaderboard.sql`).
The policy `speech_sessions_all_own` (`20260826120000_init_schema.sql:163-166`)
lets any signed-in user insert unlimited rows of their own with `quiz_score = 100`
straight through the public API, using the anon key from the app bundle.

**Why it matters.** One curious user can take #1 forever. It's a public ranking,
so everyone sees it.

**Fix (smallest safe change).** A new migration with a `before insert` trigger
that rejects more than N rows per user per UTC day, and a `created_at` that can't
be backdated (default `now()`, reject client values). N should comfortably cover
a premium user's real play (e.g. 30). Then `npm run db:push`, test by impersonating a real user in SQL
(the CLI runs as superuser, where RLS doesn't apply). A server-computed score would be cleaner, but it's a
bigger change — not needed for release.

---

### [x] 9. Expo patch versions — **C**

> **Done 2026-10-20, verified 2026-10-26:** expo 57.0.30 + patch bumps, `expo install
> --check` and tsc clean, new Android dev build, one full round played on the emulator.

**Problem.** `npx expo-doctor` _(verified 2026-10-19)_: 6 patch mismatches —
`expo` 57.0.22 (expected ~57.0.30), `expo-constants`, `expo-crypto`,
`expo-dev-client`, `expo-linking`, `expo-router`.

**Why it matters.** The first production build should run on the patch versions
the SDK was tested with. Patch-only, so low risk.

**Fix.** `npx expo install --check`, typecheck, new dev build, play one round.
Do it **before** the first production build, not after.

---

### [x] 10. Turn off iPad support — **C**

> **Done 2026-10-20** (`supportsTablet: false`). iOS-only, so unverified until the
> first iOS build.

**Problem.** `app.json` → `ios.supportsTablet: true`, but the whole UI is a fixed
390-pt phone frame (Design System §11).

**Why it matters.** With tablet support on, App Store Connect requires iPad
screenshots and review also runs the app on an iPad, where it would look
stretched.

**Fix.** Set it to `false`. The app then runs on iPad in iPhone compatibility
mode. One line.

---

### [x] 11. Speech permission text says "on-device" — **C**

> **Done 2026-10-20** — both strings reworded. iOS-only, unverified until the first
> iOS build.

**Problem.** The iOS strings in `app.json` (`NSSpeechRecognitionUsageDescription`
and the `expo-speech-recognition` plugin's `speechRecognitionPermission`) say
"transcribes your speech **on-device**". `lib/use-speech-transcript.ts` doesn't
force on-device recognition, so audio can go to Apple's/Google's servers.
`docs/privacy.html:73-76` already says this correctly.

**Why it matters.** A permission string that contradicts the privacy policy is a
review risk and simply untrue.

**Fix.** Reword, e.g. "Aloud turns your speech into text using your phone's speech
recognition, so you can see what you said." Takes effect with the next native
build.

---

### [ ] 12. Store listings and privacy forms — **F**

Not code, but nothing ships without them:
- Screenshots (iPhone 6.7" + 6.5"; Android phone), short + long description,
  category, keywords.
- **App Store privacy labels** and **Play Data safety form**: email, name, birth
  date, country, user ID, purchase history, speech transcripts (stored in
  `speech_sessions.transcript`), product interaction. Must match `docs/privacy.html`.
- Age rating questionnaires (privacy policy sets the floor at 14).
- Review notes for Apple: a test account (email + password) so the reviewer
  can get past login.

---

### [ ] 13. Test the critical flows in a release build, both platforms — **F**

> **2026-10-26, Android preview build `08aad655` (first release build ever):**
> launches, Supabase loads, no dev buttons; full round (Standard → prep skip →
> recording with mic → quiz → result) saved and shows on the profile; no JS
> errors in logcat. Purchases "unavailable" as designed (no store keys), so
> Standard was open. Not yet: login flows, offline round, sign out / delete, iOS.

Release builds behave differently from dev builds (no Metro, `__DEV__` false, real
store keys). Run each on iOS **and** Android:

| Flow | Check |
|---|---|
| First launch | No crash, anonymous guest → onboarding → home |
| Email signup | Mail arrives (custom SMTP), link → `confirmed.html`, sign in works |
| Google / Apple login | Both platforms, new and returning account |
| Password reset | Code arrives, new password works |
| A full round | Draw → prep → record (mic + speech permission prompts) → quiz → result saved, appears on profile + leaderboard |
| Offline round | Result screen offers the retry (`app/analyzing.tsx` `"unsaved"`) and doesn't lose the round silently |
| Free limit | Second round of the day → paywall |
| Purchase | Sandbox purchase → premium unlocks; restore after reinstall; cancel shows no error |
| Sign out / delete account | Both land on `/login`; deleted account is gone in the DB |
| Dev UI | None of the `__DEV__` buttons on Home (`app/(tabs)/home.tsx:359, 381, 410`) show |

---

### [x] 14. Result screen promises an AI review — **C**

> **Done 2026-10-28** — now reads "From the questions you missed. Tap one to read
> it in full." Bring the AI line back with the update that ships the analysis.

**Problem.** `app/quiz-result.tsx:303`: "AI review of your talk is coming soon"
(seen in the preview build, 2026-10-26). There is no AI in the MVP
(decided 2026-09-12), and nothing is scheduled.

**Why it matters.** Store review dislikes features announced but not present
(Apple 2.1 / 2.3), and players read it as a promise.

**Fix.** Drop the "coming soon" half of the sentence. ~5 min.

---

### [ ] 15. Signup confirmation mail lands in spam — **F** (domain + dashboard)

**Problem.** Custom SMTP sends through `smtp.gmail.com` as
`support.aloud@gmail.com`. Delivery works, but Gmail files the mail as spam
(found 2026-10-30: the signup mail to a fresh Gmail address was sent, then only
turned up via `in:anywhere`). An automated mail with a link, from a new free
mailbox, with no SPF/DKIM for its own domain, looks like phishing — no setting
on the Gmail side fixes that. Supabase's dashboard warns about it too. Gmail also
caps how many mails a mailbox may send per day.

**Why it matters.** A player who never finds the mail can't confirm, so email
signup quietly fails for them.

**Fix.**
1. **F:** Buy a domain for Aloud (~10–15 €/year). Also wanted for the legal
   pages and the confirmation page (see P2 "Leftover BrainTrain names").
2. **F:** Resend (free up to 3,000 mails/month): add the domain, put its
   SPF/DKIM records into the domain's DNS, create an API key.
3. **F:** Supabase → Authentication → Emails → SMTP: host `smtp.resend.com`,
   port 465, user `resend`, password = the API key, sender e.g.
   `no-reply@<domain>`.
4. Sign up with a fresh Gmail and a fresh Outlook address; the mail must land in
   the inbox.

---

## 🟡 P2 — Nice to have / post-release

- **`npm audit`**: 41 findings (1 critical `shell-quote`, high `braces`,
  `node-forge`, `source-map-js` …). Nearly all sit in build tooling (Metro, CLI,
  Tailwind), not in the app bundle. Revisit with the next SDK upgrade; don't
  `npm audit fix --force`.
- ~~**`app/index.tsx:54` TODO**: the "onboarded" flag is per device, not per
  account. A second account on the same phone can skip onboarding.~~ **Done
  2026-10-29:** the flag is cleared whenever auth status turns signed-out, not
  only on the Sign out button, so a session that dies on its own clears it too.
- **Free limit is client-side** (`lib/use-round-allowance.ts` counts rounds in the
  app). A determined user can bypass it. Fine for launch; move it to the server if
  it ever matters financially.
- ~~**Error toasts show a check icon**~~ (noticed 2026-10-03). **Done 2026-10-28:**
  `toast.show(message, tone)` with a required `success | error | info`; errors get
  a red ringed "!", hints no icon.
- **Leftover BrainTrain names** kept on purpose: EAS slug `braintrain`,
  entitlement `braintrain_premium`, AsyncStorage keys `braintrain.*.v1`, Pages
  URL `kili196.github.io/BrainTrain`. Harmless, but the Pages URL ends up in store
  listings and mails — consider a custom domain before launch, since changing it
  later means redirects.
- **No crash reporting.** You will only hear about production crashes from
  reviews. Consider `sentry-expo` / `@sentry/react-native` after launch (new
  dependency — decide first).
- **Waveform follows the mic level** (added 2026-10-26, `volumechange` event) —
  unverified: the bars didn't move on the emulator with a headset mic. Check on a
  real phone; if still flat, tune `VOLUME_FULL` in `lib/use-speech-transcript.ts`.

---

## 🎨 Last — still a P0 blocker, moved to the end on purpose (2026-10-26)

The icon doesn't exist yet, so this is done after everything else.

### [ ] 6. Real app icon and splash — **F** (design) + **C** (wiring)

**Problem.** `assets/icon.png` is Expo's template icon (the blue "A" on a
blueprint grid). `android-icon-*.png`, `splash-icon.png` and the adaptive icon
background `#E6F4FE` in `app.json` are template values too.

**Why it blocks.** It would ship as the store and home-screen icon.

**Fix.**
1. **F:** Design the Aloud icon. Needed files:
   - `icon.png` 1024×1024, no transparency, no rounded corners (iOS rounds them)
   - `android-icon-foreground.png` (logo inside the central safe zone),
     `android-icon-background.png` or just a colour, `android-icon-monochrome.png`
   - `splash-icon.png`
2. **C:** Set the adaptive icon `backgroundColor` and a splash config
   (`expo-splash-screen` plugin, background = the `bg` token) in `app.json`.
3. New dev build to check it — icons are native, so a reload isn't enough.

---

## 🚀 Release checklist

```
Accounts & legal
[ ] Gewerbe registered, Impressum updated in docs/
[ ] Google Play account — closed-test testers lined up
[ ] Apple Developer account
[ ] GitHub Pages on; privacy/terms/support/confirmed return 200
[x] support@example.com replaced everywhere

App config
[ ] App icon, adaptive icon, splash
[ ] iOS Google OAuth client + iosUrlScheme
[ ] Sign in with Apple set up, FEATURES.appleSignIn = true
[x] supportsTablet false, speech permission text fixed
[x] npx expo install --check, tsc clean

Backend
[x] Leaderboard insert limit migration — db:push, tested as a real user
[ ] Supabase redirect allow list + SMTP still correct for production

Payments
[ ] RevenueCat apps for both stores, products + 3-day trial, real keys in code

Build
[ ] EAS production env vars set
[ ] eas build --profile production — iOS and Android succeed
[ ] Critical flows table (#13) passed on both platforms

Stores
[ ] Listings, screenshots, privacy labels / Data safety, age rating
[ ] Apple: TestFlight → submit with review test account
[ ] Google: closed test 14 days → production
[ ] Release
```
