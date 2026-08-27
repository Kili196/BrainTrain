-- random_topic() gains an optional category filter.
--
-- Adding a defaulted parameter does not replace the old function, it creates a
-- second one — and a no-argument call would then match both and fail as
-- ambiguous. So the zero-argument version is dropped first.
drop function if exists public.random_topic();

-- The parameter is `p_category`, not `category`: inside the body a parameter
-- named like a column makes `category = category` ambiguous, and Postgres
-- resolves that in favour of the column, so the filter would silently match
-- every row.
--
-- `p_category is null or …` keeps one function for both modes. Null means "any
-- category", which is exactly what the Random mode asks for.
create or replace function public.random_topic(p_category text default null)
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
  limit 1;
$$;

grant execute on function public.random_topic(text) to anon, authenticated;
