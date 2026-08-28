-- random_topic() -> random_topics(): same draw, but any number of rows.
--
-- The home screen needs a handful of titles at once for the constellation
-- behind the stage. Loading the whole pool to show six of them is exactly what
-- keeping the draw in the database avoids, so the count becomes a parameter.
--
-- Renamed to the plural because it now returns a set by intent rather than by
-- accident. The old name is dropped: a defaulted parameter added to an existing
-- function creates an overload instead of replacing it, and the calls would
-- then be ambiguous.
drop function if exists public.random_topic(text);

-- Parameters keep the `p_` prefix so they cannot collide with column names —
-- inside the body a parameter named `category` would resolve to the column and
-- the filter would match every row without failing.
--
-- `least(p_count, 50)` is a guard, not a feature: the argument arrives from the
-- client, and nothing else stops it from asking for the entire table.
create or replace function public.random_topics(
  p_category text default null,
  p_count integer default 1
)
returns setof public.topics
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.topics
  where p_category is null or category = p_category
  order by random()
  limit least(greatest(p_count, 1), 50);
$$;

grant execute on function public.random_topics(text, integer) to anon, authenticated;
