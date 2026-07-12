-- Beyond The Visa Edge Functions database support. Run once in Supabase SQL Editor.
create table if not exists public.edge_usage_events(id bigint generated always as identity primary key,user_id uuid not null,action text not null,created_at timestamptz not null default now());
create index if not exists edge_usage_lookup on public.edge_usage_events(user_id,action,created_at desc);
alter table public.edge_usage_events enable row level security;

create table if not exists public.edge_mock_results(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,exam_type text not null check(exam_type in ('cbt','nclex')),score integer not null,total integer not null,percentage integer not null,weak_topics jsonb not null default '[]',answers jsonb not null default '[]',created_at timestamptz not null default now());
alter table public.edge_mock_results enable row level security;
drop policy if exists "users read own edge mock results" on public.edge_mock_results;
create policy "users read own edge mock results" on public.edge_mock_results for select to authenticated using(user_id=(select auth.uid()));

create table if not exists public.study_plans(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,title text not null,goal text,exam_type text,destination text,weeks jsonb not null,summary text,model text,created_at timestamptz not null default now());
alter table public.study_plans enable row level security;
drop policy if exists "users read own study plans" on public.study_plans;
drop policy if exists "users delete own study plans" on public.study_plans;
create policy "users read own study plans" on public.study_plans for select to authenticated using(user_id=(select auth.uid()));
create policy "users delete own study plans" on public.study_plans for delete to authenticated using(user_id=(select auth.uid()));

create table if not exists public.edge_email_events(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,template text not null,provider_id text,created_at timestamptz not null default now());
alter table public.edge_email_events enable row level security;

create table if not exists public.service_catalog(code text primary key,name text not null,stripe_price_id text,active boolean not null default false,created_at timestamptz not null default now());
alter table public.service_catalog enable row level security;
drop policy if exists "authenticated users read active services" on public.service_catalog;
create policy "authenticated users read active services" on public.service_catalog for select to authenticated using(active=true);
insert into public.service_catalog(code,name,active) values ('premium_membership','Beyond The Visa Premium',false),('mock_interview','Mock interview coaching',false),('cv_writing','Professional CV writing',false) on conflict(code) do nothing;

create table if not exists public.payments(id uuid primary key default gen_random_uuid(),provider_event_id text not null unique,user_id uuid not null references auth.users(id) on delete cascade,service_code text references public.service_catalog(code),status text not null,amount_total integer,currency text,checkout_session_id text,created_at timestamptz not null default now());
alter table public.payments enable row level security;
drop policy if exists "users read own payments" on public.payments;
create policy "users read own payments" on public.payments for select to authenticated using(user_id=(select auth.uid()));

-- Keep service_catalog inactive until genuine Stripe Price IDs are added.
-- Example only after Stripe setup:
-- update service_catalog set stripe_price_id='price_...',active=true where code='mock_interview';
