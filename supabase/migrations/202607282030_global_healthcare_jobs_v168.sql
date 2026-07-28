-- Global healthcare Jobs v168
-- Non-destructive: preserves NHS Jobs, USAJOBS, saved jobs and applications.
-- Rollback: disable the global cron/API, restore the previous jobs_read policy,
-- then drop only v168 tables/functions/indexes. Added nullable columns may remain.

alter table public.profiles drop constraint if exists profiles_destination_country_check;
alter table public.profiles add constraint profiles_destination_country_check
  check (destination_country is null or destination_country in ('uk','us','au','nz','ca','ie','ae','sa'));

create or replace function public.btv_set_destination_country(p_country text)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_country text := case lower(trim(coalesce(p_country,'')))
    when 'usa' then 'us' when 'united-states' then 'us'
    when 'australia' then 'au' when 'new-zealand' then 'nz'
    when 'canada' then 'ca' when 'ireland' then 'ie'
    when 'uae' then 'ae' when 'united-arab-emirates' then 'ae'
    when 'saudi-arabia' then 'sa' when 'saudi' then 'sa'
    when 'united-kingdom' then 'uk' else lower(trim(coalesce(p_country,''))) end;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_country not in ('uk','us','au','nz','ca','ie','ae','sa') then
    raise exception 'Unsupported destination country';
  end if;
  update public.profiles
     set destination_country=v_country,destination=v_country,updated_at=now()
   where id=auth.uid();
  if not found then raise exception 'Profile not found'; end if;
  return v_country;
end;
$$;
revoke all on function public.btv_set_destination_country(text) from public,anon;
grant execute on function public.btv_set_destination_country(text) to authenticated;

alter table public.btv_approved_sources
  add column if not exists country_code text,
  add column if not exists source_url text,
  add column if not exists attribution_requirements text,
  add column if not exists terms_notes text,
  add column if not exists republication_permitted boolean not null default false,
  add column if not exists import_status text not null default 'inactive',
  add column if not exists rate_limit_per_minute integer,
  add column if not exists stale_after_hours integer not null default 72,
  add column if not exists last_attempted_at timestamptz,
  add column if not exists last_status text,
  add column if not exists consecutive_failures integer not null default 0;

update public.btv_approved_sources
set country_code=coalesce(country_code,case when name='NHS Jobs' then 'GB' end),
    source_url=coalesce(source_url,base_url),
    attribution_requirements=coalesce(attribution_requirements,configuration->>'attribution'),
    republication_permitted=case when name='NHS Jobs' then true else republication_permitted end,
    import_status=case when enabled and permission_status='approved' then 'active' else 'inactive' end
where country_code is null or source_url is null;

alter table public.btv_approved_sources drop constraint if exists btv_approved_sources_integration_type_check;
alter table public.btv_approved_sources add constraint btv_approved_sources_integration_type_check
  check (integration_type in ('trac_jobs','json_feed_v1','nhs_jobs_xml_v1','usajobs_v1','approved_api','approved_rss','approved_xml','approved_json','partner_submission','manual_review'));
alter table public.btv_approved_sources drop constraint if exists btv_approved_sources_country_code_check;
alter table public.btv_approved_sources add constraint btv_approved_sources_country_code_check
  check (country_code is null or country_code in ('GB','US','AU','NZ','CA','IE','AE','SA'));
alter table public.btv_approved_sources drop constraint if exists btv_approved_sources_import_status_check;
alter table public.btv_approved_sources add constraint btv_approved_sources_import_status_check
  check (import_status in ('active','inactive','stale','rate_limited','failed','pending_configuration'));
create index if not exists btv_approved_sources_country_status_idx
  on public.btv_approved_sources(country_code,enabled,permission_status,import_status);

insert into public.btv_approved_sources(name,source_type,base_url,source_url,integration_type,enabled,permission_status,country_code,attribution_requirements,terms_notes,republication_permitted,import_status,configuration)
values
 ('USAJOBS','job','https://data.usajobs.gov','https://www.usajobs.gov','usajobs_v1',true,'approved','US','USAJOBS.gov attribution','Official USAJOBS Search API; credentials required server-side.',true,'active','{"credentials":["USAJOBS_API_KEY","USAJOBS_EMAIL"],"max_pages":5,"results_per_page":100}'),
 ('Australia authorised healthcare feeds','job','https://www.health.gov.au','https://www.health.gov.au','manual_review',false,'pending','AU',null,'No feed is enabled until an authorised state-health, employer or ATS agreement is configured.',false,'pending_configuration','{"configuration_required":true}'),
 ('Health New Zealand authorised feeds','job','https://www.healthnz.govt.nz','https://www.healthnz.govt.nz','manual_review',false,'pending','NZ',null,'Awaiting an authorised Health New Zealand or employer feed.',false,'pending_configuration','{"configuration_required":true}'),
 ('Canada authorised health-authority feeds','job','https://www.canada.ca','https://www.canada.ca','manual_review',false,'pending','CA',null,'Awaiting authorised provincial health-authority or employer feeds.',false,'pending_configuration','{"configuration_required":true}'),
 ('Ireland authorised healthcare feeds','job','https://www.hse.ie','https://www.hse.ie','manual_review',false,'pending','IE',null,'Awaiting an authorised HSE, public-sector or employer feed.',false,'pending_configuration','{"configuration_required":true}'),
 ('UAE authorised healthcare feeds','job','https://mohap.gov.ae','https://mohap.gov.ae','manual_review',false,'pending','AE',null,'Awaiting an approved hospital-group, government or recruitment-partner feed.',false,'pending_configuration','{"configuration_required":true}'),
 ('Saudi Arabia authorised healthcare feeds','job','https://www.moh.gov.sa','https://www.moh.gov.sa','manual_review',false,'pending','SA',null,'Awaiting an approved hospital-group, government or recruitment-partner feed.',false,'pending_configuration','{"configuration_required":true}')
on conflict(name) do update set
 country_code=excluded.country_code,source_url=excluded.source_url,terms_notes=excluded.terms_notes,
 integration_type=excluded.integration_type,republication_permitted=excluded.republication_permitted,
 import_status=case when public.btv_approved_sources.enabled then public.btv_approved_sources.import_status else excluded.import_status end,
 configuration=public.btv_approved_sources.configuration||excluded.configuration,updated_at=now();

alter table public.btv_jobs
  add column if not exists source_id uuid references public.btv_approved_sources(id) on delete set null,
  add column if not exists country_code text,
  add column if not exists country_name text,
  add column if not exists region_or_state text,
  add column if not exists employer_name text,
  add column if not exists employer_logo_url text,
  add column if not exists department text,
  add column if not exists requirements text,
  add column if not exists registration_body text,
  add column if not exists registration_status text,
  add column if not exists overseas_applicants_status text not null default 'not_stated',
  add column if not exists relocation_support_available boolean,
  add column if not exists salary_currency text,
  add column if not exists contract_type text,
  add column if not exists work_pattern text,
  add column if not exists experience_level text,
  add column if not exists job_reference text,
  add column if not exists source_last_modified_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists is_featured boolean not null default false,
  add column if not exists raw_source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists overview text,
  add column if not exists main_duties text,
  add column if not exists about_employer text,
  add column if not exists person_specification text,
  add column if not exists essential_criteria text[] not null default '{}',
  add column if not exists desirable_criteria text[] not null default '{}',
  add column if not exists qualifications text,
  add column if not exists knowledge_skills text,
  add column if not exists visa_details text,
  add column if not exists relocation_details text,
  add column if not exists additional_information text,
  add column if not exists employer_contact text,
  add column if not exists application_kind text not null default 'external',
  add column if not exists source_priority integer not null default 100;

update public.btv_jobs j set
  country_code=coalesce(j.country_code,case lower(j.country)
    when 'uk' then 'GB' when 'united kingdom' then 'GB' when 'gb' then 'GB'
    when 'us' then 'US' when 'usa' then 'US' when 'united states' then 'US'
    when 'au' then 'AU' when 'australia' then 'AU' when 'nz' then 'NZ' when 'new zealand' then 'NZ'
    when 'ca' then 'CA' when 'canada' then 'CA' when 'ie' then 'IE' when 'ireland' then 'IE'
    when 'ae' then 'AE' when 'uae' then 'AE' when 'united arab emirates' then 'AE'
    when 'sa' then 'SA' when 'saudi arabia' then 'SA' end),
  country_name=coalesce(j.country_name,case lower(j.country)
    when 'uk' then 'United Kingdom' when 'gb' then 'United Kingdom' when 'united kingdom' then 'United Kingdom'
    when 'us' then 'United States' when 'usa' then 'United States' when 'united states' then 'United States'
    when 'au' then 'Australia' when 'australia' then 'Australia' when 'nz' then 'New Zealand' when 'new zealand' then 'New Zealand'
    when 'ca' then 'Canada' when 'canada' then 'Canada' when 'ie' then 'Ireland' when 'ireland' then 'Ireland'
    when 'ae' then 'United Arab Emirates' when 'uae' then 'United Arab Emirates' when 'sa' then 'Saudi Arabia' when 'saudi arabia' then 'Saudi Arabia' end),
  region_or_state=coalesce(j.region_or_state,j.region),employer_name=coalesce(j.employer_name,j.employer),
  salary_currency=coalesce(j.salary_currency,j.currency),work_pattern=coalesce(j.work_pattern,j.working_pattern),
  job_reference=coalesce(j.job_reference,j.external_reference,j.external_id),
  last_verified_at=coalesce(j.last_verified_at,j.last_checked_at),is_featured=j.featured,
  source_last_modified_at=coalesce(j.source_last_modified_at,j.source_updated_at),
  source_id=coalesce(j.source_id,(select s.id from public.btv_approved_sources s where s.name=j.source_name limit 1));

alter table public.btv_jobs drop constraint if exists btv_jobs_country_code_check;
alter table public.btv_jobs add constraint btv_jobs_country_code_check
  check (country_code is null or country_code in ('GB','US','AU','NZ','CA','IE','AE','SA'));
alter table public.btv_jobs drop constraint if exists btv_jobs_sponsorship_status_check;
alter table public.btv_jobs add constraint btv_jobs_sponsorship_status_check
  check (sponsorship_status in ('confirmed','may_be_available','not_offered','not_stated','unclear','not_applicable'));
alter table public.btv_jobs drop constraint if exists btv_jobs_overseas_status_check;
alter table public.btv_jobs add constraint btv_jobs_overseas_status_check
  check (overseas_applicants_status in ('accepted','not_accepted','not_stated'));
alter table public.btv_jobs drop constraint if exists btv_jobs_application_kind_check;
alter table public.btv_jobs add constraint btv_jobs_application_kind_check
  check (application_kind in ('external','internal'));
alter table public.btv_jobs drop constraint if exists btv_jobs_status_v138_check;
alter table public.btv_jobs add constraint btv_jobs_status_v138_check
  check (status in ('draft','review','pending_review','published','active','closing_soon','expired','withdrawn','archived','import_failed'));

create index if not exists btv_jobs_global_feed_idx on public.btv_jobs(country_code,status,opportunity_type,published_at desc);
create index if not exists btv_jobs_global_filters_idx on public.btv_jobs(country_code,profession,specialty,employment_type,sponsorship_status,published_at desc);
create index if not exists btv_jobs_global_location_idx on public.btv_jobs(country_code,region_or_state,city);
create index if not exists btv_jobs_global_closing_idx on public.btv_jobs(country_code,closing_at) where status in ('published','active','closing_soon');
create unique index if not exists btv_jobs_source_external_v168_uq on public.btv_jobs(source_id,external_id) where source_id is not null and external_id is not null;
create index if not exists btv_jobs_application_url_idx on public.btv_jobs(application_url);
create index if not exists btv_jobs_reference_idx on public.btv_jobs(job_reference) where job_reference is not null;

do $migration$
begin
if to_regclass('public.btv_usa_jobs') is not null then
execute $copy_usa$
insert into public.btv_jobs(
 external_id,source_id,source_name,source_type,source_url,canonical_url,application_url,country,country_code,country_name,
 region,region_or_state,city,employer,employer_name,title,profession,specialty,description,requirements,registration_required,
 salary_min,salary_max,currency,salary_currency,salary_period,employment_type,relocation_support_available,sponsorship_status,
 visa_sponsorship,sponsorship_evidence_text,published_at,closing_at,imported_at,last_checked_at,last_verified_at,expires_at,status,
 verification_status,import_status,job_reference,featured,is_featured,raw_source_metadata,content_hash
)
select
 u.external_id,s.id,u.source_name,'official_api',u.source_job_url,u.canonical_application_url,u.canonical_application_url,'us','US','United States',
 u.state,u.state,u.city,u.employer_name,u.employer_name,u.job_title,'nurse',u.nursing_specialty,u.description,u.qualifications,u.licence_requirements,
 u.salary_min,u.salary_max,u.salary_currency,u.salary_currency,u.salary_period,u.employment_type,u.relocation_assistance,
 case u.visa_sponsorship_status when 'confirmed' then 'confirmed' when 'not_offered' then 'not_offered' when 'not_applicable' then 'not_applicable' else 'unclear' end,
 u.visa_sponsorship_status='confirmed' and u.visa_sponsorship_verified,u.sponsorship_evidence,u.date_posted,u.closing_date,u.imported_at,u.last_checked_at,u.last_checked_at,u.expires_at,
 case u.status when 'active' then 'active' when 'expired' then 'expired' when 'review' then 'pending_review' else 'archived' end,
 case when u.visa_sponsorship_verified then 'verified' else 'pending' end,'active',u.external_id,u.featured,u.featured,
 jsonb_build_object('legacy_usa_job_id',u.id,'attribution',u.attribution_text,'remote_status',u.remote_status),u.content_fingerprint
from public.btv_usa_jobs u
join public.btv_approved_sources s on s.name='USAJOBS'
on conflict(canonical_url) do update set
 title=excluded.title,employer=excluded.employer,employer_name=excluded.employer_name,description=excluded.description,
 requirements=excluded.requirements,salary_min=excluded.salary_min,salary_max=excluded.salary_max,closing_at=excluded.closing_at,
 last_checked_at=excluded.last_checked_at,last_verified_at=excluded.last_verified_at,status=excluded.status,content_hash=excluded.content_hash,updated_at=now()
$copy_usa$;
end if;
end
$migration$;

create table if not exists public.btv_job_alerts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 country_code text not null check(country_code in ('GB','US','AU','NZ','CA','IE','AE','SA')),
 profession text,specialties text[] not null default '{}',locations text[] not null default '{}',
 sponsorship_preference text check(sponsorship_preference is null or sponsorship_preference in ('confirmed','any')),
 employment_types text[] not null default '{}',frequency text not null default 'daily' check(frequency in ('daily','weekly')),
 is_active boolean not null default true,last_sent_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists btv_job_alerts_user_country_idx on public.btv_job_alerts(user_id,country_code,is_active);

alter table public.btv_job_applications
  add column if not exists country_code text,
  add column if not exists employer text,
  add column if not exists role text,
  add column if not exists interview_date date,
  add column if not exists offer_date date,
  add column if not exists visa_stage text,
  add column if not exists next_action text,
  add column if not exists next_action_date date;
update public.btv_job_applications a set
 country_code=coalesce(a.country_code,j.country_code),employer=coalesce(a.employer,j.employer_name,j.employer),role=coalesce(a.role,j.title)
from public.btv_jobs j where j.id=a.job_id and (a.country_code is null or a.employer is null or a.role is null);
create index if not exists btv_job_applications_user_country_idx on public.btv_job_applications(user_id,country_code,updated_at desc);

alter table public.btv_opportunity_import_runs
  add column if not exists country_code text,
  add column if not exists records_fetched integer not null default 0,
  add column if not exists records_unchanged integer not null default 0,
  add column if not exists records_expired integer not null default 0,
  add column if not exists records_failed integer not null default 0,
  add column if not exists duration_ms integer,
  add column if not exists final_status text,
  add column if not exists retry_count integer not null default 0;

create table if not exists public.btv_job_source_links (
 id uuid primary key default gen_random_uuid(),canonical_job_id uuid not null references public.btv_jobs(id) on delete cascade,
 duplicate_job_id uuid references public.btv_jobs(id) on delete set null,source_id uuid references public.btv_approved_sources(id) on delete set null,
 external_id text,source_url text,created_at timestamptz not null default now(),unique(canonical_job_id,source_id,external_id)
);

create table if not exists public.btv_job_admin_alerts (
 id uuid primary key default gen_random_uuid(),source_id uuid references public.btv_approved_sources(id) on delete set null,
 severity text not null check(severity in ('info','warning','critical')),code text not null,title text not null,details text,
 status text not null default 'open' check(status in ('open','acknowledged','resolved')),created_at timestamptz not null default now(),resolved_at timestamptz
);

create table if not exists public.btv_employer_job_submissions (
 id uuid primary key default gen_random_uuid(),submitted_by uuid references auth.users(id) on delete set null,
 employer_identity text not null,country_code text not null check(country_code in ('GB','US','AU','NZ','CA','IE','AE','SA')),
 role text not null,location text not null,description text not null,application_url text not null,
 closing_date date,sponsorship_status text not null default 'not_stated',registration_requirements text,
 publication_authority_confirmed boolean not null default false,status text not null default 'pending_review' check(status in ('draft','pending_review','approved','rejected','published')),
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.btv_job_audit_log (
 id bigint generated by default as identity primary key,actor_id uuid references auth.users(id) on delete set null,
 action text not null,entity_type text not null,entity_id text,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);

alter table public.btv_job_alerts enable row level security;
alter table public.btv_job_source_links enable row level security;
alter table public.btv_job_admin_alerts enable row level security;
alter table public.btv_employer_job_submissions enable row level security;
alter table public.btv_job_audit_log enable row level security;

drop policy if exists jobs_read on public.btv_jobs;
create policy jobs_read on public.btv_jobs for select to authenticated
using (
  (select public.btv_is_admin())
  or exists(select 1 from public.btv_saved_jobs sj where sj.user_id=(select auth.uid()) and sj.job_id=btv_jobs.id)
  or (
    opportunity_type='job' and status in ('published','active','closing_soon') and expired_at is null
    and (closing_at is null or closing_at>=now())
    and country_code=(select case p.destination_country when 'uk' then 'GB' when 'us' then 'US' when 'au' then 'AU' when 'nz' then 'NZ' when 'ca' then 'CA' when 'ie' then 'IE' when 'ae' then 'AE' when 'sa' then 'SA' end from public.profiles p where p.id=(select auth.uid()))
  )
  or (
    opportunity_type<>'job' and status='published' and expired_at is null and (closing_at is null or closing_at>=now())
    and country_code=(select case p.destination_country when 'uk' then 'GB' when 'us' then 'US' when 'au' then 'AU' when 'nz' then 'NZ' when 'ca' then 'CA' when 'ie' then 'IE' when 'ae' then 'AE' when 'sa' then 'SA' end from public.profiles p where p.id=(select auth.uid()))
  )
);

drop policy if exists job_alerts_owner on public.btv_job_alerts;
create policy job_alerts_owner on public.btv_job_alerts for all to authenticated
using(user_id=(select auth.uid()) or (select public.btv_is_admin()))
with check(user_id=(select auth.uid()) or (select public.btv_is_admin()));
create policy job_source_links_admin on public.btv_job_source_links for all to authenticated using((select public.btv_is_admin())) with check((select public.btv_is_admin()));
create policy job_admin_alerts_admin on public.btv_job_admin_alerts for all to authenticated using((select public.btv_is_admin())) with check((select public.btv_is_admin()));
create policy employer_submissions_owner_read on public.btv_employer_job_submissions for select to authenticated using(submitted_by=(select auth.uid()) or (select public.btv_is_admin()));
create policy employer_submissions_create on public.btv_employer_job_submissions for insert to authenticated with check(submitted_by=(select auth.uid()) and publication_authority_confirmed and status='pending_review');
create policy employer_submissions_admin_update on public.btv_employer_job_submissions for update to authenticated using((select public.btv_is_admin())) with check((select public.btv_is_admin()));
create policy job_audit_admin on public.btv_job_audit_log for select to authenticated using((select public.btv_is_admin()));
create policy job_audit_admin_insert on public.btv_job_audit_log for insert to authenticated with check((select public.btv_is_admin()));

grant select,insert,update,delete on public.btv_job_alerts to authenticated;
grant select,insert on public.btv_employer_job_submissions to authenticated;
grant update,delete on public.btv_employer_job_submissions to authenticated;
grant select,insert,update,delete on public.btv_job_source_links,public.btv_job_admin_alerts to authenticated;
grant select,insert on public.btv_job_audit_log to authenticated;

create or replace function public.btv_global_jobs_admin_summary()
returns jsonb language sql security definer set search_path=public as $$
 select case when public.btv_is_admin() then jsonb_build_object(
  'sources',(select count(*) from public.btv_approved_sources where source_type='job'),
  'active_sources',(select count(*) from public.btv_approved_sources where source_type='job' and enabled and permission_status='approved'),
  'active_jobs',(select count(*) from public.btv_jobs where opportunity_type='job' and status in ('published','active','closing_soon') and (closing_at is null or closing_at>=now())),
  'expired_jobs',(select count(*) from public.btv_jobs where opportunity_type='job' and status in ('expired','withdrawn','archived')),
  'review_jobs',(select count(*) from public.btv_jobs where opportunity_type='job' and status in ('draft','review','pending_review')),
  'open_alerts',(select count(*) from public.btv_job_admin_alerts where status='open'),
  'sponsorship_unknown',(select count(*) from public.btv_jobs where opportunity_type='job' and status in ('published','active','closing_soon') and sponsorship_status in ('not_stated','unclear'))
 ) else null end;
$$;
revoke all on function public.btv_global_jobs_admin_summary() from public,anon;
grant execute on function public.btv_global_jobs_admin_summary() to authenticated;

comment on table public.btv_approved_sources is 'Authorised job/funding source registry. Credentials are never stored here.';
comment on table public.btv_job_alerts is 'Country-scoped alerts; changing pathway never rewrites existing alert countries.';
comment on column public.btv_jobs.country_code is 'ISO 3166-1 alpha-2 destination country code.';
comment on column public.btv_jobs.salary_currency is 'ISO 4217 salary currency; no automatic conversion is performed.';
