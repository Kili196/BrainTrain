-- Removes the placeholder topics from 20260826120100 now that the real pool
-- exists. Deleting by explicit slug rather than truncating: the table may
-- already hold rows added by hand in the dashboard, and those must survive.
--
-- The two placeholder quiz questions go with them via
-- quiz_questions.topic_id -> on delete cascade.
delete from public.topics
where slug in (
  'why-glaciers-look-blue',
  'how-vaccines-train-immunity',
  'what-caused-the-cold-war',
  'why-inflation-happens',
  'how-gps-knows-where-you-are',
  'why-we-dream'
);
