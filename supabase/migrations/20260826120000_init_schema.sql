-- BrainTrain / Offhand — MVP schema
--
--   Content   (topics, quiz_questions)  -> read-only for clients
--   Identity  (profiles)                -> 1:1 with auth.users
--   Usage     (speech_sessions)         -> strictly private per user
--
-- Audio files stay on the device. Only metadata lives on the server.

-- Trigger handler: keeps updated_at current. Shared by both tables using it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table public.topics (
  id         uuid primary key default gen_random_uuid(),  -- internal key, foreign keys only
  slug       text not null unique,                        -- stable readable key the client uses
  category   text not null,                               -- 'physics', 'history', ...
  title      text not null,                               -- the topic = the speaking prompt
  status     text not null default 'draft'                -- publishing gate, RLS filters on it
               check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

create table public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid not null references public.topics(id) on delete cascade,  -- topic gone, questions gone
  question      text not null,
  options       jsonb not null,                -- ["Answer A", "Answer B", ...]
  correct_index smallint not null,             -- zero-based index into options
  explanation   text,                          -- shown after answering
  sort_order    smallint not null default 0,   -- explicit order; row order is otherwise arbitrary

  -- Catches the most common authoring mistake: an index pointing past the
  -- end of the options, which makes the question unanswerable in production.
  check (jsonb_typeof(options) = 'array'),
  check (jsonb_array_length(options) >= 2),
  check (correct_index >= 0 and correct_index < jsonb_array_length(options))
);

create index quiz_questions_topic_id_idx on public.quiz_questions (topic_id);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,  -- PK and FK in one
  display_name text,                                         -- null for anonymous users
  country_code char(2) check (country_code ~ '^[A-Z]{2}$'),   -- ISO 3166-1 alpha-2
  birth_date   date    check (birth_date >= '1900-01-01'),    -- date, not timestamptz
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Trigger handler: CHECK constraints must be immutable, current_date is not.
create or replace function public.validate_profile()
returns trigger
language plpgsql
as $$
begin
  if new.birth_date is not null and new.birth_date > current_date then
    raise exception 'birth_date must not be in the future';
  end if;
  return new;
end;
$$;

create trigger profiles_validate
  before insert or update on public.profiles
  for each row execute function public.validate_profile();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger handler: creates the profile in the same transaction as the signup,
-- so a crashing client can never leave a user without one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Usage
-- ---------------------------------------------------------------------------
create table public.speech_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,  -- carries all of RLS
  topic_id    uuid references public.topics(id) on delete set null,       -- keep history if topic dies
  topic_slug  text not null,                                              -- stays readable regardless
  started_at  timestamptz not null,                                       -- set by the device
  duration_ms integer not null check (duration_ms >= 0),
  quiz_score  smallint check (quiz_score between 0 and 100),              -- null = quiz skipped
  client_id   uuid not null                                               -- device UUID, makes upload idempotent
);

create unique index speech_sessions_user_client_idx
  on public.speech_sessions (user_id, client_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- `using` is the bouncer on the way in (which rows may I see or modify),
-- `with check` the one on the way out (which rows may I leave behind).
-- `(select auth.uid())` is evaluated once per query instead of once per row.
-- ---------------------------------------------------------------------------
alter table public.topics          enable row level security;
alter table public.quiz_questions  enable row level security;
alter table public.profiles        enable row level security;
alter table public.speech_sessions enable row level security;

-- Content is readable by everyone but only when published. Deliberately no
-- write policy: content is maintained through the service_role key, which
-- bypasses RLS.
create policy topics_read_published on public.topics
  for select to anon, authenticated
  using (status = 'published');

create policy quiz_questions_read_published on public.quiz_questions
  for select to anon, authenticated
  using (exists (
    select 1 from public.topics t
    where t.id = quiz_questions.topic_id and t.status = 'published'
  ));

-- Own profile only. No insert policy (the trigger handles it), no delete
-- policy (account deletion below does).
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy speech_sessions_all_own on public.speech_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Account deletion — not a trigger. Called from the app via
-- supabase.rpc('delete_own_account'). Required by App Store Guideline
-- 5.1.1(v) as soon as accounts exist.
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer      -- runs as the owner, so it may touch auth.users
set search_path = ''  -- prevents search_path shadowing
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;  -- profiles + sessions follow via cascade
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant   execute on function public.delete_own_account() to authenticated;
