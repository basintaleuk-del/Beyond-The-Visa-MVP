-- Privacy-conscious engagement telemetry for the protected admin user console.
-- Online means the member has sent a heartbeat in the last two minutes.

create table if not exists public.btv_user_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  current_screen text,
  last_event text,
  user_agent_family text,
  created_at timestamptz not null default now(),
  constraint btv_user_sessions_screen_length check (char_length(current_screen) <= 160),
  constraint btv_user_sessions_event_length check (char_length(last_event) <= 80),
  constraint btv_user_sessions_time_order check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.btv_user_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.btv_user_sessions(id) on delete cascade,
  event_type text not null,
  screen text,
  action_key text,
  occurred_at timestamptz not null default now(),
  constraint btv_user_activity_event_type check (event_type in ('session_start','screen_view','interaction','session_end')),
  constraint btv_user_activity_screen_length check (char_length(screen) <= 160),
  constraint btv_user_activity_action_length check (char_length(action_key) <= 120)
);

create index if not exists btv_user_sessions_user_last_seen_idx
  on public.btv_user_sessions(user_id, last_seen_at desc);
create index if not exists btv_user_sessions_online_idx
  on public.btv_user_sessions(last_seen_at desc) where ended_at is null;
create index if not exists btv_user_activity_user_time_idx
  on public.btv_user_activity_events(user_id, occurred_at desc);
create index if not exists btv_user_activity_session_time_idx
  on public.btv_user_activity_events(session_id, occurred_at desc);

alter table public.btv_user_sessions enable row level security;
alter table public.btv_user_activity_events enable row level security;

drop policy if exists "members read own engagement sessions" on public.btv_user_sessions;
create policy "members read own engagement sessions"
  on public.btv_user_sessions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "members read own engagement events" on public.btv_user_activity_events;
create policy "members read own engagement events"
  on public.btv_user_activity_events for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.btv_user_sessions from public, anon;
revoke all on table public.btv_user_activity_events from public, anon;
grant select on table public.btv_user_sessions to authenticated;
grant select on table public.btv_user_activity_events to authenticated;

create or replace function public.btv_record_user_activity(
  p_session_id uuid,
  p_event_type text,
  p_screen text default null,
  p_action_key text default null,
  p_user_agent_family text default null
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_screen text := nullif(left(trim(coalesce(p_screen,'')),160),'');
  v_action text := nullif(left(trim(coalesce(p_action_key,'')),120),'');
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_session_id is null then raise exception 'Session identifier required'; end if;
  if p_event_type not in ('session_start','screen_view','interaction','heartbeat','session_end') then
    raise exception 'Unsupported activity event';
  end if;

  select user_id into v_owner from public.btv_user_sessions where id=p_session_id;
  if v_owner is not null and v_owner <> v_user then raise exception 'Session ownership mismatch'; end if;

  insert into public.btv_user_sessions(id,user_id,current_screen,last_event,user_agent_family)
  values(p_session_id,v_user,v_screen,p_event_type,nullif(left(trim(coalesce(p_user_agent_family,'')),80),''))
  on conflict(id) do update set
    last_seen_at=now(),
    ended_at=case when p_event_type='session_end' then now() else null end,
    current_screen=coalesce(v_screen,btv_user_sessions.current_screen),
    last_event=p_event_type,
    user_agent_family=coalesce(nullif(left(trim(coalesce(p_user_agent_family,'')),80),''),btv_user_sessions.user_agent_family)
  where btv_user_sessions.user_id=v_user;

  if p_event_type <> 'heartbeat' then
    insert into public.btv_user_activity_events(user_id,session_id,event_type,screen,action_key)
    values(v_user,p_session_id,p_event_type,v_screen,v_action);
  end if;
end
$$;

create or replace function public.admin_user_engagement(
  p_search text default '',
  p_plan text default null,
  p_presence text default null,
  p_limit integer default 100,
  p_offset integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_result jsonb;
begin
  if not public.btv_is_admin() then raise exception 'Administrator access required'; end if;
  if p_presence is not null and p_presence not in ('online','offline') then raise exception 'Invalid presence filter'; end if;
  if p_plan is not null and p_plan not in ('free','premium') then raise exception 'Invalid plan filter'; end if;

  with session_rollup as (
    select s.user_id,
      count(*)::integer session_count,
      coalesce(sum(greatest(0,extract(epoch from (coalesce(s.ended_at,least(s.last_seen_at,now()))-s.started_at)))),0)::bigint total_seconds,
      max(s.last_seen_at) last_seen_at,
      bool_or(s.ended_at is null and s.last_seen_at >= now()-interval '2 minutes') online
    from public.btv_user_sessions s group by s.user_id
  ), last_session as (
    select distinct on(s.user_id) s.user_id,s.current_screen,s.last_event,s.user_agent_family
    from public.btv_user_sessions s order by s.user_id,s.last_seen_at desc
  ), event_rollup as (
    select e.user_id,count(*)::integer event_count,
      count(*) filter(where e.event_type='screen_view')::integer screen_views,
      count(*) filter(where e.event_type='interaction')::integer interactions
    from public.btv_user_activity_events e group by e.user_id
  ), people as (
    select p.id,u.email,p.full_name,p.profession,p.destination,p.account_type,p.role,
      coalesce(us.status,'active') status,p.created_at,u.last_sign_in_at,
      coalesce(sr.online,false) online,sr.last_seen_at,coalesce(sr.total_seconds,0) total_seconds,
      coalesce(sr.session_count,0) session_count,coalesce(er.event_count,0) event_count,
      coalesce(er.screen_views,0) screen_views,coalesce(er.interactions,0) interactions,
      ls.current_screen,ls.last_event,ls.user_agent_family
    from public.profiles p join auth.users u on u.id=p.id
    left join public.user_status us on us.user_id=p.id
    left join session_rollup sr on sr.user_id=p.id
    left join event_rollup er on er.user_id=p.id
    left join last_session ls on ls.user_id=p.id
    where (coalesce(p_search,'')='' or coalesce(p.full_name,'') ilike '%'||p_search||'%' or coalesce(u.email,'') ilike '%'||p_search||'%')
      and (p_plan is null or p.account_type=p_plan)
      and (p_presence is null or (p_presence='online' and coalesce(sr.online,false)) or (p_presence='offline' and not coalesce(sr.online,false)))
  ), page as (
    select * from people order by online desc,last_seen_at desc nulls last,created_at desc
    limit least(greatest(p_limit,1),200) offset greatest(p_offset,0)
  )
  select jsonb_build_object(
    'generated_at',now(),
    'online_window_seconds',120,
    'summary',jsonb_build_object(
      'total_users',(select count(*) from public.profiles),
      'online_now',(select count(distinct user_id) from public.btv_user_sessions where ended_at is null and last_seen_at>=now()-interval '2 minutes'),
      'active_today',(select count(distinct user_id) from public.btv_user_sessions where last_seen_at>=date_trunc('day',now())),
      'total_sessions',(select count(*) from public.btv_user_sessions),
      'average_session_seconds',coalesce((select round(avg(greatest(0,extract(epoch from(coalesce(ended_at,least(last_seen_at,now()))-started_at)))))::bigint from public.btv_user_sessions),0)
    ),
    'matched_users',(select count(*) from people),
    'users',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)
  ) into v_result;
  return v_result;
end
$$;

create or replace function public.admin_user_activity_timeline(
  p_user_id uuid,
  p_limit integer default 50
) returns table(event_type text,screen text,action_key text,occurred_at timestamptz,session_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.btv_is_admin() then raise exception 'Administrator access required'; end if;
  return query select e.event_type,e.screen,e.action_key,e.occurred_at,e.session_id
    from public.btv_user_activity_events e where e.user_id=p_user_id
    order by e.occurred_at desc limit least(greatest(p_limit,1),200);
end
$$;

revoke execute on function public.btv_record_user_activity(uuid,text,text,text,text) from public, anon;
grant execute on function public.btv_record_user_activity(uuid,text,text,text,text) to authenticated, service_role;
revoke execute on function public.admin_user_engagement(text,text,text,integer,integer) from public, anon;
grant execute on function public.admin_user_engagement(text,text,text,integer,integer) to authenticated, service_role;
revoke execute on function public.admin_user_activity_timeline(uuid,integer) from public, anon;
grant execute on function public.admin_user_activity_timeline(uuid,integer) to authenticated, service_role;
