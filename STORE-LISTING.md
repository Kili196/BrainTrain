# Aloud — Store listing & privacy forms (draft)

Draft for RELEASE-TODO #12, written 2026-11-01. Everything here is a proposal —
copy it into App Store Connect / Play Console once the accounts exist, and
re-check the data answers against `docs/privacy.html` and the live schema first.
Character limits are noted next to each field; counts are for the English text.

---

## 1. Listing text

### Name — Apple 30 · Google 30
`Aloud: Speak & Know`

### Subtitle (Apple only) — 30
`Talk about it. Then prove it.`

### Short description (Google only) — 80
`Draw a topic, speak about it out loud, then answer 5 questions. Train your mind.`

### Promotional text (Apple only) — 170, can change without review
`One new topic every day. Speak about it for a minute, take the quiz, and watch your streak, points and knowledge map grow.`

### Keywords (Apple only) — 100, comma-separated, no spaces
`speaking,public speaking,quiz,trivia,knowledge,brain training,general knowledge,learn,daily,rhetoric`

### Description — Apple 4000 · Google 4000

```
Can you explain it — out loud, right now, without notes?

Aloud is a speaking-and-knowledge trainer. You draw a topic, get a short prep
time, then talk about it while the app listens. Afterwards five questions show
how much you actually know. Every round makes you a little quicker on your feet
and a little sharper in your head.

HOW A ROUND WORKS
• Draw a topic — from black holes to the history of money
• Prepare — a few seconds to gather your thoughts
• Speak — talk freely; your words are turned into text as you go
• Quiz — five questions on the topic
• Result — your score, the questions you missed, and why

WHAT KEEPS YOU COMING BACK
• A daily topic, the same for everyone, every day a new one
• Streaks that reward showing up
• Points and a global leaderboard
• Achievements for milestones
• A knowledge map that lights up as you cover new subjects

TOPICS ACROSS FIVE FIELDS
Mind & Behaviour · Universe & Physics · Earth & Life · History · Technology

PRIVATE BY DESIGN
Your voice is never recorded or uploaded by us — only the text of what you said
is saved to your account. No ads, no tracking. Delete your account in Settings
and your data is gone immediately.

ALOUD PRO
Play the daily topic for free. Aloud Pro unlocks every topic and unlimited
rounds. Subscriptions renew automatically unless cancelled at least 24 hours
before the end of the period; manage or cancel them in your store account
settings.

Terms of Use: https://kili196.github.io/BrainTrain/terms.html
Privacy Policy: https://kili196.github.io/BrainTrain/privacy.html
```

> Before pasting: check the topic count and the "five fields" against
> `supabase/content/topics-v1.md`, and that the legal URLs return 200 (RELEASE-TODO #4).

### Category
- **Apple:** primary `Education`, secondary `Trivia` (under Games) — or `Games` → `Trivia` primary if you want the leaderboard/streak side to lead.
- **Google:** `Education`. (Trivia lives under Games on Play and would put the app among games.)

### Screenshots
- Apple: 6.9" (1320×2868) is the required set; 6.5" optional since 2024. Check the current requirement on upload.
- Google: 2–8 phone screenshots, plus a 1024×500 feature graphic.
- Suggested five, in order: Home with today's topic → recording with the waveform →
  quiz question → result → leaderboard or knowledge map. One short caption each.

---

## 2. Google Play — Data safety form

**Collected** (sent off the device). "Shared" means to third parties *other than*
service providers acting for us — Supabase, RevenueCat and Sentry are service
providers, so **nothing is shared**.

| Category → type | Collected | Required? | Purpose |
|---|---|---|---|
| Personal info → Name | Yes | Required | App functionality, Account management |
| Personal info → Email address | Yes | Optional (only with email/Google/Apple sign-in) | Account management |
| Personal info → User IDs | Yes | Required | App functionality, Account management |
| Personal info → Other info (date of birth, country) | Yes | Required | App functionality |
| Financial info → Purchase history | Yes | Optional (only subscribers) | App functionality |
| App activity → App interactions (rounds, scores, topics) | Yes | Required | App functionality |
| App activity → Other user-generated content (speech transcripts) | Yes | Optional (needs mic permission) | App functionality |
| App info & performance → Crash logs | Yes | Required | Analytics *(Google's term for diagnostics)* |
| Audio → Voice or sound recordings | **No** | — | The OS speech recogniser handles audio; the app never receives or sends it |
| Location | **No** | — | Country is typed in, not located |
| Device or other IDs | **No** | — | Verify: Sentry runs with `sendDefaultPii: false` |

- Data encrypted in transit: **Yes** (HTTPS to Supabase, RevenueCat, Sentry).
- Users can request deletion: **Yes**.
- **Account deletion URL** (mandatory on Play): `https://kili196.github.io/BrainTrain/support.html#delete-account` — the page offers deletion by email for people without the app.

---

## 3. Apple — App Privacy labels

Tracking: **No** (no data used to track across other companies' apps/sites).

| Data type | Linked to user | Purpose |
|---|---|---|
| Contact Info → Name | Yes | App Functionality |
| Contact Info → Email Address | Yes | App Functionality |
| Identifiers → User ID | Yes | App Functionality |
| Purchases → Purchase History | Yes | App Functionality |
| User Content → Other User Content (transcripts) | Yes | App Functionality |
| Usage Data → Product Interaction (rounds, scores) | Yes | App Functionality |
| Diagnostics → Crash Data | No | App Functionality |
| Other Data → Other Data Types (date of birth, country) | Yes | App Functionality |

Not collected: Audio Data, Location, Health, Financial Info, Browsing/Search
History, Contacts, Sensitive Info.

> **Sentry is not yet in `docs/privacy.html`** (Kili's open item). Both forms above
> already declare crash data; the policy must say the same before submission, or
> review can flag the mismatch.

---

## 4. Age rating

- **Apple** (questionnaire since 2025, ratings 4+/9+/13+/16+/18+): no violence,
  no mature content, no gambling, no unrestricted web. The one "yes" is that
  **user-entered names are visible to others** on the leaderboard (no chat, no
  messaging). Expected result: low; the privacy policy's floor of 14 still applies.
- **Google (IARC):** same answers — "Users can interact": No chat; "Shares user
  info": display name and country on the leaderboard. "Digital purchases": Yes.

---

## 5. App Review notes (Apple) / App access (Google)

```
Aloud creates a guest account automatically on first launch, so no login is
needed to review the core flow: onboarding → Home → PLAY → prep → speak (allow
microphone and speech recognition) → quiz → result.

To test sign-in, use:
  Email:    <test account email>
  Password: <test account password>

Free accounts can play the daily topic once per day; the second round opens the
paywall. Account deletion: Settings → Delete account.
```

> Create that test account (email + password) before submission and keep it
> playable — don't delete it while a review is open.
