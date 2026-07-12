-- Beyond The Visa Premium Membership v29
-- Run once in Supabase SQL Editor after BTV-ADMIN-SETUP.sql.

create table if not exists public.premium_prices (
  code text primary key,
  market text not null,
  currency text not null,
  amount numeric(12,2) not null check (amount > 0),
  interval text not null default 'monthly' check (interval in ('monthly','yearly')),
  paystack_plan_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.premium_prices(code,market,currency,amount) values
  ('premium_ghs','Ghana','GHS',49),
  ('premium_ngn','Nigeria','NGN',8500),
  ('premium_kes','Kenya','KES',700),
  ('premium_zar','South Africa','ZAR',99),
  ('premium_ugx','Uganda','UGX',24000),
  ('premium_gbp','United Kingdom','GBP',7.99),
  ('premium_usd','International','USD',9.99),
  ('premium_cad','Canada','CAD',12.99),
  ('premium_aud','Australia','AUD',14.99),
  ('premium_nzd','New Zealand','NZD',15.99),
  ('premium_eur','Europe','EUR',8.99)
on conflict(code) do update set market=excluded.market,currency=excluded.currency,amount=excluded.amount,updated_at=now();

alter table public.premium_prices enable row level security;
drop policy if exists "Users read active premium prices" on public.premium_prices;
create policy "Users read active premium prices" on public.premium_prices
for select to authenticated using(active=true or public.is_admin());
drop policy if exists "Admins manage premium prices" on public.premium_prices;
create policy "Admins manage premium prices" on public.premium_prices
for all to authenticated using(public.is_admin()) with check(public.is_admin());

create table if not exists public.paystack_checkout_sessions (
  reference text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  price_code text not null references public.premium_prices(code),
  amount numeric(12,2) not null,
  currency text not null,
  status text not null default 'pending' check(status in ('pending','paid','failed','amount_mismatch')),
  provider_transaction_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.paystack_checkout_sessions enable row level security;
drop policy if exists "Users read own Paystack checkouts" on public.paystack_checkout_sessions;
create policy "Users read own Paystack checkouts" on public.paystack_checkout_sessions
for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_code text not null default 'premium_monthly',
  price_code text references public.premium_prices(code),
  provider text not null default 'paystack',
  provider_subscription_code text,
  provider_email_token text,
  provider_customer_email text,
  status text not null default 'inactive' check(status in ('inactive','active','past_due','cancel_pending','cancelled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription" on public.subscriptions
for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
drop policy if exists "Admins manage subscriptions" on public.subscriptions;
create policy "Admins manage subscriptions" on public.subscriptions
for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "Admins read all payments" on public.payments;
create policy "Admins read all payments" on public.payments
for select to authenticated using(public.is_admin());

create or replace function public.touch_premium_record()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists touch_premium_prices on public.premium_prices;
create trigger touch_premium_prices before update on public.premium_prices for each row execute function public.touch_premium_record();
drop trigger if exists touch_paystack_checkouts on public.paystack_checkout_sessions;
create trigger touch_paystack_checkouts before update on public.paystack_checkout_sessions for each row execute function public.touch_premium_record();
drop trigger if exists touch_subscriptions on public.subscriptions;
create trigger touch_subscriptions before update on public.subscriptions for each row execute function public.touch_premium_record();
