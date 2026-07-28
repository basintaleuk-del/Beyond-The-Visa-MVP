-- Make every usable CBT practice item available to signed-in learners.
-- Rejected/duplicate-quarantined rows stay hidden. Review-gated questions stay
-- inactive, cannot enter the reviewed/paid bank, and are labelled by the client.

drop policy if exists "Authenticated users read active CBT questions" on public.cbt_questions;
drop policy if exists "Authenticated users read usable CBT questions" on public.cbt_questions;
create policy "Authenticated users read usable CBT questions"
on public.cbt_questions for select to authenticated
using (quality_status <> 'rejected' and review_status <> 'duplicate_quarantined');

comment on policy "Authenticated users read usable CBT questions" on public.cbt_questions is
  'Signed-in learners may practise with usable questions. Only approved active rows qualify for reviewed or paid products; drafts must be visibly labelled in the client.';

