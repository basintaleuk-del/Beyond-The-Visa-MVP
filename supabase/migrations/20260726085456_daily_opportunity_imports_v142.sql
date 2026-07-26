-- Daily Opportunity Imports v142
-- Automated ingestion is limited to explicitly approved structured feeds.

alter table public.btv_jobs
  add column if not exists external_id text,
  add column if not exists canonical_url text,
  add column if not exists source_type text,
  add column if not exists imported_at timestamptz,
  add column if not exists source_updated_at timestamptz,
  add column if not exists content_hash text,
  add column if not exists employment_type text,
  add column if not exists employer_url text,
  add column if not exists sponsorship_evidence_text text,
  add column if not exists sponsorship_evidence_url text,
  add column if not exists sponsorship_checked_at timestamptz,
  add column if not exists sponsorship_detection_method text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists expires_at timestamptz,
  add column if not exists import_status text not null default 'manual',
  add column if not exists opening_at timestamptz,
  add column if not exists study_level text,
  add column if not exists applicant_country_restrictions text[] not null default '{}',
  add column if not exists international_applicant_eligibility text,
  add column if not exists funding_coverage text,
  add column if not exists eligibility_summary text;

update public.btv_jobs set
  canonical_url = coalesce(canonical_url, source_url),
  external_id = coalesce(external_id, source_identifier),
  verification_status = case when verified then 'verified' else verification_status end
where canonical_url is null or (external_id is null and source_identifier is not null) or verified;

alter table public.btv_jobs drop constraint if exists btv_jobs_verification_status_check;
alter table public.btv_jobs add constraint btv_jobs_verification_status_check
  check (verification_status in ('pending','verified','rejected','duplicate'));
alter table public.btv_jobs drop constraint if exists btv_jobs_import_status_check;
alter table public.btv_jobs add constraint btv_jobs_import_status_check
  check (import_status in ('manual','active','upcoming','closed','removed','uncertain','rejected','duplicate'));
create unique index if not exists btv_jobs_canonical_url_uq on public.btv_jobs(canonical_url);
create unique index if not exists btv_jobs_source_external_id_uq on public.btv_jobs(source_name, external_id) where external_id is not null;
create index if not exists btv_jobs_import_freshness_idx on public.btv_jobs(import_status, last_checked_at desc);

alter table public.btv_opportunity_employers
  add column if not exists source_name text,
  add column if not exists source_employer_id text,
  add column if not exists source_url text,
  add column if not exists spotlight_status text not null default 'pending',
  add column if not exists featured boolean not null default false,
  add column if not exists active_job_count integer not null default 0,
  add column if not exists sponsorship_job_count integer not null default 0,
  add column if not exists specialties text[] not null default '{}';
alter table public.btv_opportunity_employers drop constraint if exists btv_opportunity_employers_spotlight_status_check;
alter table public.btv_opportunity_employers add constraint btv_opportunity_employers_spotlight_status_check
  check (spotlight_status in ('pending','approved','rejected','hidden'));
create unique index if not exists btv_opportunity_employers_identity_uq
  on public.btv_opportunity_employers(lower(name), lower(country_code));

create table if not exists public.btv_approved_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  source_type text not null check (source_type in ('job','funding')),
  base_url text not null check (base_url ~ '^https://'),
  integration_type text not null check (integration_type in ('trac_jobs','json_feed_v1','manual_review')),
  enabled boolean not null default false,
  permission_status text not null default 'pending' check (permission_status in ('pending','approved','denied')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  last_cursor text,
  last_successful_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_opportunity_import_runs (
  id uuid primary key default gen_random_uuid(),
  parent_run_id uuid references public.btv_opportunity_import_runs(id) on delete set null,
  source_id uuid references public.btv_approved_sources(id) on delete set null,
  run_scope text not null default 'daily',
  triggered_by text not null default 'cron' check (triggered_by in ('cron','admin','orchestrator')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_found integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_archived integer not null default 0,
  duplicates_skipped integer not null default 0,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  error_summary text
);
create unique index if not exists btv_import_runs_active_scope_uq
  on public.btv_opportunity_import_runs(run_scope) where status = 'running';
create index if not exists btv_import_runs_started_idx on public.btv_opportunity_import_runs(started_at desc);
create index if not exists btv_import_runs_source_idx on public.btv_opportunity_import_runs(source_id, started_at desc);

insert into public.btv_approved_sources(name, source_type, base_url, integration_type, enabled, permission_status, configuration)
values
  ('Trac Jobs', 'job', 'https://www.trac.jobs', 'trac_jobs', false, 'denied', '{"permission_note":"Automated access is disabled: public endpoints are protected and no authorised feed has been supplied.","permission_checked_at":"2026-07-26"}'),
  ('RCN Foundation Education Grants', 'funding', 'https://rcnfoundation.rcn.org.uk', 'manual_review', false, 'pending', '{"source_page":"https://rcnfoundation.rcn.org.uk/Grants-and-funding/Educational-grants","permission_note":"Awaiting written feed or syndication permission."}'),
  ('Florence Nightingale Foundation Scholarships', 'funding', 'https://florence-nightingale-foundation.org.uk', 'manual_review', false, 'pending', '{"source_page":"https://florence-nightingale-foundation.org.uk/scholarship-applications-open/","permission_note":"Awaiting written feed or syndication permission."}')
on conflict (name) do nothing;

alter table public.btv_approved_sources enable row level security;
alter table public.btv_opportunity_import_runs enable row level security;
create policy approved_sources_admin_read on public.btv_approved_sources for select to authenticated using ((select public.btv_is_admin()));
create policy approved_sources_admin_write on public.btv_approved_sources for all to authenticated using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy import_runs_admin_read on public.btv_opportunity_import_runs for select to authenticated using ((select public.btv_is_admin()));
grant select, insert, update, delete on public.btv_approved_sources to authenticated;
grant select on public.btv_opportunity_import_runs to authenticated;

drop policy if exists jobs_read on public.btv_jobs;
create policy jobs_read on public.btv_jobs for select to anon, authenticated
using (
  (status = 'published' and expired_at is null and (closing_at is null or closing_at >= now())
    and (opportunity_type <> 'scholarship' or verification_status = 'verified'))
  or (select public.btv_is_admin())
);
