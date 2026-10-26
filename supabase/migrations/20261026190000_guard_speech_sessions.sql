-- Make the leaderboard hard to fake (release todo #8).
--
-- Points are sum(quiz_score) over a player's rounds, and `speech_sessions_all_own`
-- lets any signed-in player write their own rows straight through the public
-- API with the anon key from the app bundle. That opened two doors:
--
--   1. insert as many rounds with quiz_score = 100 as you like;
--   2. update the rounds you already have to quiz_score = 100.
--
-- This closes both without changing the app: a daily cap on new rows, and
-- rounds that cannot change once written. A server-computed score would be
-- stricter, but it is a far bigger change and not needed to stop the easy cheat.
--
-- Both triggers only act on players. `auth.uid()` is null for the service_role
-- key and for SQL run from the CLI, so content maintenance and corrections by
-- hand stay possible — the rules are for the API, not for us.

-- When the row actually reached the server. `started_at` cannot serve: the
-- device sets it, so a cap counted on it is beaten by sending yesterday's date.
-- Existing rounds take their started_at, the closest thing to the truth we have.
alter table public.speech_sessions
  add column created_at timestamptz;

update public.speech_sessions set created_at = started_at;

alter table public.speech_sessions
  alter column created_at set not null,
  alter column created_at set default now();

comment on column public.speech_sessions.created_at is
  'When the server received the round. Set by trigger; a client-sent value is ignored.';

-- Far above real play: a round is at least a minute of speaking plus a quiz,
-- and nobody plays thirty of them in a day. Low enough that one player cannot
-- climb the board in an afternoon of scripted inserts.
create or replace function public.speech_sessions_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  today_count int;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Overwritten, never trusted.
  new.created_at := now();

  -- Serialises one player's inserts, so two requests sent at once cannot both
  -- see 29 and both get in. Held until the transaction ends; other players are
  -- not blocked.
  perform pg_advisory_xact_lock(hashtext('speech_sessions:' || new.user_id::text));

  select count(*) into today_count
  from public.speech_sessions s
  where s.user_id = new.user_id
    and s.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';

  if today_count >= 30 then
    raise exception 'Daily round limit reached'
      using errcode = 'P0001', hint = 'At most 30 rounds per UTC day.';
  end if;

  return new;
end;
$$;

create trigger speech_sessions_before_insert
  before insert on public.speech_sessions
  for each row execute function public.speech_sessions_before_insert();

-- A saved round is final. The app never edits one: its only write is an upsert
-- that, on a retry, sends the very same values again — which this lets through,
-- because nothing changes. `topic_id` is deliberately not on the list: its
-- foreign key is `on delete set null`, and that cascade is an update too.
-- `transcript` is not on it either; it carries no points.
create or replace function public.speech_sessions_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.user_id           is distinct from old.user_id
  or new.topic_slug        is distinct from old.topic_slug
  or new.started_at        is distinct from old.started_at
  or new.duration_ms       is distinct from old.duration_ms
  or new.quiz_score        is distinct from old.quiz_score
  or new.client_session_id is distinct from old.client_session_id
  or new.created_at        is distinct from old.created_at then
    raise exception 'A saved round cannot be changed'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger speech_sessions_before_update
  before update on public.speech_sessions
  for each row execute function public.speech_sessions_before_update();
