-- Beyond Coins v114: referrals, earn activities, buy packages, purchase initiation.

-- ── Referrals table ────────────────────────────────────────────────────────────
create table if not exists public.btv_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null unique,
  referee_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','completed','rewarded','expired')),
  coins_awarded integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(referrer_id)
);
alter table public.btv_referrals enable row level security;
drop policy if exists btv_referrals_own on public.btv_referrals;
create policy btv_referrals_own on public.btv_referrals for all using (referrer_id = auth.uid() or public.btv_is_admin());
grant select on public.btv_referrals to authenticated;

-- ── Get or create referral code for the authenticated user ─────────────────────
create or replace function public.btv_get_or_create_referral_code()
returns text language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid();
  existing_code text;
  new_code text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select referral_code into existing_code from btv_referrals where referrer_id = uid;
  if existing_code is not null then return existing_code; end if;
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into btv_referrals(referrer_id, referral_code) values(uid, new_code)
  on conflict(referrer_id) do update set referral_code = btv_referrals.referral_code
  returning referral_code into existing_code;
  return existing_code;
end $$;
revoke all on function public.btv_get_or_create_referral_code() from public, anon;
grant execute on function public.btv_get_or_create_referral_code() to authenticated;

-- ── Process a referral when a new user signs up with a code ───────────────────
create or replace function public.btv_process_referral(p_referral_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid();
  ref public.btv_referrals%rowtype;
  reward_amount integer := 150;
  new_balance integer;
begin
  if uid is null then return jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED'); end if;
  if nullif(trim(p_referral_code), '') is null then return jsonb_build_object('success', false, 'code', 'INVALID_CODE'); end if;
  -- Find the referral; cannot self-refer
  select * into ref from btv_referrals
  where referral_code = upper(trim(p_referral_code)) and referrer_id <> uid;
  if not found then return jsonb_build_object('success', false, 'code', 'CODE_NOT_FOUND'); end if;
  if ref.status in ('completed', 'rewarded') then return jsonb_build_object('success', false, 'code', 'ALREADY_USED'); end if;
  -- Complete the referral
  update btv_referrals set referee_id = uid, status = 'rewarded',
    coins_awarded = reward_amount, completed_at = now()
  where id = ref.id;
  -- Credit the referrer
  perform btv_bootstrap_user(ref.referrer_id);
  update btv_wallets set balance = balance + reward_amount,
    lifetime_earned = lifetime_earned + reward_amount, updated_at = now()
  where user_id = ref.referrer_id returning balance into new_balance;
  insert into btv_wallet_transactions(user_id, amount, balance_after, transaction_type, description, reference_type, idempotency_key)
  values(ref.referrer_id, reward_amount, new_balance, 'reward',
    'Referral reward — friend joined Beyond The Visa', 'referral', 'referral:' || ref.id::text)
  on conflict(user_id, idempotency_key) do nothing;
  -- Mark the earn opportunity as claimed for dashboard display
  insert into btv_coin_rewards(user_id, opportunity_code, coin_amount, evidence)
  values(ref.referrer_id, 'invite-friend', reward_amount,
    jsonb_build_object('referral_id', ref.id, 'referee_id', uid, 'awarded_at', now()))
  on conflict(user_id, opportunity_code) do nothing;
  return jsonb_build_object('success', true, 'referrer_rewarded', true, 'coins_awarded', reward_amount);
end $$;
revoke all on function public.btv_process_referral(text) from public, anon;
grant execute on function public.btv_process_referral(text) to authenticated;

-- ── Initiate a coin purchase (records intent; coins credited after payment confirmed) ──
create or replace function public.btv_initiate_coin_purchase(p_package_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid();
  pkg public.btv_coin_packages%rowtype;
  ref_code text;
  purchase_id uuid;
  total_coins integer;
begin
  if uid is null then return jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED', 'message', 'Please sign in to purchase coins.'); end if;
  select * into pkg from btv_coin_packages where code = p_package_code and is_active;
  if not found then return jsonb_build_object('success', false, 'code', 'PACKAGE_UNAVAILABLE', 'message', 'This coin package is not currently available.'); end if;
  ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  total_coins := pkg.coin_amount + coalesce(pkg.bonus_coins, 0);
  insert into btv_coin_purchases(user_id, package_id, provider, provider_reference, amount_minor, currency, coin_amount, status)
  values(uid, pkg.id, 'manual', ref_code, pkg.price_minor, pkg.currency, total_coins, 'pending')
  returning id into purchase_id;
  return jsonb_build_object(
    'success', true,
    'purchase_id', purchase_id,
    'reference', ref_code,
    'coin_amount', total_coins,
    'price_minor', pkg.price_minor,
    'currency', pkg.currency,
    'title', pkg.title
  );
end $$;
revoke all on function public.btv_initiate_coin_purchase(text) from public, anon;
grant execute on function public.btv_initiate_coin_purchase(text) to authenticated;

-- ── Earn activities: upsert all one-time activities ────────────────────────────
insert into public.btv_coin_opportunities(code, title, description, coin_reward, validation_type, sort_order)
values
  ('invite-friend',   'Invite a friend',              'Share your unique referral link. Earn 150 Beyond Coins when your friend creates a Beyond The Visa account.',    150, 'referral',       5),
  ('complete-profile','Complete your profile',         'Add your destination, profession and goals for fully personalised guidance.',                                    25,  'profile_complete',10),
  ('first-mock',      'Complete your first mock exam', 'Finish a full timed mock examination in CBT, NCLEX or IELTS.',                                                  20,  'first_mock',      20),
  ('streak-7',        'Build a 7-day study streak',    'Study on seven consecutive days to show consistent preparation.',                                               15,  'study_streak',    30),
  ('journey-half',    'Reach halfway in your journey', 'Complete at least 50% of your active destination journey milestones.',                                          25,  'journey_percent', 40)
on conflict(code) do update set
  title = excluded.title, description = excluded.description,
  coin_reward = excluded.coin_reward, sort_order = excluded.sort_order;

-- ── Update btv_claim_coin_opportunity to support referral validation type ──────
create or replace function public.btv_claim_coin_opportunity(p_code text)
returns integer language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid();
  opportunity public.btv_coin_opportunities%rowtype;
  eligible boolean := false;
  new_balance integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into opportunity from public.btv_coin_opportunities
  where code = p_code and is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now());
  if not found then raise exception 'Opportunity unavailable'; end if;
  if opportunity.validation_type = 'profile_complete' then
    select count(*) > 0 into eligible from public.profiles where id = uid;
  elsif opportunity.validation_type = 'first_mock' then
    select exists(select 1 from public.btv_mock_sessions where user_id = uid and status = 'completed') into eligible;
  elsif opportunity.validation_type = 'study_streak' then
    select coalesce(current_streak, 0) >= 7 into eligible from public.btv_gamification where user_id = uid;
  elsif opportunity.validation_type = 'journey_percent' then
    select coalesce(count(*) filter (where p.completed), 0) * 100 >= greatest(count(*), 1) * 50
    into eligible
    from public.btv_journey_steps s
    left join public.btv_user_journey_progress p on p.step_code = s.code and p.user_id = uid
    where s.is_active;
  elsif opportunity.validation_type = 'referral' then
    select exists(select 1 from public.btv_referrals where referrer_id = uid and status = 'rewarded') into eligible;
  end if;
  if not eligible then raise exception 'Complete this activity before claiming the reward'; end if;
  insert into public.btv_coin_rewards(user_id, opportunity_code, coin_amount, evidence)
  values(uid, p_code, opportunity.coin_reward, jsonb_build_object('validated_at', now()))
  on conflict(user_id, opportunity_code) do nothing;
  if not found then
    select balance into new_balance from public.btv_wallets where user_id = uid;
    return new_balance;
  end if;
  perform public.btv_bootstrap_user(uid);
  update public.btv_wallets set balance = balance + opportunity.coin_reward,
    lifetime_earned = lifetime_earned + opportunity.coin_reward, updated_at = now()
  where user_id = uid returning balance into new_balance;
  insert into public.btv_wallet_transactions(user_id, amount, balance_after, transaction_type, description, reference_type, idempotency_key)
  values(uid, opportunity.coin_reward, new_balance, 'reward', opportunity.title, 'coin_opportunity', 'reward:' || p_code)
  on conflict(user_id, idempotency_key) do nothing;
  return new_balance;
end $$;
revoke all on function public.btv_claim_coin_opportunity(text) from public, anon;
grant execute on function public.btv_claim_coin_opportunity(text) to authenticated;

-- ── Coin packages: GBP, USD, NGN options ──────────────────────────────────────
insert into public.btv_coin_packages(code, title, coin_amount, price_minor, currency, bonus_coins, sort_order)
values
  ('gbp-100', 'Starter',   100, 299,  'GBP', 0,   1),
  ('gbp-300', 'Explorer',  300, 699,  'GBP', 50,  2),
  ('gbp-600', 'Pro Pack',  600, 1299, 'GBP', 100, 3),
  ('usd-100', 'Starter',   100, 299,  'USD', 0,   11),
  ('usd-300', 'Explorer',  300, 699,  'USD', 50,  12),
  ('usd-600', 'Pro Pack',  600, 1299, 'USD', 100, 13),
  ('ngn-500', 'Starter',   100, 5000, 'NGN', 0,   21),
  ('ngn-1500','Explorer',  300, 12000,'NGN', 50,  22)
on conflict(code) do nothing;

-- ── RLS for coin purchases (users see their own) ───────────────────────────────
drop policy if exists btv_coin_purchases_own on public.btv_coin_purchases;
create policy btv_coin_purchases_own on public.btv_coin_purchases for select using (user_id = auth.uid() or public.btv_is_admin());
