-- Beyond The Visa manager inbox
-- Run this once in Supabase SQL Editor after BTV-ADMIN-SETUP.sql.

create table if not exists public.manager_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in (
    'interview_booking','cv_request','contact','feedback',
    'bug_report','feature_request','zibur_question','premium_request'
  )),
  subject text not null,
  message text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','in_progress','waiting','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  source text not null default 'web_app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manager_requests_created_idx
  on public.manager_requests(created_at desc);
create index if not exists manager_requests_status_idx
  on public.manager_requests(status,request_type,created_at desc);
create index if not exists manager_requests_user_idx
  on public.manager_requests(user_id,created_at desc);

alter table public.manager_requests enable row level security;

drop policy if exists "Users create manager requests" on public.manager_requests;
create policy "Users create manager requests"
on public.manager_requests for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users read own manager requests" on public.manager_requests;
create policy "Users read own manager requests"
on public.manager_requests for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Admins update manager requests" on public.manager_requests;
create policy "Admins update manager requests"
on public.manager_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete manager requests" on public.manager_requests;
create policy "Admins delete manager requests"
on public.manager_requests for delete to authenticated
using (public.is_admin());

create or replace function public.touch_manager_request()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_manager_request_trigger on public.manager_requests;
create trigger touch_manager_request_trigger
before update on public.manager_requests
for each row execute function public.touch_manager_request();

