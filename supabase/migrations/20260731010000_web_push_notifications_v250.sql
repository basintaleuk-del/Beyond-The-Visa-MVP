-- Production web push and in-site notification upgrade.
-- Extends the established notification tables; it does not create a second auth,
-- profile, role, destination or member-notification system.

alter table public.push_subscriptions
  add column if not exists browser text,
  add column if not exists device_type text,
  add column if not exists operating_system text,
  add column if not exists permission_status text not null default 'granted',
  add column if not exists is_active boolean not null default true,
  add column if not exists failed_delivery_count integer not null default 0,
  add column if not exists revoked_at timestamptz;

alter table public.notification_preferences
  add column if not exists in_app_enabled boolean not null default true,
  add column if not exists frequency text not null default 'immediate',
  add column if not exists job_alerts_enabled boolean not null default true,
  add column if not exists visa_updates_enabled boolean not null default true,
  add column if not exists mentor_messages_enabled boolean not null default true,
  add column if not exists booking_updates_enabled boolean not null default true,
  add column if not exists learning_reminders_enabled boolean not null default true,
  add column if not exists marketing_enabled boolean not null default false,
  add column if not exists account_alerts_enabled boolean not null default true,
  add column if not exists quiet_hours_enabled boolean not null default false;

alter table public.notifications
  add column if not exists priority text not null default 'normal',
  add column if not exists image_url text,
  add column if not exists icon_url text,
  add column if not exists expires_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists dismissed_at timestamptz,
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists notification_tag text,
  add column if not exists dedupe_key text;

alter table public.notification_delivery_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists attempt_number integer not null default 1,
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.notification_campaigns(
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 1 and 120),
  body text not null check(char_length(body) between 1 and 240),
  category text not null check(category in (
    'jobs','visa','mentor_message','booking','learning','course','mock','application',
    'account','billing','coins','announcement','administrative'
  )),
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  target_url text not null default '/',
  image_url text,
  icon_url text,
  created_by uuid not null references auth.users(id),
  status text not null default 'draft' check(status in ('draft','scheduled','processing','sent','cancelled','failed')),
  delivery_channels text[] not null default array['in_app','push']::text[],
  scheduled_for timestamptz,
  expires_at timestamptz,
  targeting_rules jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  locked_at timestamptz,
  sent_at timestamptz,
  audience_count integer not null default 0,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  opened_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(target_url ~ '^/(?!/)[A-Za-z0-9_?&=#%./-]*$'),
  check(expires_at is null or scheduled_for is null or expires_at > scheduled_for)
);

alter table public.notifications
  add column if not exists campaign_id uuid references public.notification_campaigns(id) on delete set null;

create table if not exists public.notification_job_matches(
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.btv_jobs(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  matched_at timestamptz not null default now(),
  primary key(user_id,job_id)
);

create unique index if not exists push_subscriptions_endpoint_uidx on public.push_subscriptions(endpoint);
create index if not exists push_subscriptions_active_user_idx on public.push_subscriptions(user_id,is_active,enabled);
create index if not exists notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null and dismissed_at is null;
create unique index if not exists notifications_user_dedupe_uidx on public.notifications(user_id,dedupe_key);
create index if not exists notification_campaigns_due_idx on public.notification_campaigns(status,scheduled_for) where status in ('scheduled','processing');
create index if not exists notification_delivery_logs_notification_idx on public.notification_delivery_logs(notification_id,attempted_at desc);
create index if not exists notification_delivery_logs_subscription_idx on public.notification_delivery_logs(subscription_id,attempted_at desc);

alter table public.notification_campaigns enable row level security;
alter table public.notification_job_matches enable row level security;

drop policy if exists notification_campaigns_admin_read on public.notification_campaigns;
create policy notification_campaigns_admin_read on public.notification_campaigns
  for select to authenticated using(public.btv_is_admin());
drop policy if exists notification_campaigns_admin_write on public.notification_campaigns;
create policy notification_campaigns_admin_write on public.notification_campaigns
  for all to authenticated using(public.btv_is_admin()) with check(public.btv_is_admin());
drop policy if exists notification_job_matches_owner_read on public.notification_job_matches;
create policy notification_job_matches_owner_read on public.notification_job_matches
  for select to authenticated using(user_id=(select auth.uid()) or public.btv_is_admin());

revoke all on public.notification_campaigns,public.notification_job_matches from anon;
grant select,insert,update,delete on public.notification_campaigns to authenticated;
grant select on public.notification_job_matches to authenticated;
grant all on public.notification_campaigns,public.notification_job_matches to service_role;

create or replace function public.btv_notification_register_subscription(
  p_endpoint text,p_p256dh text,p_auth_key text,p_user_agent text,
  p_browser text default null,p_device_type text default null,p_operating_system text default null
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=(select auth.uid()); sid uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint)>2048 then raise exception 'Invalid push endpoint'; end if;
  if char_length(p_p256dh) not between 40 and 200 or char_length(p_auth_key) not between 8 and 100 then raise exception 'Invalid push keys'; end if;
  insert into public.push_subscriptions(
    user_id,endpoint,p256dh,auth_key,user_agent,browser,device_type,operating_system,
    enabled,is_active,permission_status,failed_delivery_count,revoked_at,last_used_at,updated_at
  ) values(
    uid,p_endpoint,p_p256dh,p_auth_key,left(p_user_agent,600),left(p_browser,80),left(p_device_type,80),left(p_operating_system,80),
    true,true,'granted',0,null,now(),now()
  )
  on conflict(endpoint) do update set
    user_id=uid,p256dh=excluded.p256dh,auth_key=excluded.auth_key,user_agent=excluded.user_agent,
    browser=excluded.browser,device_type=excluded.device_type,operating_system=excluded.operating_system,
    enabled=true,is_active=true,permission_status='granted',failed_delivery_count=0,revoked_at=null,last_used_at=now(),updated_at=now()
  returning id into sid;
  return sid;
end $$;

create or replace function public.btv_notification_disable_subscription(p_endpoint text)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  update public.push_subscriptions set enabled=false,is_active=false,permission_status='denied',revoked_at=now(),updated_at=now()
  where user_id=(select auth.uid()) and endpoint=p_endpoint;
  return found;
end $$;

create or replace function public.btv_notification_save_preferences(p_preferences jsonb)
returns public.notification_preferences
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=(select auth.uid()); result public.notification_preferences;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into public.notification_preferences(
    user_id,push_enabled,email_enabled,in_app_enabled,frequency,
    job_alerts_enabled,visa_updates_enabled,mentor_messages_enabled,booking_updates_enabled,
    learning_reminders_enabled,marketing_enabled,account_alerts_enabled,
    quiet_hours_enabled,quiet_start,quiet_end,timezone,categories,updated_at
  ) values(
    uid,
    coalesce((p_preferences->>'push_enabled')::boolean,false),
    coalesce((p_preferences->>'email_enabled')::boolean,false),
    coalesce((p_preferences->>'in_app_enabled')::boolean,true),
    case when p_preferences->>'frequency' in ('immediate','daily','weekly','none') then p_preferences->>'frequency' else 'immediate' end,
    coalesce((p_preferences->>'job_alerts_enabled')::boolean,true),
    coalesce((p_preferences->>'visa_updates_enabled')::boolean,true),
    coalesce((p_preferences->>'mentor_messages_enabled')::boolean,true),
    coalesce((p_preferences->>'booking_updates_enabled')::boolean,true),
    coalesce((p_preferences->>'learning_reminders_enabled')::boolean,true),
    coalesce((p_preferences->>'marketing_enabled')::boolean,false),
    true,
    coalesce((p_preferences->>'quiet_hours_enabled')::boolean,false),
    nullif(p_preferences->>'quiet_start','')::time,
    nullif(p_preferences->>'quiet_end','')::time,
    left(coalesce(nullif(p_preferences->>'timezone',''),'UTC'),80),
    jsonb_build_object(
      'jobs',coalesce((p_preferences->>'job_alerts_enabled')::boolean,true),
      'visa',coalesce((p_preferences->>'visa_updates_enabled')::boolean,true),
      'mentor_message',coalesce((p_preferences->>'mentor_messages_enabled')::boolean,true),
      'booking',coalesce((p_preferences->>'booking_updates_enabled')::boolean,true),
      'learning',coalesce((p_preferences->>'learning_reminders_enabled')::boolean,true),
      'announcement',coalesce((p_preferences->>'marketing_enabled')::boolean,false),
      'account',true
    ),
    now()
  )
  on conflict(user_id) do update set
    push_enabled=excluded.push_enabled,email_enabled=excluded.email_enabled,in_app_enabled=excluded.in_app_enabled,
    frequency=excluded.frequency,job_alerts_enabled=excluded.job_alerts_enabled,visa_updates_enabled=excluded.visa_updates_enabled,
    mentor_messages_enabled=excluded.mentor_messages_enabled,booking_updates_enabled=excluded.booking_updates_enabled,
    learning_reminders_enabled=excluded.learning_reminders_enabled,marketing_enabled=excluded.marketing_enabled,
    account_alerts_enabled=true,quiet_hours_enabled=excluded.quiet_hours_enabled,quiet_start=excluded.quiet_start,
    quiet_end=excluded.quiet_end,timezone=excluded.timezone,categories=excluded.categories,updated_at=now()
  returning * into result;
  return result;
end $$;

create or replace function public.btv_notification_mark_opened(p_notification uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare destination text;
begin
  update public.notifications set read_at=coalesce(read_at,now()),opened_at=coalesce(opened_at,now())
  where id=p_notification and user_id=(select auth.uid()) and dismissed_at is null
  returning action_url into destination;
  return coalesce(destination,'/');
end $$;

create or replace function public.btv_notification_dismiss(p_notification uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  update public.notifications set dismissed_at=now(),read_at=coalesce(read_at,now())
  where id=p_notification and user_id=(select auth.uid());
  return found;
end $$;

create or replace function public.btv_notification_admin_audience_count(p_campaign uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare rules jsonb; total integer;
begin
  if not public.btv_is_admin() then raise exception 'Administrator access required'; end if;
  select targeting_rules into rules from public.notification_campaigns where id=p_campaign;
  if not found then raise exception 'Notification campaign not found'; end if;
  select count(*) into total
  from public.profiles p
  left join public.notification_preferences pref on pref.user_id=p.id
  where (not (rules?'destination_country') or lower(coalesce(p.destination_country,p.destination,''))=lower(rules->>'destination_country'))
    and (not (rules?'role') or lower(coalesce(p.role,''))=lower(rules->>'role'))
    and (not (rules?'account_type') or lower(coalesce(p.account_type,''))=lower(rules->>'account_type'))
    and (not (rules?'profession') or lower(coalesce(p.profession,'')) like '%'||lower(rules->>'profession')||'%')
    and (not (rules?'user_id') or p.id=(rules->>'user_id')::uuid)
    and coalesce(pref.in_app_enabled,true);
  return total;
end $$;

revoke all on function public.btv_notification_register_subscription(text,text,text,text,text,text,text) from public,anon;
revoke all on function public.btv_notification_disable_subscription(text) from public,anon;
revoke all on function public.btv_notification_save_preferences(jsonb) from public,anon;
revoke all on function public.btv_notification_mark_opened(uuid) from public,anon;
revoke all on function public.btv_notification_dismiss(uuid) from public,anon;
revoke all on function public.btv_notification_admin_audience_count(uuid) from public,anon;
grant execute on function public.btv_notification_register_subscription(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.btv_notification_disable_subscription(text) to authenticated;
grant execute on function public.btv_notification_save_preferences(jsonb) to authenticated;
grant execute on function public.btv_notification_mark_opened(uuid) to authenticated;
grant execute on function public.btv_notification_dismiss(uuid) to authenticated;
grant execute on function public.btv_notification_admin_audience_count(uuid) to authenticated;
