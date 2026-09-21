# BrainTrain

A cross-platform app for iOS and Android — React Native + Expo (managed workflow)
in TypeScript, with Supabase as the backend.

This README covers how to get the project running locally.

---

## 1. Prerequisites

- **Node 22** (tested with v22.18.0, npm 11) — check with `node -v`
- **Git**
- One of these to run the app:
  - **Expo Go** on your phone (App Store / Play Store), or
  - the Xcode simulator (macOS) or an Android Studio emulator

Without either, `npm run web` still gets you a running build.

## 2. Access to the Supabase project

You need two values from the Supabase dashboard (project ref `unwbyioipuwzpluvxxgw`),
which requires an invite to the organization — ask Fabian if you don't have one.

Alternatively Fabian can send you both values directly: the URL and the publishable
key are public by design, they ship inside the app bundle anyway. Security comes from
Row Level Security in the database, not from hiding the key.

> **The secret / `service_role` key must never reach the client, the `.env`, or the
> repository.**

## 3. Clone the repo

```bash
git clone https://github.com/Kili196/BrainTrain.git
cd BrainTrain
npm install
```

## 4. Create your `.env`

`.env` is gitignored, so it does not come with the clone:

```bash
cp .env.example .env
```

Then fill in the two values:

| Variable | Where in the dashboard | Value |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Settings → Data API | `https://unwbyioipuwzpluvxxgw.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Settings → API Keys | the **publishable** key, starts with `sb_publishable_…` |

The project uses the new API key layout — there is no classic `anon` JWT any more,
even though the variable is still named that way. If your key is a long JWT, you
grabbed the wrong one.

If the file or a value is missing, `lib/supabase.ts` throws a clear error at startup
on purpose, instead of a cryptic "Invalid URL" from deep inside the first query.

## 5. Run the app

```bash
npm start        # Metro + QR code; press i / a, or scan the QR with Expo Go
npm run ios      # straight into the iOS simulator
npm run android  # straight into the Android emulator
npm run web      # in the browser, no simulator needed
```

After **any** change to `.env`, restart Metro with a cleared cache:

```bash
npx expo start -c
```

Reason: `EXPO_PUBLIC_*` variables are inlined into the bundle at build time, not read
at runtime. A plain reload keeps serving the old value.

## 6. Link the Supabase CLI *(only needed for schema work)*

Skip this if you are only touching UI.

```bash
npx supabase login                                    # opens the browser
npx supabase link --project-ref unwbyioipuwzpluvxxgw  # asks for the database password
```

The link is stored in `supabase/.temp/` and is local to your machine, so everyone has
to set it up once.

That unlocks the scripts:

```bash
npm run db:push    # apply migrations from supabase/migrations/ to the project
npm run db:types   # regenerate lib/database.types.ts from the live schema
npm run db:seed    # compile supabase/content/topics-v1.md into a seed migration
```

To check the link is working: `npx supabase migration list` — local and remote should
show the same migrations.

## 7. Google sign-in setup *(optional — only needed to test Google/Apple sign-in)*

The login screen's "Continue as guest" works everywhere, including Expo Go. Google
sign-in needs a **custom dev build** — `@react-native-google-signin/google-signin` is a
native module and is not in Expo Go, the same way the microphone isn't (§ Project
status). The button detects Expo Go and disables itself with a short note instead of
crashing; guest still works there.

To actually sign in with Google on a dev build, both a Google Cloud project and the
Supabase dashboard need to be told about each other:

1. **Google Cloud Console** → APIs & Services → Credentials → *Create Credentials* →
   *OAuth client ID*, three times:
   - **Web application** — no redirect URI needed for this flow. Copy its client ID into
     `.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. This is the one Supabase checks the ID
     token's audience against — see the comment above it in `.env.example`. This is the
     only one of the three referenced anywhere in the app's code or config.
   - **iOS** — bundle ID `com.braintrain.app`. Take its client ID, reverse it (e.g.
     `1234-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.1234-abc`), and
     paste that into the `iosUrlScheme` TODO in `app.json`'s `@react-native-google-signin/google-signin`
     plugin config. Without this, iOS never returns control to the app after the sign-in
     sheet closes.
   - **Android** — package name `com.braintrain.app`, plus the SHA-1 fingerprint of the
     signing certificate (get it from `eas credentials`, or `./gradlew signingReport` for
     a local debug build). Nothing from this one goes into `.env` or `app.json` either —
     Google's servers use it purely to check that the app calling in is really this app,
     matched by package name and signature. Skipping it doesn't break the build; it
     surfaces later as a `DEVELOPER_ERROR` the first time someone taps the button on
     Android.
2. **Supabase dashboard** → Authentication → Providers → Google → enable it, and paste
   the **web** client ID and secret from the credential above. This is what makes
   `supabase.auth.signInWithIdToken({ provider: "google", ... })` accept the token instead
   of rejecting it as an untrusted audience.
3. Rebuild the dev client (`eas build --profile development`, or `npx expo run:ios` /
   `run:android` locally) — the plugin config only takes effect in a native build, not in
   Metro alone.

Apple sign-in is **scaffolded but switched off**: the UI and the `signInWithIdToken({
provider: "apple", ... })` call already exist (`lib/auth-providers.ts`), gated behind
`FEATURES.appleSignIn` in `lib/features.ts`. Turning it on needs an Apple Developer
account to register the "Sign in with Apple" capability and enable the provider in
Supabase the same way as Google — nothing to do until that account exists.

---

## Project status

Topics are wired end to end; auth and saving a round are the two pieces still stubbed:

- The schema is migrated, and the topic pool (125 English topics, 25 per category) is
  live and verified through a real `supabase-js` query.
- `lib/supabase.ts` and `lib/topics.ts` (`fetchTopics`, `fetchTopicBySlug`,
  `fetchQuizQuestions`, `fetchRandomTopic(s)`, `fetchDailyTopic`) are done and typed
  from `lib/database.types.ts`, and screens call them directly: `home.tsx` draws
  topics, `quiz.tsx` and `quiz-result.tsx` fetch the quiz questions for a round.
- A player is either resumed from a stored session or lands on `/login`
  (`lib/auth-context.tsx`, `app/(auth)/login.tsx`) with three ways in: Google, Apple
  (scaffolded, off until there's an Apple developer account — § 7), or a guest account
  (an anonymous Supabase user, same as before). Whichever it is, the session is kept in
  the Keychain / encrypted shared preferences through `lib/secure-store-adapter.ts`.
  Without a session `auth.uid()` is null and RLS keeps `speech_sessions` shut, so the
  gate is what makes saving possible at all.
- A finished round is **written for real**: `lib/round-session.tsx` carries it from the
  draw to the result screen, and `lib/speech-sessions.ts` upserts it — topic, start,
  spoken duration, quiz score and the on-device transcript.
- Still faked: the "analyzing" step between the last answer and the result
  (`app/analyzing.tsx`) is a timer with labels on it. Nothing is analysed yet.
- The **microphone needs a custom dev build** — `expo-speech-recognition` is a native
  module and is not in Expo Go. The app itself runs in Expo Go; the recording screen
  says so in place of a transcript, and the round then saves with `transcript` null.

## Changing content

The topic pool is maintained in `supabase/content/topics-v1.md` and compiled into a
migration with `npm run db:seed`. **Never hand-patch the generated SQL** — edit the
markdown and regenerate.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Missing EXPO_PUBLIC_SUPABASE_URL…` at startup | `.env` missing, misnamed, or Metro was already running → `npx expo start -c` |
| Your key is a long JWT | wrong dashboard tab, that's the legacy key |
| `db:push` says "not linked" | step 6 is missing |
