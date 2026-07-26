-- Official NHS Jobs Self-Serve Job Adverts XML feed v1.07.
-- Non-destructive: extends the existing Opportunity Centre records and run log.

alter table public.btv_jobs
  add column if not exists external_reference text,
  add column if not exists salary_text text,
  add column if not exists salary_period text,
  add column if not exists working_pattern text,
  add column if not exists hours text,
  add column if not exists postcode text,
  add column if not exists interview_at timestamptz;

create unique index if not exists btv_jobs_source_external_reference_uq
  on public.btv_jobs(source_name, external_reference)
  where external_reference is not null;
create index if not exists btv_jobs_nhs_active_filter_idx
  on public.btv_jobs(source_name, status, profession, sponsorship_status, published_at desc, closing_at);
create index if not exists btv_jobs_nhs_band_idx
  on public.btv_jobs(band) where source_name = 'NHS Jobs' and status = 'published';
create index if not exists btv_jobs_nhs_employer_idx
  on public.btv_jobs(employer) where source_name = 'NHS Jobs' and status = 'published';

alter table public.btv_opportunity_import_runs
  add column if not exists records_nursing integer not null default 0,
  add column if not exists records_midwifery integer not null default 0,
  add column if not exists confirmed_sponsorship_count integer not null default 0;

alter table public.btv_opportunity_employers
  add column if not exists latest_vacancy_at timestamptz,
  add column if not exists active_nursing_count integer not null default 0,
  add column if not exists active_midwifery_count integer not null default 0,
  add column if not exists spotlight_starts_at timestamptz,
  add column if not exists spotlight_ends_at timestamptz;

alter table public.btv_approved_sources drop constraint if exists btv_approved_sources_integration_type_check;
alter table public.btv_approved_sources add constraint btv_approved_sources_integration_type_check
  check (integration_type in ('trac_jobs','json_feed_v1','nhs_jobs_xml_v1','manual_review'));

insert into public.btv_approved_sources(
  name, source_type, base_url, integration_type, enabled, permission_status, configuration
)
values (
  'NHS Jobs',
  'job',
  'https://www.jobs.nhs.uk',
  'nhs_jobs_xml_v1',
  true,
  'approved',
  jsonb_build_object(
    'feed_url', 'https://www.jobs.nhs.uk/api/v1/search_xml',
    'staff_group', 'NURSING_AND_MIDWIFERY_REGD',
    'max_pages', 3,
    'max_records', 300,
    'initial_days', 30,
    'full_snapshot', false,
    'specification', 'NHS Jobs Self-Serve Job Adverts API V1.07 (1 May 2026)',
    'attribution', 'Contains public sector information licensed under the Open Government Licence v3.0.'
  )
)
on conflict (name) do update set
  base_url = excluded.base_url,
  integration_type = excluded.integration_type,
  permission_status = excluded.permission_status,
  configuration = excluded.configuration,
  updated_at = now();
