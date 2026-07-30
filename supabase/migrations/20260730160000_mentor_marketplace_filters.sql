-- Approved-only, server-backed mentor marketplace discovery.
create or replace function public.btv_list_approved_mentors(
  p_category text default 'all',
  p_search text default null
)
returns table(
  id uuid,
  biography text,
  experience_years integer,
  specialty text,
  languages text[],
  areas_of_support text[],
  coin_price integer,
  rating numeric,
  review_count integer
)
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_category text := lower(trim(coalesce(p_category, 'all')));
  v_search text := lower(left(trim(coalesce(p_search, '')), 120));
begin
  if v_category not in ('all', 'registration', 'exam', 'career') then
    raise exception 'Unsupported mentor category';
  end if;

  return query
  select m.id, m.biography, m.experience_years, m.specialty, m.languages,
         m.areas_of_support, m.coin_price, m.rating, m.review_count
  from public.btv_mentors m
  cross join lateral (
    select lower(concat_ws(' ', m.specialty, m.biography,
      array_to_string(m.languages, ' '), array_to_string(m.areas_of_support, ' '))) as searchable
  ) s
  where m.status = 'approved'
    and (v_search = '' or s.searchable like '%' || v_search || '%')
    and (
      v_category = 'all'
      or (v_category = 'registration' and s.searchable ~ '(registration|pathway|visa|relocation|licensure)')
      or (v_category = 'exam' and s.searchable ~ '(exam|cbt|nclex|osce|ielts)')
      or (v_category = 'career' and s.searchable ~ '(career|interview|application|employment|job)')
    )
  order by m.rating desc, m.review_count desc, m.created_at asc
  limit 100;
end;
$$;

revoke all on function public.btv_list_approved_mentors(text,text) from public;
grant execute on function public.btv_list_approved_mentors(text,text) to authenticated;
