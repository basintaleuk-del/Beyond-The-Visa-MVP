-- Keep NCLEX mock checkout on the same timed Beyond Coins offer as CBT and
-- allow a signed-in owner to renew their sample-question acknowledgement.
-- The acknowledgement function uses an upsert; its conflict path is an UPDATE
-- and therefore needs an owner-only UPDATE policy as well as INSERT.

drop policy if exists "users update own sample acceptances" on public.btv_exam_sample_acceptances;
create policy "users update own sample acceptances"
on public.btv_exam_sample_acceptances
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant update on public.btv_exam_sample_acceptances to authenticated;

-- The shared Beyond Coins modal reads btv_coin_products, while the purchase
-- procedure validates the matching btv_mock_catalog record. Update both
-- authoritative sources together so NCLEX always matches CBT's offer.
update public.btv_mock_catalog
set coin_cost = case code when 'nclex_short' then 50 when 'nclex_full' then 100 end,
    duration_minutes = case code when 'nclex_short' then 15 when 'nclex_full' then 30 end,
    question_count = case code when 'nclex_short' then 30 when 'nclex_full' then 60 end,
    is_active = true,
    updated_at = now()
where code in ('nclex_short', 'nclex_full');

update public.btv_coin_products
set coin_price = case code when 'nclex_short' then 50 when 'nclex_full' then 100 end,
    duration_minutes = case code when 'nclex_short' then 15 when 'nclex_full' then 30 end,
    question_count = case code when 'nclex_short' then 30 when 'nclex_full' then 60 end,
    description = case code
      when 'nclex_short' then 'A 30-question NCLEX mock with a 15-minute secure timer.'
      when 'nclex_full' then 'A 60-question NCLEX mock with a 30-minute secure timer.'
    end,
    benefit_summary = case code
      when 'nclex_short' then '30 random NCLEX questions, server-timed for 15 minutes.'
      when 'nclex_full' then '60 random NCLEX questions, server-timed for 30 minutes.'
    end,
    is_active = true,
    updated_at = now()
where code in ('nclex_short', 'nclex_full');
