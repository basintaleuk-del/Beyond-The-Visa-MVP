-- Additive, owner-scoped hiring-readiness snapshots for the homepage tile.
-- Scores are advisory and are recalculated from evidence already saved by the member.

create table if not exists public.btv_hiring_score_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  market_code text not null default 'GB' check (market_code = 'GB'),
  profession_code text not null default 'nurse' check (profession_code = 'nurse'),
  score smallint not null check (score between 0 and 100),
  benchmark_percentile smallint not null check (benchmark_percentile between 1 and 99),
  breakdown jsonb not null default '{}'::jsonb check (jsonb_typeof(breakdown) = 'object'),
  recommendations jsonb not null default '[]'::jsonb check (jsonb_typeof(recommendations) = 'array'),
  computed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.btv_hiring_score_snapshots enable row level security;

drop policy if exists btv_hiring_score_owner_read on public.btv_hiring_score_snapshots;
create policy btv_hiring_score_owner_read
  on public.btv_hiring_score_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.btv_hiring_score_snapshots from public, anon;
grant select on table public.btv_hiring_score_snapshots to authenticated;

create or replace function public.btv_refresh_hiring_score()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_has_profile boolean := false;
  v_has_qualification boolean := false;
  v_has_english boolean := false;
  v_has_practice boolean := false;
  v_has_registration boolean := false;
  v_has_cbt boolean := false;
  v_has_references boolean := false;
  v_has_documents boolean := false;
  v_score smallint := 0;
  v_percentile smallint := 1;
  v_recommendations jsonb := '[]'::jsonb;
  v_breakdown jsonb;
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user
      and nullif(btrim(p.full_name), '') is not null
      and nullif(btrim(p.profession), '') is not null
      and coalesce(nullif(btrim(p.destination_country), ''), nullif(btrim(p.destination), '')) = 'uk'
  ) into v_has_profile;

  select
    coalesce(nullif(btrim(pp.qualification_title), '') is not null
      and nullif(btrim(pp.institution), '') is not null
      and pp.graduation_year is not null, false),
    coalesce(nullif(btrim(pp.english_test_type), '') is not null
      and nullif(btrim(pp.english_overall_result), '') is not null, false),
    coalesce(nullif(btrim(pp.qualification_evidence_path), '') is not null
      or nullif(btrim(pp.english_evidence_path), '') is not null, false)
  into v_has_qualification, v_has_english, v_has_documents
  from public.btv_professional_profiles pp
  where pp.user_id = v_user;

  v_has_qualification := coalesce(v_has_qualification, false);
  v_has_english := coalesce(v_has_english, false);
  v_has_documents := coalesce(v_has_documents, false);

  select exists (
    select 1 from public.btv_professional_practice_history ph
    where ph.user_id = v_user and nullif(btrim(ph.employer), '') is not null
  ) into v_has_practice;

  select exists (
    select 1 from public.btv_professional_registrations pr
    where pr.user_id = v_user and pr.status in ('Active', 'Pending')
  ) into v_has_registration;

  select exists (
    select 1
    from public.btv_professional_assessments pa
    where pa.user_id = v_user
      and pa.status = 'Passed'
      and (
        lower(pa.assessment_name) like '%cbt%'
        or lower(coalesce(pa.assessment_other_name, '')) like '%cbt%'
      )
  ) or exists (
    select 1
    from public.btv_user_journey_progress jp
    where jp.user_id = v_user
      and jp.completed
      and lower(jp.step_code) like '%cbt%'
  ) into v_has_cbt;

  select exists (
    select 1
    from public.btv_professional_practice_history ph
    where ph.user_id = v_user
      and nullif(btrim(ph.evidence_document_path), '') is not null
  ) into v_has_references;

  v_has_documents := v_has_documents or exists (
    select 1 from public.btv_professional_registrations pr
    where pr.user_id = v_user and nullif(btrim(pr.evidence_document_path), '') is not null
  ) or exists (
    select 1 from public.btv_professional_assessments pa
    where pa.user_id = v_user and nullif(btrim(pa.evidence_document_path), '') is not null
  );

  -- A complete evidence-backed profile totals 100. The final 17 points map to
  -- the three improvements displayed in the product brief (CBT, references, documents).
  v_score := (case when v_has_profile then 18 else 0 end)
    + (case when v_has_qualification then 20 else 0 end)
    + (case when v_has_practice then 15 else 0 end)
    + (case when v_has_registration then 15 else 0 end)
    + (case when v_has_english then 15 else 0 end)
    + (case when v_has_cbt then 7 else 0 end)
    + (case when v_has_references then 5 else 0 end)
    + (case when v_has_documents then 5 else 0 end);

  v_percentile := case
    when v_score >= 95 then 94
    when v_score >= 90 then 88
    when v_score >= 85 then 79
    when v_score >= 80 then 72
    when v_score >= 70 then 61
    when v_score >= 60 then 49
    when v_score >= 50 then 38
    when v_score >= 35 then 24
    else 10
  end;

  if not v_has_cbt then
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'code', 'complete_cbt', 'label', 'Complete CBT', 'route', 'cbt'
    ));
  end if;
  if not v_has_references then
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'code', 'add_references', 'label', 'Add references', 'route', 'qualifications-registration'
    ));
  end if;
  if not v_has_documents then
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'code', 'verify_documents', 'label', 'Verify documents', 'route', 'documents'
    ));
  end if;
  if jsonb_array_length(v_recommendations) = 0 then
    v_recommendations := jsonb_build_array(jsonb_build_object(
      'code', 'keep_current', 'label', 'Keep your profile current', 'route', 'qualifications-registration'
    ));
  end if;

  v_breakdown := jsonb_build_object(
    'profile', v_has_profile,
    'qualification', v_has_qualification,
    'practice', v_has_practice,
    'registration', v_has_registration,
    'english', v_has_english,
    'cbt', v_has_cbt,
    'references', v_has_references,
    'documents', v_has_documents
  );

  insert into public.btv_hiring_score_snapshots (
    user_id, score, benchmark_percentile, breakdown, recommendations, computed_at, updated_at
  ) values (
    v_user, v_score, v_percentile, v_breakdown, v_recommendations, now(), now()
  )
  on conflict (user_id) do update set
    score = excluded.score,
    benchmark_percentile = excluded.benchmark_percentile,
    breakdown = excluded.breakdown,
    recommendations = excluded.recommendations,
    computed_at = excluded.computed_at,
    updated_at = now();

  select jsonb_build_object(
    'score', hs.score,
    'percentile', hs.benchmark_percentile,
    'stars', greatest(1, least(5, ceil(hs.score / 20.0)::integer)),
    'recommendations', hs.recommendations,
    'breakdown', hs.breakdown,
    'computed_at', hs.computed_at,
    'benchmark_label', 'UK nurse applicant benchmark'
  ) into v_result
  from public.btv_hiring_score_snapshots hs
  where hs.user_id = v_user;

  return v_result;
end;
$$;

revoke all on function public.btv_refresh_hiring_score() from public, anon;
grant execute on function public.btv_refresh_hiring_score() to authenticated;
