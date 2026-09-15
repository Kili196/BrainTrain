-- The leaderboard: every player who has finished at least one round, ordered by
-- the points they have collected.
--
-- This is the first time this app shows one user anything about another, and the
-- door is deliberately narrow. There is NO new row-level policy here.
-- `profiles` and `speech_sessions` stay exactly as locked as they were —
-- `auth.uid() = id` and `auth.uid() = user_id` — because opening either would
-- give away far more than a leaderboard needs: `profiles` carries `birth_date`,
-- and `speech_sessions` carries the player's transcripts.
--
-- So this function is the only way across, and it hands back four things: a
-- place, a name, a country code and a number. `security definer` is what lets it
-- read past the policies; the `returns table` clause is what stops it handing
-- over anything else. Same bargain `daily_topic()` makes — elevated rights
-- buying exactly one capability.
--
-- Note what is NOT returned: other players' user ids. The client only needs to
-- know which row is its own, so the function answers that question itself with
-- `auth.uid()` and returns a boolean. An id that is never sent cannot leak.
create or replace function public.leaderboard(top_n int default 50)
returns table (
  place        int,
  display_name text,
  country_code char(2),
  points       bigint,
  is_you       boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with totals as (
    -- A skipped quiz is null in the table and worth nothing here — exactly how
    -- the profile screen counts it. The two must agree: a leaderboard that
    -- contradicts the profile it sits one tab away from is a bug report waiting
    -- to be filed.
    select s.user_id as uid, sum(coalesce(s.quiz_score, 0))::bigint as total
    from public.speech_sessions s
    group by s.user_id
  ),
  ordered as (
    select
      -- row_number rather than rank: equal points get distinct places, so the
      -- podium always has exactly three steps instead of two firsts and no
      -- second. The tie-break is the older account, which is arbitrary but
      -- stable — and legible, because both rows show the same points.
      row_number() over (
        order by t.total desc, p.created_at asc, p.id asc
      )::int as pos,
      p.display_name as name,
      p.country_code as country,
      t.total,
      t.uid
    from totals t
    -- Inner join: the signup trigger gives every user a profile, so a player
    -- without one cannot exist. If that ever breaks, they drop off the board
    -- rather than appearing as a nameless row.
    join public.profiles p on p.id = t.uid
  )
  select
    o.pos,
    o.name,
    o.country,
    o.total,
    -- Coalesced, because a comparison against a null `auth.uid()` is null
    -- rather than false, and "is this row you" is a question with two answers.
    -- It cannot happen through the app — every screen runs behind a session —
    -- but a nullable boolean would make the client carry a third case forever
    -- to handle a state that never arrives.
    coalesce(o.uid = (select auth.uid()), false)
  from ordered o
  -- The caller's own row comes back wherever it sits, so a board they are
  -- nowhere near the top of still tells them where they are. One query instead
  -- of two, and the client does not have to ask a second question to find out
  -- it was not in the answer.
  --
  -- `top_n` is clamped rather than trusted: it arrives from the client, and an
  -- unbounded one would be a way to ask this function for every player in the
  -- database in a single call.
  where o.pos <= least(greatest(top_n, 1), 200)
     or o.uid = (select auth.uid())
  order by o.pos;
$$;

-- Definer functions are executable by everyone by default, so the grant is
-- narrowed deliberately rather than left implicit. No `anon`: every screen in
-- this app runs behind a session, and a signed-out caller has no own row to be
-- told about anyway.
--
-- `anon` has to be revoked by name. Revoking from `public` does not reach it:
-- Supabase grants execute to `anon` and `authenticated` explicitly through
-- default privileges, and an explicit grant outlives the revoke of the implicit
-- one. Checked against `pg_proc.proacl` rather than assumed — the first version
-- of this migration had exactly that hole, and it looked closed.
revoke execute on function public.leaderboard(int) from public;
revoke execute on function public.leaderboard(int) from anon;
grant execute on function public.leaderboard(int) to authenticated;
