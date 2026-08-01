-- Add Jooble to the existing destination-scoped Jobs pipeline. Credentials
-- remain exclusively in JOOBLE_API_KEY and are never stored in Postgres.
alter table public.btv_jobs
  add column if not exists source_missing_runs integer not null default 0,
  add column if not exists source_missing_since timestamptz;

alter table public.btv_opportunity_import_runs
  add column if not exists requests_made integer not null default 0,
  add column if not exists duplicates_skipped integer not null default 0,
  add column if not exists provider_summary jsonb not null default '{}'::jsonb;

insert into public.btv_approved_sources(
  name,source_type,base_url,source_url,integration_type,enabled,permission_status,country_code,
  attribution_requirements,terms_notes,republication_permitted,import_status,stale_after_hours,
  rate_limit_per_minute,configuration
)
values(
  'jooble','job','https://jooble.org','https://jooble.org','approved_api',false,'approved',null,
  'Display Jooble as the source and retain the Jooble vacancy URL.',
  'Official Jooble REST API. JOOBLE_API_KEY is read only by the server; Jooble pages are not scraped.',
  true,'pending_configuration',72,null,
  jsonb_build_object(
    'endpoint','https://jooble.org/api/{api_key}',
    'credential','JOOBLE_API_KEY',
    'schedule','daily',
    'max_pages_per_search',1,
    'results_per_page',20,
    'countries',jsonb_build_array(
      jsonb_build_object('code','GB','domain','uk.jooble.org'),
      jsonb_build_object('code','US','domain','jooble.org'),
      jsonb_build_object('code','CA','domain','ca.jooble.org'),
      jsonb_build_object('code','AU','domain','au.jooble.org'),
      jsonb_build_object('code','NZ','domain','nz.jooble.org'),
      jsonb_build_object('code','IE','domain','ie.jooble.org'),
      jsonb_build_object('code','AE','domain','ae.jooble.org'),
      jsonb_build_object('code','SA','domain','sa.jooble.org')
    )
  )
)
on conflict(name) do update set
  source_type=excluded.source_type,base_url=excluded.base_url,source_url=excluded.source_url,
  integration_type=excluded.integration_type,permission_status=excluded.permission_status,
  attribution_requirements=excluded.attribution_requirements,terms_notes=excluded.terms_notes,
  republication_permitted=excluded.republication_permitted,stale_after_hours=excluded.stale_after_hours,
  configuration=public.btv_approved_sources.configuration||excluded.configuration,updated_at=now();

create index if not exists btv_jobs_jooble_stale_idx
  on public.btv_jobs(country_code,status,source_missing_runs,source_missing_since)
  where source_name='jooble';

comment on column public.btv_jobs.source_missing_runs is
  'Number of consecutive complete provider syncs in which a job was absent; used for cautious non-destructive expiry.';
comment on column public.btv_opportunity_import_runs.provider_summary is
  'Provider-specific import metrics safe for administrator display; credentials must never be stored here.';
