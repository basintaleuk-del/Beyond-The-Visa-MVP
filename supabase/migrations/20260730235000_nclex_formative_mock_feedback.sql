-- NCLEX paid mocks are formative: reveal feedback only after the member
-- submits the current question, while keeping every other answer private.
create or replace function public.btv_review_nclex_mock_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_selected jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_attempt public.btv_exam_attempts%rowtype;
  v_attempt_question public.btv_exam_attempt_questions%rowtype;
  v_correct text[];
  v_selected_text text[];
  v_rationale text;
  v_strategy text;
  v_ok boolean:=false;
begin
  if v_user is null then
    raise exception using message='AUTH_REQUIRED';
  end if;

  select *
    into v_attempt
    from public.btv_exam_attempts
   where id=p_attempt_id
     and user_id=v_user
   for update;

  if not found then
    raise exception using message='ATTEMPT_NOT_FOUND';
  end if;
  if v_attempt.status<>'active' then
    raise exception using message='ATTEMPT_NOT_ACTIVE';
  end if;
  if v_attempt.expires_at is not null and v_attempt.expires_at<=now() then
    raise exception using message='ATTEMPT_EXPIRED';
  end if;
  if v_attempt.question_source<>'nclex_questions' then
    raise exception using message='INVALID_EXAM_TYPE';
  end if;
  if jsonb_typeof(coalesce(p_selected,'null'::jsonb))<>'array' then
    raise exception using message='INVALID_ANSWER';
  end if;

  select *
    into v_attempt_question
    from public.btv_exam_attempt_questions
   where attempt_id=v_attempt.id
     and question_id=p_question_id
   for update;

  if not found then
    raise exception using message='QUESTION_NOT_IN_ATTEMPT';
  end if;

  select q.correct_options,q.rationale,q.test_strategy
    into v_correct,v_rationale,v_strategy
    from public.nclex_questions q
   where q.id::text=p_question_id;

  if not found then
    raise exception using message='QUESTION_NOT_FOUND';
  end if;

  select coalesce(array_agg(value order by value),'{}'::text[])
    into v_selected_text
    from jsonb_array_elements_text(p_selected);

  v_ok:=coalesce(
    (select array_agg(value order by value) from unnest(v_correct) value)
      = v_selected_text,
    false
  );

  update public.btv_exam_attempt_questions
     set selected_answer=p_selected,
         is_correct=v_ok,
         answered_at=now()
   where id=v_attempt_question.id;

  return jsonb_build_object(
    'question_id',p_question_id,
    'selected_answer',p_selected,
    'is_correct',v_ok,
    'correct_options',to_jsonb(v_correct),
    'rationale',v_rationale,
    'test_strategy',v_strategy,
    'answered_at',now()
  );
end
$$;

revoke all on function public.btv_review_nclex_mock_answer(uuid,text,jsonb) from public,anon;
grant execute on function public.btv_review_nclex_mock_answer(uuid,text,jsonb) to authenticated,service_role;

comment on function public.btv_review_nclex_mock_answer(uuid,text,jsonb) is
  'Records and reviews one answer from the authenticated member''s active NCLEX mock. It never returns answers for unsubmitted questions.';
