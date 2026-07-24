-- Prevent a mock purchase unless its reviewed question bank can fulfil the advertised attempt.
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

revoke all on function public.btv_purchase_resource(text,text) from public,anon;
grant execute on function public.btv_purchase_resource(text,text) to authenticated;
