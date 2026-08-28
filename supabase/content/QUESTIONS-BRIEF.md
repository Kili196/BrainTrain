# Quiz questions — authoring brief

Hand this file to whatever writes the questions, together with
`supabase/content/topics-v1.md` (the topic pool it must write against).

---

## 1. What the questions are for

BrainTrain is a speaking trainer. The player is given a topic, prepares, speaks
freely about it for a set time, and only then answers questions about it.

So the questions are **not a trivia round**. They check whether the speaker
actually understood the point of the topic — and every topic in the pool exists
because of one specific point, written after the em dash in `topics-v1.md`:

```
2. **The Monty Hall problem** — Switching doubles your odds. Almost nobody believes it.
```

That second half is the topic's reason to exist. The questions have to hinge on
it. A question that could be answered by someone who has never thought about the
topic, from general knowledge alone, is a wasted question.

---

## 2. How the player answers

Three rules that decide how the questions have to be written:

1. **Every question is answered with checkboxes**, never radio buttons. The
   player ticks what they think is right and confirms.
2. **The player is never told how many answers are correct.** Not in the
   question, not in the interface. Saying "pick two" turns the question into an
   elimination puzzle that can be solved without understanding anything.
3. **Scoring is all-or-nothing.** The exact set of correct answers, or no point.
   There is no partial credit and no penalty maths.

Rule 1 means a question with one correct answer looks exactly like a question
with three. Rule 3 means a question where four of four options are correct is
not clever, it is cruel — see the limits in §4.

---

## 3. The schema the answers land in

Table `public.quiz_questions`:

| Column | Type | Rule |
|---|---|---|
| `topic_id` | uuid | Set by the importer from the topic title. Not authored. |
| `question` | text | The question itself. Required. |
| `options` | jsonb | An array of answer strings. |
| `correct_indexes` | smallint[] | **Zero-based** indexes into `options`. At least one. |
| `explanation` | text | Shown after answering. Nullable in the database, required here. |
| `sort_order` | smallint | Taken from array position. Not authored. |

The database rejects the whole insert if any of these fails:

```sql
check (jsonb_typeof(options) = 'array')
check (jsonb_array_length(options) >= 2)
check (cardinality(correct_indexes) >= 1)
check (array_position(correct_indexes, null) is null)
check (0 <= all(correct_indexes)
       and jsonb_array_length(options) > all(correct_indexes))
```

Duplicate indexes (`[1, 1]`) are not caught by the database — a CHECK cannot
contain a subquery — but the importer rejects them.

The client narrows `options` to `string[]` on read and throws on anything else,
so every option must be a plain string: no nested objects, no nulls, no numbers.

---

## 4. Output format

JSON, one array, nothing around it. The topic is identified by its **title,
copied exactly** as it appears in `topics-v1.md` — the importer derives the slug
itself, so do not invent slugs.

```json
[
  {
    "topic": "The Monty Hall problem",
    "questions": [
      {
        "question": "You picked door 1. The host opens door 3, showing a goat. What is true?",
        "options": [
          "Switching wins two times out of three",
          "Both doors are now equally likely",
          "The host's choice told you something about door 2",
          "Your odds improved to 1 in 2 by staying"
        ],
        "correctIndexes": [0, 2],
        "explanation": "Your first pick was right one in three times, and opening a goat door does not change that — so the remaining door carries the other two thirds. The doors only look equal because the host's knowledge is easy to forget: he was always able to open a goat door, so doing so is not new information about your own door."
      }
    ]
  }
]
```

Field rules:

- `topic` — exact title from `topics-v1.md`. A title that does not match an
  existing topic is an error, not a new topic.
- `questions` — exactly **5** per topic. The player answers five per round.
- `options` — exactly **4** strings. Order matters: it is the order shown.
- `correctIndexes` — an array of **1 to 3** distinct values from 0–3.
  Never all four.
- `explanation` — required, even though the column allows null.

---

## 5. Writing rules

**Across the five questions of a topic**

- Do not attack the point from the same angle five times. A reasonable spread:
  what the point actually is, why the obvious intuition fails, a consequence of
  it, a case where it does *not* apply, and one that requires applying it to a
  new situation.
- **Vary how many answers are correct.** Roughly two or three of the five should
  have a single correct answer and the rest two or three. If every question has
  one answer, the checkboxes are a lie; if every question has three, the player
  learns to tick almost everything.
- **Vary which positions are correct.** Do not leave the answers clustered on
  the same slots across the five.

**The question**

- Under ~90 characters. It is set at 20px/800 on a phone; longer than that takes
  three lines and stops reading as a question.
- Phrase multi-answer questions neutrally — "What is true?", "Which of these
  hold?" — and single-answer ones the same way. **The wording must never betray
  how many answers there are.** No "Which one…", no "Select both…".
- No "All of the above", no "None of the above", no double negatives.
- Do not ask for numbers nobody would remember from a spoken explanation (exact
  dates, exact figures), unless the number *is* the point of the topic.

**The options**

- Exactly 4, each under ~60 characters — they are cards with a checkbox, not
  paragraphs.
- **The popular misconception must always be one of the wrong options.** Most
  topics in this pool exist because the intuitive answer is wrong; if the
  intuitive answer is not on the list, the question tests nothing.
- Every wrong option must be plausible to someone who half-knows the topic.
  Obvious filler ("It is magic") wastes an option, and under all-or-nothing
  scoring it also makes the whole question free.
- **Correct and incorrect options must be indistinguishable by shape.** No
  pattern where the true ones are longer, more hedged, or more technical — that
  is the tell that lets people score without knowing anything, and with multiple
  answers a shape tell gives away the entire set at once.
- Each option must stand or fall on its own. Do not write options that only make
  sense together, or that contradict each other so that ticking both is
  obviously wrong.

**The explanation**

- Two to three sentences. Say why the correct answers are correct, and — this is
  the sentence that teaches — why the most tempting wrong one is wrong.
- With several correct answers, make clear what they have in common, so the
  player learns the rule and not five separate facts.
- Address the reader plainly. No "Great job!", no "As we learned".

**Language**

- English throughout, matching the topic pool. British or American spelling is
  fine as long as one file is consistent.

---

## 6. Not built yet

There is no importer. Topics go through `supabase/content/gen-topics.js` into a
seed migration (`npm run db:seed`), and questions will need the same: a generator
that reads this JSON, resolves each title to a slug the way `slugify()` does,
rejects duplicate indexes, and writes an idempotent
`insert … on conflict do nothing`.

Until that exists, this file describes the target and nothing consumes it. As
with topics: once the generator is there, edit the source file and regenerate —
never hand-patch the generated SQL.
