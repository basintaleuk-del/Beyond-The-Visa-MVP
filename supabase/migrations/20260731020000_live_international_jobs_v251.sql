-- Live international healthcare vacancy sources.
-- Additive only: the working NHS Jobs and USAJOBS records and importers are unchanged.

insert into public.btv_approved_sources(
  name,source_type,base_url,source_url,integration_type,enabled,permission_status,country_code,
  attribution_requirements,terms_notes,republication_permitted,import_status,stale_after_hours,configuration
)
values
  (
    'Queensland Health SmartJobs','job','https://smartjobs.qld.gov.au',
    'https://smartjobs.qld.gov.au/jobtools/jncustomsearch.searchResults?in_organid=14904&in_jobDate=All&in_skills=nurse&in_orderby=dateinput%20desc',
    'approved_api',true,'approved','AU','Attribute Queensland Health SmartJobs and retain the original vacancy URL.',
    'Public Queensland Government vacancy listings; Beyond The Visa stores a short factual index and sends applicants to the official record.',true,'active',48,
    '{"profession_filter":"nurse","apply_mode":"external","maximum_records":40}'::jsonb
  ),
  (
    'New Zealand Government Jobs','job','https://jobs.govt.nz',
    'https://jobs.govt.nz/jobtools/jncustomsearch.searchResults?in_multi01=%22Health%22&in_multi01_id=1802&in_organid=16563&in_others=%22Health%22',
    'approved_api',true,'approved','NZ','Attribute New Zealand Government Jobs and retain the original vacancy URL.',
    'Public New Zealand Government vacancy listings; only nursing, midwifery and healthcare-assistant roles are indexed.',true,'active',48,
    '{"profession_filter":"nursing_midwifery","apply_mode":"external","maximum_records":40}'::jsonb
  ),
  (
    'Canada Job Bank','job','https://www.jobbank.gc.ca',
    'https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=registered+nurse&sort=M',
    'approved_api',true,'approved','CA','Attribute Government of Canada Job Bank and retain the original vacancy URL.',
    'Public Government of Canada Job Bank search results; session identifiers are removed before URLs are stored.',true,'active',48,
    '{"profession_filter":"registered_nurse","apply_mode":"external","maximum_records":40}'::jsonb
  ),
  (
    'HSE Job Search','job','https://about.hse.ie',
    'https://about.hse.ie/jobs/job-search/?category=nursing%20and%20midwifery&page=1',
    'approved_api',true,'approved','IE','Attribute Ireland Health Service Executive and retain the original vacancy URL.',
    'Public HSE nursing and midwifery vacancy listings; the HSE remains the authoritative application source.',true,'active',48,
    '{"category":"Nursing and Midwifery","apply_mode":"external","maximum_records":40}'::jsonb
  ),
  (
    'Emirates Health Services Careers','job','https://www.ehs.gov.ae',
    'https://www.ehs.gov.ae/en/about-us/careers',
    'approved_api',true,'approved','AE','Attribute Emirates Health Services and retain its official careers route.',
    'Public EHS careers route for current clinical and nursing opportunities. The employer page controls current opening and application details.',true,'active',72,
    '{"profession_filter":"clinical_nursing","apply_mode":"external","maximum_records":10}'::jsonb
  ),
  (
    'King Faisal Specialist Hospital Careers','job','https://services.kfshrc.edu.sa',
    'https://services.kfshrc.edu.sa/external/en/home/careers/vacancieslist',
    'approved_api',true,'approved','SA','Attribute King Faisal Specialist Hospital & Research Centre and retain the official vacancy URL.',
    'Public hospital vacancy list; only nursing records are indexed and applications remain on the hospital service.',true,'active',48,
    '{"profession_filter":"nursing","apply_mode":"external","maximum_records":40}'::jsonb
  )
on conflict(name) do update set
  source_type=excluded.source_type,
  base_url=excluded.base_url,
  source_url=excluded.source_url,
  integration_type=excluded.integration_type,
  enabled=excluded.enabled,
  permission_status=excluded.permission_status,
  country_code=excluded.country_code,
  attribution_requirements=excluded.attribution_requirements,
  terms_notes=excluded.terms_notes,
  republication_permitted=excluded.republication_permitted,
  import_status=excluded.import_status,
  stale_after_hours=excluded.stale_after_hours,
  configuration=public.btv_approved_sources.configuration||excluded.configuration,
  updated_at=now();

comment on table public.btv_approved_sources is
  'Governed registry for official job feeds and public employer vacancy listings used by the daily importer.';
