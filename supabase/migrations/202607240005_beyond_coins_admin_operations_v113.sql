-- Beyond Coins Centre v113: audited administrative operations and platform controls.
alter table public.btv_currency_settings add column if not exists promotional_expiry_days integer;
alter table public.btv_currency_settings add column if not exists minimum_purchase_amount integer check(minimum_purchase_amount is null or minimum_purchase_amount>=0);
alter table public.btv_currency_settings add column if not exists maximum_wallet_balance integer check(maximum_wallet_balance is null or maximum_wallet_balance>0);
alter table public.btv_currency_settings add column if not exists maximum_daily_spend integer check(maximum_daily_spend is null or maximum_daily_spend>0);
alter table public.btv_currency_settings add column if not exists insufficient_balance_behavior text not null default 'buy_coins';
alter table public.btv_currency_settings add column if not exists transaction_confirmation_required boolean not null default true;
alter table public.btv_currency_settings add column if not exists reserve_pending_transactions boolean not null default false;
alter table public.btv_currency_settings add column if not exists expired_mocks_refundable boolean not null default false;

alter table public.btv_coin_packages add column if not exists provider_product_reference text;
alter table public.btv_coin_packages add column if not exists promotional_label text;
alter table public.btv_coin_packages add column if not exists starts_at timestamptz;
alter table public.btv_coin_packages add column if not exists ends_at timestamptz;
alter table public.btv_coin_purchases add column if not exists refund_status text not null default 'not_requested';
alter table public.btv_coin_opportunities add column if not exists max_claims integer;
alter table public.btv_coin_opportunities add column if not exists frequency text;
alter table public.btv_coin_opportunities add column if not exists reward_expiry_days integer;
alter table public.btv_coin_opportunities add column if not exists anti_abuse_config jsonb not null default '{}'::jsonb;
alter table public.btv_admin_coin_audit add column if not exists session_information jsonb not null default '{}'::jsonb;

create or replace function public.btv_admin_update_currency_settings(p_patch jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); old_row btv_currency_settings%rowtype; new_row btv_currency_settings%rowtype;
begin
 if not btv_has_admin_permission('manage_platform_currency_settings') then raise exception 'Currency settings permission required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
 select * into old_row from btv_currency_settings where id=true for update;
 update btv_currency_settings set
  welcome_bonus=coalesce((p_patch->>'welcome_bonus')::integer,welcome_bonus),
  welcome_bonus_enabled=coalesce((p_patch->>'welcome_bonus_enabled')::boolean,welcome_bonus_enabled),
  daily_free_questions=coalesce((p_patch->>'daily_free_questions')::integer,daily_free_questions),
  reset_timezone=coalesce(nullif(p_patch->>'reset_timezone',''),reset_timezone),
  coins_expire=coalesce((p_patch->>'coins_expire')::boolean,coins_expire),
  default_expiry_days=coalesce((p_patch->>'default_expiry_days')::integer,default_expiry_days),
  promotional_expiry_days=coalesce((p_patch->>'promotional_expiry_days')::integer,promotional_expiry_days),
  minimum_purchase_amount=coalesce((p_patch->>'minimum_purchase_amount')::integer,minimum_purchase_amount),
  maximum_wallet_balance=coalesce((p_patch->>'maximum_wallet_balance')::integer,maximum_wallet_balance),
  maximum_daily_spend=coalesce((p_patch->>'maximum_daily_spend')::integer,maximum_daily_spend),
  refunds_enabled=coalesce((p_patch->>'refunds_enabled')::boolean,refunds_enabled),
  earning_enabled=coalesce((p_patch->>'earning_enabled')::boolean,earning_enabled),
  bulk_rewards_enabled=coalesce((p_patch->>'bulk_rewards_enabled')::boolean,bulk_rewards_enabled),
  insufficient_balance_behavior=coalesce(nullif(p_patch->>'insufficient_balance_behavior',''),insufficient_balance_behavior),
  transaction_confirmation_required=coalesce((p_patch->>'transaction_confirmation_required')::boolean,transaction_confirmation_required),
  reserve_pending_transactions=coalesce((p_patch->>'reserve_pending_transactions')::boolean,reserve_pending_transactions),
  mock_entitlement_expiry_days=coalesce((p_patch->>'mock_entitlement_expiry_days')::integer,mock_entitlement_expiry_days),
  expired_mocks_refundable=coalesce((p_patch->>'expired_mocks_refundable')::boolean,expired_mocks_refundable),
  updated_by=admin_uid,updated_at=now() where id=true returning * into new_row;
 insert into btv_currency_settings_audit(admin_id,previous_value,new_value,reason) values(admin_uid,to_jsonb(old_row),to_jsonb(new_row),p_reason);
 insert into btv_admin_coin_audit(admin_id,action,previous_value,new_value,reason,reference) values(admin_uid,'currency_settings_change',to_jsonb(old_row),to_jsonb(new_row),p_reason,'currency-settings');
 return to_jsonb(new_row);
end $$;

create or replace function public.btv_admin_set_wallet_status(p_user uuid,p_status text,p_reason text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); w btv_wallets%rowtype;
begin
 if not btv_has_admin_permission('manage_wallet_status') then raise exception 'Wallet status permission required'; end if;
 if p_status not in ('active','frozen','restricted') or nullif(trim(p_reason),'') is null then raise exception 'Valid status and reason required'; end if;
 select * into w from btv_wallets where user_id=p_user for update; if not found then raise exception 'Wallet not found'; end if;
 update btv_wallets set wallet_status=p_status,admin_note=nullif(trim(p_note),''),updated_at=now() where user_id=p_user;
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,internal_note,reference)
 values(admin_uid,p_user,'wallet_status_change',jsonb_build_object('status',w.wallet_status),jsonb_build_object('status',p_status),p_reason,p_note,p_user::text);
 insert into btv_notifications(user_id,category,title,body,dedupe_key) values(p_user,'wallet','Beyond Coins wallet status updated','Your wallet is now '||p_status||'. '||p_reason,'wallet-status:'||gen_random_uuid());
 return jsonb_build_object('success',true,'status',p_status);
end $$;

create or replace function public.btv_admin_adjust_coins(p_user uuid,p_amount integer,p_action text,p_reason text,p_note text,p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); w btv_wallets%rowtype; rule btv_currency_settings%rowtype; before_bal integer; after_bal integer; tx uuid; signed_amount integer; permission_name text;
begin
 permission_name:=case when p_action in ('refund') then 'refund_transactions' when p_action in ('deduct') then 'deduct_coins' when p_action in ('correction','reversal') then 'reverse_transactions' else 'issue_coins' end;
 if not btv_has_admin_permission(permission_name) then raise exception 'Beyond Coins adjustment permission required'; end if;
 if p_amount<=0 or nullif(trim(p_reason),'') is null or p_action not in ('credit','deduct','correction','refund','reversal','compensation') then raise exception 'A valid amount, action and reason are required'; end if;
 perform btv_bootstrap_user(p_user); select * into w from btv_wallets where user_id=p_user for update; select * into rule from btv_currency_settings where id=true; before_bal:=w.balance;
 signed_amount:=case when p_action='deduct' then -p_amount else p_amount end; after_bal:=before_bal+signed_amount;
 if after_bal<0 then raise exception 'This adjustment would make the wallet negative'; end if;
 if rule.maximum_wallet_balance is not null and after_bal>rule.maximum_wallet_balance then raise exception 'This adjustment exceeds the configured maximum wallet balance'; end if;
 update btv_wallets set balance=after_bal,lifetime_earned=lifetime_earned+greatest(signed_amount,0),lifetime_spent=lifetime_spent+greatest(-signed_amount,0),updated_at=now() where user_id=p_user;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,admin_id,reason)
 values(p_user,p_user,signed_amount,before_bal,after_bal,case when signed_amount>0 then 'admin_credit' else 'admin_deduction' end,'admin_adjustment',p_reference,p_reason,'admin:'||coalesce(nullif(p_reference,''),gen_random_uuid()::text),jsonb_build_object('internal_note',p_note,'action',p_action),'completed',admin_uid,p_reason) returning id into tx;
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,internal_note,reference) values(admin_uid,p_user,p_action,jsonb_build_object('balance',before_bal),jsonb_build_object('balance',after_bal),p_reason,p_note,p_reference);
 insert into btv_notifications(user_id,category,title,body,dedupe_key) values(p_user,'wallet','Beyond Coins balance updated',format('%s Beyond Coins. New balance: %s. %s',case when signed_amount>0 then '+'||signed_amount else signed_amount::text end,after_bal,p_reason),'coin-adjustment:'||tx);
 return jsonb_build_object('success',true,'transaction_id',tx,'balance_before',before_bal,'balance_after',after_bal);
end $$;

create or replace function public.btv_admin_bulk_issue(p_users uuid[],p_amount integer,p_reason text,p_note text,p_public_description text,p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid; admin_uid uuid:=auth.uid(); result jsonb; total integer:=0; recipients integer:=0; rule btv_currency_settings%rowtype;
begin
 if not btv_has_admin_permission('perform_bulk_adjustments') then raise exception 'Bulk adjustment permission required'; end if;
 select * into rule from btv_currency_settings where id=true;
 if not rule.bulk_rewards_enabled then raise exception 'Bulk rewards are disabled'; end if;
 if p_amount<=0 or nullif(trim(p_reason),'') is null or nullif(trim(p_reference),'') is null or coalesce(array_length(p_users,1),0)=0 then raise exception 'Recipients, amount, reason and reference are required'; end if;
 for uid in select distinct unnest(p_users) order by 1 loop
  result:=btv_admin_adjust_coins(uid,p_amount,'credit',coalesce(nullif(trim(p_public_description),''),p_reason),p_note,p_reference||':'||uid::text);
  recipients:=recipients+1; total:=total+p_amount;
 end loop;
 insert into btv_admin_coin_audit(admin_id,action,new_value,reason,internal_note,reference) values(admin_uid,'bulk_issue',jsonb_build_object('recipients',recipients,'coins',total),p_reason,p_note,p_reference);
 return jsonb_build_object('success',true,'recipients',recipients,'total_coins',total);
end $$;

create or replace function public.btv_admin_reverse_transaction(p_transaction uuid,p_reason text,p_note text,p_force boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); original btv_wallet_transactions%rowtype; w btv_wallets%rowtype; ent btv_entitlements%rowtype; new_tx uuid; after_bal integer;
begin
 if not btv_has_admin_permission('reverse_transactions') then raise exception 'Transaction reversal permission required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
 select * into original from btv_wallet_transactions where id=p_transaction for update; if not found then raise exception 'Transaction not found'; end if;
 if exists(select 1 from btv_wallet_transactions where idempotency_key='reversal:'||p_transaction::text) then raise exception 'Transaction already reversed'; end if;
 select * into ent from btv_entitlements where purchase_transaction_id=p_transaction limit 1;
 if found and ent.status in ('ready','active') and not p_force then return jsonb_build_object('success',false,'code','ACTIVE_ENTITLEMENT','message','This transaction has an active entitlement. Confirm the linked access cancellation before reversal.','entitlement_id',ent.id); end if;
 select * into w from btv_wallets where user_id=original.user_id for update; after_bal:=w.balance-original.amount;
 if after_bal<0 then raise exception 'Reversal would make the wallet negative'; end if;
 update btv_wallets set balance=after_bal,lifetime_earned=lifetime_earned+greatest(-original.amount,0),lifetime_spent=lifetime_spent+greatest(original.amount,0),updated_at=now() where user_id=w.user_id;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,item_code,admin_id,reason)
 values(w.user_id,w.user_id,-original.amount,w.balance,after_bal,'reversal','transaction_reversal',original.id::text,'Reversal: '||p_reason,'reversal:'||original.id,jsonb_build_object('original_transaction',original.id,'internal_note',p_note),'completed',original.item_code,admin_uid,p_reason) returning id into new_tx;
 if ent.id is not null then update btv_entitlements set status=case when original.amount<0 then 'refunded' else 'cancelled' end,updated_at=now() where id=ent.id; end if;
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,internal_note,reference) values(admin_uid,w.user_id,'transaction_reversal',to_jsonb(original),jsonb_build_object('transaction_id',new_tx,'balance',after_bal),p_reason,p_note,original.id::text);
 insert into btv_notifications(user_id,category,title,body,dedupe_key) values(w.user_id,'wallet','Beyond Coins transaction reversed',format('%s Beyond Coins. New balance: %s. %s',-original.amount,after_bal,p_reason),'coin-reversal:'||new_tx);
 return jsonb_build_object('success',true,'transaction_id',new_tx,'balance',after_bal);
end $$;

create or replace function public.btv_admin_refund_entitlement(p_entitlement uuid,p_reason text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); ent btv_entitlements%rowtype; prod btv_coin_products%rowtype; tx btv_wallet_transactions%rowtype; w btv_wallets%rowtype; refund_tx uuid; after_bal integer;
begin
 if not btv_has_admin_permission('refund_transactions') then raise exception 'Refund permission required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
 select * into ent from btv_entitlements where id=p_entitlement for update; if not found then raise exception 'Entitlement not found'; end if;
 if ent.status<>'ready' or ent.attempts_used<>0 then raise exception 'Only an unused ready entitlement can be refunded'; end if;
 select * into prod from btv_coin_products where id=ent.product_id; select * into tx from btv_wallet_transactions where id=ent.purchase_transaction_id;
 select * into w from btv_wallets where user_id=ent.user_id for update; after_bal:=w.balance+abs(tx.amount);
 update btv_wallets set balance=after_bal,lifetime_earned=lifetime_earned+abs(tx.amount),updated_at=now() where user_id=w.user_id;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,item_code,admin_id,reason)
 values(w.user_id,w.user_id,abs(tx.amount),w.balance,after_bal,'refund','entitlement_refund',ent.id::text,'Refund: '||prod.name,'refund-entitlement:'||ent.id,jsonb_build_object('purchase_transaction',tx.id,'internal_note',p_note),'completed',prod.code,admin_uid,p_reason) returning id into refund_tx;
 update btv_entitlements set status='refunded',updated_at=now() where id=ent.id;
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,internal_note,reference) values(admin_uid,w.user_id,'entitlement_refund',to_jsonb(ent),jsonb_build_object('status','refunded','transaction_id',refund_tx,'balance',after_bal),p_reason,p_note,ent.id::text);
 insert into btv_notifications(user_id,category,title,body,dedupe_key) values(w.user_id,'wallet','Beyond Coins refund completed',format('+%s Beyond Coins. New balance: %s. %s',abs(tx.amount),after_bal,p_reason),'coin-refund:'||refund_tx);
 return jsonb_build_object('success',true,'transaction_id',refund_tx,'balance',after_bal);
end $$;

create or replace function public.btv_admin_grant_daily_questions(p_user uuid,p_exam_type text,p_amount integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); rule btv_currency_settings%rowtype; today date; extra integer;
begin
 if not btv_has_admin_permission('manage_daily_free_questions') then raise exception 'Daily allowance permission required'; end if;
 if p_amount<=0 or nullif(trim(p_exam_type),'') is null or nullif(trim(p_reason),'') is null then raise exception 'User, exam, amount and reason required'; end if;
 select * into rule from btv_currency_settings where id=true; today:=(now() at time zone rule.reset_timezone)::date;
 insert into btv_daily_practice_usage(user_id,practice_date,exam_type,questions_answered,extra_allowance) values(p_user,today,lower(p_exam_type),0,p_amount)
 on conflict(user_id,practice_date,exam_type) do update set extra_allowance=btv_daily_practice_usage.extra_allowance+excluded.extra_allowance,updated_at=now() returning extra_allowance into extra;
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,new_value,reason,reference) values(admin_uid,p_user,'daily_allowance_grant',jsonb_build_object('exam_type',lower(p_exam_type),'extra_allowance',extra),p_reason,today::text);
 return jsonb_build_object('success',true,'extra_allowance',extra,'practice_date',today);
end $$;

create or replace function public.btv_admin_reset_daily_usage(p_user uuid,p_exam_type text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); rule btv_currency_settings%rowtype; today date; previous integer:=0;
begin
 if not btv_has_admin_permission('manage_daily_free_questions') then raise exception 'Daily allowance permission required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
 select * into rule from btv_currency_settings where id=true; today:=(now() at time zone rule.reset_timezone)::date;
 select questions_answered into previous from btv_daily_practice_usage where user_id=p_user and practice_date=today and exam_type=lower(p_exam_type) for update;
 update btv_daily_practice_usage set questions_answered=0,updated_at=now() where user_id=p_user and practice_date=today and exam_type=lower(p_exam_type);
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,reference) values(admin_uid,p_user,'daily_usage_reset',jsonb_build_object('used',coalesce(previous,0)),jsonb_build_object('used',0),p_reason,lower(p_exam_type)||':'||today);
 return jsonb_build_object('success',true,'previous_used',coalesce(previous,0),'practice_date',today);
end $$;

create or replace function public.btv_admin_reconcile_wallet(p_user uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare stored integer; ledger integer; purchases integer; entitlement_count integer; attempt_count integer;
begin
 if not btv_has_admin_permission('view_coin_dashboard') then raise exception 'Dashboard permission required'; end if;
 select balance into stored from btv_wallets where user_id=p_user;
 select coalesce(sum(amount),0) into ledger from btv_wallet_transactions where user_id=p_user and status='completed';
 select count(*) into purchases from btv_coin_purchases where user_id=p_user and status='verified' and coins_credited>0;
 select count(*) into entitlement_count from btv_entitlements where user_id=p_user;
 select count(*) into attempt_count from btv_exam_attempts where user_id=p_user;
 return jsonb_build_object('user_id',p_user,'stored_balance',stored,'ledger_balance',ledger,'matches',stored=ledger,'verified_purchases',purchases,'entitlements',entitlement_count,'attempts',attempt_count);
end $$;

create or replace function public.btv_admin_resolve_wallet_alert(p_alert uuid,p_status text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); a btv_wallet_alerts%rowtype;
begin
 if not btv_has_admin_permission('view_audit_logs') then raise exception 'Alert permission required'; end if;
 if p_status not in ('open','investigating','resolved','false_positive') then raise exception 'Invalid alert status'; end if;
 select * into a from btv_wallet_alerts where id=p_alert for update; if not found then raise exception 'Alert not found'; end if;
 update btv_wallet_alerts set status=p_status,resolution_note=nullif(trim(p_note),''),resolved_by=case when p_status in ('resolved','false_positive') then admin_uid else null end,resolved_at=case when p_status in ('resolved','false_positive') then now() else null end where id=p_alert;
 insert into btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,reference) values(admin_uid,a.user_id,'wallet_alert_status',jsonb_build_object('status',a.status),jsonb_build_object('status',p_status),coalesce(nullif(trim(p_note),''),'Status updated'),a.id::text);
 return jsonb_build_object('success',true,'status',p_status);
end $$;

revoke all on function public.btv_admin_update_currency_settings(jsonb,text),public.btv_admin_set_wallet_status(uuid,text,text,text),public.btv_admin_bulk_issue(uuid[],integer,text,text,text,text),public.btv_admin_reverse_transaction(uuid,text,text,boolean),public.btv_admin_refund_entitlement(uuid,text,text),public.btv_admin_grant_daily_questions(uuid,text,integer,text),public.btv_admin_reset_daily_usage(uuid,text,text),public.btv_admin_reconcile_wallet(uuid),public.btv_admin_resolve_wallet_alert(uuid,text,text) from public,anon;
grant execute on function public.btv_admin_update_currency_settings(jsonb,text),public.btv_admin_set_wallet_status(uuid,text,text,text),public.btv_admin_bulk_issue(uuid[],integer,text,text,text,text),public.btv_admin_reverse_transaction(uuid,text,text,boolean),public.btv_admin_refund_entitlement(uuid,text,text),public.btv_admin_grant_daily_questions(uuid,text,integer,text),public.btv_admin_reset_daily_usage(uuid,text,text),public.btv_admin_reconcile_wallet(uuid),public.btv_admin_resolve_wallet_alert(uuid,text,text) to authenticated;
