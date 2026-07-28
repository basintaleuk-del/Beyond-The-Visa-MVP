-- Secure legacy CBT practice delivery and scoring.
-- Learners receive question stems/options only; answers and rationales are
-- released by the server after a valid submission.

create or replace function public.btv_cbt_practice_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED');
  end if;

  return jsonb_build_object(
    'success', true,
    'total', (
      select count(*) from public.cbt_questions q
      where q.quality_status <> 'rejected'
        and q.review_status <> 'duplicate_quarantined'
    ),
    'reviewed', (
      select count(*) from public.cbt_questions q
      where q.quality_status <> 'rejected'
        and q.review_status <> 'duplicate_quarantined'
        and q.is_active
        and q.quality_status = 'approved'
        and q.review_status in ('approved', 'reviewed', 'published')
    ),
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object('profession', s.profession, 'subject', s.subject)
                       order by s.profession, s.subject)
      from (
        select distinct q.profession, q.subject
        from public.cbt_questions q
        where q.quality_status <> 'rejected'
          and q.review_status <> 'duplicate_quarantined'
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.btv_cbt_next_practice_question(
  p_profession text,
  p_subject text default null,
  p_exclude_ids bigint[] default '{}'::bigint[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profession text := lower(trim(coalesce(p_profession, '')));
  v_subject text := nullif(trim(coalesce(p_subject, '')), '');
  v_question public.cbt_questions%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED');
  end if;
  if v_profession not in ('nurse', 'midwife') then
    return jsonb_build_object('success', false, 'code', 'INVALID_PROFESSION');
  end if;
  if lower(coalesce(v_subject, 'all')) = 'all' then v_subject := null; end if;

  select q.* into v_question
  from public.cbt_questions q
  where q.quality_status <> 'rejected'
    and q.review_status <> 'duplicate_quarantined'
    and q.profession in (v_profession, 'both')
    and (v_subject is null or q.subject = v_subject)
    and not (q.id = any(coalesce(p_exclude_ids, '{}'::bigint[])))
  order by
    case when exists (
      select 1 from public.cbt_attempts a
      where a.user_id = v_user and a.question_id = q.id
    ) then 1 else 0 end,
    random()
  limit 1;

  if not found and coalesce(array_length(p_exclude_ids, 1), 0) > 0 then
    select q.* into v_question
    from public.cbt_questions q
    where q.quality_status <> 'rejected'
      and q.review_status <> 'duplicate_quarantined'
      and q.profession in (v_profession, 'both')
      and (v_subject is null or q.subject = v_subject)
    order by random()
    limit 1;
  end if;

  if not found then
    return jsonb_build_object('success', false, 'code', 'NO_QUESTIONS');
  end if;

  return jsonb_build_object(
    'success', true,
    'question', jsonb_build_object(
      'id', v_question.id,
      'profession', v_question.profession,
      'subject', v_question.subject,
      'difficulty', v_question.difficulty,
      'question_type', v_question.question_type,
      'question_text', v_question.question_text,
      'option_a', v_question.option_a,
      'option_b', v_question.option_b,
      'option_c', v_question.option_c,
      'option_d', v_question.option_d,
      'reviewed', (
        v_question.is_active
        and v_question.quality_status = 'approved'
        and v_question.review_status in ('approved', 'reviewed', 'published')
      )
    )
  );
end;
$$;

create or replace function public.btv_submit_cbt_practice_answer(
  p_question_id bigint,
  p_selected_option text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_option text := upper(trim(coalesce(p_selected_option, '')));
  v_question public.cbt_questions%rowtype;
  v_usage jsonb;
  v_correct boolean;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED');
  end if;
  if v_option not in ('A', 'B', 'C', 'D') then
    return jsonb_build_object('success', false, 'code', 'INVALID_OPTION');
  end if;

  select q.* into v_question
  from public.cbt_questions q
  where q.id = p_question_id
    and q.quality_status <> 'rejected'
    and q.review_status <> 'duplicate_quarantined';
  if not found then
    return jsonb_build_object('success', false, 'code', 'QUESTION_UNAVAILABLE');
  end if;

  v_usage := public.btv_use_free_practice('cbt');
  if not coalesce((v_usage ->> 'success')::boolean, false) then
    return v_usage;
  end if;

  v_correct := v_option = v_question.correct_option;
  insert into public.cbt_attempts(user_id, question_id, selected_option, is_correct, mode)
  values(v_user, v_question.id, v_option, v_correct, 'practice');

  return v_usage || jsonb_build_object(
    'success', true,
    'is_correct', v_correct,
    'correct_option', v_question.correct_option,
    'explanation', v_question.explanation
  );
end;
$$;

-- Practice writes must go through the scoring function so clients cannot forge
-- is_correct. Direct question-table reads are removed to prevent answer leaks.
drop policy if exists "Users insert own CBT attempts" on public.cbt_attempts;
drop policy if exists "Authenticated users read active CBT questions" on public.cbt_questions;
drop policy if exists "Authenticated users read usable CBT questions" on public.cbt_questions;
drop trigger if exists btv_cbt_daily_limit on public.cbt_attempts;

revoke all on function public.btv_cbt_practice_catalog() from public, anon;
revoke all on function public.btv_cbt_next_practice_question(text, text, bigint[]) from public, anon;
revoke all on function public.btv_submit_cbt_practice_answer(bigint, text) from public, anon;
grant execute on function public.btv_cbt_practice_catalog() to authenticated;
grant execute on function public.btv_cbt_next_practice_question(text, text, bigint[]) to authenticated;
grant execute on function public.btv_submit_cbt_practice_answer(bigint, text) to authenticated;

