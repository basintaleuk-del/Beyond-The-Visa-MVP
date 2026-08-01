-- Extend the existing Adzuna source to every supported Featured Pathway country.
-- Credentials remain in the existing server-side environment variables.

drop index if exists public.btv_jobs_source_external_id_uq;
drop index if exists public.btv_jobs_source_external_id_full_uq;
drop index if exists public.btv_jobs_source_external_v168_uq;

create unique index if not exists btv_jobs_source_country_external_uq
  on public.btv_jobs(source_name,country_code,external_id);

update public.btv_approved_sources
set configuration=jsonb_build_object(
      'credentials',jsonb_build_array('ADZUNA_APP_ID','ADZUNA_APP_KEY'),
      'countries',jsonb_build_array('gb','us','ca','au','nz'),
      'schedule','daily',
      'attribution','Jobs by Adzuna'
    ),
    updated_at=now()
where name='ADZUNA';
