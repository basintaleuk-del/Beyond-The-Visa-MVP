-- Beyond Coins Centre v112: one catalogue, atomic purchases, entitlements and admin ledger controls.
create table if not exists public.btv_currency_settings(
  id boolean primary key default true check(id), currency_name text not null default 'Beyond Coins',
  symbol text not null default 'BC', welcome_bonus integer not null default 150 check(welcome_bonus>=0),
  welcome_bonus_enabled boolean not null default true, daily_free_questions integer not null default 10 check(daily_free_questions>=0),
  reset_timezone text not null default 'UTC', coins_expire boolean not null default false,
  default_expiry_days integer, refunds_enabled boolean not null default true, earning_enabled boolean not null default true,
  bulk_rewards_enabled boolean not null default true, mock_entitlement_expiry_days integer not null default 7 check(mock_entitlement_expiry_days>0),
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
insert into public.btv_currency_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.btv_currency_settings_audit(
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users(id),
  previous_value jsonb not null, new_value jsonb not null, reason text not null, created_at timestamptz not null default now()
);
create table if not exists public.btv_coin_products(
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, category text not null,
  coin_price integer not null check(coin_price>=0), access_type text not null check(access_type in ('one_attempt','permanent','time_limited','service')),
  duration_minutes integer, question_count integer, attempts integer not null default 1 check(attempts>0), expiry_days integer,
  is_active boolean not null default true, featured boolean not null default false, description text not null default '',
  linked_route text, linked_resource text, refund_eligible boolean not null default true,
  promotional_price integer, promotion_starts_at timestamptz, promotion_ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.btv_entitlements(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.btv_coin_products(id), purchase_transaction_id uuid references public.btv_wallet_transactions(id),
  access_type text not null, attempts_total integer not null default 1, attempts_used integer not null default 0,
  status text not null default 'ready' check(status in ('ready','active','consumed','expired','cancelled','refunded')),
  idempotency_key text not null, expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);
create index if not exists btv_entitlements_user_status_idx on public.btv_entitlements(user_id,status,created_at desc);
create table if not exists public.btv_admin_coin_audit(
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users(id), affected_user_id uuid references auth.users(id),
  action text not null, previous_value jsonb not null default '{}'::jsonb, new_value jsonb not null default '{}'::jsonb,
  reason text not null, internal_note text, reference text, status text not null default 'completed', created_at timestamptz not null default now()
);
create table if not exists public.btv_wallet_alerts(
  id uuid primary key default gen_random_uuid(), alert_type text not null, severity text not null default 'medium',
  user_id uuid references auth.users(id), transaction_id uuid references public.btv_wallet_transactions(id), details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check(status in ('open','investigating','resolved','false_positive')),
  resolution_note text, resolved_by uuid references auth.users(id), resolved_at timestamptz, created_at timestamptz not null default now()
);

alter table public.btv_wallets add column if not exists wallet_status text not null default 'active';
alter table public.btv_wallets add column if not exists admin_note text;
alter table public.btv_wallets drop constraint if exists btv_wallets_wallet_status_check;
alter table public.btv_wallets add constraint btv_wallets_wallet_status_check check(wallet_status in ('active','frozen','restricted'));
alter table public.btv_wallet_transactions add column if not exists status text not null default 'completed';
alter table public.btv_wallet_transactions add column if not exists item_code text;
alter table public.btv_wallet_transactions add column if not exists admin_id uuid references auth.users(id);
alter table public.btv_wallet_transactions add column if not exists reason text;
alter table public.btv_wallet_transactions drop constraint if exists btv_wallet_transactions_transaction_type_check;
alter table public.btv_wallet_transactions add constraint btv_wallet_transactions_transaction_type_check check(transaction_type in
 ('welcome','mock_charge','mock_refund','mentor_charge','mentor_refund','reward','purchase','purchase_refund','admin_adjustment','spend','refund','reversal','correction','expiry','promotional_credit','admin_credit','admin_deduction'));
alter table public.btv_daily_practice_usage drop constraint if exists btv_daily_practice_usage_questions_answered_check;
alter table public.btv_daily_practice_usage add column if not exists extra_allowance integer not null default 0 check(extra_allowance>=0);
alter table public.btv_exam_attempts add column if not exists entitlement_id uuid references public.btv_entitlements(id);

insert into public.btv_coin_products(code,name,category,coin_price,access_type,duration_minutes,question_count,description,linked_route,linked_resource) values
 ('cbt_short','CBT 15-minute mock','mock',25,'one_attempt',15,30,'One timed CBT attempt.','cbt.html','cbt_short'),
 ('cbt_full','CBT 30-minute mock','mock',50,'one_attempt',30,60,'One timed CBT attempt.','cbt.html','cbt_full'),
 ('nclex_short','NCLEX 15-minute mock','mock',25,'one_attempt',15,30,'One timed NCLEX attempt.','nclex.html','nclex_short'),
 ('nclex_full','NCLEX 30-minute mock','mock',50,'one_attempt',30,60,'One timed NCLEX attempt.','nclex.html','nclex_full'),
 ('osce_short','OSCE focused stations','mock',25,'one_attempt',15,30,'One focused OSCE session.','osce.html','osce_short'),
 ('osce_full','OSCE full stations','mock',50,'one_attempt',30,60,'One full OSCE session.','osce.html','osce_full'),
 ('ielts_short','IELTS Academic focused mock','mock',25,'one_attempt',15,30,'One focused IELTS session.','ielts.html','ielts_short'),
 ('ielts_full','IELTS Academic full mock','mock',50,'one_attempt',30,60,'One full IELTS session.','ielts.html','ielts_full')
on conflict(code) do update set name=excluded.name,coin_price=excluded.coin_price,duration_minutes=excluded.duration_minutes,
 question_count=excluded.question_count,description=excluded.description,linked_route=excluded.linked_route,linked_resource=excluded.linked_resource,updated_at=now();
update public.btv_mock_catalog set coin_cost=case when code like '%_short' then 25 else 50 end,
 duration_minutes=case when code like '%_short' then 15 else 30 end,
 question_count=case when code like '%_short' then 30 else 60 end,updated_at=now()
where code in ('cbt_short','cbt_full','nclex_short','nclex_full','osce_short','osce_full','ielts_short','ielts_full');

create or replace function public.btv_purchase_resource(p_product_code text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); prod btv_coin_products%rowtype; w btv_wallets%rowtype; ent btv_entitlements%rowtype; cat btv_mock_catalog%rowtype;
 tx uuid; before_bal integer; after_bal integer; effective_price integer; available_questions integer; dyn text;
begin
 if uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED','message','Please sign in to continue.'); end if;
 if nullif(trim(p_product_code),'') is null or nullif(trim(p_idempotency_key),'') is null then return jsonb_build_object('success',false,'code','INVALID_REQUEST','message','The product or purchase reference is missing.'); end if;
 select * into ent from btv_entitlements where user_id=uid and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('success',true,'resumed',true,'entitlement_id',ent.id,'status',ent.status,'balance',(select balance from btv_wallets where user_id=uid)); end if;
 select * into prod from btv_coin_products where code=p_product_code and is_active for share;
 if not found then return jsonb_build_object('success',false,'code','PRODUCT_UNAVAILABLE','message','This resource is not currently available.'); end if;
 if prod.category='mock' then
  select * into cat from btv_mock_catalog where code=prod.linked_resource and is_active;
  if not found or cat.question_source not in ('cbt_questions','nclex_questions','btv_exam_questions') or to_regclass('public.'||cat.question_source) is null then return jsonb_build_object('success',false,'code','MOCK_CONFIGURATION_ERROR','message','This mock is not fully configured. No coins were deducted.'); end if;
  if cat.question_source='btv_exam_questions' then dyn:=format('select count(*) from public.%I where is_active=true and lower(exam_type)=lower($1)',cat.question_source); execute dyn into available_questions using cat.exam_type;
  else dyn:=format('select count(*) from public.%I where is_active=true',cat.question_source); execute dyn into available_questions; end if;
  if available_questions<prod.question_count then return jsonb_build_object('success',false,'code','QUESTION_BANK_INCOMPLETE','message',format('This mock is being prepared and cannot be purchased yet. %s reviewed questions are required. No coins were deducted.',prod.question_count),'available_questions',available_questions,'required_questions',prod.question_count); end if;
 end if;
 effective_price:=case when prod.promotional_price is not null and now() between coalesce(prod.promotion_starts_at,'-infinity') and coalesce(prod.promotion_ends_at,'infinity') then prod.promotional_price else prod.coin_price end;
 perform btv_bootstrap_user(uid); select * into w from btv_wallets where user_id=uid for update;
 if w.wallet_status<>'active' then return jsonb_build_object('success',false,'code','WALLET_RESTRICTED','message','Your Beyond Coins wallet is currently restricted.'); end if;
 if prod.access_type='permanent' then select * into ent from btv_entitlements where user_id=uid and product_id=prod.id and status in ('ready','active','consumed') order by created_at desc limit 1; if found then return jsonb_build_object('success',true,'resumed',true,'entitlement_id',ent.id,'status',ent.status,'balance',w.balance); end if; end if;
 if w.balance<effective_price then return jsonb_build_object('success',false,'code','INSUFFICIENT_BALANCE','message',format('You need %s more Beyond Coins to unlock this resource.',effective_price-w.balance),'required',effective_price,'available',w.balance,'shortfall',effective_price-w.balance); end if;
 before_bal:=w.balance; after_bal:=before_bal-effective_price;
 insert into btv_entitlements(user_id,product_id,access_type,attempts_total,idempotency_key,expires_at)
 values(uid,prod.id,prod.access_type,prod.attempts,p_idempotency_key,case when prod.expiry_days is null then null else now()+make_interval(days=>prod.expiry_days) end) returning * into ent;
 update btv_wallets set balance=after_bal,lifetime_spent=lifetime_spent+effective_price,updated_at=now() where user_id=uid;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,item_code)
 values(uid,uid,-effective_price,before_bal,after_bal,'spend','resource_purchase',ent.id::text,prod.name,'purchase:'||p_idempotency_key,jsonb_build_object('product_code',prod.code,'entitlement_id',ent.id),'completed',prod.code) returning id into tx;
 update btv_entitlements set purchase_transaction_id=tx where id=ent.id;
 return jsonb_build_object('success',true,'resumed',false,'entitlement_id',ent.id,'transaction_id',tx,'status','ready','balance',after_bal,'coin_price',effective_price,'product_code',prod.code,'route',prod.linked_route);
exception when unique_violation then select * into ent from btv_entitlements where user_id=uid and idempotency_key=p_idempotency_key; return jsonb_build_object('success',true,'resumed',true,'entitlement_id',ent.id,'status',ent.status,'balance',(select balance from btv_wallets where user_id=uid));
end $$;

create or replace function public.btv_start_entitled_mock(p_entitlement_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); ent btv_entitlements%rowtype; prod btv_coin_products%rowtype; cat btv_mock_catalog%rowtype;
 attempt btv_exam_attempts%rowtype; ids text[]; source text; dyn text;
begin
 if uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED','message','Please sign in to start this mock.'); end if;
 select * into ent from btv_entitlements where id=p_entitlement_id and user_id=uid for update;
 if not found then return jsonb_build_object('success',false,'code','ENTITLEMENT_NOT_FOUND','message','This mock purchase could not be found. No additional coins were deducted.'); end if;
 select * into prod from btv_coin_products where id=ent.product_id and category='mock';
 if not found then return jsonb_build_object('success',false,'code','INVALID_ENTITLEMENT','message','This purchase is not a mock entitlement.'); end if;
 select * into attempt from btv_exam_attempts where entitlement_id=ent.id order by created_at desc limit 1;
 if found then return jsonb_build_object('success',true,'resumed',true,'attempt_id',attempt.id,'status',attempt.status,'question_count',attempt.total_questions,'duration_minutes',prod.duration_minutes); end if;
 if ent.status<>'ready' or ent.attempts_used>=ent.attempts_total or (ent.expires_at is not null and ent.expires_at<=now()) then return jsonb_build_object('success',false,'code','ENTITLEMENT_UNAVAILABLE','message','This mock attempt has already been used or has expired.'); end if;
 select * into cat from btv_mock_catalog where code=prod.linked_resource and is_active;
 if not found or cat.question_count is null or cat.duration_minutes is null then return jsonb_build_object('success',false,'code','MOCK_CONFIGURATION_ERROR','message','This mock is not fully configured. No additional coins were deducted.'); end if;
 source:=cat.question_source;
 if source not in ('cbt_questions','nclex_questions','btv_exam_questions') or to_regclass('public.'||source) is null then return jsonb_build_object('success',false,'code','QUESTION_BANK_UNAVAILABLE','message','The question bank is temporarily unavailable. No additional coins were deducted.'); end if;
 if source='btv_exam_questions' then dyn:=format('select array_agg(id::text) from (select id from public.%I where is_active=true and lower(exam_type)=lower($1) order by random() limit $2) q',source); execute dyn into ids using cat.exam_type,cat.question_count;
 else dyn:=format('select array_agg(id::text) from (select id from public.%I where is_active=true order by random() limit $1) q',source); execute dyn into ids using cat.question_count; end if;
 if coalesce(array_length(ids,1),0)<>cat.question_count then return jsonb_build_object('success',false,'code','QUESTION_BANK_INCOMPLETE','message',format('This mock requires %s reviewed questions, but the bank is not ready. No coins were deducted.',cat.question_count)); end if;
 insert into btv_exam_attempts(user_id,exam_product_id,wallet_transaction_id,idempotency_key,status,question_source,question_ids,started_at,expires_at,total_questions,coin_price_paid,metadata,entitlement_id)
 values(uid,cat.id,ent.purchase_transaction_id,'entitlement:'||ent.id,'active',source,to_jsonb(ids),now(),now()+make_interval(mins=>cat.duration_minutes),cat.question_count,cat.coin_cost,jsonb_build_object('entitlement_id',ent.id),ent.id) returning * into attempt;
 insert into btv_exam_attempt_questions(attempt_id,question_id,display_order) select attempt.id,x.id,x.ord::integer from unnest(ids) with ordinality x(id,ord);
 update btv_entitlements set status='active',attempts_used=attempts_used+1,updated_at=now() where id=ent.id;
 return jsonb_build_object('success',true,'resumed',false,'attempt_id',attempt.id,'status','active','question_count',cat.question_count,'duration_minutes',cat.duration_minutes,'coin_price',cat.coin_cost);
end $$;

create or replace function public.btv_admin_adjust_coins(p_user uuid,p_amount integer,p_action text,p_reason text,p_note text,p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); w btv_wallets%rowtype; before_bal integer; after_bal integer; tx uuid; signed_amount integer;
begin
 if not btv_is_admin() then raise exception 'Administrator access required'; end if;
 if p_amount<=0 or nullif(trim(p_reason),'') is null or p_action not in ('credit','deduct','correction','refund','reversal','compensation') then raise exception 'A valid amount, action and reason are required'; end if;
 perform btv_bootstrap_user(p_user); select * into w from btv_wallets where user_id=p_user for update; before_bal:=w.balance;
 signed_amount:=case when p_action='deduct' then -p_amount else p_amount end; after_bal:=before_bal+signed_amount;
 if after_bal<0 then raise exception 'This adjustment would make the wallet negative'; end if;
 update btv_wallets set balance=after_bal,lifetime_earned=lifetime_earned+greatest(signed_amount,0),lifetime_spent=lifetime_spent+greatest(-signed_amount,0),updated_at=now() where user_id=p_user;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,admin_id,reason)
 values(p_user,p_user,signed_amount,before_bal,after_bal,case when signed_amount>0 then 'admin_credit' else 'admin_deduction' end,'admin_adjustment',p_reference,p_reason,'admin:'||coalesce(nullif(p_reference,''),gen_random_uuid()::text),jsonb_build_object('internal_note',p_note,'action',p_action),'completed',admin_uid,p_reason) returning id into tx;
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,internal_note,reference) values(admin_uid,p_user,p_action,jsonb_build_object('balance',before_bal),jsonb_build_object('balance',after_bal),p_reason,p_note,p_reference);
 insert into btv_notifications(user_id,category,title,body,dedupe_key) values(p_user,'wallet','Beyond Coins balance updated',format('%s Beyond Coins. New balance: %s. %s',case when signed_amount>0 then '+'||signed_amount else signed_amount::text end,after_bal,p_reason),'coin-adjustment:'||tx);
 return jsonb_build_object('success',true,'transaction_id',tx,'balance_before',before_bal,'balance_after',after_bal);
end $$;

create or replace function public.btv_admin_set_product_price(p_product_code text,p_coin_price integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); prod btv_coin_products%rowtype;
begin
 if not btv_is_admin() then raise exception 'Administrator access required'; end if;
 if p_coin_price<0 or nullif(trim(p_reason),'') is null then raise exception 'A valid price and reason are required'; end if;
 select * into prod from btv_coin_products where code=p_product_code for update;
 if not found then raise exception 'Product not found'; end if;
 update btv_coin_products set coin_price=p_coin_price,updated_at=now() where id=prod.id;
 insert into btv_admin_coin_audit(admin_id,action,previous_value,new_value,reason,reference)
 values(admin_uid,'product_price_change',jsonb_build_object('code',prod.code,'coin_price',prod.coin_price),jsonb_build_object('code',prod.code,'coin_price',p_coin_price),p_reason,prod.id::text);
 return jsonb_build_object('success',true,'product_code',prod.code,'previous_price',prod.coin_price,'coin_price',p_coin_price);
end $$;

create or replace function public.btv_use_free_practice(p_exam_type text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rule btv_currency_settings%rowtype; used integer; extra integer; today date;
begin
 if uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED'); end if;
 select * into rule from btv_currency_settings where id=true; today:=(now() at time zone rule.reset_timezone)::date;
 insert into btv_daily_practice_usage(user_id,practice_date,exam_type,questions_answered) values(uid,today,lower(p_exam_type),0) on conflict do nothing;
 select questions_answered,extra_allowance into used,extra from btv_daily_practice_usage where user_id=uid and practice_date=today and exam_type=lower(p_exam_type) for update;
 if used>=rule.daily_free_questions+extra then return jsonb_build_object('success',false,'code','DAILY_LIMIT_REACHED','used',used,'limit',rule.daily_free_questions+extra,'message','You have completed today''s free questions.'); end if;
 update btv_daily_practice_usage set questions_answered=questions_answered+1,updated_at=now() where user_id=uid and practice_date=today and exam_type=lower(p_exam_type) returning questions_answered into used;
 return jsonb_build_object('success',true,'used',used,'limit',rule.daily_free_questions+extra,'remaining',rule.daily_free_questions+extra-used,'practice_date',today);
end $$;

alter table public.btv_currency_settings enable row level security; alter table public.btv_currency_settings_audit enable row level security;
alter table public.btv_coin_products enable row level security; alter table public.btv_entitlements enable row level security;
alter table public.btv_admin_coin_audit enable row level security; alter table public.btv_wallet_alerts enable row level security;
drop policy if exists "authenticated read currency settings" on public.btv_currency_settings;
drop policy if exists "authenticated read active coin products" on public.btv_coin_products;
drop policy if exists "users read own entitlements" on public.btv_entitlements;
drop policy if exists "admins read currency audits" on public.btv_currency_settings_audit;
drop policy if exists "admins read coin audits" on public.btv_admin_coin_audit;
drop policy if exists "admins read wallet alerts" on public.btv_wallet_alerts;
drop policy if exists "admins manage coin products" on public.btv_coin_products;
drop policy if exists "admins manage wallet alerts" on public.btv_wallet_alerts;
create policy "authenticated read currency settings" on public.btv_currency_settings for select to authenticated using(true);
create policy "authenticated read active coin products" on public.btv_coin_products for select to authenticated using(is_active or btv_is_admin());
create policy "users read own entitlements" on public.btv_entitlements for select to authenticated using(user_id=(select auth.uid()) or btv_is_admin());
create policy "admins read currency audits" on public.btv_currency_settings_audit for select to authenticated using(btv_is_admin());
create policy "admins read coin audits" on public.btv_admin_coin_audit for select to authenticated using(btv_is_admin());
create policy "admins read wallet alerts" on public.btv_wallet_alerts for select to authenticated using(btv_is_admin());
create policy "admins manage coin products" on public.btv_coin_products for all to authenticated using(btv_is_admin()) with check(btv_is_admin());
create policy "admins manage wallet alerts" on public.btv_wallet_alerts for update to authenticated using(btv_is_admin()) with check(btv_is_admin());
grant select on public.btv_currency_settings,public.btv_coin_products to authenticated;
grant select on public.btv_entitlements,public.btv_currency_settings_audit,public.btv_admin_coin_audit,public.btv_wallet_alerts to authenticated;
grant insert,update,delete on public.btv_coin_products to authenticated;
grant update on public.btv_wallet_alerts to authenticated;
revoke all on function public.btv_purchase_resource(text,text),public.btv_start_entitled_mock(uuid),public.btv_admin_adjust_coins(uuid,integer,text,text,text,text),public.btv_admin_set_product_price(text,integer,text),public.btv_use_free_practice(text) from public,anon;
grant execute on function public.btv_purchase_resource(text,text),public.btv_start_entitled_mock(uuid),public.btv_admin_adjust_coins(uuid,integer,text,text,text,text),public.btv_admin_set_product_price(text,integer,text),public.btv_use_free_practice(text) to authenticated;
