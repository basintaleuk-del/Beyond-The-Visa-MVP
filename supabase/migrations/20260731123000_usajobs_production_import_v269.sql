-- Complete the official USAJOBS nursing importer without altering the UK feed.
alter table public.btv_usa_jobs
  add column if not exists agency text,
  add column if not exists department text,
  add column if not exists location_display text,
  add column if not exists schedule text,
  add column if not exists grade text,
  add column if not exists requirements text,
  add column if not exists who_may_apply text,
  add column if not exists opening_date timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists raw_source_data jsonb;

alter table public.btv_usa_job_import_runs
  add column if not exists duration_ms integer,
  add column if not exists searches_run integer not null default 0,
  add column if not exists pages_fetched integer not null default 0;

create index if not exists btv_usa_jobs_source_idx on public.btv_usa_jobs(source_name);
create index if not exists btv_usa_jobs_country_idx on public.btv_usa_jobs(country);
create index if not exists btv_usa_jobs_state_idx on public.btv_usa_jobs(state);
create index if not exists btv_usa_jobs_status_idx on public.btv_usa_jobs(status);
create index if not exists btv_usa_jobs_closing_idx on public.btv_usa_jobs(closing_date);
create index if not exists btv_usa_jobs_external_idx on public.btv_usa_jobs(external_id);
create index if not exists btv_usa_jobs_agency_idx on public.btv_usa_jobs(agency);
create index if not exists btv_usa_jobs_last_seen_idx on public.btv_usa_jobs(last_seen_at desc);

update public.btv_usa_job_sources
set configuration = configuration || jsonb_build_object(
      'max_pages', 18,
      'results_per_page', 100,
      'occupational_series', jsonb_build_array('0610','0620','0621'),
      'schedule', 'daily'
    ),
    last_error = null,
    updated_at = now()
where name = 'USAJOBS';

comment on column public.btv_usa_jobs.raw_source_data is
  'Server-imported USAJOBS vacancy payload. Never exposed by the public list endpoint.';
