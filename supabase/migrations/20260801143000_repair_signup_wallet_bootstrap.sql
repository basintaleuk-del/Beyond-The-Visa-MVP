-- Restore new-user signup after source_type became mandatory on wallet entries.
create or replace function public.btv_bootstrap_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  wallet_created uuid;
  current_balance integer;
  bonus integer := 0;
  rule public.btv_currency_settings%rowtype;
begin
  if pg_trigger_depth() = 0
     and (caller is null or (caller <> p_user and not public.btv_is_admin())) then
    raise exception 'You may only initialise your own Beyond Coins wallet';
  end if;

  select * into rule from public.btv_currency_settings where id = true;
  bonus := case when rule.welcome_bonus_enabled then rule.welcome_bonus else 0 end;

  insert into public.btv_wallets(user_id, balance, lifetime_earned)
  values (p_user, bonus, bonus)
  on conflict (user_id) do nothing
  returning user_id into wallet_created;

  select balance into current_balance
  from public.btv_wallets
  where user_id = p_user;

  if not found then
    raise exception 'Unable to create or locate wallet';
  end if;

  if wallet_created is not null and bonus > 0 then
    insert into public.btv_wallet_transactions(
      wallet_id,
      user_id,
      amount,
      balance_before,
      balance_after,
      transaction_type,
      source_type,
      description,
      idempotency_key,
      metadata,
      status,
      item_code
    ) values (
      p_user,
      p_user,
      bonus,
      0,
      current_balance,
      'welcome',
      'welcome_bonus',
      'Welcome to Beyond The Visa — ' || bonus || ' Beyond Coins',
      'welcome-bonus',
      jsonb_build_object('currency', 'Beyond Coins'),
      'completed',
      'welcome_bonus'
    )
    on conflict (user_id, idempotency_key) do nothing;
  end if;

  insert into public.btv_gamification(user_id)
  values (p_user)
  on conflict (user_id) do nothing;

  insert into public.btv_notification_preferences(user_id)
  values (p_user)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.btv_bootstrap_user(uuid) from public, anon;
grant execute on function public.btv_bootstrap_user(uuid) to authenticated;
