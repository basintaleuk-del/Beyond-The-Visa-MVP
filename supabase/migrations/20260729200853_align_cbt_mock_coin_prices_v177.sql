-- Keep the visible Beyond Coins catalogue and the transactional exam catalogue aligned.
update public.btv_mock_catalog
set coin_cost = case code when 'cbt_short' then 50 when 'cbt_full' then 100 end,
    duration_minutes = case code when 'cbt_short' then 15 when 'cbt_full' then 30 end,
    question_count = case code when 'cbt_short' then 30 when 'cbt_full' then 60 end,
    is_active = true,
    updated_at = now()
where code in ('cbt_short','cbt_full');

update public.btv_coin_products
set coin_price = case code when 'cbt_short' then 50 when 'cbt_full' then 100 end,
    duration_minutes = case code when 'cbt_short' then 15 when 'cbt_full' then 30 end,
    question_count = case code when 'cbt_short' then 30 when 'cbt_full' then 60 end,
    description = case code
      when 'cbt_short' then 'A 30-question CBT mock with a 15-minute secure timer.'
      when 'cbt_full' then 'A 60-question CBT mock with a 30-minute secure timer.'
    end,
    benefit_summary = case code
      when 'cbt_short' then '30 random CBT questions, server-timed for 15 minutes.'
      when 'cbt_full' then '60 random CBT questions, server-timed for 30 minutes.'
    end,
    is_active = true,
    updated_at = now()
where code in ('cbt_short','cbt_full');

-- Numeracy products were introduced at the requested prices; keep them explicitly aligned.
update public.btv_mock_catalog
set coin_cost = case code when 'numeracy_short' then 50 when 'numeracy_full' then 100 end,
    duration_minutes = case code when 'numeracy_short' then 15 when 'numeracy_full' then 30 end,
    question_count = case code when 'numeracy_short' then 30 when 'numeracy_full' then 60 end,
    is_active = true,
    updated_at = now()
where code in ('numeracy_short','numeracy_full');

update public.btv_coin_products
set coin_price = case code when 'numeracy_short' then 50 when 'numeracy_full' then 100 end,
    duration_minutes = case code when 'numeracy_short' then 15 when 'numeracy_full' then 30 end,
    question_count = case code when 'numeracy_short' then 30 when 'numeracy_full' then 60 end,
    is_active = true,
    updated_at = now()
where code in ('numeracy_short','numeracy_full');
