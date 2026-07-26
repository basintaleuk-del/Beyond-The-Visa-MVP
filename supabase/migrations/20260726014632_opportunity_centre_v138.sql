-- Opportunity Centre v138
-- Non-destructive: btv_jobs remains the authoritative record and btv_saved_jobs
-- keeps every existing save. Rollback by dropping the v138 policies, indexes,
-- btv_opportunity_dismissals / btv_opportunity_employers, and only then removing
-- the added btv_jobs columns after confirming no opportunity data depends on them.

create table if not exists public.btv_opportunity_employers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  country_code text not null,
  website_url text,
  description text,
  verified boolean not null default false,
  sponsorship_status text not null default 'not_stated'
    check (sponsorship_status in ('confirmed','may_be_available','not_stated')),
  relocation_support boolean,
  accommodation_support boolean,
  development_opportunities text,
  last_checked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.btv_jobs
  add column if not exists opportunity_type text not null default 'job',
  add column if not exists summary text,
  add column if not exists description text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists profession text not null default 'both',
  add column if not exists employer_id uuid references public.btv_opportunity_employers(id) on delete set null,
  add column if not exists provider_name text,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists registration_url text,
  add column if not exists sponsorship_status text not null default 'not_stated',
  add column if not exists remote_interview boolean,
  add column if not exists graduate_friendly boolean,
  add column if not exists internationally_educated_friendly boolean,
  add column if not exists published_at timestamptz,
  add column if not exists closing_at timestamptz,
  add column if not exists event_start_at timestamptz,
  add column if not exists event_end_at timestamptz,
  add column if not exists event_timezone text,
  add column if not exists verified boolean not null default false,
  add column if not exists featured boolean not null default false,
  add column if not exists source_identifier text,
  add column if not exists last_checked_at timestamptz,
  add column if not exists expired_at timestamptz;

alter table public.btv_jobs drop constraint if exists btv_jobs_opportunity_type_check;
alter table public.btv_jobs add constraint btv_jobs_opportunity_type_check
  check (opportunity_type in ('job','scholarship','event','registration_update','immigration_update','employer_campaign','learning','journey_action'));
alter table public.btv_jobs drop constraint if exists btv_jobs_profession_check;
alter table public.btv_jobs add constraint btv_jobs_profession_check
  check (profession in ('nurse','midwife','both'));
alter table public.btv_jobs drop constraint if exists btv_jobs_sponsorship_status_check;
alter table public.btv_jobs add constraint btv_jobs_sponsorship_status_check
  check (sponsorship_status in ('confirmed','may_be_available','not_stated'));
alter table public.btv_jobs drop constraint if exists btv_jobs_status_v138_check;
alter table public.btv_jobs add constraint btv_jobs_status_v138_check
  check (status in ('draft','review','published','expired','archived'));

update public.btv_jobs
set sponsorship_status = case when visa_sponsorship then 'confirmed' else 'not_stated' end,
    published_at = coalesce(published_at, created_at),
    source_name = coalesce(source_name, employer),
    source_url = coalesce(source_url, application_url),
    closing_at = coalesce(closing_at, closing_date::timestamptz)
where sponsorship_status = 'not_stated' or published_at is null or source_name is null;

create table if not exists public.btv_opportunity_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.btv_jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- Verification notes are deliberately isolated from the public opportunity row.
create table if not exists public.btv_opportunity_source_reviews (
  opportunity_id uuid primary key references public.btv_jobs(id) on delete cascade,
  verified_by uuid not null references auth.users(id),
  verification_notes text,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists btv_jobs_opportunity_feed_idx
  on public.btv_jobs(status, opportunity_type, country, published_at desc);
create index if not exists btv_jobs_recommendation_idx
  on public.btv_jobs(country, profession, specialty, sponsorship_status, featured, published_at desc)
  where status = 'published';
create index if not exists btv_jobs_closing_idx
  on public.btv_jobs(closing_at) where status = 'published';
create unique index if not exists btv_jobs_source_record_uq
  on public.btv_jobs(source_name, source_identifier)
  where source_identifier is not null;
create unique index if not exists btv_jobs_source_url_uq
  on public.btv_jobs(source_url) where source_url is not null;
create index if not exists btv_saved_jobs_user_saved_idx
  on public.btv_saved_jobs(user_id, saved_at desc);
create index if not exists btv_opportunity_employers_country_idx
  on public.btv_opportunity_employers(country_code, verified, name);
create index if not exists btv_jobs_created_by_idx on public.btv_jobs(created_by);
create index if not exists btv_jobs_employer_id_idx on public.btv_jobs(employer_id);
create index if not exists btv_saved_jobs_job_id_idx on public.btv_saved_jobs(job_id);
create index if not exists btv_opportunity_employers_created_by_idx on public.btv_opportunity_employers(created_by);
create index if not exists btv_opportunity_dismissals_opportunity_id_idx on public.btv_opportunity_dismissals(opportunity_id);
create index if not exists btv_opportunity_source_reviews_verified_by_idx on public.btv_opportunity_source_reviews(verified_by);
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'btv_jobs' and column_name = 'verified_by'
  ) then
    execute 'create index if not exists btv_jobs_verified_by_idx on public.btv_jobs(verified_by)';
  end if;
end $$;

alter table public.btv_opportunity_employers enable row level security;
alter table public.btv_opportunity_dismissals enable row level security;
alter table public.btv_opportunity_source_reviews enable row level security;

drop policy if exists jobs_read on public.btv_jobs;
create policy jobs_read on public.btv_jobs for select to anon, authenticated
using (
  (status = 'published' and expired_at is null and (closing_at is null or closing_at >= now()))
  or (select public.btv_is_admin())
);

drop policy if exists phase7_admin_manage on public.btv_jobs;
drop policy if exists jobs_admin_insert on public.btv_jobs;
drop policy if exists jobs_admin_update on public.btv_jobs;
drop policy if exists jobs_admin_delete on public.btv_jobs;
create policy jobs_admin_insert on public.btv_jobs for insert to authenticated
with check ((select public.btv_is_admin()));
create policy jobs_admin_update on public.btv_jobs for update to authenticated
using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy jobs_admin_delete on public.btv_jobs for delete to authenticated
using ((select public.btv_is_admin()));

drop policy if exists opportunity_employers_read on public.btv_opportunity_employers;
create policy opportunity_employers_read on public.btv_opportunity_employers for select to anon, authenticated
using (verified or (select public.btv_is_admin()));
drop policy if exists opportunity_employers_admin on public.btv_opportunity_employers;
drop policy if exists opportunity_employers_admin_insert on public.btv_opportunity_employers;
drop policy if exists opportunity_employers_admin_update on public.btv_opportunity_employers;
drop policy if exists opportunity_employers_admin_delete on public.btv_opportunity_employers;
create policy opportunity_employers_admin_insert on public.btv_opportunity_employers for insert to authenticated
with check ((select public.btv_is_admin()));
create policy opportunity_employers_admin_update on public.btv_opportunity_employers for update to authenticated
using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy opportunity_employers_admin_delete on public.btv_opportunity_employers for delete to authenticated
using ((select public.btv_is_admin()));

drop policy if exists opportunity_dismissals_select on public.btv_opportunity_dismissals;
create policy opportunity_dismissals_select on public.btv_opportunity_dismissals for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists opportunity_dismissals_insert on public.btv_opportunity_dismissals;
create policy opportunity_dismissals_insert on public.btv_opportunity_dismissals for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists opportunity_dismissals_delete on public.btv_opportunity_dismissals;
create policy opportunity_dismissals_delete on public.btv_opportunity_dismissals for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists opportunity_source_reviews_admin on public.btv_opportunity_source_reviews;
create policy opportunity_source_reviews_admin on public.btv_opportunity_source_reviews for all to authenticated
using ((select public.btv_is_admin()))
with check ((select public.btv_is_admin()));

-- Replace broad legacy save policies with explicit owner-only policies.
drop policy if exists saved_jobs_write on public.btv_saved_jobs;
drop policy if exists own_data on public.btv_saved_jobs;
drop policy if exists saved_jobs_select on public.btv_saved_jobs;
drop policy if exists saved_jobs_insert on public.btv_saved_jobs;
drop policy if exists saved_jobs_delete on public.btv_saved_jobs;
create policy saved_jobs_select on public.btv_saved_jobs for select to authenticated
using ((select auth.uid()) = user_id or (select public.btv_is_admin()));
create policy saved_jobs_insert on public.btv_saved_jobs for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy saved_jobs_delete on public.btv_saved_jobs for delete to authenticated
using ((select auth.uid()) = user_id);

grant select on public.btv_jobs, public.btv_opportunity_employers to anon, authenticated;
grant insert, update, delete on public.btv_jobs, public.btv_opportunity_employers to authenticated;
grant select, insert, delete on public.btv_saved_jobs, public.btv_opportunity_dismissals to authenticated;
grant select, insert, update, delete on public.btv_opportunity_source_reviews to authenticated;
