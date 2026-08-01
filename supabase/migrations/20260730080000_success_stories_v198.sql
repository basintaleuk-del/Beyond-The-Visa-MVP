-- Premium member success-story publishing with protected editorial moderation.
-- Additive to the existing btv_success_stories table; no unrelated platform schema is changed.

alter table public.btv_success_stories enable row level security;

grant select, insert, update on table public.btv_success_stories to authenticated;

drop policy if exists stories_submit on public.btv_success_stories;
create policy stories_submit
on public.btv_success_stories
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'review'
  and featured = false
  and approved_by is null
  and approved_at is null
);

create or replace function public.btv_submit_success_story(
  p_title text,
  p_member_name text,
  p_profession text,
  p_origin_country text,
  p_destination_country text,
  p_quote text,
  p_story text,
  p_timeline jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_timeline jsonb := coalesce(p_timeline, '[]'::jsonb);
begin
  if v_user is null then
    raise exception 'You must be signed in to submit a success story.';
  end if;

  if length(trim(coalesce(p_title, ''))) < 8 or length(trim(p_title)) > 140 then
    raise exception 'The story headline must be between 8 and 140 characters.';
  end if;
  if length(trim(coalesce(p_member_name, ''))) < 2 or length(trim(p_member_name)) > 100 then
    raise exception 'Please provide your name.';
  end if;
  if length(trim(coalesce(p_story, ''))) < 120 or length(trim(p_story)) > 6000 then
    raise exception 'The story must be between 120 and 6,000 characters.';
  end if;
  if length(trim(coalesce(p_profession, ''))) < 2 or length(trim(p_profession)) > 100 then
    raise exception 'Please provide your profession.';
  end if;
  if length(trim(coalesce(p_origin_country, ''))) < 2 or length(trim(p_origin_country)) > 80
     or length(trim(coalesce(p_destination_country, ''))) < 2 or length(trim(p_destination_country)) > 80 then
    raise exception 'Please provide both countries in your journey.';
  end if;
  if p_quote is not null and length(trim(p_quote)) > 280 then
    raise exception 'The pull quote must be 280 characters or fewer.';
  end if;
  if jsonb_typeof(v_timeline) <> 'array' or jsonb_array_length(v_timeline) > 6 then
    raise exception 'A story can contain up to six milestones.';
  end if;

  insert into public.btv_success_stories (
    title, member_name, profession, origin_country, destination_country,
    quote, story, timeline, status, featured, submitted_by,
    approved_by, approved_at
  ) values (
    trim(p_title), trim(p_member_name), trim(p_profession), trim(p_origin_country),
    trim(p_destination_country), nullif(trim(coalesce(p_quote, '')), ''), trim(p_story),
    v_timeline, 'review', false, v_user, null, null
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.btv_submit_success_story(text,text,text,text,text,text,text,jsonb) from public;
revoke all on function public.btv_submit_success_story(text,text,text,text,text,text,text,jsonb) from anon;
grant execute on function public.btv_submit_success_story(text,text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.btv_admin_review_success_story(
  p_story_id uuid,
  p_status text,
  p_featured boolean,
  p_title text,
  p_member_name text,
  p_profession text,
  p_origin_country text,
  p_destination_country text,
  p_quote text,
  p_story text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null or not public.btv_is_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if p_status not in ('draft', 'review', 'approved', 'rejected') then
    raise exception 'Unsupported publication state.';
  end if;
  if length(trim(coalesce(p_title, ''))) < 8 or length(trim(p_title)) > 140 then
    raise exception 'The story headline must be between 8 and 140 characters.';
  end if;
  if length(trim(coalesce(p_member_name, ''))) < 2 or length(trim(p_member_name)) > 100 then
    raise exception 'The contributor name is required.';
  end if;
  if length(trim(coalesce(p_story, ''))) < 120 or length(trim(p_story)) > 6000 then
    raise exception 'The story must be between 120 and 6,000 characters.';
  end if;

  update public.btv_success_stories
  set title = trim(p_title),
      member_name = trim(p_member_name),
      profession = nullif(trim(coalesce(p_profession, '')), ''),
      origin_country = nullif(trim(coalesce(p_origin_country, '')), ''),
      destination_country = nullif(trim(coalesce(p_destination_country, '')), ''),
      quote = nullif(trim(coalesce(p_quote, '')), ''),
      story = trim(p_story),
      status = p_status,
      featured = coalesce(p_featured, false),
      approved_by = case when p_status = 'approved' then v_admin else null end,
      approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else null end
  where id = p_story_id;

  if not found then
    raise exception 'Success story not found.';
  end if;
  return p_story_id;
end;
$$;

revoke all on function public.btv_admin_review_success_story(uuid,text,boolean,text,text,text,text,text,text,text) from public;
revoke all on function public.btv_admin_review_success_story(uuid,text,boolean,text,text,text,text,text,text,text) from anon;
grant execute on function public.btv_admin_review_success_story(uuid,text,boolean,text,text,text,text,text,text,text) to authenticated;
