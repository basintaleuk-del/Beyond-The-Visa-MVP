-- Already run in your Supabase project. Keep this file for reference.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  profession text,
  qualification_country text,
  destination text,
  registration_stage text,
  job_status text,
  dependants text,
  account_type text not null default 'free' check (account_type in ('free','premium')),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
