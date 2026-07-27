-- Allow authenticated users to read active free CBT questions.
-- Premium users continue to read all active questions.

drop policy if exists "Authenticated users read active CBT questions" on public.cbt_questions;

create policy "Authenticated users read active CBT questions"
on public.cbt_questions
as permissive
for select
to authenticated
using (
  is_active = true
  and (
    access_level = 'free'
    or public.btv_is_premium()
  )
);
