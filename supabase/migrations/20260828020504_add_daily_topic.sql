-- The daily topic: the same one for everybody, drawn at random, and never
-- repeated.
--
-- "Never repeated" is what forces a table. A stateless pick cannot promise it:
-- a random draw repeats by definition, and a hash of the date repeats as soon
-- as the pool changes size. The only way to guarantee it is to write down what
-- was already used — which is what `topic_id unique` does here.
create table public.daily_topics (
  -- The UTC day this topic belongs to. Primary key, so a day can never have two.
  day        date primary key,
  -- Unique across the whole table: a topic can be the daily topic at most once,
  -- ever. `restrict` rather than cascade — deleting a topic must not silently
  -- erase the day it was used and free it up again.
  topic_id   uuid not null unique references public.topics(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.daily_topics enable row level security;

-- Readable by everyone: the history of daily topics is not private, and being
-- able to look at it makes the feature debuggable. There is deliberately no
-- insert or update policy — the only way a row appears is through the function
-- below, so no client can claim a day for a topic of its choosing.
create policy daily_topics_read on public.daily_topics
  for select to anon, authenticated
  using (true);

-- Returns today's topic, choosing one on the first call of the day.
--
-- `security definer` is required: clients have no insert policy on
-- daily_topics, and must not have one. The function is the only writer, and it
-- can only ever insert a published topic for the current day, so the elevated
-- rights buy exactly one capability and no more.
--
-- The race — two devices opening the app in the same second on a new day — is
-- settled by the primary key: both compute a candidate, both insert, one wins
-- and the other is discarded by `on conflict do nothing`. Whichever loses then
-- reads the winner's row, so both see the same topic. No locking needed.
--
-- When every published topic has already had its day, the insert selects
-- nothing, no row exists for today, and the function returns an empty set. That
-- is the "pool exhausted" signal — the caller renders it, rather than getting a
-- repeat.
create or replace function public.daily_topic()
returns setof public.topics
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Explicitly UTC rather than `current_date`, which follows the session's time
  -- zone. Everybody has to be on the same day for "the same topic for everyone"
  -- to hold.
  today date := (now() at time zone 'utc')::date;
begin
  insert into public.daily_topics (day, topic_id)
  select today, t.id
  from public.topics t
  where t.status = 'published'
    and not exists (
      select 1 from public.daily_topics d where d.topic_id = t.id
    )
  order by random()
  limit 1
  on conflict (day) do nothing;

  return query
  select t.*
  from public.topics t
  join public.daily_topics d on d.topic_id = t.id
  where d.day = today;
end;
$$;

-- Definer functions are executable by everyone by default, so the grant is
-- narrowed deliberately rather than left implicit.
revoke execute on function public.daily_topic() from public;
grant execute on function public.daily_topic() to anon, authenticated;
