-- Persist the main member professional profile in the existing owner-scoped
-- professional record. Browser storage is only a recoverable per-user cache.

alter table public.btv_professional_profiles
  add column if not exists preferred_name text,
  add column if not exists clinical_specialty text,
  add column if not exists experience_level text,
  add column if not exists target_arrival_month date,
  add column if not exists learning_preference text,
  add column if not exists priority_support text,
  add column if not exists career_goal text;

alter table public.btv_professional_profiles
  drop constraint if exists btv_professional_profiles_experience_level_check,
  add constraint btv_professional_profiles_experience_level_check check (
    experience_level is null or experience_level in (
      'Student or newly qualified', 'Under 2 years', '2–5 years',
      '6–10 years', 'More than 10 years'
    )
  ),
  drop constraint if exists btv_professional_profiles_learning_preference_check,
  add constraint btv_professional_profiles_learning_preference_check check (
    learning_preference is null or learning_preference in (
      'Short step-by-step guidance', 'Detailed explanations',
      'Videos and demonstrations', 'Practice questions'
    )
  ),
  drop constraint if exists btv_professional_profiles_priority_support_check,
  add constraint btv_professional_profiles_priority_support_check check (
    priority_support is null or priority_support in (
      'Registration and documents', 'Finding a job', 'Interview confidence',
      'Budgeting and relocation', 'Workplace culture'
    )
  ),
  drop constraint if exists btv_professional_profiles_preferred_name_length_check,
  add constraint btv_professional_profiles_preferred_name_length_check check (char_length(preferred_name) <= 80),
  drop constraint if exists btv_professional_profiles_specialty_length_check,
  add constraint btv_professional_profiles_specialty_length_check check (char_length(clinical_specialty) <= 120),
  drop constraint if exists btv_professional_profiles_goal_length_check,
  add constraint btv_professional_profiles_goal_length_check check (char_length(career_goal) <= 2000);

create or replace function public.btv_save_member_professional_profile(
  p_preferred_name text,
  p_clinical_specialty text,
  p_experience_level text,
  p_target_arrival_month text,
  p_learning_preference text,
  p_priority_support text,
  p_career_goal text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_arrival date;
  v_row public.btv_professional_profiles;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_target_arrival_month is not null and btrim(p_target_arrival_month) <> '' then
    if p_target_arrival_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid target arrival month'; end if;
    v_arrival := to_date(p_target_arrival_month || '-01', 'YYYY-MM-DD');
  end if;

  insert into public.btv_professional_profiles (
    user_id, preferred_name, clinical_specialty, experience_level,
    target_arrival_month, learning_preference, priority_support, career_goal, updated_at
  ) values (
    v_user, nullif(btrim(p_preferred_name), ''), nullif(btrim(p_clinical_specialty), ''),
    nullif(btrim(p_experience_level), ''), v_arrival,
    nullif(btrim(p_learning_preference), ''), nullif(btrim(p_priority_support), ''),
    nullif(btrim(p_career_goal), ''), now()
  )
  on conflict (user_id) do update set
    preferred_name = excluded.preferred_name,
    clinical_specialty = excluded.clinical_specialty,
    experience_level = excluded.experience_level,
    target_arrival_month = excluded.target_arrival_month,
    learning_preference = excluded.learning_preference,
    priority_support = excluded.priority_support,
    career_goal = excluded.career_goal,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'preferred_name', v_row.preferred_name,
    'clinical_specialty', v_row.clinical_specialty,
    'experience_level', v_row.experience_level,
    'target_arrival_month', v_row.target_arrival_month,
    'learning_preference', v_row.learning_preference,
    'priority_support', v_row.priority_support,
    'career_goal', v_row.career_goal,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.btv_save_member_professional_profile(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.btv_save_member_professional_profile(text,text,text,text,text,text,text) to authenticated;

comment on function public.btv_save_member_professional_profile(text,text,text,text,text,text,text)
  is 'Validates and persists the signed-in member professional profile using auth.uid().';
