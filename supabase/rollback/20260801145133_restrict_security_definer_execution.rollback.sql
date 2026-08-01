-- EMERGENCY INVERSE ONLY.
-- Reversing the matching hardening migration reopens execution and storage
-- permissions that were deliberately restricted. Run only during an approved
-- incident rollback after capturing the current grants and policy definition.

grant execute on function private.btv_notification_to_inbox() to public, anon, authenticated;
grant execute on function public.btv_audit_admin_change() to public, anon, authenticated;
grant execute on function public.btv_auth_user_created() to public, anon, authenticated;
grant execute on function public.btv_enforce_daily_practice_limit() to public, anon, authenticated;
grant execute on function public.btv_protect_profile_v31_fields() to public, anon, authenticated;
grant execute on function public.btv_track_basic_question_attempt() to public, anon, authenticated;
grant execute on function public.btv_track_exam_prep_question() to public, anon, authenticated;
grant execute on function public.btv_track_golden_question() to public, anon, authenticated;
grant execute on function public.btv_track_numeracy_question() to public, anon, authenticated;
grant execute on function public.btv_track_paid_exam_question() to public, anon, authenticated;
grant execute on function public.btv_track_study_activity() to public, anon, authenticated;
grant execute on function public.handle_new_user() to public, anon, authenticated;
grant execute on function public.protect_profile_admin_fields() to public, anon, authenticated;

grant execute on function public.admin_analytics(timestamptz, timestamptz) to public, anon;
grant execute on function public.admin_list_users(text, text, text, integer, integer) to public, anon;
grant execute on function public.admin_set_user_access(uuid, text, text, text) to public, anon;
grant execute on function public.btv_approve_mock_refund(uuid, boolean) to public, anon;
grant execute on function public.btv_begin_ai_request(text, text) to public, anon;
grant execute on function public.btv_book_mentor(uuid, uuid, text) to public, anon;
grant execute on function public.btv_complete_exam_prep_session(uuid) to public, anon;
grant execute on function public.btv_complete_mock(uuid, numeric, integer, jsonb, numeric) to public, anon;
grant execute on function public.btv_exam_prep_admin_import(jsonb, text, boolean) to public, anon;
grant execute on function public.btv_exam_prep_admin_summary() to public, anon;
grant execute on function public.btv_exam_prep_admin_transition(uuid, text, text) to public, anon;
grant execute on function public.btv_exam_prep_catalog() to public, anon;
grant execute on function public.btv_exam_prep_dashboard() to public, anon;
grant execute on function public.btv_exam_prep_review_session(uuid) to public, anon;
grant execute on function public.btv_exam_prep_session_question(uuid, integer) to public, anon;
grant execute on function public.btv_exam_prep_set_flag(uuid, uuid, boolean) to public, anon;
grant execute on function public.btv_exam_prep_toggle_saved(uuid) to public, anon;
grant execute on function public.btv_exam_prep_topics_for_exam(uuid) to public, anon;
grant execute on function public.btv_finish_ai_request(uuid, text, text, integer) to public, anon;
grant execute on function public.btv_has_admin_permission(text) to public, anon;
grant execute on function public.btv_is_admin() to public, anon;
grant execute on function public.btv_is_premium() to public, anon;
grant execute on function public.btv_request_mock_refund(uuid, text) to public, anon;
grant execute on function public.btv_start_exam_prep_session(text, text, uuid[], text, integer, boolean, text, text) to public, anon;
grant execute on function public.btv_start_mock(text, text) to public, anon;
grant execute on function public.btv_submit_exam_prep_answer(uuid, uuid, uuid[], integer) to public, anon;
grant execute on function public.btv_toggle_post_like(uuid) to public, anon;
grant execute on function public.create_booking(uuid, timestamptz, text, text, text, text) to public, anon;
grant execute on function public.is_admin() to public, anon;
grant execute on function public.is_btv_admin() to public, anon;
grant execute on function public.manage_own_booking(uuid, text, timestamptz) to public, anon;

alter function private.btv_guard_golden_profession() reset search_path;
alter function public.btv_toggle_post_like(uuid) reset search_path;
alter function public.touch_manager_request() reset search_path;
alter function public.touch_premium_record() reset search_path;

drop policy if exists phase8_profile_public_read on storage.objects;
create policy phase8_profile_public_read
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');
