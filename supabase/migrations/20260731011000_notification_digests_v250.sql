create table if not exists public.notification_digest_queue(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  frequency text not null check(frequency in ('daily','weekly','quiet_hours')),
  deliver_after timestamptz not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,notification_id)
);
create index if not exists notification_digest_due_idx on public.notification_digest_queue(deliver_after) where delivered_at is null;
alter table public.notification_digest_queue enable row level security;
drop policy if exists notification_digest_owner_read on public.notification_digest_queue;
create policy notification_digest_owner_read on public.notification_digest_queue
  for select to authenticated using(user_id=(select auth.uid()) or public.btv_is_admin());
revoke all on public.notification_digest_queue from anon;
grant select on public.notification_digest_queue to authenticated;
grant all on public.notification_digest_queue to service_role;
