-- Golden Question Centre v120
-- 1) Create dedicated golden-question bank and attempts tables
-- 2) Move previously seeded [BTV-GOLDEN-*] rows out of CBT
-- 3) Keep CBT library focused on CBT-only content

create table if not exists public.btv_golden_questions (
  id uuid primary key default gen_random_uuid(),
  audience text not null default 'both' check (audience in ('nurse','midwife','both')),
  category text not null default 'Instrument identification',
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  prompt text not null,
  question_image_url text,
  image_caption text,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A','B','C','D')),
  explanation text not null default '',
  coin_reward integer not null default 25 check (coin_reward >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  source_hash text unique,
  source_reference text,
  legacy_source_question_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_golden_question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.btv_golden_questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('A','B','C','D')),
  is_correct boolean not null,
  awarded_coins integer not null default 0 check (awarded_coins >= 0),
  answered_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists btv_golden_questions_active_audience_idx
  on public.btv_golden_questions (is_active, audience, sort_order, created_at desc);
create index if not exists btv_golden_attempts_user_idx
  on public.btv_golden_question_attempts (user_id, answered_at desc);

alter table public.btv_golden_questions enable row level security;
alter table public.btv_golden_question_attempts enable row level security;

drop policy if exists "Authenticated users read active golden questions" on public.btv_golden_questions;
create policy "Authenticated users read active golden questions"
on public.btv_golden_questions
as permissive
for select
to authenticated
using (is_active = true);

drop policy if exists "Admins manage golden questions" on public.btv_golden_questions;
create policy "Admins manage golden questions"
on public.btv_golden_questions
as permissive
for all
to authenticated
using (public.btv_is_admin())
with check (public.btv_is_admin());

drop policy if exists "Users read own golden attempts" on public.btv_golden_question_attempts;
create policy "Users read own golden attempts"
on public.btv_golden_question_attempts
as permissive
for select
to authenticated
using (user_id = auth.uid() or public.btv_is_admin());

drop policy if exists "Users insert own golden attempts" on public.btv_golden_question_attempts;
create policy "Users insert own golden attempts"
on public.btv_golden_question_attempts
as permissive
for insert
to authenticated
with check (user_id = auth.uid());

create or replace function public.btv_answer_golden_question(p_question_id uuid, p_selected_option text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  q public.btv_golden_questions%rowtype;
  existing public.btv_golden_question_attempts%rowtype;
  selected text := upper(trim(coalesce(p_selected_option,'')));
  correct boolean := false;
  award integer := 0;
  new_balance integer := 0;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED', 'message', 'Sign in is required.');
  end if;

  if selected not in ('A','B','C','D') then
    return jsonb_build_object('success', false, 'code', 'INVALID_OPTION', 'message', 'Choose A, B, C or D.');
  end if;

  select * into q
  from public.btv_golden_questions
  where id = p_question_id and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'code', 'QUESTION_NOT_FOUND', 'message', 'Golden Question not available.');
  end if;

  select * into existing
  from public.btv_golden_question_attempts
  where user_id = uid and question_id = q.id;

  if found then
    return jsonb_build_object(
      'success', true,
      'already_answered', true,
      'is_correct', existing.is_correct,
      'awarded_coins', existing.awarded_coins,
      'selected_option', existing.selected_option
    );
  end if;

  correct := (selected = q.correct_option);
  if correct then
    award := coalesce(q.coin_reward, 0);
  end if;

  perform public.btv_bootstrap_user(uid);
  select balance into new_balance from public.btv_wallets where user_id = uid;

  if award > 0 then
    update public.btv_wallets
    set balance = balance + award,
        lifetime_earned = lifetime_earned + award,
        updated_at = now()
    where user_id = uid
    returning balance into new_balance;

    insert into public.btv_wallet_transactions(
      user_id, amount, balance_after, transaction_type, description, reference_type, idempotency_key
    ) values (
      uid, award, new_balance, 'reward',
      'Golden Question reward', 'golden_question',
      'golden:' || uid::text || ':' || q.id::text
    )
    on conflict(user_id, idempotency_key) do nothing;
  end if;

  insert into public.btv_golden_question_attempts(user_id, question_id, selected_option, is_correct, awarded_coins)
  values(uid, q.id, selected, correct, award);

  return jsonb_build_object(
    'success', true,
    'already_answered', false,
    'is_correct', correct,
    'awarded_coins', award,
    'correct_option', q.correct_option,
    'explanation', q.explanation,
    'balance', new_balance
  );
end;
$$;

revoke all on function public.btv_answer_golden_question(uuid,text) from public, anon;
grant execute on function public.btv_answer_golden_question(uuid,text) to authenticated;

-- Ensure source columns exist on CBT in case the environment missed earlier migration.
alter table public.cbt_questions
  add column if not exists question_image_url text,
  add column if not exists image_caption text;

with golden_source as (
  select
    q.id as source_id,
    q.profession,
    q.subject,
    q.difficulty,
    regexp_replace(q.question_text, '^\[BTV-GOLDEN-[0-9]+\]\s*', '') as prompt,
    q.question_image_url,
    q.image_caption,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.correct_option,
    q.explanation,
    q.source_hash,
    row_number() over (order by q.id) as rn
  from public.cbt_questions q
  where q.question_text like '[BTV-GOLDEN-%'
)
insert into public.btv_golden_questions(
  audience, category, difficulty, prompt, question_image_url, image_caption,
  option_a, option_b, option_c, option_d, correct_option, explanation,
  coin_reward, is_active, sort_order, source_hash, source_reference, legacy_source_question_id
)
select
  case when profession in ('nurse','midwife','both') then profession else 'both' end,
  'Instrument identification',
  case when difficulty in ('easy','medium','hard') then difficulty else 'medium' end,
  prompt, question_image_url, image_caption,
  option_a, option_b, option_c, option_d, correct_option, coalesce(explanation,''),
  25, true, rn, source_hash,
  'Imported from v119 mistaken CBT seed to Golden Question Centre',
  source_id
from golden_source
where not exists (
  select 1
  from public.btv_golden_questions g
  where g.source_hash = golden_source.source_hash
);

-- Remove migrated Golden rows from CBT-related tables first, then from CBT question bank.
with golden_ids as (
  select id
  from public.cbt_questions
  where question_text like '[BTV-GOLDEN-%'
)
delete from public.cbt_attempts a
using golden_ids g
where a.question_id = g.id;

with golden_ids as (
  select id
  from public.cbt_questions
  where question_text like '[BTV-GOLDEN-%'
)
delete from public.cbt_bookmarks b
using golden_ids g
where b.question_id = g.id;

delete from public.cbt_questions
where question_text like '[BTV-GOLDEN-%';
