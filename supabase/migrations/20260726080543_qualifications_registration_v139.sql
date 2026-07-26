-- Qualifications & Registration v139
-- Non-destructive user-owned professional history. Rollback by removing the
-- four v139 tables only after exporting any records users have entered.

create table if not exists public.btv_professional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profession text check (profession in ('registered_nurse','enrolled_nurse','midwife')),
  qualification_country text,
  qualification_title text,
  institution text,
  graduation_year integer check (graduation_year between 1900 and 2100),
  nursing_field text,
  qualification_evidence_path text,
  english_test_type text,
  english_test_date date,
  english_overall_result text,
  english_component_results jsonb not null default '{}'::jsonb,
  english_expiry_date date,
  english_evidence_path text,
  australian_pathway text not null default 'Qualification Assessment Required'
    check (australian_pathway in ('Pathway 1','Pathway 2','Stream A','Stream B — Outcomes-Based Assessment','Qualification Assessment Required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_professional_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,
  regulatory_authority text not null,
  registration_type text not null,
  registration_number text,
  initial_registration_date date,
  status text not null check (status in ('Active','Expired','Pending','Suspended')),
  evidence_document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_professional_practice_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,
  employer text not null,
  clinical_area text,
  start_date date,
  end_date date,
  currently_employed boolean not null default false,
  estimated_practice_hours numeric(12,2) check (estimated_practice_hours >= 0),
  registration_held text,
  evidence_document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not currently_employed or end_date is null)
);

create table if not exists public.btv_professional_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_name text not null check (assessment_name in ('NCLEX-RN','Multiple-choice question examination — MCQ','Objective Structured Clinical Examination — OSCE','Outcomes-Based Assessment — OBA','Orientation Part 1','Orientation Part 2','IELTS','OET','Other professional examination')),
  assessment_other_name text,
  status text not null check (status in ('Not started','Planned','Booked','Passed','Failed','Expired')),
  result_date date,
  evidence_document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (assessment_name = 'Other professional examination' or assessment_other_name is null)
);

create index if not exists btv_professional_registrations_user_idx on public.btv_professional_registrations(user_id, created_at desc);
create index if not exists btv_professional_practice_user_idx on public.btv_professional_practice_history(user_id, start_date desc);
create index if not exists btv_professional_assessments_user_idx on public.btv_professional_assessments(user_id, created_at desc);

alter table public.btv_professional_profiles enable row level security;
alter table public.btv_professional_registrations enable row level security;
alter table public.btv_professional_practice_history enable row level security;
alter table public.btv_professional_assessments enable row level security;

create policy professional_profiles_select on public.btv_professional_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy professional_profiles_insert on public.btv_professional_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy professional_profiles_update on public.btv_professional_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy professional_profiles_delete on public.btv_professional_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy professional_registrations_select on public.btv_professional_registrations for select to authenticated using ((select auth.uid()) = user_id);
create policy professional_registrations_insert on public.btv_professional_registrations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy professional_registrations_update on public.btv_professional_registrations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy professional_registrations_delete on public.btv_professional_registrations for delete to authenticated using ((select auth.uid()) = user_id);

create policy professional_practice_select on public.btv_professional_practice_history for select to authenticated using ((select auth.uid()) = user_id);
create policy professional_practice_insert on public.btv_professional_practice_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy professional_practice_update on public.btv_professional_practice_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy professional_practice_delete on public.btv_professional_practice_history for delete to authenticated using ((select auth.uid()) = user_id);

create policy professional_assessments_select on public.btv_professional_assessments for select to authenticated using ((select auth.uid()) = user_id);
create policy professional_assessments_insert on public.btv_professional_assessments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy professional_assessments_update on public.btv_professional_assessments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy professional_assessments_delete on public.btv_professional_assessments for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.btv_professional_profiles to authenticated;
grant select, insert, update, delete on public.btv_professional_registrations to authenticated;
grant select, insert, update, delete on public.btv_professional_practice_history to authenticated;
grant select, insert, update, delete on public.btv_professional_assessments to authenticated;
