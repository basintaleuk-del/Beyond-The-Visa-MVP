-- USA Nursing Jobs v155
-- This is deliberately isolated from the existing NHS/UK btv_jobs pipeline.

create table if not exists public.btv_usa_job_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text not null check (base_url ~ '^https://'),
  integration_type text not null check (integration_type in ('usajobs_v1','adzuna_v1','approved_api')),
  enabled boolean not null default false,
  permission_status text not null default 'pending' check (permission_status in ('pending','approved','denied')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  last_successful_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_usa_jobs (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source_name text not null,
  source_job_url text not null check (source_job_url ~ '^https://'),
  canonical_application_url text not null check (canonical_application_url ~ '^https://'),
  employer_name text not null,
  job_title text not null,
  nursing_specialty text,
  employment_type text,
  city text,
  state text,
  country text not null default 'United States' check (country = 'United States'),
  country_code text not null default 'US' check (country_code = 'US'),
  destination_country text not null default 'United States of America' check (destination_country = 'United States of America'),
  salary_min numeric,
  salary_max numeric,
  salary_currency text not null default 'USD' check (salary_currency = 'USD'),
  salary_period text,
  description text,
  qualifications text,
  licence_requirements text,
  visa_sponsorship_status text not null default 'unclear' check (visa_sponsorship_status in ('confirmed','not_offered','unclear','not_applicable')),
  visa_sponsorship_verified boolean not null default false,
  sponsorship_evidence text,
  relocation_assistance boolean,
  remote_status text not null default 'not_stated' check (remote_status in ('remote','hybrid','onsite','not_stated')),
  date_posted timestamptz,
  closing_date timestamptz,
  imported_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','expired','hidden','review')),
  attribution_text text not null default 'USAJOBS.gov',
  content_fingerprint text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_name, external_id)
);

create unique index if not exists btv_usa_jobs_canonical_url_uq on public.btv_usa_jobs(canonical_application_url);
create unique index if not exists btv_usa_jobs_fingerprint_uq on public.btv_usa_jobs(content_fingerprint);
create unique index if not exists btv_usa_jobs_fallback_identity_uq
  on public.btv_usa_jobs(lower(employer_name),lower(job_title),lower(coalesce(state,'')),lower(coalesce(city,'')),date_posted)
  where date_posted is not null;
create index if not exists btv_usa_jobs_feed_idx on public.btv_usa_jobs(status,date_posted desc,closing_date);
create index if not exists btv_usa_jobs_filters_idx on public.btv_usa_jobs(state,nursing_specialty,employment_type,visa_sponsorship_status);

create table if not exists public.btv_usa_job_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.btv_usa_job_sources(id) on delete set null,
  run_scope text not null default 'twice_daily',
  triggered_by text not null default 'cron' check (triggered_by in ('cron','admin')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_found integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_expired integer not null default 0,
  duplicates_skipped integer not null default 0,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  error_summary text
);
create unique index if not exists btv_usa_job_import_active_uq on public.btv_usa_job_import_runs(run_scope) where status='running';
create index if not exists btv_usa_job_import_started_idx on public.btv_usa_job_import_runs(started_at desc);

create table if not exists public.btv_usa_saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.btv_usa_jobs(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key(user_id,job_id)
);

create table if not exists public.btv_usa_job_alert_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  keyword text,
  state text,
  city text,
  nursing_specialty text,
  employment_type text,
  visa_sponsorship_status text check (visa_sponsorship_status is null or visa_sponsorship_status in ('confirmed','not_offered','unclear','not_applicable')),
  relocation_assistance boolean,
  remote_status text check (remote_status is null or remote_status in ('remote','hybrid','onsite','not_stated')),
  updated_at timestamptz not null default now()
);

insert into public.btv_usa_job_sources(name,base_url,integration_type,enabled,permission_status,configuration)
values
 ('USAJOBS','https://data.usajobs.gov','usajobs_v1',true,'approved','{"attribution":"USAJOBS.gov","authorisation":"Official USAJOBS Search API","max_pages":5,"results_per_page":100}'),
 ('Adzuna USA','https://api.adzuna.com','adzuna_v1',false,'pending','{"status_note":"Connector remains disabled until USAJOBS is operational and Adzuna credentials/licensing are approved."}')
on conflict(name) do nothing;

alter table public.btv_usa_jobs enable row level security;
alter table public.btv_usa_job_sources enable row level security;
alter table public.btv_usa_job_import_runs enable row level security;
alter table public.btv_usa_saved_jobs enable row level security;
alter table public.btv_usa_job_alert_preferences enable row level security;

drop policy if exists usa_jobs_destination_read on public.btv_usa_jobs;
create policy usa_jobs_destination_read on public.btv_usa_jobs for select to authenticated
using (
  (status='active' and (closing_date is null or closing_date >= now()) and exists(
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.destination_country='us'
  )) or (select public.btv_is_admin())
);
create policy usa_jobs_admin_insert on public.btv_usa_jobs for insert to authenticated with check ((select public.btv_is_admin()));
create policy usa_jobs_admin_update on public.btv_usa_jobs for update to authenticated using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy usa_jobs_admin_delete on public.btv_usa_jobs for delete to authenticated using ((select public.btv_is_admin()));

create policy usa_job_sources_admin on public.btv_usa_job_sources for all to authenticated using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy usa_job_runs_admin_read on public.btv_usa_job_import_runs for select to authenticated using ((select public.btv_is_admin()));
create policy usa_saved_jobs_owner on public.btv_usa_saved_jobs for all to authenticated
using ((select auth.uid())=user_id and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.destination_country='us'))
with check ((select auth.uid())=user_id and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.destination_country='us'));
create policy usa_alert_preferences_owner on public.btv_usa_job_alert_preferences for all to authenticated
using ((select auth.uid())=user_id and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.destination_country='us'))
with check ((select auth.uid())=user_id and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.destination_country='us'));

-- Preserve the UK feed for UK/other destinations while preventing USA-destination
-- accounts from reading UK opportunities at the database layer.
drop policy if exists jobs_read on public.btv_jobs;
create policy jobs_read on public.btv_jobs for select to authenticated
using (
  ((status='published' and expired_at is null and (closing_at is null or closing_at >= now())
    and (opportunity_type <> 'scholarship' or verification_status='verified')) and exists(
      select 1 from public.profiles p where p.id=(select auth.uid()) and p.destination_country='uk'
    ))
  or (select public.btv_is_admin())
);

create or replace function public.btv_generate_usa_job_alerts(p_since timestamptz default (now()-interval '13 hours'))
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer;
begin
  insert into public.btv_notifications(user_id,category,title,body,action_url,dedupe_key)
  select p.id,'usa_jobs','New USA nursing job: '||j.job_title,
         j.employer_name||' · '||concat_ws(', ',j.city,j.state),
         '/jobs/usa/'||j.id,'usa-job:'||j.id
  from public.profiles p
  left join public.btv_notification_preferences np on np.user_id=p.id
  left join public.btv_usa_job_alert_preferences ap on ap.user_id=p.id
  cross join lateral (
    select u.* from public.btv_usa_jobs u
    where u.status='active' and u.date_posted>=p_since and (u.closing_date is null or u.closing_date>=now())
      and coalesce(ap.enabled,true)
      and (ap.keyword is null or concat_ws(' ',u.job_title,u.description,u.qualifications) ilike '%'||ap.keyword||'%')
      and (ap.state is null or u.state=ap.state)
      and (ap.city is null or u.city=ap.city)
      and (ap.nursing_specialty is null or u.nursing_specialty=ap.nursing_specialty)
      and (ap.employment_type is null or u.employment_type=ap.employment_type)
      and (ap.visa_sponsorship_status is null or u.visa_sponsorship_status=ap.visa_sponsorship_status)
      and (ap.relocation_assistance is null or u.relocation_assistance=ap.relocation_assistance)
      and (ap.remote_status is null or u.remote_status=ap.remote_status)
    order by u.featured desc,u.date_posted desc nulls last limit 3
  ) j
  where p.destination_country='us' and coalesce(np.job_matches,true)
  on conflict(user_id,dedupe_key) do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

revoke all on function public.btv_generate_usa_job_alerts(timestamptz) from public,anon,authenticated;
grant execute on function public.btv_generate_usa_job_alerts(timestamptz) to service_role;
grant select on public.btv_usa_jobs to authenticated;
grant select,insert,delete on public.btv_usa_saved_jobs to authenticated;
grant select,insert,update,delete on public.btv_usa_job_alert_preferences to authenticated;
grant select,insert,update,delete on public.btv_usa_job_sources to authenticated;
grant select on public.btv_usa_job_import_runs to authenticated;
