-- Beyond The Visa personal inbox.
-- Additive by design: existing booking and notification records remain intact.

create table if not exists public.btv_inbox_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('mentor','job_offer','application','support','account','system')),
  subject text not null check (char_length(subject) between 1 and 180),
  sender_name text not null default 'Beyond The Visa',
  sender_role text not null default 'Member support',
  related_type text,
  related_id uuid,
  priority text not null default 'standard' check (priority in ('standard','important','urgent')),
  status text not null default 'open' check (status in ('open','archived')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists btv_inbox_threads_user_latest_idx
  on public.btv_inbox_threads(user_id, last_message_at desc);
create index if not exists btv_inbox_threads_related_idx
  on public.btv_inbox_threads(user_id, related_type, related_id);

create table if not exists public.btv_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.btv_inbox_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_type text not null check (sender_type in ('member','mentor','employer','support','system')),
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 8000),
  action_label text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists btv_inbox_messages_thread_created_idx
  on public.btv_inbox_messages(thread_id, created_at);

alter table public.btv_inbox_threads enable row level security;
alter table public.btv_inbox_messages enable row level security;

drop policy if exists inbox_threads_owner_read on public.btv_inbox_threads;
create policy inbox_threads_owner_read on public.btv_inbox_threads
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.btv_is_admin()));

drop policy if exists inbox_threads_owner_update on public.btv_inbox_threads;
create policy inbox_threads_owner_update on public.btv_inbox_threads
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.btv_is_admin()))
  with check (user_id = (select auth.uid()) or (select public.btv_is_admin()));

drop policy if exists inbox_messages_owner_read on public.btv_inbox_messages;
create policy inbox_messages_owner_read on public.btv_inbox_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.btv_inbox_threads t
      where t.id = thread_id
        and (t.user_id = (select auth.uid()) or (select public.btv_is_admin()))
    )
  );

drop policy if exists inbox_messages_owner_update on public.btv_inbox_messages;
create policy inbox_messages_owner_update on public.btv_inbox_messages
  for update to authenticated
  using (
    exists (
      select 1 from public.btv_inbox_threads t
      where t.id = thread_id
        and (t.user_id = (select auth.uid()) or (select public.btv_is_admin()))
    )
  )
  with check (
    exists (
      select 1 from public.btv_inbox_threads t
      where t.id = thread_id
        and (t.user_id = (select auth.uid()) or (select public.btv_is_admin()))
    )
  );

create or replace function public.btv_inbox_mark_thread(
  p_thread uuid,
  p_read boolean default true
) returns void
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.btv_inbox_threads
    where id = p_thread and user_id = v_user
  ) then raise exception 'Inbox conversation not found'; end if;

  update public.btv_inbox_messages
  set read_at = case when p_read then coalesce(read_at, now()) else null end
  where thread_id = p_thread and sender_type <> 'member';
end
$$;

create or replace function public.btv_inbox_send_reply(
  p_thread uuid,
  p_body text
) returns public.btv_inbox_messages
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  v_thread public.btv_inbox_threads%rowtype;
  v_check jsonb;
  v_message public.btv_inbox_messages%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(p_body),'') is null then raise exception 'Write a message before sending'; end if;

  select * into v_thread
  from public.btv_inbox_threads
  where id = p_thread and user_id = v_user and status = 'open';
  if not found then raise exception 'Inbox conversation not found'; end if;
  if v_thread.category not in ('mentor','application','support') then
    raise exception 'This update is read-only';
  end if;

  v_check := public.btv_enforce_contact_sharing('inbox_reply', p_body, v_user);
  if not coalesce((v_check->>'allowed')::boolean, false) then
    raise exception '%', coalesce(v_check->>'message','This message cannot be sent');
  end if;

  insert into public.btv_inbox_messages(
    thread_id, sender_user_id, sender_type, sender_name, body, read_at
  ) values (
    v_thread.id, v_user, 'member', 'You', btrim(p_body), now()
  ) returning * into v_message;

  update public.btv_inbox_threads
  set last_message_at = v_message.created_at, updated_at = now()
  where id = v_thread.id;
  return v_message;
end
$$;

create or replace function public.btv_inbox_send_personal_message(
  p_user uuid,
  p_category text,
  p_subject text,
  p_body text,
  p_sender_name text default 'Beyond The Visa',
  p_sender_role text default 'Member support',
  p_priority text default 'standard',
  p_related_type text default null,
  p_related_id uuid default null,
  p_action_label text default null,
  p_action_url text default null,
  p_thread uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_service boolean := auth.role() = 'service_role';
  v_admin boolean := public.btv_is_admin();
  v_mentor public.btv_mentors%rowtype;
  v_thread public.btv_inbox_threads%rowtype;
  v_sender_type text;
begin
  if v_actor is null and not v_service then raise exception 'Authentication required'; end if;
  if p_category not in ('mentor','job_offer','application','support','account','system') then
    raise exception 'Invalid inbox category';
  end if;
  if p_priority not in ('standard','important','urgent') then raise exception 'Invalid priority'; end if;
  if nullif(btrim(p_subject),'') is null or nullif(btrim(p_body),'') is null then
    raise exception 'Subject and message are required';
  end if;

  if v_service or v_admin then
    v_sender_type := case
      when p_category = 'job_offer' then 'employer'
      when p_category in ('support','account') then 'support'
      else 'system'
    end;
  else
    select * into v_mentor
    from public.btv_mentors
    where user_id = v_actor and status = 'approved';
    if not found or p_category <> 'mentor' then raise exception 'Authorised sender required'; end if;
    if not exists (
      select 1 from public.btv_mentor_bookings b
      where b.mentor_id = v_mentor.id and b.user_id = p_user
        and b.status in ('confirmed','completed')
    ) then raise exception 'A valid mentor booking is required'; end if;
    v_sender_type := 'mentor';
  end if;

  if p_thread is not null then
    select * into v_thread from public.btv_inbox_threads
    where id = p_thread and user_id = p_user and category = p_category;
  end if;

  if v_thread.id is null then
    insert into public.btv_inbox_threads(
      user_id, category, subject, sender_name, sender_role,
      related_type, related_id, priority
    ) values (
      p_user, p_category, btrim(p_subject),
      coalesce(nullif(btrim(p_sender_name),''),'Beyond The Visa'),
      coalesce(nullif(btrim(p_sender_role),''),'Member support'),
      p_related_type, p_related_id, p_priority
    ) returning * into v_thread;
  end if;

  insert into public.btv_inbox_messages(
    thread_id, sender_user_id, sender_type, sender_name, body,
    action_label, action_url
  ) values (
    v_thread.id, case when v_service then null else v_actor end, v_sender_type,
    coalesce(nullif(btrim(p_sender_name),''),'Beyond The Visa'), btrim(p_body),
    nullif(btrim(p_action_label),''), nullif(btrim(p_action_url),'')
  );

  update public.btv_inbox_threads
  set last_message_at = now(), updated_at = now(), status = 'open',
      priority = p_priority
  where id = v_thread.id;
  return v_thread.id;
end
$$;

create or replace function private.btv_notification_to_inbox()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_thread uuid;
  v_category text;
begin
  v_category := case
    when lower(new.category) like '%mentor%' then 'mentor'
    when lower(new.category) like '%job%' then 'application'
    when lower(new.category) like '%support%' then 'support'
    when lower(new.category) like '%account%' or lower(new.category) like '%wallet%' then 'account'
    else 'system'
  end;
  insert into public.btv_inbox_threads(
    user_id, category, subject, sender_name, sender_role,
    related_type, related_id, priority, last_message_at
  ) values (
    new.user_id, v_category, new.title, 'Beyond The Visa', 'Member updates',
    'notification', new.id,
    case when v_category in ('mentor','application','account') then 'important' else 'standard' end,
    new.created_at
  ) returning id into v_thread;
  insert into public.btv_inbox_messages(
    thread_id, sender_type, sender_name, body, action_label, action_url, read_at, created_at
  ) values (
    v_thread, 'system', 'Beyond The Visa', new.body,
    case when new.action_url is not null then 'View update' end,
    new.action_url, new.read_at, new.created_at
  );
  return new;
end
$$;

drop trigger if exists btv_notification_to_inbox on public.btv_notifications;
create trigger btv_notification_to_inbox
after insert on public.btv_notifications
for each row execute function private.btv_notification_to_inbox();

revoke all on function public.btv_inbox_mark_thread(uuid,boolean) from public, anon;
revoke all on function public.btv_inbox_send_reply(uuid,text) from public, anon;
revoke all on function public.btv_inbox_send_personal_message(uuid,text,text,text,text,text,text,text,uuid,text,text,uuid) from public, anon;
grant execute on function public.btv_inbox_mark_thread(uuid,boolean) to authenticated;
grant execute on function public.btv_inbox_send_reply(uuid,text) to authenticated;
grant execute on function public.btv_inbox_send_personal_message(uuid,text,text,text,text,text,text,text,uuid,text,text,uuid) to authenticated, service_role;

revoke insert, update, delete on public.btv_inbox_threads from anon, authenticated;
revoke insert, update, delete on public.btv_inbox_messages from anon, authenticated;
grant update(status) on public.btv_inbox_threads to authenticated;

comment on table public.btv_inbox_threads is 'Owner-protected personal communication threads for members.';
comment on function public.btv_inbox_send_personal_message(uuid,text,text,text,text,text,text,text,uuid,text,text,uuid)
  is 'Creates personal inbox messages. Job offers require admin/service authority; mentors require an approved profile and an existing booking.';
