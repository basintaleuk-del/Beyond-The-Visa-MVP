-- Contact-sharing prevention for the user-authored surfaces that exist today.
-- Detection rules live in the private schema. No raw attempted contact detail is retained.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  surface text not null,
  record_id text,
  event_type text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  decision text not null check (decision in ('allowed','redacted','quarantined','restricted')),
  matched_categories text[] not null default '{}',
  content_fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_sharing_attempts (
  id uuid primary key default gen_random_uuid(),
  moderation_event_id uuid not null references public.moderation_events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  surface text not null,
  record_id text,
  matched_categories text[] not null,
  content_fingerprint text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_moderation_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  warning_count integer not null default 0 check (warning_count >= 0),
  restriction_level integer not null default 0 check (restriction_level between 0 and 5),
  status text not null default 'clear' check (status in ('clear','warned','temporarily_restricted','permanently_restricted')),
  can_message boolean not null default true,
  can_book boolean not null default true,
  restricted_until timestamptz,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_risk_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_key text not null,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  signal_categories text[] not null default '{}',
  last_signal_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, conversation_key)
);

create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  moderation_event_id uuid references public.moderation_events(id) on delete set null,
  reason text not null check (char_length(reason) between 10 and 2000),
  status text not null default 'open' check (status in ('open','upheld','overturned','closed')),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moderation_events_user_created_idx on public.moderation_events(user_id, created_at desc);
create index if not exists moderation_events_decision_created_idx on public.moderation_events(decision, created_at desc);
create index if not exists contact_attempts_user_created_idx on public.contact_sharing_attempts(user_id, created_at desc);
create index if not exists moderation_appeals_status_created_idx on public.moderation_appeals(status, created_at);
create index if not exists conversation_risk_expiry_idx on public.conversation_risk_scores(expires_at);

alter table public.moderation_events enable row level security;
alter table public.contact_sharing_attempts enable row level security;
alter table public.user_moderation_status enable row level security;
alter table public.conversation_risk_scores enable row level security;
alter table public.moderation_appeals enable row level security;

create or replace function private.btv_contact_is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_catalog
as $$
  select coalesce(exists(
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin','super_admin','owner')
  ), false)
$$;

revoke all on function private.btv_contact_is_admin() from public, anon, authenticated;

drop policy if exists moderation_events_admin_read on public.moderation_events;
create policy moderation_events_admin_read on public.moderation_events for select to authenticated
using ((select private.btv_contact_is_admin()));
drop policy if exists contact_attempts_admin_read on public.contact_sharing_attempts;
create policy contact_attempts_admin_read on public.contact_sharing_attempts for select to authenticated
using ((select private.btv_contact_is_admin()));
drop policy if exists moderation_status_own_read on public.user_moderation_status;
create policy moderation_status_own_read on public.user_moderation_status for select to authenticated
using (user_id = (select auth.uid()) or (select private.btv_contact_is_admin()));
drop policy if exists conversation_risk_admin_read on public.conversation_risk_scores;
create policy conversation_risk_admin_read on public.conversation_risk_scores for select to authenticated
using ((select private.btv_contact_is_admin()));
drop policy if exists moderation_appeals_own_read on public.moderation_appeals;
create policy moderation_appeals_own_read on public.moderation_appeals for select to authenticated
using (user_id = (select auth.uid()) or (select private.btv_contact_is_admin()));
drop policy if exists moderation_appeals_own_insert on public.moderation_appeals;
create policy moderation_appeals_own_insert on public.moderation_appeals for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists moderation_appeals_admin_update on public.moderation_appeals;
create policy moderation_appeals_admin_update on public.moderation_appeals for update to authenticated
using ((select private.btv_contact_is_admin())) with check ((select private.btv_contact_is_admin()));

revoke all on public.moderation_events, public.contact_sharing_attempts, public.user_moderation_status,
  public.conversation_risk_scores, public.moderation_appeals from anon, authenticated;
grant select on public.user_moderation_status to authenticated;
grant select, insert, update on public.moderation_appeals to authenticated;
grant select on public.moderation_events, public.contact_sharing_attempts, public.conversation_risk_scores to authenticated;

create or replace function private.btv_contact_categories(p_content text)
returns text[] language plpgsql immutable
set search_path = pg_catalog
as $$
declare
  v text := lower(coalesce(p_content,''));
  v_digits text;
  categories text[] := '{}';
begin
  v := replace(replace(replace(v, chr(8203), ''), chr(8204), ''), chr(8205), '');
  v_digits := regexp_replace(v, '[^0-9]', '', 'g');

  if v ~ '[a-z0-9][a-z0-9._%+\-]{1,}@[a-z0-9][a-z0-9.\-]{1,}\.[a-z]{2,}'
     or v ~ '[a-z0-9][a-z0-9._%+\-]{1,}[[:space:]]*(\(|\[)?[[:space:]]*(at)[[:space:]]*(\)|\])?[[:space:]]*[a-z0-9][a-z0-9.\-]{1,}[[:space:]]*(\(|\[)?[[:space:]]*(dot)[[:space:]]*(\)|\])?[[:space:]]*[a-z]{2,}' then
    categories := array_append(categories,'email');
  end if;

  if v ~ '\+[0-9][0-9 ()\-]{6,}[0-9]'
     or (v ~ '(phone|mobile|call|text|sms|whats?app)[^a-z0-9]{0,12}' and char_length(v_digits) between 7 and 15)
     or v ~ '(^|[^0-9])0[1-9][0-9]{2,4}[ .()\-]+[0-9]{3,4}[ .()\-]+[0-9]{3,4}([^0-9]|$)'
     or v ~ '((zero|oh|one|two|three|four|five|six|seven|eight|nine)[[:space:],.\-]*){7,}' then
    categories := array_append(categories,'phone');
  end if;

  if v ~ '(whats?app|telegram|signal|instagram|snapchat|facebook|linkedin|tiktok)[[:space:]]*(me[[:space:]]*)?(at|:|@|\-)[[:space:]]*[a-z0-9_.]{3,}'
     or v ~ '(^|[^a-z0-9._%+\-])@[a-z][a-z0-9_.]{2,}' then
    categories := array_append(categories,'social_handle');
  end if;

  if v ~ '(https?://|www\.)'
     or v ~ '(zoom\.us|meet\.google\.com|teams\.microsoft\.com|calendly\.com|webex\.com)'
     or v ~ '[a-z0-9\-]{2,}[[:space:]]+dot[[:space:]]+(com|org|net|co|me|io)([[:space:]]+dot[[:space:]]+[a-z]{2,})?' then
    categories := array_append(categories,'external_link');
  end if;

  if v ~ '(paypal\.me|cash\.app|revolut|wise\.com|bank[[:space:]]+transfer|sort[[:space:]\-]*code|account[[:space:]\-]*number|pay[[:space:]]+me[[:space:]]+direct|outside[[:space:]]+(the[[:space:]]+)?platform)' then
    categories := array_append(categories,'external_payment');
  end if;

  if v ~ '(contact|call|text|email|message|dm|reach)[[:space:]]+me[[:space:]]+(directly|privately|outside|off[[:space:]\-]*platform)'
     or v ~ '(take|move|continue)[[:space:]]+(this|the)[[:space:]]+(chat|conversation|booking)[[:space:]]+(outside|off)'
     or v ~ 'avoid[[:space:]]+(the[[:space:]]+)?(fee|platform|commission)' then
    categories := array_append(categories,'circumvention_intent');
  end if;

  return categories;
end
$$;

revoke all on function private.btv_contact_categories(text) from public, anon, authenticated;

create or replace function private.btv_record_contact_attempt(
  p_user uuid, p_surface text, p_record_id text, p_content text, p_categories text[], p_decision text default 'quarantined'
) returns uuid language plpgsql security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_event uuid;
  v_count integer;
  v_level integer;
  v_until timestamptz;
  v_status text;
begin
  if p_user is null or coalesce(array_length(p_categories,1),0)=0 then return null; end if;

  insert into public.moderation_events(user_id,surface,record_id,event_type,severity,decision,matched_categories,content_fingerprint)
  values(p_user,left(p_surface,80),left(p_record_id,160),'contact_sharing_attempt','high',p_decision,p_categories,md5(coalesce(p_content,'')))
  returning id into v_event;

  insert into public.contact_sharing_attempts(moderation_event_id,user_id,surface,record_id,matched_categories,content_fingerprint)
  values(v_event,p_user,left(p_surface,80),left(p_record_id,160),p_categories,md5(coalesce(p_content,'')));

  insert into public.user_moderation_status(user_id,warning_count,restriction_level,status,last_event_at,updated_at)
  values(p_user,1,1,'warned',now(),now())
  on conflict(user_id) do update set
    warning_count=public.user_moderation_status.warning_count+1,
    last_event_at=now(), updated_at=now()
  returning warning_count into v_count;

  v_level := least(v_count,5);
  v_until := case v_count when 2 then now()+interval '24 hours' when 3 then now()+interval '7 days' when 4 then now()+interval '30 days' else null end;
  v_status := case when v_count=1 then 'warned' when v_count between 2 and 4 then 'temporarily_restricted' else 'permanently_restricted' end;
  update public.user_moderation_status set
    restriction_level=v_level,
    status=v_status,
    can_message=(v_count=1),
    can_book=(v_count=1),
    restricted_until=v_until,
    updated_at=now()
  where user_id=p_user;

  insert into public.conversation_risk_scores(user_id,conversation_key,risk_score,signal_categories,last_signal_at,expires_at)
  values(p_user,left(p_surface,80),least(100,20+10*coalesce(array_length(p_categories,1),1)),p_categories,now(),now()+interval '24 hours')
  on conflict(user_id,conversation_key) do update set
    risk_score=least(100,public.conversation_risk_scores.risk_score+20+10*coalesce(array_length(excluded.signal_categories,1),1)),
    signal_categories=(select array_agg(distinct x) from unnest(public.conversation_risk_scores.signal_categories||excluded.signal_categories) x),
    last_signal_at=now(),expires_at=now()+interval '24 hours',updated_at=now();
  return v_event;
end
$$;

revoke all on function private.btv_record_contact_attempt(uuid,text,text,text,text[],text) from public, anon, authenticated;

create or replace function public.btv_check_contact_sharing(p_surface text, p_content text)
returns jsonb language plpgsql security invoker
set search_path = public, private, pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  v_categories text[] := private.btv_contact_categories(p_content);
  v_status public.user_moderation_status%rowtype;
  v_restricted boolean := false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_status from public.user_moderation_status where user_id=v_user;
  v_restricted := found and v_status.status in ('temporarily_restricted','permanently_restricted')
    and (v_status.restricted_until is null or v_status.restricted_until>now());
  return jsonb_build_object(
    'allowed',not v_restricted and coalesce(array_length(v_categories,1),0)=0,
    'reason',case when v_restricted then 'restricted' when coalesce(array_length(v_categories,1),0)>0 then 'contact_sharing' else null end,
    'message',case when v_restricted then 'Your account is temporarily restricted from messages and bookings. Use the moderation appeal option if you believe this is a mistake.' when coalesce(array_length(v_categories,1),0)>0 then 'Keep conversations and bookings on Beyond The Visa. Remove phone numbers, email addresses, social handles, external links or payment details and try again.' else null end
  );
end
$$;

revoke all on function public.btv_check_contact_sharing(text,text) from public, anon;
grant execute on function public.btv_check_contact_sharing(text,text) to authenticated;

create or replace function public.btv_enforce_contact_sharing(p_surface text, p_content text, p_user uuid default null)
returns jsonb language plpgsql security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_role text := coalesce(auth.role(),'');
  v_user uuid;
  v_categories text[] := private.btv_contact_categories(p_content);
  v_status public.user_moderation_status%rowtype;
  v_restricted boolean := false;
begin
  if v_role='service_role' then v_user:=p_user;
  elsif v_role='authenticated' then v_user:=auth.uid();
  else raise exception 'Authentication required';
  end if;
  if v_user is null then raise exception 'User is required'; end if;

  select * into v_status from public.user_moderation_status where user_id=v_user;
  v_restricted := found and v_status.status in ('temporarily_restricted','permanently_restricted')
    and (v_status.restricted_until is null or v_status.restricted_until>now());
  if coalesce(array_length(v_categories,1),0)>0 then
    perform private.btv_record_contact_attempt(v_user,p_surface,null,p_content,v_categories,'quarantined');
  end if;
  return jsonb_build_object(
    'allowed',not v_restricted and coalesce(array_length(v_categories,1),0)=0,
    'reason',case when v_restricted then 'restricted' when coalesce(array_length(v_categories,1),0)>0 then 'contact_sharing' else null end,
    'message',case when v_restricted then 'Your account is temporarily restricted from messages and bookings. Use the moderation appeal option if you believe this is a mistake.' when coalesce(array_length(v_categories,1),0)>0 then 'Keep conversations and bookings on Beyond The Visa. Remove phone numbers, email addresses, social handles, external links or payment details and try again.' else null end
  );
end
$$;

revoke all on function public.btv_enforce_contact_sharing(text,text,uuid) from public, anon;
grant execute on function public.btv_enforce_contact_sharing(text,text,uuid) to authenticated, service_role;

create or replace function private.btv_moderate_shared_content()
returns trigger language plpgsql security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  v_surface text := tg_table_name;
  v_record text;
  v_content text := '';
  v_categories text[];
  v_restricted boolean := false;
begin
  if v_user is null or private.btv_contact_is_admin() then return new; end if;
  v_record := coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'step_code','pending');

  select exists(
    select 1 from public.user_moderation_status s
    where s.user_id=v_user
      and s.status in ('temporarily_restricted','permanently_restricted')
      and (s.restricted_until is null or s.restricted_until>now())
  ) into v_restricted;
  if v_restricted and tg_table_name in ('bookings','btv_mentor_bookings','btv_mentor_reviews','btv_mentors','golden_question_comments','cv_service_requests') then
    insert into public.moderation_events(user_id,surface,record_id,event_type,severity,decision,metadata)
    values(v_user,v_surface,v_record,'restriction_enforced','high','restricted',jsonb_build_object('operation',tg_op));
    return null;
  end if;

  case tg_table_name
    when 'bookings' then v_content:=coalesce(new.role_band,'')||E'\n'||coalesce(new.notes,'');
    when 'btv_mentor_bookings' then v_content:=coalesce(new.topic,'');
    when 'btv_mentor_reviews' then v_content:=coalesce(new.review,'');
    when 'btv_mentors' then v_content:=coalesce(new.biography,'')||E'\n'||coalesce(new.specialty,'');
    when 'golden_question_comments' then v_content:=coalesce(new.body,'');
    when 'cv_service_requests' then v_content:=coalesce(new.notes,'');
    when 'manager_requests' then v_content:=coalesce(new.subject,'')||E'\n'||coalesce(new.message,'')||E'\n'||coalesce(new.details::text,'');
    when 'profiles' then v_content:=coalesce(new.golden_public_name,'');
    else return new;
  end case;

  v_categories := private.btv_contact_categories(v_content);
  if coalesce(array_length(v_categories,1),0)=0 then return new; end if;
  perform private.btv_record_contact_attempt(v_user,v_surface,v_record,v_content,v_categories,
    case when tg_table_name in ('golden_question_comments','btv_mentors') then 'quarantined' else 'redacted' end);

  case tg_table_name
    when 'bookings' then new.role_band:=null;new.notes:=null;
    when 'btv_mentor_bookings' then new.topic:=null;
    when 'btv_mentor_reviews' then new.review:=null;
    when 'btv_mentors' then new.biography:='Biography withheld pending moderation';new.specialty:=null;new.status:='pending';
    when 'golden_question_comments' then new.body:='Contact-sharing attempt blocked';new.status:='hidden';
    when 'cv_service_requests' then new.notes:=null;
    when 'manager_requests' then new.subject:='Request pending moderation';new.message:=null;new.details:=jsonb_build_object('moderated',true);
    when 'profiles' then new.golden_public_name:=null;
  end case;
  return new;
end
$$;

revoke all on function private.btv_moderate_shared_content() from public, anon, authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array['bookings','btv_mentor_bookings','btv_mentor_reviews','btv_mentors','golden_question_comments','cv_service_requests','manager_requests','profiles'] loop
    execute format('drop trigger if exists btv_contact_moderation_trigger on public.%I',v_table);
    execute format('create trigger btv_contact_moderation_trigger before insert or update on public.%I for each row execute function private.btv_moderate_shared_content()',v_table);
  end loop;
end
$$;

comment on table public.contact_sharing_attempts is 'Metadata-only record of blocked contact-sharing attempts; raw attempted contact details are not retained.';
comment on function public.btv_check_contact_sharing(text,text) is 'Server-side preflight for existing user-authored communication and booking fields.';
comment on function public.btv_enforce_contact_sharing(text,text,uuid) is 'Server-side enforcement and metadata-only audit for browser and trusted Edge Function submission paths.';
