-- v85 timed IELTS mock catalogue. Server-authoritative Beyond Coins pricing.

insert into public.btv_mock_catalog(
    code,
    title,
    exam_type,
    mock_category,
    coin_cost,
    duration_minutes,
    question_count,
    configuration
)
values
(
    'ielts_short',
    'IELTS Academic Focused Session',
    'ielts',
    'short',
    25,
    30,
    30,
    '{"sections":["reading","writing"],"autosave":true}'::jsonb
),
(
    'ielts_full',
    'IELTS Academic Full Session',
    'ielts',
    'standard',
    50,
    60,
    60,
    '{"sections":["reading","writing"],"autosave":true}'::jsonb
)
on conflict (code)
do update
set
    title = excluded.title,
    exam_type = excluded.exam_type,
    mock_category = excluded.mock_category,
    coin_cost = excluded.coin_cost,
    duration_minutes = excluded.duration_minutes,
    question_count = excluded.question_count,
    configuration = excluded.configuration,
    is_active = true,
    updated_at = now();