-- Restrict direct access to SECURITY DEFINER functions found by the production
-- Supabase security advisor on 2026-08-01. Trigger functions do not require
-- EXECUTE grants to client roles; user-facing RPCs remain available only to
-- signed-in users and the service role.

revoke execute on function private.btv_notification_to_inbox() from public, anon, authenticated;
revoke execute on function public.btv_audit_admin_change() from public, anon, authenticated;
revoke execute on function public.btv_auth_user_created() from public, anon, authenticated;
revoke execute on function public.btv_enforce_daily_practice_limit() from public, anon, authenticated;
revoke execute on function public.btv_protect_profile_v31_fields() from public, anon, authenticated;
revoke execute on function public.btv_track_basic_question_attempt() from public, anon, authenticated;
revoke execute on function public.btv_track_exam_prep_question() from public, anon, authenticated;
revoke execute on function public.btv_track_golden_question() from public, anon, authenticated;
revoke execute on function public.btv_track_numeracy_question() from public, anon, authenticated;
revoke execute on function public.btv_track_paid_exam_question() from public, anon, authenticated;
revoke execute on function public.btv_track_study_activity() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_admin_fields() from public, anon, authenticated;

revoke execute on function public.admin_analytics(timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_analytics(timestamptz,timestamptz) to authenticated, service_role;
revoke execute on function public.admin_list_users(text,text,text,integer,integer) from public, anon;
grant execute on function public.admin_list_users(text,text,text,integer,integer) to authenticated, service_role;
revoke execute on function public.admin_set_user_access(uuid,text,text,text) from public, anon;
grant execute on function public.admin_set_user_access(uuid,text,text,text) to authenticated, service_role;
revoke execute on function public.btv_approve_mock_refund(uuid,boolean) from public, anon;
grant execute on function public.btv_approve_mock_refund(uuid,boolean) to authenticated, service_role;
revoke execute on function public.btv_begin_ai_request(text,text) from public, anon;
grant execute on function public.btv_begin_ai_request(text,text) to authenticated, service_role;
revoke execute on function public.btv_book_mentor(uuid,uuid,text) from public, anon;
grant execute on function public.btv_book_mentor(uuid,uuid,text) to authenticated, service_role;
revoke execute on function public.btv_complete_exam_prep_session(uuid) from public, anon;
grant execute on function public.btv_complete_exam_prep_session(uuid) to authenticated, service_role;
revoke execute on function public.btv_complete_mock(uuid,numeric,integer,jsonb,numeric) from public, anon;
grant execute on function public.btv_complete_mock(uuid,numeric,integer,jsonb,numeric) to authenticated, service_role;
revoke execute on function public.btv_exam_prep_admin_import(jsonb,text,boolean) from public, anon;
grant execute on function public.btv_exam_prep_admin_import(jsonb,text,boolean) to authenticated, service_role;
revoke execute on function public.btv_exam_prep_admin_summary() from public, anon;
grant execute on function public.btv_exam_prep_admin_summary() to authenticated, service_role;
revoke execute on function public.btv_exam_prep_admin_transition(uuid,text,text) from public, anon;
grant execute on function public.btv_exam_prep_admin_transition(uuid,text,text) to authenticated, service_role;
revoke execute on function public.btv_exam_prep_catalog() from public, anon;
grant execute on function public.btv_exam_prep_catalog() to authenticated, service_role;
revoke execute on function public.btv_exam_prep_dashboard() from public, anon;
grant execute on function public.btv_exam_prep_dashboard() to authenticated, service_role;
revoke execute on function public.btv_exam_prep_review_session(uuid) from public, anon;
grant execute on function public.btv_exam_prep_review_session(uuid) to authenticated, service_role;
revoke execute on function public.btv_exam_prep_session_question(uuid,integer) from public, anon;
grant execute on function public.btv_exam_prep_session_question(uuid,integer) to authenticated, service_role;
revoke execute on function public.btv_exam_prep_set_flag(uuid,uuid,boolean) from public, anon;
grant execute on function public.btv_exam_prep_set_flag(uuid,uuid,boolean) to authenticated, service_role;
revoke execute on function public.btv_exam_prep_toggle_saved(uuid) from public, anon;
grant execute on function public.btv_exam_prep_toggle_saved(uuid) to authenticated, service_role;
revoke execute on function public.btv_exam_prep_topics_for_exam(uuid) from public, anon;
grant execute on function public.btv_exam_prep_topics_for_exam(uuid) to authenticated, service_role;
revoke execute on function public.btv_finish_ai_request(uuid,text,text,integer) from public, anon;
grant execute on function public.btv_finish_ai_request(uuid,text,text,integer) to authenticated, service_role;
revoke execute on function public.btv_has_admin_permission(text) from public, anon;
grant execute on function public.btv_has_admin_permission(text) to authenticated, service_role;
revoke execute on function public.btv_is_admin() from public, anon;
grant execute on function public.btv_is_admin() to authenticated, service_role;
revoke execute on function public.btv_is_premium() from public, anon;
grant execute on function public.btv_is_premium() to authenticated, service_role;
revoke execute on function public.btv_request_mock_refund(uuid,text) from public, anon;
grant execute on function public.btv_request_mock_refund(uuid,text) to authenticated, service_role;
revoke execute on function public.btv_start_exam_prep_session(text,text,uuid[],text,integer,boolean,text,text) from public, anon;
grant execute on function public.btv_start_exam_prep_session(text,text,uuid[],text,integer,boolean,text,text) to authenticated, service_role;
revoke execute on function public.btv_start_mock(text,text) from public, anon;
grant execute on function public.btv_start_mock(text,text) to authenticated, service_role;
revoke execute on function public.btv_submit_exam_prep_answer(uuid,uuid,uuid[],integer) from public, anon;
grant execute on function public.btv_submit_exam_prep_answer(uuid,uuid,uuid[],integer) to authenticated, service_role;
revoke execute on function public.btv_toggle_post_like(uuid) from public, anon;
grant execute on function public.btv_toggle_post_like(uuid) to authenticated, service_role;
revoke execute on function public.create_booking(uuid,timestamptz,text,text,text,text) from public, anon;
grant execute on function public.create_booking(uuid,timestamptz,text,text,text,text) to authenticated, service_role;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
revoke execute on function public.is_btv_admin() from public, anon;
grant execute on function public.is_btv_admin() to authenticated, service_role;
revoke execute on function public.manage_own_booking(uuid,text,timestamptz) from public, anon;
grant execute on function public.manage_own_booking(uuid,text,timestamptz) to authenticated, service_role;

-- Remove function-search-path ambiguity reported by the security advisor.
-- These paths preserve each function's existing qualified/unqualified lookups.
alter function private.btv_guard_golden_profession() set search_path = private, public, pg_temp;
alter function public.btv_toggle_post_like(uuid) set search_path = public, pg_temp;
alter function public.touch_manager_request() set search_path = public, pg_temp;
alter function public.touch_premium_record() set search_path = public, pg_temp;

-- Public buckets do not need a SELECT policy for public object delivery. This
-- policy also allowed anonymous object listing; the frontend does not use it.
drop policy if exists phase8_profile_public_read on storage.objects;
