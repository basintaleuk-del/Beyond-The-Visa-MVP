-- Premium CBT Numeracy hub: private answer bank, daily practice and paid mocks.

create table if not exists public.btv_numeracy_questions (
  id uuid primary key default gen_random_uuid(),
  question_code text not null unique,
  category text not null check (category in ('measuring_correct_dose','metric_units','oral_medications','injections','intravenous_infusions','fluid_balance')),
  question_text text not null,
  answer_numeric numeric not null,
  answer_unit text not null default '',
  tolerance numeric not null default 0 check (tolerance >= 0),
  rationale text not null,
  difficulty text not null default 'exam_standard' check (difficulty in ('foundation','exam_standard','advanced')),
  visual_type text not null default 'none' check (visual_type in ('none','syringe','medicine_cup','iv_bag','fluid_chart')),
  visual_data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  source_note text not null default 'Original independent practice modelled on the public NMC Test of Competence numeracy blueprint; not official NMC or Pearson VUE content.',
  created_at timestamptz not null default now()
);

alter table public.btv_numeracy_questions enable row level security;
revoke all on public.btv_numeracy_questions from anon, authenticated;
grant all on public.btv_numeracy_questions to service_role;

create index if not exists btv_numeracy_questions_active_category_idx
  on public.btv_numeracy_questions (category) where is_active;

create table if not exists public.btv_numeracy_daily_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.btv_numeracy_questions(id) on delete cascade,
  practice_date date not null default (timezone('utc', now()))::date,
  submitted_answer numeric not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id, practice_date)
);

alter table public.btv_numeracy_daily_answers enable row level security;
revoke all on public.btv_numeracy_daily_answers from anon, authenticated;
grant all on public.btv_numeracy_daily_answers to service_role;

-- Exactly 3,000 original, parameterised questions. Every 15-question block follows
-- the public NMC numeracy weighting: 2 dose, 2 metric, 4 oral, 3 injection, 3 IV, 1 fluid balance.
insert into public.btv_numeracy_questions
  (question_code, category, question_text, answer_numeric, answer_unit, tolerance, rationale, difficulty, visual_type, visual_data)
select
  'NUM-' || lpad(g.i::text, 4, '0'),
  case
    when g.slot in (1,2) then 'measuring_correct_dose'
    when g.slot in (3,4) then 'metric_units'
    when g.slot between 5 and 8 then 'oral_medications'
    when g.slot between 9 and 11 then 'injections'
    when g.slot between 12 and 14 then 'intravenous_infusions'
    else 'fluid_balance'
  end,
  case
    when g.slot in (1,2) then format('A liquid medicine contains %s mg in %s mL. The prescription is for %s mg. How many mL should be administered? Give your answer to 1 decimal place.', g.strength, g.volume, g.dose)
    when g.slot=3 then format('Convert %s micrograms to milligrams. Give the numerical value only.', g.micrograms)
    when g.slot=4 then format('Convert %s litres to millilitres. Give the numerical value only.', g.litres)
    when g.slot between 5 and 8 then format('A patient is prescribed %s mg of an oral medicine. Tablets containing %s mg are available. How many tablets are required?', g.tablet_dose, g.tablet_strength)
    when g.slot between 9 and 11 then format('An injection contains %s mg in %s mL. The prescribed dose is %s mg. What volume should be drawn into the syringe? Give your answer to 1 decimal place.', g.strength, g.volume, g.dose)
    when g.slot between 12 and 14 then format('An infusion of %s mL must run over %s hours. Calculate the pump rate in mL/hour, rounded to the nearest whole number.', g.infusion_volume, g.hours)
    else format('During a shift, intake was %s mL oral fluid plus %s mL IV fluid. Output was %s mL urine and %s mL drainage. What is the fluid balance in mL?', g.intake_a, g.intake_b, g.output_a, g.output_b)
  end,
  case
    when g.slot in (1,2,9,10,11) then round((g.dose * g.volume / g.strength)::numeric, 1)
    when g.slot=3 then round((g.micrograms / 1000.0)::numeric, 3)
    when g.slot=4 then (g.litres * 1000)::numeric
    when g.slot between 5 and 8 then (g.tablet_dose / g.tablet_strength)::numeric
    when g.slot between 12 and 14 then round((g.infusion_volume / g.hours)::numeric, 0)
    else (g.intake_a + g.intake_b - g.output_a - g.output_b)::numeric
  end,
  case when g.slot in (1,2,9,10,11) then 'mL' when g.slot=3 then 'mg' when g.slot=4 then 'mL' when g.slot between 5 and 8 then 'tablets' when g.slot between 12 and 14 then 'mL/hour' else 'mL' end,
  case when g.slot in (1,2,9,10,11) then 0.05 else 0 end,
  case
    when g.slot in (1,2,9,10,11) then format('Use prescribed dose divided by stock dose multiplied by stock volume: %s divided by %s multiplied by %s = %s mL.', g.dose, g.strength, g.volume, round((g.dose * g.volume / g.strength)::numeric,1))
    when g.slot=3 then format('There are 1,000 micrograms in 1 mg, so %s divided by 1,000 = %s mg.', g.micrograms, round((g.micrograms/1000.0)::numeric,3))
    when g.slot=4 then format('There are 1,000 mL in 1 litre, so %s multiplied by 1,000 = %s mL.', g.litres, g.litres*1000)
    when g.slot between 5 and 8 then format('Required tablets = prescribed dose divided by strength per tablet: %s divided by %s = %s.', g.tablet_dose, g.tablet_strength, g.tablet_dose/g.tablet_strength)
    when g.slot between 12 and 14 then format('Pump rate = volume divided by time: %s divided by %s = %s mL/hour after rounding.', g.infusion_volume, g.hours, round((g.infusion_volume/g.hours)::numeric,0))
    else format('Balance = total intake minus total output: (%s + %s) minus (%s + %s) = %s mL.', g.intake_a, g.intake_b, g.output_a, g.output_b, g.intake_a+g.intake_b-g.output_a-g.output_b)
  end,
  case when g.i % 7=0 then 'advanced' when g.i % 5=0 then 'foundation' else 'exam_standard' end,
  case when g.slot in (1,2) then 'medicine_cup' when g.slot between 9 and 11 then 'syringe' when g.slot between 12 and 14 then 'iv_bag' when g.slot=15 then 'fluid_chart' else 'none' end,
  case
    when g.slot in (1,2,9,10,11) then jsonb_build_object('capacity_ml', greatest(1,ceil(g.volume*4)), 'stock_volume_ml',g.volume,'graduation_ml',case when g.volume<=2 then 0.1 else 0.5 end)
    when g.slot between 12 and 14 then jsonb_build_object('bag_ml',g.infusion_volume,'hours',g.hours)
    when g.slot=15 then jsonb_build_object('intake',jsonb_build_array(g.intake_a,g.intake_b),'output',jsonb_build_array(g.output_a,g.output_b))
    else '{}'::jsonb
  end
from generate_series(1,3000) g0(i)
cross join lateral (
  select g0.i, ((g0.i-1)%15)+1 as slot,
    (100 + ((g0.i*37)%9)*50)::numeric as strength,
    (1 + ((g0.i*7)%4))::numeric as volume,
    (50 + ((g0.i*29)%8)*25)::numeric as dose,
    (125 + ((g0.i*41)%12)*125)::numeric as micrograms,
    round((0.25 + ((g0.i*13)%15)*0.25)::numeric,2) as litres,
    (50 + ((g0.i*17)%8)*25)::numeric as tablet_strength,
    ((50 + ((g0.i*17)%8)*25) * (1 + ((g0.i*11)%4)*0.5))::numeric as tablet_dose,
    (250 + ((g0.i*31)%7)*250)::numeric as infusion_volume,
    (2 + ((g0.i*19)%11))::numeric as hours,
    (300 + ((g0.i*23)%9)*50)::numeric as intake_a,
    (250 + ((g0.i*43)%8)*50)::numeric as intake_b,
    (200 + ((g0.i*47)%9)*50)::numeric as output_a,
    (50 + ((g0.i*53)%7)*25)::numeric as output_b
) g
on conflict (question_code) do nothing;

insert into public.btv_mock_catalog(code,title,exam_type,mock_category,coin_cost,duration_minutes,question_count,is_active,configuration,question_source,section,product_kind,eligibility)
values
 ('numeracy_short','Numeracy Sprint','numeracy','calculation',50,15,30,true,'{"mode":"timed","calculator":true}'::jsonb,'btv_numeracy_questions','all','exam','{}'::jsonb),
 ('numeracy_full','Numeracy Simulation','numeracy','calculation',100,30,60,true,'{"mode":"timed","calculator":true}'::jsonb,'btv_numeracy_questions','all','exam','{}'::jsonb)
on conflict (code) do update set title=excluded.title,exam_type=excluded.exam_type,mock_category=excluded.mock_category,coin_cost=excluded.coin_cost,duration_minutes=excluded.duration_minutes,question_count=excluded.question_count,is_active=true,configuration=excluded.configuration,question_source=excluded.question_source,section=excluded.section,product_kind=excluded.product_kind,updated_at=now();

insert into public.btv_coin_products(code,name,category,coin_price,access_type,duration_minutes,question_count,attempts,is_active,featured,description,linked_route,linked_resource,refund_eligible,benefit_summary,usage_terms,display_order)
values
 ('numeracy_short','Numeracy Sprint','exam',50,'one_attempt',15,30,1,true,true,'A 30-question CBT calculation sprint.','numeracy.html','numeracy_short',true,'30 random calculation questions with a 15-minute timer.','One timed attempt; charge is recorded before questions open.',45),
 ('numeracy_full','Numeracy Simulation','exam',100,'one_attempt',30,60,1,true,true,'A 60-question CBT calculation simulation.','numeracy.html','numeracy_full',true,'60 random calculation questions with a 30-minute timer.','One timed attempt; charge is recorded before questions open.',46)
on conflict (code) do update set name=excluded.name,category=excluded.category,coin_price=excluded.coin_price,access_type=excluded.access_type,duration_minutes=excluded.duration_minutes,question_count=excluded.question_count,is_active=true,featured=excluded.featured,description=excluded.description,linked_route=excluded.linked_route,linked_resource=excluded.linked_resource,refund_eligible=excluded.refund_eligible,benefit_summary=excluded.benefit_summary,usage_terms=excluded.usage_terms,display_order=excluded.display_order,updated_at=now();

create or replace function public.btv_numeracy_catalog()
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'total',count(*),
    'visual_questions',count(*) filter(where visual_type<>'none'),
    'daily_limit',10,
    'categories',coalesce(jsonb_agg(distinct category),'[]'::jsonb),
    'source_note','Original independent practice modelled on the public NMC Test of Competence numeracy blueprint; not official NMC or Pearson VUE content.'
  ) from public.btv_numeracy_questions where is_active;
$$;

create or replace function public.btv_numeracy_next_question(p_category text default null,p_exclude_ids uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_q public.btv_numeracy_questions%rowtype; v_used integer;
begin
  if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
  select count(*) into v_used from public.btv_numeracy_daily_answers where user_id=v_user and practice_date=(timezone('utc',now()))::date;
  if v_used>=10 then raise exception using message='DAILY_FREE_LIMIT_REACHED'; end if;
  select * into v_q from public.btv_numeracy_questions q
   where q.is_active and (p_category is null or q.category=p_category)
     and not(q.id=any(coalesce(p_exclude_ids,'{}'::uuid[])))
     and not exists(select 1 from public.btv_numeracy_daily_answers a where a.user_id=v_user and a.practice_date=(timezone('utc',now()))::date and a.question_id=q.id)
   order by random() limit 1;
  if not found then raise exception using message='QUESTION_BANK_EXHAUSTED'; end if;
  return (to_jsonb(v_q)-'answer_numeric'-'tolerance'-'rationale'-'is_active'-'source_note'-'created_at')||jsonb_build_object('remaining_today',10-v_used);
end; $$;

create or replace function public.btv_submit_numeracy_answer(p_question_id uuid,p_answer numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_q public.btv_numeracy_questions%rowtype; v_ok boolean; v_existing public.btv_numeracy_daily_answers%rowtype; v_usage jsonb;
begin
  if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
  if p_answer is null then raise exception using message='ANSWER_REQUIRED'; end if;
  select * into v_q from public.btv_numeracy_questions where id=p_question_id and is_active;
  if not found then raise exception using message='QUESTION_NOT_FOUND'; end if;
  select * into v_existing from public.btv_numeracy_daily_answers where user_id=v_user and question_id=p_question_id and practice_date=(timezone('utc',now()))::date;
  if found then return jsonb_build_object('correct',v_existing.is_correct,'answer',v_q.answer_numeric,'unit',v_q.answer_unit,'rationale',v_q.rationale,'remaining_today',10-(select count(*) from public.btv_numeracy_daily_answers where user_id=v_user and practice_date=(timezone('utc',now()))::date)); end if;
  v_usage:=public.btv_use_free_practice('numeracy');
  if not coalesce((v_usage->>'success')::boolean,false) then
    raise exception using message=coalesce(v_usage->>'code','DAILY_FREE_LIMIT_REACHED');
  end if;
  v_ok:=abs(p_answer-v_q.answer_numeric)<=v_q.tolerance;
  insert into public.btv_numeracy_daily_answers(user_id,question_id,submitted_answer,is_correct) values(v_user,p_question_id,p_answer,v_ok);
  return jsonb_build_object('correct',v_ok,'answer',v_q.answer_numeric,'unit',v_q.answer_unit,'rationale',v_q.rationale,'remaining_today',greatest(0,coalesce((v_usage->>'remaining')::integer,0)));
end; $$;

revoke all on function public.btv_numeracy_catalog() from public,anon;
revoke all on function public.btv_numeracy_next_question(text,uuid[]) from public,anon;
revoke all on function public.btv_submit_numeracy_answer(uuid,numeric) from public,anon;
grant execute on function public.btv_numeracy_catalog() to authenticated;
grant execute on function public.btv_numeracy_next_question(text,uuid[]) to authenticated;
grant execute on function public.btv_submit_numeracy_answer(uuid,numeric) to authenticated;

create or replace function public.btv_start_paid_exam(p_product_code text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_product btv_mock_catalog%rowtype; v_wallet btv_wallets%rowtype; v_attempt btv_exam_attempts%rowtype; v_ids text[]; v_attempt_id uuid; v_tx_id uuid; v_before integer; v_after integer; v_source text; v_sql text; v_section text;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 if nullif(trim(p_idempotency_key),'') is null then raise exception using message='EXAM_START_FAILED: idempotency key required'; end if;
 perform btv_bootstrap_user(v_user);
 select * into v_product from btv_mock_catalog where code=p_product_code;
 if not found then raise exception using message='PRODUCT_NOT_FOUND'; end if;
 if not v_product.is_active then raise exception using message='PRODUCT_INACTIVE'; end if;
 if coalesce(v_product.question_count,0)<=0 or coalesce(v_product.duration_minutes,0)<=0 then raise exception using message='PRODUCT_INACTIVE: product requires question count and duration'; end if;
 select * into v_attempt from btv_exam_attempts where user_id=v_user and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 select * into v_attempt from btv_exam_attempts where user_id=v_user and exam_product_id=v_product.id and status='active' order by created_at desc limit 1;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 v_source:=coalesce(v_product.question_source,''); v_section:=coalesce(v_product.section,v_product.mock_category);
 if v_source not in ('cbt_questions','nclex_questions','btv_exam_questions','btv_numeracy_questions') then raise exception using message='QUESTION_BANK_INCOMPLETE: invalid question source'; end if;
 if to_regclass('public.'||v_source) is null then raise exception using message='QUESTION_BANK_INCOMPLETE: source table is missing'; end if;
 select array_agg(question_id order by display_order,question_id) into v_ids from (select question_id,display_order from btv_exam_product_questions where exam_product_id=v_product.id and is_active order by display_order,question_id limit v_product.question_count) mapped;
 if v_product.code like 'adult_nursing_%' and coalesce(array_length(v_ids,1),0)=0 then raise exception using message='QUESTION_BANK_INCOMPLETE: Adult Nursing products require explicit reviewed question mappings'; end if;
 if coalesce(array_length(v_ids,1),0)=0 then
   if v_source='btv_exam_questions' then v_sql:=format('select array_agg(id::text) from (select id from public.%I where is_active=true and lower(exam_type)=lower($1) and ($2='''' or section is null or lower(section)=lower($2)) order by random() limit $3) q',v_source); execute v_sql into v_ids using v_product.exam_type,v_section,v_product.question_count;
   else v_sql:=format('select array_agg(id::text) from (select id from public.%I where is_active=true order by random() limit $1) q',v_source); execute v_sql into v_ids using v_product.question_count; end if;
 end if;
 if coalesce(array_length(v_ids,1),0)<>v_product.question_count then raise exception using message=format('QUESTION_BANK_INCOMPLETE: requires %s active questions, found %s',v_product.question_count,coalesce(array_length(v_ids,1),0)); end if;
 select * into v_wallet from btv_wallets where user_id=v_user for update;
 if v_wallet.balance<v_product.coin_cost then raise exception using message=format('INSUFFICIENT_COINS:%s:%s',v_product.coin_cost,v_wallet.balance); end if;
 v_before:=v_wallet.balance; v_after:=v_before-v_product.coin_cost;
 insert into btv_exam_attempts(user_id,exam_product_id,idempotency_key,status,question_source,question_ids,expires_at,total_questions,coin_price_paid) values(v_user,v_product.id,p_idempotency_key,'active',v_source,to_jsonb(v_ids),now()+make_interval(mins=>v_product.duration_minutes),v_product.question_count,v_product.coin_cost) returning id into v_attempt_id;
 insert into btv_exam_attempt_questions(attempt_id,question_id,display_order) select v_attempt_id,x.id,x.ord::integer from unnest(v_ids) with ordinality x(id,ord);
 update btv_wallets set balance=v_after,lifetime_spent=lifetime_spent+v_product.coin_cost,updated_at=now() where user_id=v_user;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,reference_type,reference_id,source_id_text,description,idempotency_key,metadata) values(v_user,v_user,-v_product.coin_cost,v_before,v_after,'exam_charge','exam_purchase','exam_attempt',v_attempt_id,v_attempt_id::text,v_product.title,'exam:'||v_attempt_id,jsonb_build_object('product_code',v_product.code,'question_count',v_product.question_count,'duration_minutes',v_product.duration_minutes)) returning id into v_tx_id;
 update btv_exam_attempts set wallet_transaction_id=v_tx_id where id=v_attempt_id;
 return jsonb_build_object('attempt_id',v_attempt_id,'resumed',false,'balance',v_after,'coin_price',v_product.coin_cost,'duration_minutes',v_product.duration_minutes,'question_count',v_product.question_count);
exception when unique_violation then
 select * into v_attempt from btv_exam_attempts where user_id=v_user and (idempotency_key=p_idempotency_key or (exam_product_id=v_product.id and status='active')) order by created_at desc limit 1;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if; raise;
end $$;

create or replace function public.btv_get_exam_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_attempt btv_exam_attempts%rowtype; v_product btv_mock_catalog%rowtype; r record; v_q jsonb; v_questions jsonb:='[]'::jsonb;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 select * into v_attempt from btv_exam_attempts where id=p_attempt_id and user_id=v_user; if not found then raise exception using message='ATTEMPT_NOT_FOUND'; end if;
 select * into v_product from btv_mock_catalog where id=v_attempt.exam_product_id;
 for r in select * from btv_exam_attempt_questions where attempt_id=v_attempt.id order by display_order loop
  execute format('select to_jsonb(q) from public.%I q where q.id::text=$1',v_attempt.question_source) into v_q using r.question_id;
  v_q:=v_q||jsonb_build_object('sample_question',true,'sample_label','ORIGINAL PRACTICE QUESTION','sample_notice','Independent educational practice, not an official examination question.');
  if v_attempt.status in ('submitted','completed','refunded') then v_q:=v_q||jsonb_build_object('selected_answer',r.selected_answer,'is_correct',r.is_correct);
  elsif v_attempt.question_source='cbt_questions' then v_q:=v_q-'correct_option'-'explanation';
  elsif v_attempt.question_source='nclex_questions' then v_q:=v_q-'correct_options'-'rationale'-'test_strategy';
  elsif v_attempt.question_source='btv_numeracy_questions' then v_q:=v_q-'answer_numeric'-'tolerance'-'rationale'-'is_active'-'source_note'-'created_at';
  else v_q:=v_q-'correct_answer'-'explanation'; end if;
  v_questions:=v_questions||jsonb_build_array(v_q||jsonb_build_object('display_order',r.display_order));
 end loop;
 return jsonb_build_object('attempt',to_jsonb(v_attempt),'product',to_jsonb(v_product),'questions',v_questions,'server_time',now(),'sample_mock',true,'sample_terms_version','2026-07-29-numeracy-v1');
end $$;

create or replace function public.btv_submit_paid_exam(p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_attempt btv_exam_attempts%rowtype; r record; v_selected jsonb; v_correct jsonb; v_ok boolean; v_score numeric; v_correct_count integer:=0; v_tolerance numeric;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 select * into v_attempt from btv_exam_attempts where id=p_attempt_id and user_id=v_user for update; if not found then raise exception using message='ATTEMPT_NOT_FOUND'; end if;
 if v_attempt.status in ('submitted','completed') then return public.btv_get_exam_attempt(v_attempt.id); end if;
 if v_attempt.status<>'active' then raise exception using message='ATTEMPT_NOT_ACTIVE'; end if;
 for r in select * from btv_exam_attempt_questions where attempt_id=v_attempt.id order by display_order loop
  v_selected:=coalesce(p_answers->r.question_id,'null'::jsonb);
  if v_attempt.question_source='cbt_questions' then execute 'select to_jsonb(correct_option) from public.cbt_questions where id::text=$1' into v_correct using r.question_id;
  elsif v_attempt.question_source='nclex_questions' then execute 'select to_jsonb(correct_options) from public.nclex_questions where id::text=$1' into v_correct using r.question_id;
  elsif v_attempt.question_source='btv_numeracy_questions' then
    execute 'select to_jsonb(answer_numeric),tolerance from public.btv_numeracy_questions where id::text=$1' into v_correct,v_tolerance using r.question_id;
    begin v_ok:=abs((trim(both '"' from v_selected::text))::numeric-(v_correct::text)::numeric)<=coalesce(v_tolerance,0); exception when others then v_ok:=false; end;
  else execute 'select correct_answer from public.btv_exam_questions where id::text=$1' into v_correct using r.question_id; end if;
  if v_attempt.question_source='nclex_questions' and jsonb_typeof(v_selected)='array' and jsonb_typeof(v_correct)='array' then select coalesce(array_agg(value order by value),'{}')=coalesce((select array_agg(value order by value) from jsonb_array_elements_text(v_correct)),'{}') into v_ok from jsonb_array_elements_text(v_selected);
  elsif v_attempt.question_source<>'btv_numeracy_questions' then v_ok:=coalesce(v_selected=v_correct,false); end if;
  if v_ok then v_correct_count:=v_correct_count+1; end if;
  update btv_exam_attempt_questions set selected_answer=v_selected,is_correct=v_ok,answered_at=now() where id=r.id;
 end loop;
 v_score:=round((v_correct_count::numeric/greatest(v_attempt.total_questions,1))*100,2);
 update btv_exam_attempts set status='completed',submitted_at=now(),score=v_score,updated_at=now() where id=v_attempt.id;
 return public.btv_get_exam_attempt(v_attempt.id)||jsonb_build_object('score',v_score,'correct_count',v_correct_count);
end $$;

revoke all on function public.btv_start_paid_exam(text,text) from public,anon;
revoke all on function public.btv_get_exam_attempt(uuid) from public,anon;
revoke all on function public.btv_submit_paid_exam(uuid,jsonb) from public,anon;
grant execute on function public.btv_start_paid_exam(text,text) to authenticated,service_role;
grant execute on function public.btv_get_exam_attempt(uuid) to authenticated,service_role;
grant execute on function public.btv_submit_paid_exam(uuid,jsonb) to authenticated,service_role;
