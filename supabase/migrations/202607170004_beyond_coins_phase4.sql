-- Phase 4: extend the existing Beyond Coins ledger. Credits remain server-authoritative.
create table if not exists public.btv_coin_packages (
  id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
  coin_amount integer not null check (coin_amount > 0), price_minor integer not null check (price_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'), bonus_coins integer not null default 0 check (bonus_coins >= 0),
  is_active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.btv_coin_purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.btv_coin_packages(id), provider text not null default 'paystack',
  provider_reference text not null unique, amount_minor integer not null, currency text not null,
  coin_amount integer not null, status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists btv_coin_purchases_user_idx on public.btv_coin_purchases(user_id,created_at desc);
create table if not exists public.btv_coin_opportunities (
  code text primary key, title text not null, description text not null, coin_reward integer not null check (coin_reward > 0),
  validation_type text not null, validation_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true, starts_at timestamptz, ends_at timestamptz, sort_order integer not null default 0
);
create table if not exists public.btv_coin_rewards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_code text not null references public.btv_coin_opportunities(code), coin_amount integer not null,
  evidence jsonb not null default '{}'::jsonb, awarded_at timestamptz not null default now(),
  unique(user_id,opportunity_code)
);

alter table public.btv_coin_packages enable row level security;
alter table public.btv_coin_purchases enable row level security;
alter table public.btv_coin_opportunities enable row level security;
alter table public.btv_coin_rewards enable row level security;
drop policy if exists coin_packages_read on public.btv_coin_packages;
create policy coin_packages_read on public.btv_coin_packages for select using (is_active or public.btv_is_admin());
drop policy if exists coin_opportunities_read on public.btv_coin_opportunities;
create policy coin_opportunities_read on public.btv_coin_opportunities for select using (is_active or public.btv_is_admin());
drop policy if exists coin_purchases_own on public.btv_coin_purchases;
create policy coin_purchases_own on public.btv_coin_purchases for select using (user_id=auth.uid() or public.btv_is_admin());
drop policy if exists coin_rewards_own on public.btv_coin_rewards;
create policy coin_rewards_own on public.btv_coin_rewards for select using (user_id=auth.uid() or public.btv_is_admin());
grant select on public.btv_coin_packages,public.btv_coin_opportunities,public.btv_coin_purchases,public.btv_coin_rewards to authenticated;
revoke insert,update,delete on public.btv_coin_purchases,public.btv_coin_rewards from anon,authenticated;

insert into public.btv_coin_opportunities(code,title,description,coin_reward,validation_type,sort_order) values
('complete-profile','Complete your profile','Add the information needed for personalised guidance.',25,'profile_complete',10),
('first-mock','Complete your first mock','Finish a full mock examination.',20,'first_mock',20),
('streak-7','Build a 7-day study streak','Study consistently for seven consecutive days.',15,'study_streak',30),
('journey-half','Reach halfway in your journey','Complete half of your active journey milestones.',25,'journey_percent',40)
on conflict(code) do update set title=excluded.title,description=excluded.description,coin_reward=excluded.coin_reward,validation_type=excluded.validation_type,sort_order=excluded.sort_order;

-- Admins configure regional packages; no price is hard-coded in the client.
insert into public.btv_coin_packages(code,title,coin_amount,price_minor,currency,bonus_coins,sort_order) values
('gh-starter','Starter',100,2500,'GHS',0,10),('gh-focus','Focused learner',250,5500,'GHS',25,20)
on conflict(code) do nothing;

create or replace function public.btv_admin_adjust_wallet(p_user uuid,p_amount integer,p_reason text,p_key text)
returns integer language plpgsql security definer set search_path=public as $$
declare new_balance integer;
begin
  if not public.btv_is_admin() then raise exception 'Administrator access required'; end if;
  if p_amount=0 or nullif(trim(p_reason),'') is null or nullif(trim(p_key),'') is null then raise exception 'Invalid adjustment'; end if;
  perform public.btv_bootstrap_user(p_user);
  update public.btv_wallets set balance=balance+p_amount,
    lifetime_earned=lifetime_earned+greatest(p_amount,0), lifetime_spent=lifetime_spent+greatest(-p_amount,0), updated_at=now()
  where user_id=p_user and balance+p_amount>=0 returning balance into new_balance;
  if new_balance is null then raise exception 'Adjustment would create an invalid balance'; end if;
  insert into public.btv_wallet_transactions(user_id,amount,balance_after,transaction_type,description,idempotency_key)
  values(p_user,p_amount,new_balance,'admin_adjustment',left(trim(p_reason),300),'admin:'||p_key)
  on conflict(user_id,idempotency_key) do nothing;
  return new_balance;
end $$;
grant execute on function public.btv_admin_adjust_wallet(uuid,integer,text,text) to authenticated;
