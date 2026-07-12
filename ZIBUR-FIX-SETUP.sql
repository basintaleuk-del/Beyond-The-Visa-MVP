-- Beyond The Visa – Zibur support table
-- Safe to run more than once.
create table if not exists public.edge_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists edge_usage_lookup
  on public.edge_usage_events(user_id, action, created_at desc);

alter table public.edge_usage_events enable row level security;

-- Browser users do not need direct access. The Edge Function uses the service role.
revoke all on public.edge_usage_events from anon, authenticated;
