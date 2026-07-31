-- Enable the approved Adzuna US nursing connector without modifying UK or USAJOBS records.
update public.btv_usa_job_sources
set enabled=true,
    permission_status='approved',
    integration_type='adzuna_v1',
    configuration=jsonb_build_object(
      'attribution','Jobs by Adzuna',
      'credentials',jsonb_build_array('ADZUNA_APP_ID','ADZUNA_APP_KEY'),
      'max_pages',8,
      'results_per_page',50,
      'schedule','daily',
      'terms',jsonb_build_array('Registered Nurse','Nurse Practitioner','Licensed Practical Nurse','Nursing Assistant','ICU Nurse','PACU Nurse','Mental Health Nurse')
    ),
    last_error=null,
    updated_at=now()
where name='Adzuna USA';

insert into public.btv_approved_sources(
  name,source_type,base_url,source_url,integration_type,enabled,permission_status,country_code,
  attribution_requirements,terms_notes,republication_permitted,import_status,stale_after_hours,configuration
)
values(
  'ADZUNA','job','https://api.adzuna.com','https://www.adzuna.com','approved_api',true,'approved','US',
  'Jobs by Adzuna','Official Adzuna API. Credentials remain server-side and applications use the returned redirect URL.',
  true,'active',48,'{"credentials":["ADZUNA_APP_ID","ADZUNA_APP_KEY"],"schedule":"daily","country":"us"}'::jsonb
)
on conflict(name) do update set
  enabled=true,permission_status='approved',country_code='US',source_url=excluded.source_url,
  integration_type='approved_api',attribution_requirements=excluded.attribution_requirements,
  terms_notes=excluded.terms_notes,republication_permitted=true,import_status='active',
  stale_after_hours=48,configuration=excluded.configuration,updated_at=now();

create index if not exists btv_usa_jobs_adzuna_active_idx
  on public.btv_usa_jobs(date_posted desc)
  where source_name='ADZUNA' and status='active';
