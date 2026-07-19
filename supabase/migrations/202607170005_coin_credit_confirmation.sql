alter table public.btv_wallet_transactions drop constraint if exists btv_wallet_transactions_transaction_type_check;
alter table public.btv_wallet_transactions add constraint btv_wallet_transactions_transaction_type_check
check(transaction_type in ('welcome','mock_charge','mock_refund','mentor_charge','mentor_refund','reward','purchase','purchase_refund','admin_adjustment'));

create or replace function public.btv_confirm_coin_purchase(p_reference text,p_provider_payload jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare purchase public.btv_coin_purchases%rowtype; new_balance integer;
begin
  select * into purchase from public.btv_coin_purchases where provider_reference=p_reference for update;
  if not found then raise exception 'Purchase not found'; end if;
  if purchase.status='paid' then select balance into new_balance from public.btv_wallets where user_id=purchase.user_id; return new_balance; end if;
  if purchase.status<>'pending' then raise exception 'Purchase cannot be confirmed'; end if;
  perform public.btv_bootstrap_user(purchase.user_id);
  update public.btv_wallets set balance=balance+purchase.coin_amount,lifetime_earned=lifetime_earned+purchase.coin_amount,updated_at=now()
  where user_id=purchase.user_id returning balance into new_balance;
  update public.btv_coin_purchases set status='paid',verified_at=now(),updated_at=now() where id=purchase.id;
  insert into public.btv_wallet_transactions(user_id,amount,balance_after,transaction_type,description,reference_type,reference_id,idempotency_key)
  values(purchase.user_id,purchase.coin_amount,new_balance,'purchase','Beyond Coins purchase','coin_purchase',purchase.id,'coin-purchase:'||purchase.provider_reference)
  on conflict(user_id,idempotency_key) do nothing;
  return new_balance;
end $$;
revoke all on function public.btv_confirm_coin_purchase(text,jsonb) from public,anon,authenticated;
grant execute on function public.btv_confirm_coin_purchase(text,jsonb) to service_role;
