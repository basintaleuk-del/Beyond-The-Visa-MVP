-- Register Reed Jobseeker API v1.0 without modifying NHS Jobs, USAJOBS or Adzuna records.
insert into public.btv_approved_sources(
  name,source_type,base_url,source_url,integration_type,enabled,permission_status,country_code,
  attribution_requirements,terms_notes,republication_permitted,import_status,stale_after_hours,configuration
)
values(
  'REED','job','https://www.reed.co.uk','https://www.reed.co.uk/jobs','approved_api',true,'approved','GB',
  'Display a Reed source badge and retain the Reed application URL.',
  'Reed Jobseeker API version 1.0. Authentication uses the server-side REED_API_KEY as the Basic username with an empty password.',
  true,'active',48,
  '{"api_version":"1.0","credential":"REED_API_KEY","schedule":"daily","sample_size":10,"country":"United Kingdom"}'::jsonb
)
on conflict(name) do update set
  enabled=true,permission_status='approved',country_code='GB',source_url=excluded.source_url,
  integration_type='approved_api',attribution_requirements=excluded.attribution_requirements,
  terms_notes=excluded.terms_notes,republication_permitted=true,import_status='active',
  stale_after_hours=48,configuration=excluded.configuration,updated_at=now();

-- A full unique index lets PostgREST target source + external_id directly.
-- PostgreSQL unique indexes permit multiple NULL external IDs used by older sources.
create unique index if not exists btv_jobs_source_external_id_full_uq
  on public.btv_jobs(source_name,external_id);

create index if not exists btv_jobs_reed_uk_active_idx
  on public.btv_jobs(published_at desc,closing_at)
  where source_name='REED' and country_code='GB' and status='published';
