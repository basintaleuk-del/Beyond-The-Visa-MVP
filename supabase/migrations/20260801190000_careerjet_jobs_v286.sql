-- Register Careerjet in the existing destination-scoped jobs pipeline.
-- CAREERJET_AFFILIATE_ID is server-only and is never stored in Postgres.
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
  'careerjet','job','https://www.careerjet.com','https://www.careerjet.com','approved_api',false,'approved',null,
  'Display Careerjet as the source and retain the original Careerjet vacancy URL.',
  'Official Careerjet v4 publisher API. CAREERJET_AFFILIATE_ID is read only by the server; Careerjet pages are not scraped.',
  true,'pending_configuration',72,null,
  jsonb_build_object(
    'endpoint','https://search.api.careerjet.net/v4/query',
    'credential','CAREERJET_AFFILIATE_ID',
    'schedule','daily',
    'rollout_phase','sample_validation',
    'sample',jsonb_build_object('country','GB','keyword','registered nurse','maximum_jobs',10),
    'max_pages_per_search',1,
    'results_per_page',20,
    'countries',jsonb_build_array(
      jsonb_build_object('code','GB','locale','en_GB','site','careerjet.co.uk'),
      jsonb_build_object('code','US','locale','en_US','site','careerjet.com'),
      jsonb_build_object('code','CA','locale','en_CA','site','careerjet.ca'),
      jsonb_build_object('code','AU','locale','en_AU','site','careerjet.com.au'),
      jsonb_build_object('code','NZ','locale','en_NZ','site','careerjet.co.nz'),
      jsonb_build_object('code','IE','locale','en_IE','site','careerjet.ie'),
      jsonb_build_object('code','AE','locale','en_AE','site','careerjet.ae'),
      jsonb_build_object('code','SA','locale','en_SA','site','careerjet.com.sa')
    )
  )
)
on conflict(name) do update set
  source_type=excluded.source_type,base_url=excluded.base_url,source_url=excluded.source_url,
  integration_type=excluded.integration_type,permission_status=excluded.permission_status,
  attribution_requirements=excluded.attribution_requirements,terms_notes=excluded.terms_notes,
  republication_permitted=excluded.republication_permitted,stale_after_hours=excluded.stale_after_hours,
  configuration=public.btv_approved_sources.configuration||excluded.configuration,updated_at=now();

create index if not exists btv_jobs_careerjet_stale_idx
  on public.btv_jobs(country_code,status,source_missing_runs,source_missing_since)
  where source_name='careerjet';
