-- APPLIED, SUPERSEDED. Do not edit and do not reuse this version number.
--
-- These were placeholder topics, written before the real pool existed. They are
-- already applied to the hosted project, so the file has to stay: the CLI tracks
-- migrations by version, and deleting it would leave the remote history pointing
-- at a file that no longer exists.
--
-- The rows inserted here are removed again by 20260826130000_drop_placeholder_topics.sql,
-- and the real pool arrives in 20260826130200_seed_topics_v1.sql.

insert into public.topics (slug, category, title, status) values
  ('why-glaciers-look-blue',      'physics',   'Why glaciers look blue',                       'published'),
  ('how-vaccines-train-immunity', 'biology',   'How a vaccine trains the immune system',       'published'),
  ('what-caused-the-cold-war',    'history',   'What actually started the Cold War',           'published'),
  ('why-inflation-happens',       'economics', 'Why inflation happens',                        'published'),
  ('how-gps-knows-where-you-are', 'technology','How GPS knows where you are',                  'published'),
  ('why-we-dream',                'psychology','Why we dream',                                 'published')
on conflict (slug) do nothing;

insert into public.quiz_questions (topic_id, question, options, correct_index, explanation, sort_order)
select t.id, q.question, q.options, q.correct_index, q.explanation, q.sort_order
from public.topics t
join (values
  (
    'Why does thick glacier ice appear blue?',
    '["It reflects the sky","It absorbs red light more than blue","It contains blue minerals","It scatters light off air bubbles"]'::jsonb,
    1::smallint,
    'Ice absorbs longer (red) wavelengths as light travels through it, so the light that escapes is blue-shifted. Reflecting the sky would make it blue on overcast days too, which it is not.',
    0::smallint
  ),
  (
    'Why does fresh snow look white rather than blue?',
    '["It is a different kind of ice","Light travels too short a distance through it","It is colder","Air bubbles absorb blue light"]'::jsonb,
    1::smallint,
    'The blue tint needs a long optical path. In snow, light scatters off grain surfaces and leaves again almost immediately, so nothing is selectively absorbed.',
    1::smallint
  )
) as q(question, options, correct_index, explanation, sort_order) on true
where t.slug = 'why-glaciers-look-blue'
  and not exists (
    select 1 from public.quiz_questions existing where existing.topic_id = t.id
  );
