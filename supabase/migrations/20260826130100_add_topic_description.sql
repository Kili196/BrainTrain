-- The authored topic pool carries a second line per topic — the common
-- misconception or the surprising point, i.e. the reason the topic is in the
-- pool at all. The MVP schema had nowhere to put it, so this adds it.
--
-- Nullable on purpose: it is context for the speaker, not something every topic
-- must have, and requiring it would block adding a topic before the line exists.
alter table public.topics
  add column description text;

comment on column public.topics.description is
  'Short framing line shown with the topic — usually the misconception it corrects.';
