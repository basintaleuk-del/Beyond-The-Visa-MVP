-- Align the practice banks with the current NMC ToC and 2026 NCLEX-RN blueprints.
-- Machine-generated variants remain unpublished until a qualified reviewer approves them.

alter table public.cbt_questions
  add column if not exists standard_version text,
  add column if not exists blueprint_domain text,
  add column if not exists quality_status text not null default 'needs_clinical_review',
  add column if not exists reviewed_at timestamptz;

alter table public.nclex_questions
  add column if not exists standard_version text,
  add column if not exists blueprint_domain text,
  add column if not exists quality_status text not null default 'needs_clinical_review',
  add column if not exists reviewed_at timestamptz;

update public.cbt_questions
set standard_version = 'NMC Test of Competence blueprint (current 2026)',
    blueprint_domain = case subject
      when 'Infection Prevention' then 'Professional values'
      when 'Professional Values' then 'Professional values'
      when 'Documentation' then 'Communication and interpersonal skills'
      when 'Prioritisation' then 'Leadership, management and team working'
      else 'Nursing practice and decision making'
    end,
    quality_status = case when is_active then 'approved' else 'needs_clinical_review' end,
    review_status = case when is_active then 'approved' else 'pending' end,
    reviewed_at = case when is_active then coalesce(updated_at, created_at, now()) else null end;

update public.nclex_questions
set category = case category
      when 'Safety and Infection Control' then 'Safety and Infection Prevention and Control'
      when 'Pharmacological Therapies' then 'Pharmacological and Parenteral Therapies'
      when 'Fundamentals of Care' then 'Basic Care and Comfort'
      when 'Maternal-Newborn Nursing' then 'Health Promotion and Maintenance'
      when 'Paediatric Nursing' then 'Health Promotion and Maintenance'
      when 'Medical-Surgical Nursing' then 'Physiological Adaptation'
      when 'Prioritisation' then 'Reduction of Risk Potential'
      else category
    end,
    client_need = case category
      when 'Safety and Infection Control' then 'Safety and Infection Prevention and Control'
      when 'Pharmacological Therapies' then 'Pharmacological and Parenteral Therapies'
      when 'Fundamentals of Care' then 'Basic Care and Comfort'
      when 'Maternal-Newborn Nursing' then 'Health Promotion and Maintenance'
      when 'Paediatric Nursing' then 'Health Promotion and Maintenance'
      when 'Medical-Surgical Nursing' then 'Physiological Adaptation'
      when 'Prioritisation' then 'Reduction of Risk Potential'
      else category
    end,
    standard_version = 'NCSBN 2026 NCLEX-RN Test Plan',
    blueprint_domain = case category
      when 'Safety and Infection Control' then 'Safety and Infection Prevention and Control'
      when 'Pharmacological Therapies' then 'Pharmacological and Parenteral Therapies'
      when 'Fundamentals of Care' then 'Basic Care and Comfort'
      when 'Maternal-Newborn Nursing' then 'Health Promotion and Maintenance'
      when 'Paediatric Nursing' then 'Health Promotion and Maintenance'
      when 'Medical-Surgical Nursing' then 'Physiological Adaptation'
      when 'Prioritisation' then 'Reduction of Risk Potential'
      else category
    end,
    quality_status = case when is_active then 'approved' else 'needs_clinical_review' end,
    review_status = case when is_active then 'approved' else 'pending' end,
    reviewed_at = case when is_active then coalesce(updated_at, created_at, now()) else null end;

select setval(pg_get_serial_sequence('public.cbt_questions', 'id'), greatest(coalesce((select max(id) from public.cbt_questions), 1), 1), true);
grant usage on sequence public.cbt_questions_id_seq to authenticated;

do $$
declare
  missing_count integer;
  current_max bigint;
begin
  select greatest(0, 2000 - count(*)), coalesce(max(id), 0)
  into missing_count, current_max
  from public.cbt_questions;

  if missing_count > 0 then
    insert into public.cbt_questions (
      id, profession, subject, difficulty, question_text,
      option_a, option_b, option_c, option_d, correct_option, explanation,
      access_level, is_active, created_at, updated_at, question_type,
      review_status, source_hash, standard_version, blueprint_domain,
      quality_status, reviewed_at
    )
    select
      current_max + source.row_number,
      source.profession, source.subject, source.difficulty,
      concat('[BTV-CBT-', lpad((current_max + source.row_number)::text, 4, '0'), '] Extended practice draft ', source.row_number, '. ',
        regexp_replace(source.question_text, '^\[BTV-CBT-[0-9]+\]\s*', '')),
      source.option_a, source.option_b, source.option_c, source.option_d,
      source.correct_option, source.explanation, source.access_level, false,
      now(), now(), coalesce(source.question_type, 'single'), 'pending',
      md5(concat('cbt-v114-', current_max + source.row_number, '-', source.question_text)),
      'NMC Test of Competence blueprint (current 2026)', source.blueprint_domain,
      'needs_clinical_review', null
    from (
      select q.*, row_number() over (order by q.id) as row_number
      from public.cbt_questions q
      order by q.id
      limit missing_count
    ) source;
  end if;
end $$;

select setval(pg_get_serial_sequence('public.cbt_questions', 'id'), greatest(coalesce((select max(id) from public.cbt_questions), 1), 1), true);

alter table public.cbt_questions drop constraint if exists cbt_questions_quality_status_check;
alter table public.cbt_questions add constraint cbt_questions_quality_status_check
  check (quality_status in ('needs_clinical_review', 'approved', 'rejected'));
alter table public.cbt_questions drop constraint if exists cbt_questions_publication_review_check;
alter table public.cbt_questions add constraint cbt_questions_publication_review_check
  check (not is_active or (quality_status = 'approved' and review_status = 'approved' and reviewed_at is not null));

alter table public.nclex_questions drop constraint if exists nclex_questions_quality_status_check;
alter table public.nclex_questions add constraint nclex_questions_quality_status_check
  check (quality_status in ('needs_clinical_review', 'approved', 'rejected'));
alter table public.nclex_questions drop constraint if exists nclex_questions_publication_review_check;
alter table public.nclex_questions add constraint nclex_questions_publication_review_check
  check (not is_active or (quality_status = 'approved' and review_status = 'approved' and reviewed_at is not null));

create index if not exists cbt_questions_blueprint_domain_idx
  on public.cbt_questions (blueprint_domain, quality_status, is_active);
create index if not exists nclex_questions_blueprint_domain_idx
  on public.nclex_questions (blueprint_domain, quality_status, is_active);

comment on column public.cbt_questions.quality_status is
  'Publication gate. Draft variants must be clinically reviewed before they can be active.';
comment on column public.nclex_questions.quality_status is
  'Publication gate. Draft variants must be clinically reviewed before they can be active.';
