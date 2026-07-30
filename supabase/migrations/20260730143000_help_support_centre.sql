-- Authenticated Help & Support contract.
-- Reuses manager_requests so member tickets arrive in the existing admin inbox.

create or replace function public.btv_submit_support_request(
  p_request_type text,
  p_subject text,
  p_message text,
  p_details jsonb default '{}'::jsonb,
  p_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_type text := lower(trim(coalesce(p_request_type, '')));
  v_subject text := trim(coalesce(p_subject, ''));
  v_message text := trim(coalesce(p_message, ''));
  v_priority text := lower(trim(coalesce(p_priority, 'normal')));
begin
  if v_user_id is null then
    raise exception 'You must be signed in to contact support.' using errcode = '42501';
  end if;

  if v_type not in ('contact', 'feedback', 'bug_report', 'feature_request') then
    raise exception 'Unsupported support request type.' using errcode = '22023';
  end if;

  if char_length(v_subject) < 4 or char_length(v_subject) > 180 then
    raise exception 'Subject must be between 4 and 180 characters.' using errcode = '22023';
  end if;

  if char_length(v_message) < 10 or char_length(v_message) > 5000 then
    raise exception 'Message must be between 10 and 5000 characters.' using errcode = '22023';
  end if;

  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'normal';
  end if;

  insert into public.manager_requests (
    user_id, request_type, subject, message, details, status, priority, source
  ) values (
    v_user_id,
    v_type,
    v_subject,
    v_message,
    jsonb_strip_nulls(coalesce(p_details, '{}'::jsonb)) || jsonb_build_object(
      'support_channel', 'member_help_centre',
      'support_contract', 'v210'
    ),
    'new',
    v_priority,
    'help_centre'
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.btv_get_my_support_requests()
returns table (
  id uuid,
  request_type text,
  subject text,
  message text,
  details jsonb,
  status text,
  priority text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    mr.id,
    mr.request_type,
    mr.subject,
    mr.message,
    mr.details,
    mr.status,
    mr.priority,
    mr.created_at,
    mr.updated_at
  from public.manager_requests mr
  where auth.uid() is not null
    and mr.user_id = auth.uid()
    and (
      mr.source = 'help_centre'
      or (mr.source = 'web_app' and mr.request_type in ('contact', 'feedback', 'bug_report', 'feature_request'))
    )
  order by mr.created_at desc
  limit 100;
$$;

create or replace function public.btv_add_support_update(
  p_request_id uuid,
  p_message text
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_message text := trim(coalesce(p_message, ''));
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to update a request.' using errcode = '42501';
  end if;

  if char_length(v_message) < 2 or char_length(v_message) > 2000 then
    raise exception 'Update must be between 2 and 2000 characters.' using errcode = '22023';
  end if;

  update public.manager_requests mr
  set
    details = jsonb_set(
      coalesce(mr.details, '{}'::jsonb),
      '{user_updates}',
      coalesce(mr.details->'user_updates', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('message', v_message, 'created_at', now())
      ),
      true
    ),
    status = case when mr.status in ('resolved', 'waiting') then 'new' else mr.status end,
    updated_at = now()
  where mr.id = p_request_id
    and mr.user_id = v_user_id
    and mr.status <> 'closed'
  returning mr.updated_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'Request not found or no longer accepts updates.' using errcode = 'P0002';
  end if;

  return v_updated_at;
end;
$$;

revoke all on function public.btv_submit_support_request(text, text, text, jsonb, text) from public, anon;
revoke all on function public.btv_get_my_support_requests() from public, anon;
revoke all on function public.btv_add_support_update(uuid, text) from public, anon;

grant execute on function public.btv_submit_support_request(text, text, text, jsonb, text) to authenticated;
grant execute on function public.btv_get_my_support_requests() to authenticated;
grant execute on function public.btv_add_support_update(uuid, text) to authenticated;

comment on function public.btv_submit_support_request(text, text, text, jsonb, text)
  is 'Creates an authenticated support ticket in the manager inbox without trusting a client-supplied user id.';
comment on function public.btv_get_my_support_requests()
  is 'Returns only support requests belonging to the authenticated member.';
comment on function public.btv_add_support_update(uuid, text)
  is 'Appends a member update to an owned, non-closed support request.';
