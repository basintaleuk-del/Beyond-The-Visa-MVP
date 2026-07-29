-- Keep answer-bearing Numeracy tables entirely private while making the RLS intent explicit.
drop policy if exists "numeracy bank service only" on public.btv_numeracy_questions;
create policy "numeracy bank service only" on public.btv_numeracy_questions
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "numeracy answers service only" on public.btv_numeracy_daily_answers;
create policy "numeracy answers service only" on public.btv_numeracy_daily_answers
  for all to anon, authenticated using (false) with check (false);

create index if not exists btv_numeracy_daily_answers_question_idx
  on public.btv_numeracy_daily_answers(question_id);
