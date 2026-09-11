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

---

## Project status

Topics are wired end to end; auth and saving a round are the two pieces still stubbed:

- The schema is migrated, and the topic pool (125 English topics, 25 per category) is
  live and verified through a real `supabase-js` query.
- `lib/supabase.ts` and `lib/topics.ts` (`fetchTopics`, `fetchTopicBySlug`,
  `fetchQuizQuestions`, `fetchRandomTopic(s)`, `fetchDailyTopic`) are done and typed
  from `lib/database.types.ts`, and screens call them directly: `home.tsx` draws
  topics, `quiz.tsx` and `quiz-result.tsx` fetch the quiz questions for a round.
- Every player is signed in **anonymously** (`lib/auth-context.tsx`), established
  before any screen mounts and kept in the Keychain / encrypted shared preferences
  through `lib/secure-store-adapter.ts`. Without a session `auth.uid()` is null and
  RLS keeps `speech_sessions` shut, so the gate is what makes saving possible at all.
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
