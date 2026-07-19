-- Beyond The Visa v87: one authoritative Beyond Coins wallet and atomic paid exams.
-- This migration is additive and preserves all existing users, questions and results.
create extension if not exists pgcrypto;

-- Consolidate the ledger. Existing signed `amount` is retained for compatibility.
alter table public.btv_wallet_transactions add column if not exists wallet_id uuid references public.btv_wallets(user_id) on delete cascade;
alter table public.btv_wallet_transactions add column if not exists balance_before integer;
alter table public.btv_wallet_transactions add column if not exists source_type text;
alter table public.btv_wallet_transactions add column if not exists source_id_text text;
alter table public.btv_wallet_transactions add column if not exists payment_reference text;
alter table public.btv_wallet_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
update public.btv_wallet_transactions
set wallet_id=user_id,
    balance_before=coalesce(balance_before,balance_after-amount),
    source_type=coalesce(source_type,transaction_type),
    source_id_text=coalesce(source_id_text,reference_id::text)
where wallet_id is null or balance_before is null or source_type is null;
alter table public.btv_wallet_transactions alter column wallet_id set not null;
alter table public.btv_wallet_transactions alter column balance_before set not null;
alter table public.btv_wallet_transactions alter column source_type set not null;
create unique index if not exists btv_wallet_transactions_payment_reference_uq
  on public.btv_wallet_transactions(payment_reference) where payment_reference is not null;

alter table public.btv_wallet_transactions drop constraint if exists btv_wallet_transactions_transaction_type_check;
alter table public.btv_wallet_transactions add constraint btv_wallet_transactions_transaction_type_check check(transaction_type in
 ('welcome','mock_charge','mock_refund','exam_charge','exam_refund','mentor_charge','mentor_refund','reward','purchase','purchase_refund','admin_adjustment'));

-- Product configuration extends the existing catalogue instead of duplicating it.
alter table public.btv_mock_catalog add column if not exists question_source text;
alter table public.btv_mock_catalog add column if not exists section text;
alter table public.btv_mock_catalog add column if not exists product_kind text not null default 'exam';
alter table public.btv_mock_catalog add column if not exists eligibility jsonb not null default '{}'::jsonb;
alter table public.btv_coin_purchases add column if not exists coins_credited integer not null default 0;
alter table public.btv_coin_purchases add column if not exists provider_payload jsonb not null default '{}'::jsonb;
alter table public.btv_coin_purchases add column if not exists failure_reason text;
update public.btv_mock_catalog set question_source=case
 when lower(exam_type)='cbt' then 'cbt_questions'
 when lower(exam_type)='nclex' then 'nclex_questions'
 when lower(exam_type)='ielts' then 'btv_exam_questions'
 else 'btv_exam_questions' end
where question_source is null;

-- Generic source for IELTS/OSCE and future banks. Existing CBT/NCLEX tables stay untouched.
create table if not exists public.btv_exam_questions(
 id uuid primary key default gen_random_uuid(), exam_type text not null, section text,
 question_text text not null, options jsonb not null default '[]'::jsonb,
 correct_answer jsonb not null, explanation text, metadata jsonb not null default '{}'::jsonb,
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists btv_exam_questions_source_idx on public.btv_exam_questions(exam_type,section,is_active);

create table if not exists public.btv_exam_product_questions(
 exam_product_id uuid not null references public.btv_mock_catalog(id) on delete cascade, question_id text not null,
 display_order integer not null default 0, is_active boolean not null default true, created_at timestamptz not null default now(),
 primary key(exam_product_id,question_id)
);

create table if not exists public.btv_exam_attempts(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 exam_product_id uuid not null references public.btv_mock_catalog(id), wallet_transaction_id uuid references public.btv_wallet_transactions(id),
 idempotency_key text not null, status text not null default 'active' check(status in ('pending','active','submitted','completed','expired','cancelled','refunded')),
 question_source text not null, question_ids jsonb not null default '[]'::jsonb,
 started_at timestamptz not null default now(), expires_at timestamptz, submitted_at timestamptz,
 score numeric, total_questions integer not null, coin_price_paid integer not null,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key)
);
create unique index if not exists btv_exam_attempts_one_active_product
 on public.btv_exam_attempts(user_id,exam_product_id) where status='active';
create index if not exists btv_exam_attempts_user_created on public.btv_exam_attempts(user_id,created_at desc);

create table if not exists public.btv_exam_attempt_questions(
 id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.btv_exam_attempts(id) on delete cascade,
 question_id text not null, display_order integer not null, selected_answer jsonb, is_correct boolean, answered_at timestamptz,
 unique(attempt_id,question_id), unique(attempt_id,display_order)
);

-- Exactly-once welcome bonus. The wallet starts at zero and the transaction creates the 150 BC.
alter table public.btv_wallets alter column balance set default 0;
alter table public.btv_wallets alter column lifetime_earned set default 0;
create or replace function public.btv_bootstrap_user(p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_balance integer; v_tx uuid; v_created uuid;
begin
  if p_user is null then raise exception using message='AUTH_REQUIRED'; end if;
  insert into btv_wallets(user_id,balance,lifetime_earned,lifetime_spent) values(p_user,0,0,0)
    on conflict(user_id) do nothing returning user_id into v_created;
  select id into v_tx from btv_wallet_transactions where user_id=p_user and idempotency_key='welcome-bonus';
  if v_tx is null then
    select balance into v_balance from btv_wallets where user_id=p_user for update;
    if v_created is not null or v_balance<150 then
      update btv_wallets set balance=balance+150,lifetime_earned=lifetime_earned+150,updated_at=now()
        where user_id=p_user returning balance into v_balance;
    else
      update btv_wallets set lifetime_earned=greatest(lifetime_earned,150),updated_at=now() where user_id=p_user;
    end if;
    insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,description,idempotency_key,metadata)
      values(p_user,p_user,150,greatest(v_balance-150,0),v_balance,'welcome','welcome_bonus','Welcome bonus','welcome-bonus',jsonb_build_object('reconciled_existing_wallet',v_created is null))
      on conflict(user_id,idempotency_key) do nothing;
  end if;
  insert into btv_gamification(user_id) values(p_user) on conflict(user_id) do nothing;
  insert into btv_notification_preferences(user_id) values(p_user) on conflict(user_id) do nothing;
end $$;

-- Repair prior wallets whose row defaulted to 150 but had no immutable welcome entry.
do $$ declare r record; begin
 for r in select w.user_id from public.btv_wallets w
          where not exists(select 1 from public.btv_wallet_transactions t where t.user_id=w.user_id and t.idempotency_key='welcome-bonus')
 loop perform public.btv_bootstrap_user(r.user_id); end loop;
end $$;

-- Atomic product validation, row lock, question snapshot, debit and attempt creation.
create or replace function public.btv_start_paid_exam(p_product_code text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_user uuid:=auth.uid(); v_product btv_mock_catalog%rowtype; v_wallet btv_wallets%rowtype;
 v_attempt btv_exam_attempts%rowtype; v_ids text[]; v_attempt_id uuid; v_tx_id uuid; v_before integer; v_after integer;
 v_source text; v_sql text; v_section text;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 if nullif(trim(p_idempotency_key),'') is null then raise exception using message='EXAM_START_FAILED: idempotency key required'; end if;
 perform btv_bootstrap_user(v_user);
 select * into v_product from btv_mock_catalog where code=p_product_code;
 if not found then raise exception using message='PRODUCT_NOT_FOUND'; end if;
 if not v_product.is_active then raise exception using message='PRODUCT_INACTIVE'; end if;
 if coalesce(v_product.question_count,0)<=0 or coalesce(v_product.duration_minutes,0)<=0 then
   raise exception using message='PRODUCT_INACTIVE: product requires question count and duration';
 end if;
 select * into v_attempt from btv_exam_attempts where user_id=v_user and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 select * into v_attempt from btv_exam_attempts where user_id=v_user and exam_product_id=v_product.id and status='active' order by created_at desc limit 1;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 v_source:=coalesce(v_product.question_source,''); v_section:=coalesce(v_product.section,v_product.mock_category);
 if v_source not in ('cbt_questions','nclex_questions','btv_exam_questions') then raise exception using message='QUESTION_BANK_INCOMPLETE: invalid question source'; end if;
 if to_regclass('public.'||v_source) is null then raise exception using message='QUESTION_BANK_INCOMPLETE: source table is missing'; end if;
 select array_agg(question_id order by display_order,question_id) into v_ids from (select question_id,display_order from btv_exam_product_questions where exam_product_id=v_product.id and is_active order by display_order,question_id limit v_product.question_count) mapped;
 if v_product.code like 'adult_nursing_%' and coalesce(array_length(v_ids,1),0)=0 then raise exception using message='QUESTION_BANK_INCOMPLETE: Adult Nursing products require explicit reviewed question mappings'; end if;
 if coalesce(array_length(v_ids,1),0)=0 then
   if v_source='btv_exam_questions' then
     v_sql:=format('select array_agg(id::text) from (select id from public.%I where is_active=true and lower(exam_type)=lower($1) and ($2='''' or section is null or lower(section)=lower($2)) order by random() limit $3) q',v_source);
     execute v_sql into v_ids using v_product.exam_type,v_section,v_product.question_count;
   else
     v_sql:=format('select array_agg(id::text) from (select id from public.%I where is_active=true order by random() limit $1) q',v_source);
     execute v_sql into v_ids using v_product.question_count;
   end if;
 end if;
 if coalesce(array_length(v_ids,1),0)<>v_product.question_count then raise exception using message=format('QUESTION_BANK_INCOMPLETE: requires %s active questions, found %s',v_product.question_count,coalesce(array_length(v_ids,1),0)); end if;
 select * into v_wallet from btv_wallets where user_id=v_user for update;
 if v_wallet.balance<v_product.coin_cost then raise exception using message=format('INSUFFICIENT_COINS:%s:%s',v_product.coin_cost,v_wallet.balance); end if;
 v_before:=v_wallet.balance; v_after:=v_before-v_product.coin_cost;
 insert into btv_exam_attempts(user_id,exam_product_id,idempotency_key,status,question_source,question_ids,expires_at,total_questions,coin_price_paid)
 values(v_user,v_product.id,p_idempotency_key,'active',v_source,to_jsonb(v_ids),now()+make_interval(mins=>v_product.duration_minutes),v_product.question_count,v_product.coin_cost)
 returning id into v_attempt_id;
 insert into btv_exam_attempt_questions(attempt_id,question_id,display_order)
 select v_attempt_id,x.id,x.ord::integer from unnest(v_ids) with ordinality x(id,ord);
 update btv_wallets set balance=v_after,lifetime_spent=lifetime_spent+v_product.coin_cost,updated_at=now() where user_id=v_user;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,reference_type,reference_id,source_id_text,description,idempotency_key,metadata)
 values(v_user,v_user,-v_product.coin_cost,v_before,v_after,'exam_charge','exam_purchase','exam_attempt',v_attempt_id,v_attempt_id::text,v_product.title,'exam:'||v_attempt_id,jsonb_build_object('product_code',v_product.code,'question_count',v_product.question_count,'duration_minutes',v_product.duration_minutes))
 returning id into v_tx_id;
 update btv_exam_attempts set wallet_transaction_id=v_tx_id where id=v_attempt_id;
 return jsonb_build_object('attempt_id',v_attempt_id,'resumed',false,'balance',v_after,'coin_price',v_product.coin_cost,'duration_minutes',v_product.duration_minutes,'question_count',v_product.question_count);
exception when unique_violation then
 select * into v_attempt from btv_exam_attempts where user_id=v_user and (idempotency_key=p_idempotency_key or (exam_product_id=v_product.id and status='active')) order by created_at desc limit 1;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 raise;
end $$;

-- Safe attempt payload: answers and rationales are removed until submission.
create or replace function public.btv_get_exam_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_attempt btv_exam_attempts%rowtype; v_product btv_mock_catalog%rowtype; r record; v_q jsonb; v_questions jsonb:='[]'::jsonb;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 select * into v_attempt from btv_exam_attempts where id=p_attempt_id and user_id=v_user;
 if not found then raise exception using message='ATTEMPT_NOT_FOUND'; end if;
 select * into v_product from btv_mock_catalog where id=v_attempt.exam_product_id;
 for r in select * from btv_exam_attempt_questions where attempt_id=v_attempt.id order by display_order loop
   execute format('select to_jsonb(q) from public.%I q where q.id::text=$1',v_attempt.question_source) into v_q using r.question_id;
   if v_attempt.status in ('submitted','completed','refunded') then
     v_q:=v_q||jsonb_build_object('selected_answer',r.selected_answer,'is_correct',r.is_correct);
   elsif v_attempt.question_source='cbt_questions' then v_q:=v_q-'correct_option'-'explanation';
   elsif v_attempt.question_source='nclex_questions' then v_q:=v_q-'correct_options'-'rationale'-'test_strategy';
   else v_q:=v_q-'correct_answer'-'explanation'; end if;
   v_questions:=v_questions||jsonb_build_array(v_q||jsonb_build_object('display_order',r.display_order));
 end loop;
 return jsonb_build_object('attempt',to_jsonb(v_attempt),'product',to_jsonb(v_product),'questions',v_questions,'server_time',now());
end $$;

-- Submission and scoring are server authoritative; the review payload is returned only afterwards.
create or replace function public.btv_submit_paid_exam(p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_attempt btv_exam_attempts%rowtype; r record; v_selected jsonb; v_correct jsonb; v_ok boolean; v_score numeric; v_correct_count integer:=0;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 select * into v_attempt from btv_exam_attempts where id=p_attempt_id and user_id=v_user for update;
 if not found then raise exception using message='ATTEMPT_NOT_FOUND'; end if;
 if v_attempt.status in ('submitted','completed') then return public.btv_get_exam_attempt(v_attempt.id); end if;
 if v_attempt.status<>'active' then raise exception using message='ATTEMPT_NOT_ACTIVE'; end if;
 for r in select * from btv_exam_attempt_questions where attempt_id=v_attempt.id order by display_order loop
   v_selected:=coalesce(p_answers->r.question_id,'null'::jsonb);
   if v_attempt.question_source='cbt_questions' then
     execute 'select to_jsonb(correct_option) from public.cbt_questions where id::text=$1' into v_correct using r.question_id;
   elsif v_attempt.question_source='nclex_questions' then
     execute 'select to_jsonb(correct_options) from public.nclex_questions where id::text=$1' into v_correct using r.question_id;
   else execute 'select correct_answer from public.btv_exam_questions where id::text=$1' into v_correct using r.question_id; end if;
   if v_attempt.question_source='nclex_questions' and jsonb_typeof(v_selected)='array' and jsonb_typeof(v_correct)='array' then
     select coalesce(array_agg(value order by value),'{}')=coalesce((select array_agg(value order by value) from jsonb_array_elements_text(v_correct)),'{}') into v_ok from jsonb_array_elements_text(v_selected);
   else v_ok:=coalesce(v_selected=v_correct,false); end if;
   if v_ok then v_correct_count:=v_correct_count+1; end if;
   update btv_exam_attempt_questions set selected_answer=v_selected,is_correct=v_ok,answered_at=now() where id=r.id;
 end loop;
 v_score:=round((v_correct_count::numeric/greatest(v_attempt.total_questions,1))*100,2);
 update btv_exam_attempts set status='completed',submitted_at=now(),score=v_score,updated_at=now() where id=v_attempt.id;
 return public.btv_get_exam_attempt(v_attempt.id)||jsonb_build_object('score',v_score,'correct_count',v_correct_count);
end $$;

create or replace function public.btv_admin_refund_exam(p_attempt_id uuid,p_reason text,p_key text)
returns integer language plpgsql security definer set search_path=public as $$
declare v_attempt btv_exam_attempts%rowtype; v_wallet btv_wallets%rowtype; v_balance integer; v_before integer;
begin
 if not btv_is_admin() then raise exception using message='ADMIN_REQUIRED'; end if;
 if nullif(trim(p_reason),'') is null or nullif(trim(p_key),'') is null then raise exception using message='REFUND_REASON_REQUIRED'; end if;
 select * into v_attempt from btv_exam_attempts where id=p_attempt_id for update;
 if not found then raise exception using message='ATTEMPT_NOT_FOUND'; end if;
 select * into v_wallet from btv_wallets where user_id=v_attempt.user_id for update; v_before:=v_wallet.balance;
 if exists(select 1 from btv_wallet_transactions where user_id=v_attempt.user_id and idempotency_key='exam-refund:'||v_attempt.id) then return v_before; end if;
 update btv_wallets set balance=balance+v_attempt.coin_price_paid,lifetime_earned=lifetime_earned+v_attempt.coin_price_paid,updated_at=now() where user_id=v_attempt.user_id returning balance into v_balance;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata)
 values(v_attempt.user_id,v_attempt.user_id,v_attempt.coin_price_paid,v_before,v_balance,'exam_refund','refund',v_attempt.id::text,left(trim(p_reason),300),'exam-refund:'||v_attempt.id,jsonb_build_object('admin_id',auth.uid(),'admin_key',p_key));
 update btv_exam_attempts set status='refunded',updated_at=now() where id=v_attempt.id; return v_balance;
end $$;

-- Server-side daily free-practice counter (UTC day).
create table if not exists public.btv_daily_practice_usage(
 user_id uuid not null references auth.users(id) on delete cascade, practice_date date not null default (now() at time zone 'utc')::date,
 exam_type text not null, questions_answered integer not null default 0 check(questions_answered between 0 and 10), updated_at timestamptz not null default now(),
 primary key(user_id,practice_date,exam_type)
);
create or replace function public.btv_use_free_practice(p_exam_type text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_date date:=(now() at time zone 'utc')::date; v_count integer;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 insert into btv_daily_practice_usage(user_id,practice_date,exam_type,questions_answered) values(v_user,v_date,lower(p_exam_type),0)
 on conflict(user_id,practice_date,exam_type) do nothing;
 select questions_answered into v_count from btv_daily_practice_usage where user_id=v_user and practice_date=v_date and exam_type=lower(p_exam_type) for update;
 if v_count>=10 then raise exception using message='DAILY_PRACTICE_LIMIT'; end if;
 update btv_daily_practice_usage set questions_answered=questions_answered+1,updated_at=now() where user_id=v_user and practice_date=v_date and exam_type=lower(p_exam_type) returning questions_answered into v_count;
 return jsonb_build_object('used',v_count,'remaining',10-v_count,'resets_at',(v_date+1)::timestamptz);
end $$;

-- Authoritative products. Prices are editable by admin and never trusted from the browser.
insert into public.btv_mock_catalog(code,title,exam_type,mock_category,section,coin_cost,duration_minutes,question_count,question_source,is_active,configuration) values
 ('cbt_short','CBT Focused Mock','cbt','short','general',25,30,30,'cbt_questions',true,'{}'),
 ('cbt_full','CBT Full Mock','cbt','full','general',50,60,60,'cbt_questions',true,'{}'),
 ('adult_nursing_short','Adult Nursing Focused Mock','cbt','adult-nursing','adult-nursing',25,30,30,'cbt_questions',true,'{}'),
 ('adult_nursing_full','Adult Nursing Full Mock','cbt','adult-nursing','adult-nursing',50,60,60,'cbt_questions',true,'{}'),
 ('nclex_short','NCLEX-RN Focused Mock','nclex','short','general',25,30,30,'nclex_questions',true,'{}'),
 ('nclex_full','NCLEX-RN Full Mock','nclex','full','general',50,60,60,'nclex_questions',true,'{}'),
 ('ielts_short','IELTS Academic Focused Mock','ielts','short','academic',25,30,30,'btv_exam_questions',true,'{}'),
 ('ielts_full','IELTS Academic Full Mock','ielts','full','academic',50,60,60,'btv_exam_questions',true,'{}'),
 ('ielts_reading','IELTS Academic Reading Unlock','ielts','reading','reading',100,60,40,'btv_exam_questions',true,'{"access":"section"}'),
 ('ielts_writing','IELTS Academic Writing Unlock','ielts','writing','writing',100,60,2,'btv_exam_questions',true,'{"access":"section"}'),
 ('osce_short','OSCE Focused Stations','osce','short','general',25,30,30,'btv_exam_questions',true,'{}'),
 ('osce_full','OSCE Full Stations','osce','full','general',50,60,60,'btv_exam_questions',true,'{}')
on conflict(code) do update set title=excluded.title,exam_type=excluded.exam_type,mock_category=excluded.mock_category,section=excluded.section,coin_cost=excluded.coin_cost,duration_minutes=excluded.duration_minutes,question_count=excluded.question_count,question_source=excluded.question_source,is_active=excluded.is_active,configuration=excluded.configuration,updated_at=now();

-- RLS: clients read only their records; all writes occur through SECURITY DEFINER RPCs.
alter table public.btv_exam_questions enable row level security;
alter table public.btv_exam_product_questions enable row level security;
alter table public.btv_exam_attempts enable row level security;
alter table public.btv_exam_attempt_questions enable row level security;
alter table public.btv_daily_practice_usage enable row level security;
drop policy if exists btv_exam_questions_admin on public.btv_exam_questions;
create policy btv_exam_questions_admin on public.btv_exam_questions for all using(btv_is_admin()) with check(btv_is_admin());
drop policy if exists btv_exam_product_questions_read on public.btv_exam_product_questions;
create policy btv_exam_product_questions_read on public.btv_exam_product_questions for select using(is_active or btv_is_admin());
drop policy if exists btv_exam_product_questions_admin on public.btv_exam_product_questions;
create policy btv_exam_product_questions_admin on public.btv_exam_product_questions for all using(btv_is_admin()) with check(btv_is_admin());
drop policy if exists btv_exam_attempts_own on public.btv_exam_attempts;
create policy btv_exam_attempts_own on public.btv_exam_attempts for select using(user_id=auth.uid() or btv_is_admin());
drop policy if exists btv_exam_attempt_questions_own on public.btv_exam_attempt_questions;
create policy btv_exam_attempt_questions_own on public.btv_exam_attempt_questions for select using(exists(select 1 from btv_exam_attempts a where a.id=attempt_id and (a.user_id=auth.uid() or btv_is_admin())));
drop policy if exists btv_daily_practice_own on public.btv_daily_practice_usage;
create policy btv_daily_practice_own on public.btv_daily_practice_usage for select using(user_id=auth.uid() or btv_is_admin());
revoke insert,update,delete on public.btv_wallets,public.btv_wallet_transactions,public.btv_exam_attempts,public.btv_exam_attempt_questions,public.btv_daily_practice_usage from anon,authenticated;
revoke all on public.btv_exam_questions from anon,authenticated;
grant select on public.btv_wallets,public.btv_wallet_transactions,public.btv_mock_catalog,public.btv_exam_product_questions,public.btv_exam_attempts,public.btv_exam_attempt_questions,public.btv_daily_practice_usage to authenticated;
grant select,insert,update,delete on public.btv_exam_questions to authenticated;
revoke all on function public.btv_start_paid_exam(text,text) from public,anon;
revoke all on function public.btv_get_exam_attempt(uuid) from public,anon;
revoke all on function public.btv_submit_paid_exam(uuid,jsonb) from public,anon;
revoke all on function public.btv_admin_refund_exam(uuid,text,text) from public,anon;
revoke all on function public.btv_use_free_practice(text) from public,anon;
grant execute on function public.btv_start_paid_exam(text,text) to authenticated;
grant execute on function public.btv_get_exam_attempt(uuid) to authenticated;
grant execute on function public.btv_submit_paid_exam(uuid,jsonb) to authenticated;
grant execute on function public.btv_admin_refund_exam(uuid,text,text) to authenticated;
grant execute on function public.btv_use_free_practice(text) to authenticated;

-- Retire the obsolete split IELTS wallet path. Existing rows remain for audit only.
do $$ begin
 if to_regclass('public.btv_coin_wallets') is not null then execute 'revoke all on public.btv_coin_wallets from anon,authenticated'; end if;
 if to_regclass('public.btv_coin_transactions') is not null then execute 'revoke all on public.btv_coin_transactions from anon,authenticated'; end if;
end $$;

-- Administrative configuration policies for the v87 control centre.
drop policy if exists catalog_admin on public.btv_mock_catalog;
create policy catalog_admin on public.btv_mock_catalog for all using(public.btv_is_admin()) with check(public.btv_is_admin());
grant insert,update,delete on public.btv_mock_catalog,public.btv_coin_packages,public.btv_exam_product_questions to authenticated;

-- Paystack confirmation is idempotent, service-role only and records the provider payload.
create or replace function public.btv_confirm_coin_purchase(p_reference text,p_provider_payload jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare
  v_purchase public.btv_coin_purchases%rowtype;
  v_wallet public.btv_wallets%rowtype;
  v_before integer;
  v_after integer;
begin
  select * into v_purchase from public.btv_coin_purchases where provider_reference=p_reference for update;
  if not found then raise exception using message='PURCHASE_NOT_FOUND'; end if;
  perform public.btv_bootstrap_user(v_purchase.user_id);
  select * into v_wallet from public.btv_wallets where user_id=v_purchase.user_id for update;
  if v_purchase.status='paid' then return v_wallet.balance; end if;
  if v_purchase.status<>'pending' then raise exception using message='PURCHASE_NOT_CONFIRMABLE'; end if;
  v_before:=v_wallet.balance;
  v_after:=v_before+v_purchase.coin_amount;
  update public.btv_wallets set balance=v_after,lifetime_earned=lifetime_earned+v_purchase.coin_amount,updated_at=now()
    where user_id=v_purchase.user_id;
  update public.btv_coin_purchases set status='paid',coins_credited=v_purchase.coin_amount,provider_payload=coalesce(p_provider_payload,'{}'::jsonb),verified_at=now(),updated_at=now()
    where id=v_purchase.id;
  insert into public.btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,reference_type,reference_id,source_id_text,payment_reference,description,idempotency_key,metadata)
  values(v_purchase.user_id,v_purchase.user_id,v_purchase.coin_amount,v_before,v_after,'purchase','paystack','coin_purchase',v_purchase.id,v_purchase.id::text,v_purchase.provider_reference,'Beyond Coins purchase','coin-purchase:'||v_purchase.provider_reference,jsonb_build_object('purchase_id',v_purchase.id,'provider_payload',coalesce(p_provider_payload,'{}'::jsonb)))
  on conflict(user_id,idempotency_key) do nothing;
  return v_after;
end $$;
revoke all on function public.btv_confirm_coin_purchase(text,jsonb) from public,anon,authenticated;
grant execute on function public.btv_confirm_coin_purchase(text,jsonb) to service_role;

-- Preserve existing IELTS unlock records but debit the single authoritative wallet.
create or replace function public.btv_unlock_learning(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid();
  v_product public.btv_mock_catalog%rowtype;
  v_wallet public.btv_wallets%rowtype;
  v_before integer;
  v_after integer;
begin
  if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
  if p_code not in ('ielts_reading','ielts_writing') then raise exception using message='PRODUCT_NOT_FOUND'; end if;
  perform public.btv_bootstrap_user(v_user);
  if exists(select 1 from public.btv_user_learning_unlocks where user_id=v_user and unlock_code=p_code) then
    return jsonb_build_object('unlocked',true,'already_unlocked',true,'balance',(select balance from public.btv_wallets where user_id=v_user));
  end if;
  select * into v_product from public.btv_mock_catalog where code=p_code and is_active for share;
  if not found then raise exception using message='PRODUCT_INACTIVE'; end if;
  select * into v_wallet from public.btv_wallets where user_id=v_user for update;
  if v_wallet.balance<v_product.coin_cost then raise exception using message=format('INSUFFICIENT_COINS:%s:%s',v_product.coin_cost,v_wallet.balance); end if;
  v_before:=v_wallet.balance;
  v_after:=v_before-v_product.coin_cost;
  insert into public.btv_user_learning_unlocks(user_id,unlock_code,coin_cost) values(v_user,p_code,v_product.coin_cost)
    on conflict(user_id,unlock_code) do nothing;
  if not found then return jsonb_build_object('unlocked',true,'already_unlocked',true,'balance',v_before); end if;
  update public.btv_wallets set balance=v_after,lifetime_spent=lifetime_spent+v_product.coin_cost,updated_at=now() where user_id=v_user;
  insert into public.btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata)
  values(v_user,v_user,-v_product.coin_cost,v_before,v_after,'exam_charge','exam_purchase',p_code,'Unlocked '||v_product.title,'learning:'||p_code,jsonb_build_object('product_code',p_code,'access','section'))
  on conflict(user_id,idempotency_key) do nothing;
  return jsonb_build_object('unlocked',true,'already_unlocked',false,'balance',v_after,'cost',v_product.coin_cost);
end $$;
revoke all on function public.btv_unlock_learning(text) from public,anon;
grant execute on function public.btv_unlock_learning(text) to authenticated;
