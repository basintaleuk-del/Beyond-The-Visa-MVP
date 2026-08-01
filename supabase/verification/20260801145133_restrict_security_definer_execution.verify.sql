-- Run read-only on the isolated Preview branch after applying 20260801145133.
-- The first query must return zero rows.
with sensitive_functions(signature) as (
  values
    ('public.admin_analytics(timestamptz,timestamptz)'),
    ('public.admin_list_users(text,text,text,integer,integer)'),
    ('public.admin_set_user_access(uuid,text,text,text)'),
    ('public.btv_approve_mock_refund(uuid,boolean)'),
    ('public.btv_begin_ai_request(text,text)'),
    ('public.btv_book_mentor(uuid,uuid,text)'),
    ('public.btv_complete_exam_prep_session(uuid)'),
    ('public.btv_complete_mock(uuid,numeric,integer,jsonb,numeric)'),
    ('public.btv_exam_prep_admin_import(jsonb,text,boolean)'),
    ('public.btv_exam_prep_admin_summary()'),
    ('public.btv_exam_prep_admin_transition(uuid,text,text)'),
    ('public.btv_finish_ai_request(uuid,text,text,integer)'),
    ('public.btv_has_admin_permission(text)'),
    ('public.btv_is_admin()'),
    ('public.btv_is_premium()'),
    ('public.btv_request_mock_refund(uuid,text)'),
    ('public.btv_start_mock(text,text)'),
    ('public.btv_toggle_post_like(uuid)'),
    ('public.create_booking(uuid,timestamptz,text,text,text,text)'),
    ('public.is_admin()'),
    ('public.is_btv_admin()'),
    ('public.manage_own_booking(uuid,text,timestamptz)')
)
select signature
from sensitive_functions
where has_function_privilege('anon', signature, 'EXECUTE')
   or has_function_privilege('public', signature, 'EXECUTE');

-- Every row must show authenticated_execute=true and service_role_execute=true.
with intended_rpcs(signature) as (
  values
    ('public.btv_book_mentor(uuid,uuid,text)'),
    ('public.btv_begin_ai_request(text,text)'),
    ('public.btv_complete_exam_prep_session(uuid)'),
    ('public.btv_request_mock_refund(uuid,text)'),
    ('public.btv_start_mock(text,text)'),
    ('public.btv_toggle_post_like(uuid)'),
    ('public.create_booking(uuid,timestamptz,text,text,text,text)'),
    ('public.manage_own_booking(uuid,text,timestamptz)')
)
select signature,
       has_function_privilege('authenticated', signature, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', signature, 'EXECUTE') as service_role_execute
from intended_rpcs
order by signature;

-- Trigger-only functions must have no client EXECUTE grants.
select n.nspname as schema_name,
       p.proname as function_name,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('private', 'btv_notification_to_inbox'),
  ('public', 'btv_audit_admin_change'),
  ('public', 'btv_auth_user_created'),
  ('public', 'btv_enforce_daily_practice_limit'),
  ('public', 'btv_protect_profile_v31_fields'),
  ('public', 'btv_track_basic_question_attempt'),
  ('public', 'btv_track_exam_prep_question'),
  ('public', 'btv_track_golden_question'),
  ('public', 'btv_track_numeracy_question'),
  ('public', 'btv_track_paid_exam_question'),
  ('public', 'btv_track_study_activity'),
  ('public', 'handle_new_user'),
  ('public', 'protect_profile_admin_fields')
)
order by 1, 2;

-- Expected search paths must be present.
select n.nspname as schema_name, p.proname as function_name, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('private', 'btv_guard_golden_profession'),
  ('public', 'btv_toggle_post_like'),
  ('public', 'touch_manager_request'),
  ('public', 'touch_premium_record')
)
order by 1, 2;

-- Must return zero rows: anonymous object listing policy was removed.
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'phase8_profile_public_read';
