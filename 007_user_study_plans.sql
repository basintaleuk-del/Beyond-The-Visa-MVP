-- Beyond The Visa: save and restore one user's study plans across devices.
create extension if not exists pgcrypto;

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My study plan',
  goal text,
  exam_type text,
  destination text,
  weeks jsonb not null default '[]'::jsonb,
  summary text,
  model text,
  plan_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_plans add column if not exists plan_data jsonb;
alter table public.study_plans add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.study_plans add column if not exists title text default 'My study plan';
alter table public.study_plans add column if not exists goal text;
alter table public.study_plans add column if not exists exam_type text;
alter table public.study_plans add column if not exists destination text;
alter table public.study_plans add column if not exists weeks jsonb default '[]'::jsonb;
alter table public.study_plans add column if not exists summary text;
alter table public.study_plans add column if not exists model text;
alter table public.study_plans add column if not exists created_at timestamptz not null default now();
alter table public.study_plans add column if not exists updated_at timestamptz not null default now();
create index if not exists study_plans_user_created_idx on public.study_plans(user_id,created_at desc);
alter table public.study_plans enable row level security;

drop policy if exists "Users read own study plans" on public.study_plans;
create policy "Users read own study plans" on public.study_plans for select to authenticated using (auth.uid()=user_id);
drop policy if exists "Users create own study plans" on public.study_plans;
create policy "Users create own study plans" on public.study_plans for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "Users update own study plans" on public.study_plans;
create policy "Users update own study plans" on public.study_plans for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users delete own study plans" on public.study_plans;
create policy "Users delete own study plans" on public.study_plans for delete to authenticated using (auth.uid()=user_id);

grant select,insert,update,delete on public.study_plans to authenticated;
