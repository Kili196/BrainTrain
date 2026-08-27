-- random_topic(): one random published topic, picked in the database.
--
-- The alternative would be to pull every topic and roll the dice in JS, which
-- ships 125 rows to select one of them. PostgREST cannot express "order by
-- random()" through the query API, so a function is the way to keep the pick on
-- the server.
--
-- `security invoker` matters here: the function runs with the caller's rights,
-- so the RLS policy on topics still applies and drafts stay invisible. A
-- `security definer` function would bypass RLS and quietly leak unpublished
-- rows.
--
-- `stable` (not `immutable`) because random() gives a different answer per call.
-- `set search_path` pins schema resolution so the body cannot be hijacked by a
-- caller's search_path.
--
-- This is NOT the daily topic — that one is global, recorded, and never repeats.
-- This is the "give me something to talk about" draw.
create or replace function public.random_topic()
returns setof public.topics
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.topics
  order by random()
  limit 1;
$$;

-- Callable from the app with the publishable key. Explicit, so the grant does
-- not depend on Postgres' default of executable-by-public.
grant execute on function public.random_topic() to anon, authenticated;
