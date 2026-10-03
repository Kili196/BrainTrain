-- How many different players have started a round today (UTC) — the
-- "148 people started today" line under the paywall's button, as a real
-- number instead of an invented one (Fabian, 2026-09-30: invented social proof
-- is unlawful in the EU, so the line only exists if the database can back it).
--
-- Same door as `leaderboard()`: `speech_sessions` stays locked to its owner,
-- and this definer function hands back exactly one integer. No ids, no
-- transcripts, no per-user anything — a count cannot leak who is behind it.
--
-- UTC, like `daily_topic()`: one global day, so the number means the same
-- thing on every phone.
create or replace function public.players_today()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(distinct s.user_id)::int
  from public.speech_sessions s
  where s.started_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

-- Narrowed as in the leaderboard migration: `anon` has to be revoked by name,
-- because revoking from `public` does not reach Supabase's explicit grant.
revoke execute on function public.players_today() from public;
revoke execute on function public.players_today() from anon;
grant execute on function public.players_today() to authenticated;
