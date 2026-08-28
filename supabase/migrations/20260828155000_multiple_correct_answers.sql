-- A question can have more than one correct answer.
--
-- `correct_index` (exactly one) becomes `correct_indexes` (at least one). A
-- question with a single answer is simply an array of length one, so the two
-- cases share one shape and nothing has to decide globally which kind of quiz
-- this is.
--
-- The player is never told how many answers are correct and every question is
-- answered with checkboxes, so a single-answer question must not be
-- distinguishable from the outside. Scoring is all-or-nothing: the exact set,
-- or no point.
--
-- This drops and re-adds rather than migrating values: `quiz_questions` is
-- empty (verified 2026-08-28), and there is no client code that names the old
-- column — `lib/topics.ts` passes the row through untouched.
--
-- A real smallint[] rather than jsonb, because CHECK constraints cannot contain
-- subqueries: over an array the bounds are plain expressions using ALL, while
-- over jsonb they would need jsonb_array_elements and therefore an immutable
-- helper function. It also generates as `number[]` instead of `Json`, so the
-- client needs no narrowing for it the way `options` does.

alter table public.quiz_questions
  -- The CHECK that referenced correct_index goes with it automatically.
  drop column correct_index,
  add column correct_indexes smallint[] not null;

comment on column public.quiz_questions.correct_indexes is
  'Zero-based indexes into options. At least one; a single-answer question is an array of one.';

alter table public.quiz_questions
  -- ALL over an empty array is true, so every bound below would pass for a
  -- question with no answer at all. This is what stops that.
  add constraint quiz_questions_answers_not_empty
    check (cardinality(correct_indexes) >= 1),

  -- A NULL element makes both comparisons below evaluate to NULL, and a CHECK
  -- passes on NULL. Without this, [null] would be accepted.
  add constraint quiz_questions_answers_not_null
    check (array_position(correct_indexes, null) is null),

  add constraint quiz_questions_answers_in_range
    check (
      0 <= all(correct_indexes)
      and jsonb_array_length(options) > all(correct_indexes)
    );

-- Not enforced here: duplicate indexes ([1,1]). Detecting them needs a
-- subquery, which a CHECK cannot have, and a duplicate is harmless at read time
-- — it selects the same option twice. The importer rejects them instead.
