-- Beyond Coins loyalty v178.
-- Additive only: preserves the canonical btv_wallets / btv_wallet_transactions ledger.
set lock_timeout = '8s';
set statement_timeout = '120s';

alter table public.btv_wallets
  add column if not exists pending_balance integer not null default 0 check (pending_balance >= 0),
  add column if not exists lifetime_expired integer not null default 0 check (lifetime_expired >= 0);

alter table public.btv_wallet_transactions
  add column if not exists available_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists related_feature text,
  add column if not exists reversal_of uuid references public.btv_wallet_transactions(id),
  add column if not exists created_by text not null default 'system',
  add column if not exists remaining_amount integer check (remaining_amount is null or remaining_amount >= 0);

update public.btv_wallet_transactions
set available_at = coalesce(available_at, created_at)
where available_at is null and status = 'completed';

alter table public.btv_wallet_transactions drop constraint if exists btv_wallet_transactions_transaction_type_check;
alter table public.btv_wallet_transactions add constraint btv_wallet_transactions_transaction_type_check
check (transaction_type in (
  'welcome','mock_charge','mock_refund','mentor_charge','mentor_refund','reward','purchase','purchase_refund',
  'admin_adjustment','spend','refund','reversal','correction','expiry','promotional_credit','admin_credit',
  'admin_deduction','golden_question_monthly_prize','pending','released','referral_reward','challenge_reward','streak_reward'
));

create index if not exists btv_wallet_transactions_expiry_idx
  on public.btv_wallet_transactions(expires_at) where status='completed' and remaining_amount > 0;
create index if not exists btv_wallet_transactions_user_status_created_idx
  on public.btv_wallet_transactions(user_id,status,created_at desc);

-- Existing credits remain non-expiring. Reconstruct their unspent lot balances without changing wallets.
with ledger as (
  select id,user_id,amount,created_at,
    coalesce(sum(case when amount < 0 then -amount else 0 end) over(partition by user_id),0) as total_spent,
    coalesce(sum(case when amount > 0 then amount else 0 end) over(
      partition by user_id order by created_at,id rows between unbounded preceding and 1 preceding
    ),0) as earlier_credits
  from public.btv_wallet_transactions where status='completed'
), lots as (
  select id,case when amount>0 then greatest(0,amount-greatest(0,total_spent-earlier_credits)) else 0 end remaining
  from ledger
)
update public.btv_wallet_transactions t set remaining_amount=lots.remaining
from lots where lots.id=t.id;

alter table public.btv_coin_opportunities
  add column if not exists category text not null default 'engagement',
  add column if not exists claim_mode text not null default 'manual' check(claim_mode in ('automatic','manual','pending')),
  add column if not exists max_per_day integer check(max_per_day is null or max_per_day>0),
  add column if not exists max_per_week integer check(max_per_week is null or max_per_week>0),
  add column if not exists max_per_month integer check(max_per_month is null or max_per_month>0),
  add column if not exists cooldown_hours integer check(cooldown_hours is null or cooldown_hours>=0),
  add column if not exists eligibility_conditions jsonb not null default '{}'::jsonb;

alter table public.btv_coin_rewards
  add column if not exists claim_key text not null default 'once',
  add column if not exists status text not null default 'released' check(status in ('pending','released','reversed','expired')),
  add column if not exists related_record_id text,
  add column if not exists available_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists transaction_id uuid references public.btv_wallet_transactions(id);
update public.btv_coin_rewards set available_at=coalesce(available_at,awarded_at),claim_key='once' where claim_key is null or claim_key='';
alter table public.btv_coin_rewards drop constraint if exists btv_coin_rewards_user_id_opportunity_code_key;
create unique index if not exists btv_coin_rewards_claim_key_idx
  on public.btv_coin_rewards(user_id,opportunity_code,claim_key);
create index if not exists btv_coin_rewards_user_status_idx
  on public.btv_coin_rewards(user_id,status,awarded_at desc);

alter table public.btv_coin_products
  add column if not exists benefit_summary text,
  add column if not exists usage_terms text,
  add column if not exists display_order integer not null default 0,
  add column if not exists available_from timestamptz,
  add column if not exists available_until timestamptz,
  add column if not exists max_per_user integer check(max_per_user is null or max_per_user>0);

create table if not exists public.btv_coin_levels(
  code text primary key,
  name text not null,
  sort_order integer not null unique,
  minimum_lifetime_earned integer not null check(minimum_lifetime_earned>=0),
  badge text not null,
  benefits jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_coin_user_progress(
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_level_code text references public.btv_coin_levels(code),
  current_streak integer not null default 0 check(current_streak>=0),
  longest_streak integer not null default 0 check(longest_streak>=0),
  learning_streak integer not null default 0 check(learning_streak>=0),
  job_search_streak integer not null default 0 check(job_search_streak>=0),
  journey_streak integer not null default 0 check(journey_streak>=0),
  last_active_on date,
  last_learning_on date,
  last_job_search_on date,
  last_journey_on date,
  streak_protection integer not null default 0 check(streak_protection>=0),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_coin_challenges(
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  cadence text not null check(cadence in ('daily','weekly','monthly','campaign')),
  metric_code text not null,
  target integer not null check(target>0),
  coin_reward integer not null check(coin_reward>=0),
  eligibility jsonb not null default '{}'::jsonb,
  auto_claim boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at>starts_at),
  status text not null default 'draft' check(status in ('draft','active','paused','completed','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_coin_challenge_progress(
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.btv_coin_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress integer not null default 0 check(progress>=0),
  completed_at timestamptz,
  claimed_at timestamptz,
  reward_transaction_id uuid references public.btv_wallet_transactions(id),
  updated_at timestamptz not null default now(),
  unique(challenge_id,user_id)
);
create index if not exists btv_coin_challenge_progress_user_idx
  on public.btv_coin_challenge_progress(user_id,updated_at desc);

create table if not exists public.btv_coin_campaigns(
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  banner_message text,
  eligible_countries text[] not null default '{}',
  eligible_pathways text[] not null default '{}',
  eligible_actions text[] not null default '{}',
  multiplier numeric(5,2) not null default 1 check(multiplier>=1 and multiplier<=5),
  maximum_reward integer check(maximum_reward is null or maximum_reward>0),
  usage_limit integer check(usage_limit is null or usage_limit>0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at>starts_at),
  status text not null default 'draft' check(status in ('draft','active','paused','completed','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_coin_redemptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.btv_coin_products(id),
  entitlement_id uuid references public.btv_entitlements(id),
  transaction_id uuid references public.btv_wallet_transactions(id),
  idempotency_key text not null,
  coin_cost integer not null check(coin_cost>=0),
  status text not null default 'completed' check(status in ('pending','completed','failed','refunded','reversed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);

create table if not exists public.btv_referral_codes(
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.btv_referrals(
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null references public.btv_referral_codes(code),
  status text not null default 'pending' check(status in ('pending','review','qualified','rewarded','rejected','expired')),
  reward_amount integer,
  reward_claim_id uuid references public.btv_coin_rewards(id),
  risk_score integer not null default 0 check(risk_score between 0 and 100),
  risk_flags jsonb not null default '[]'::jsonb,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_note text,
  created_at timestamptz not null default now()
);
create index if not exists btv_referrals_referrer_status_idx on public.btv_referrals(referrer_id,status,created_at desc);

-- RLS: users read their records; only audited functions or admins mutate financial state.
alter table public.btv_coin_levels enable row level security;
alter table public.btv_coin_user_progress enable row level security;
alter table public.btv_coin_challenges enable row level security;
alter table public.btv_coin_challenge_progress enable row level security;
alter table public.btv_coin_campaigns enable row level security;
alter table public.btv_coin_redemptions enable row level security;
alter table public.btv_referral_codes enable row level security;
alter table public.btv_referrals enable row level security;

create policy "members read active coin levels" on public.btv_coin_levels for select to authenticated using(is_active or public.btv_is_admin());
create policy "members read own coin progress" on public.btv_coin_user_progress for select to authenticated using((select auth.uid())=user_id or public.btv_is_admin());
create policy "members read active coin challenges" on public.btv_coin_challenges for select to authenticated using((status='active' and now() between starts_at and ends_at) or public.btv_is_admin());
create policy "members read own challenge progress" on public.btv_coin_challenge_progress for select to authenticated using((select auth.uid())=user_id or public.btv_is_admin());
create policy "members read active coin campaigns" on public.btv_coin_campaigns for select to authenticated using((status='active' and now() between starts_at and ends_at) or public.btv_is_admin());
create policy "members read own redemptions" on public.btv_coin_redemptions for select to authenticated using((select auth.uid())=user_id or public.btv_is_admin());
create policy "members read own referral code" on public.btv_referral_codes for select to authenticated using((select auth.uid())=user_id or public.btv_is_admin());
create policy "members read own referrals" on public.btv_referrals for select to authenticated using(
  (select auth.uid())=referrer_id or (select auth.uid())=referred_user_id or public.btv_is_admin()
);

create policy "admins manage coin levels" on public.btv_coin_levels for all to authenticated using(public.btv_is_admin()) with check(public.btv_is_admin());
create policy "admins manage coin challenges" on public.btv_coin_challenges for all to authenticated using(public.btv_is_admin()) with check(public.btv_is_admin());
create policy "admins manage coin campaigns" on public.btv_coin_campaigns for all to authenticated using(public.btv_is_admin()) with check(public.btv_is_admin());

revoke all on public.btv_coin_levels,public.btv_coin_user_progress,public.btv_coin_challenges,public.btv_coin_challenge_progress,
 public.btv_coin_campaigns,public.btv_coin_redemptions,public.btv_referral_codes,public.btv_referrals from anon;
grant select on public.btv_coin_levels,public.btv_coin_user_progress,public.btv_coin_challenges,public.btv_coin_challenge_progress,
 public.btv_coin_campaigns,public.btv_coin_redemptions,public.btv_referral_codes,public.btv_referrals to authenticated;
grant insert,update,delete on public.btv_coin_levels,public.btv_coin_challenges,public.btv_coin_campaigns to authenticated;

create or replace function public.btv_coin_fifo_ledger_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_left integer; v_credit record; v_take integer;
begin
  if new.status<>'completed' then return new; end if;
  if new.amount>0 then
    update public.btv_wallet_transactions set remaining_amount=coalesce(remaining_amount,new.amount) where id=new.id;
    return new;
  end if;
  if coalesce((new.metadata->>'skip_fifo')::boolean,false) then return new; end if;
  v_left:=abs(new.amount);
  for v_credit in
    select id,remaining_amount from public.btv_wallet_transactions
    where user_id=new.user_id and status='completed' and amount>0 and coalesce(remaining_amount,0)>0
    order by coalesce(expires_at,'infinity'::timestamptz),created_at,id for update
  loop
    exit when v_left<=0;
    v_take:=least(v_left,v_credit.remaining_amount);
    update public.btv_wallet_transactions set remaining_amount=remaining_amount-v_take where id=v_credit.id;
    v_left:=v_left-v_take;
  end loop;
  return new;
end $$;
drop trigger if exists btv_coin_fifo_ledger on public.btv_wallet_transactions;
create trigger btv_coin_fifo_ledger after insert on public.btv_wallet_transactions
for each row execute function public.btv_coin_fifo_ledger_trigger();
revoke all on function public.btv_coin_fifo_ledger_trigger() from public,anon,authenticated;

create or replace function public.btv_coin_credit(
  p_user uuid,p_amount integer,p_type text,p_description text,p_idempotency text,p_source text,p_source_id text,
  p_status text default 'completed',p_expires_at timestamptz default null,p_created_by text default 'system'
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_wallet public.btv_wallets%rowtype; v_tx uuid; v_before integer; v_after integer;
begin
  if p_user is null or p_amount<=0 or p_status not in ('completed','pending') then raise exception 'INVALID_COIN_CREDIT'; end if;
  perform public.btv_bootstrap_user(p_user);
  select * into v_wallet from public.btv_wallets where user_id=p_user for update;
  select id into v_tx from public.btv_wallet_transactions where user_id=p_user and idempotency_key=p_idempotency;
  if v_tx is not null then return v_tx; end if;
  v_before:=v_wallet.balance;
  if p_status='pending' then
    update public.btv_wallets set pending_balance=pending_balance+p_amount,updated_at=now() where user_id=p_user;
    v_after:=v_before;
  else
    v_after:=v_before+p_amount;
    update public.btv_wallets set balance=v_after,lifetime_earned=lifetime_earned+p_amount,updated_at=now() where user_id=p_user;
  end if;
  insert into public.btv_wallet_transactions(
    user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,
    idempotency_key,metadata,status,item_code,available_at,expires_at,related_feature,created_by,remaining_amount
  ) values(
    p_user,p_user,p_amount,v_before,v_after,p_type,p_source,p_source_id,p_description,p_idempotency,'{}'::jsonb,p_status,
    p_source,case when p_status='completed' then now() end,p_expires_at,p_source,p_created_by,
    case when p_status='completed' then p_amount else 0 end
  ) returning id into v_tx;
  return v_tx;
exception when unique_violation then
  select id into v_tx from public.btv_wallet_transactions where user_id=p_user and idempotency_key=p_idempotency;
  return v_tx;
end $$;
revoke all on function public.btv_coin_credit(uuid,integer,text,text,text,text,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.btv_coin_credit(uuid,integer,text,text,text,text,text,text,timestamptz,text) to service_role;

create or replace function public.btv_coin_claim_reward(p_code text,p_related_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=(select auth.uid()); v_rule public.btv_coin_opportunities%rowtype; v_settings public.btv_currency_settings%rowtype;
  v_wallet public.btv_wallets%rowtype; v_related uuid; v_eligible boolean:=false; v_claim_key text; v_amount integer;
  v_multiplier numeric:=1; v_campaign_cap integer; v_status text; v_tx uuid; v_reward uuid; v_expiry timestamptz;
begin
  if v_uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED'); end if;
  select * into v_settings from public.btv_currency_settings where id=true;
  if not coalesce(v_settings.earning_enabled,false) then return jsonb_build_object('success',false,'code','EARNING_DISABLED'); end if;
  select * into v_rule from public.btv_coin_opportunities where code=p_code and is_active
    and now() between coalesce(starts_at,'-infinity') and coalesce(ends_at,'infinity') for share;
  if not found then return jsonb_build_object('success',false,'code','REWARD_UNAVAILABLE'); end if;
  begin v_related:=nullif(p_related_id,'')::uuid; exception when invalid_text_representation then v_related:=null; end;

  case v_rule.validation_type
    when 'daily_login' then v_eligible:=true;
    when 'profile_complete' then select exists(select 1 from public.profiles where id=v_uid and nullif(full_name,'') is not null and nullif(profession,'') is not null and coalesce(nullif(destination_country,''),nullif(destination,'')) is not null and onboarding_completed_at is not null) into v_eligible;
    when 'destination_selected' then select exists(select 1 from public.profiles where id=v_uid and coalesce(nullif(destination_country,''),nullif(destination,'')) is not null) into v_eligible;
    when 'journey_assessment' then select exists(select 1 from public.btv_user_journey_progress where user_id=v_uid) into v_eligible;
    when 'job_save' then select exists(select 1 from public.btv_saved_jobs where user_id=v_uid and (v_related is null or job_id=v_related)) into v_eligible;
    when 'job_application' then select exists(select 1 from public.btv_job_applications where user_id=v_uid and consent_confirmed and submitted_at is not null and (v_related is null or id=v_related)) into v_eligible;
    when 'learning_activity' then select exists(select 1 from public.btv_study_activity where user_id=v_uid and questions_answered>0 and (v_related is null or id=v_related)) into v_eligible;
    when 'first_mock' then select exists(select 1 from public.btv_mock_sessions where user_id=v_uid and status='completed' and (v_related is null or id=v_related)) into v_eligible;
    when 'study_streak' then select exists(select 1 from public.btv_coin_user_progress where user_id=v_uid and learning_streak>=7) into v_eligible;
    when 'journey_progress' then select count(*)>=5 into v_eligible from public.btv_user_journey_progress where user_id=v_uid and (completed or completed_at is not null);
    when 'mentor_session' then select exists(select 1 from public.btv_mentor_bookings where user_id=v_uid and status='completed' and (v_related is null or id=v_related)) into v_eligible;
    when 'mentor_review' then select exists(select 1 from public.btv_mentor_reviews r join public.btv_mentor_bookings b on b.id=r.booking_id where r.user_id=v_uid and b.status='completed' and (v_related is null or r.id=v_related)) into v_eligible;
    else v_eligible:=false;
  end case;
  if not v_eligible then return jsonb_build_object('success',false,'code','NOT_ELIGIBLE','message','Complete this verified activity first.'); end if;

  v_claim_key:=case coalesce(v_rule.frequency,'once')
    when 'daily' then to_char(current_date,'YYYY-MM-DD')
    when 'weekly' then to_char(current_date,'IYYY-IW')
    when 'monthly' then to_char(current_date,'YYYY-MM')
    when 'per_record' then coalesce(v_related::text,'missing')
    else 'once' end;
  if v_claim_key='missing' then return jsonb_build_object('success',false,'code','RELATED_RECORD_REQUIRED'); end if;
  if exists(select 1 from public.btv_coin_rewards where user_id=v_uid and opportunity_code=p_code and claim_key=v_claim_key) then
    select * into v_wallet from public.btv_wallets where user_id=v_uid;
    return jsonb_build_object('success',true,'already_claimed',true,'available_balance',coalesce(v_wallet.balance,0),'pending_balance',coalesce(v_wallet.pending_balance,0));
  end if;
  if v_rule.max_claims is not null and (select count(*) from public.btv_coin_rewards where user_id=v_uid and opportunity_code=p_code and status<>'reversed')>=v_rule.max_claims then return jsonb_build_object('success',false,'code','LIFETIME_LIMIT'); end if;
  if v_rule.max_per_day is not null and (select count(*) from public.btv_coin_rewards where user_id=v_uid and opportunity_code=p_code and awarded_at>=date_trunc('day',now()) and status<>'reversed')>=v_rule.max_per_day then return jsonb_build_object('success',false,'code','DAILY_LIMIT'); end if;
  if v_rule.max_per_week is not null and (select count(*) from public.btv_coin_rewards where user_id=v_uid and opportunity_code=p_code and awarded_at>=date_trunc('week',now()) and status<>'reversed')>=v_rule.max_per_week then return jsonb_build_object('success',false,'code','WEEKLY_LIMIT'); end if;
  if v_rule.max_per_month is not null and (select count(*) from public.btv_coin_rewards where user_id=v_uid and opportunity_code=p_code and awarded_at>=date_trunc('month',now()) and status<>'reversed')>=v_rule.max_per_month then return jsonb_build_object('success',false,'code','MONTHLY_LIMIT'); end if;

  select greatest(coalesce(max(c.multiplier),1),1),max(c.maximum_reward) into v_multiplier,v_campaign_cap
  from public.btv_coin_campaigns c left join public.profiles p on p.id=v_uid
  where c.status='active' and now() between c.starts_at and c.ends_at
    and (cardinality(c.eligible_actions)=0 or p_code=any(c.eligible_actions))
    and (cardinality(c.eligible_countries)=0 or lower(coalesce(p.destination_country,p.destination,''))=any(select lower(x) from unnest(c.eligible_countries) x));
  v_amount:=round(v_rule.coin_reward*coalesce(v_multiplier,1));
  if v_campaign_cap is not null then v_amount:=least(v_amount,v_campaign_cap); end if;
  v_status:=case when v_rule.claim_mode='pending' then 'pending' else 'completed' end;
  v_expiry:=case when v_rule.reward_expiry_days is not null then now()+make_interval(days=>v_rule.reward_expiry_days) when v_settings.coins_expire and v_settings.default_expiry_days is not null then now()+make_interval(days=>v_settings.default_expiry_days) end;
  v_tx:=public.btv_coin_credit(v_uid,v_amount,case when v_status='pending' then 'pending' else 'reward' end,v_rule.title,'reward:'||p_code||':'||v_claim_key,'coin_reward',coalesce(v_related::text,v_claim_key),v_status,v_expiry,'system');
  insert into public.btv_coin_rewards(user_id,opportunity_code,coin_amount,evidence,claim_key,status,related_record_id,available_at,expires_at,transaction_id)
  values(v_uid,p_code,v_amount,jsonb_build_object('validated_at',now(),'multiplier',v_multiplier),v_claim_key,case when v_status='pending' then 'pending' else 'released' end,p_related_id,case when v_status='completed' then now() end,v_expiry,v_tx)
  returning id into v_reward;
  select * into v_wallet from public.btv_wallets where user_id=v_uid;
  return jsonb_build_object('success',true,'already_claimed',false,'reward_id',v_reward,'coins',v_amount,'status',case when v_status='pending' then 'pending' else 'released' end,'available_balance',v_wallet.balance,'pending_balance',v_wallet.pending_balance);
end $$;
revoke all on function public.btv_coin_claim_reward(text,text) from public,anon;
grant execute on function public.btv_coin_claim_reward(text,text) to authenticated;

create or replace function public.btv_claim_coin_opportunity(p_code text)
returns integer language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  v_result:=public.btv_coin_claim_reward(p_code,null);
  if not coalesce((v_result->>'success')::boolean,false) then raise exception '%',coalesce(v_result->>'message',v_result->>'code','Reward unavailable'); end if;
  return coalesce((v_result->>'available_balance')::integer,0);
end $$;
revoke all on function public.btv_claim_coin_opportunity(text) from public,anon;
grant execute on function public.btv_claim_coin_opportunity(text) to authenticated;

create or replace function public.btv_sync_coin_challenges(p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare c record; v_progress integer;
begin
  for c in select * from public.btv_coin_challenges where status='active' and now() between starts_at and ends_at loop
    v_progress:=case c.metric_code
      when 'profile_complete' then (select case when exists(select 1 from public.profiles where id=p_user and onboarding_completed_at is not null) then 1 else 0 end)
      when 'saved_jobs' then (select count(*)::integer from public.btv_saved_jobs where user_id=p_user and saved_at between c.starts_at and c.ends_at)
      when 'learning_activities' then (select count(*)::integer from public.btv_study_activity where user_id=p_user and created_at between c.starts_at and c.ends_at and questions_answered>0)
      when 'journey_tasks' then (select count(*)::integer from public.btv_user_journey_progress where user_id=p_user and completed_at between c.starts_at and c.ends_at)
      when 'mentor_sessions' then (select count(*)::integer from public.btv_mentor_bookings where user_id=p_user and status='completed' and starts_at between c.starts_at and c.ends_at)
      else 0 end;
    insert into public.btv_coin_challenge_progress(challenge_id,user_id,progress,completed_at,updated_at)
    values(c.id,p_user,least(v_progress,c.target),case when v_progress>=c.target then now() end,now())
    on conflict(challenge_id,user_id) do update set progress=excluded.progress,completed_at=coalesce(public.btv_coin_challenge_progress.completed_at,excluded.completed_at),updated_at=now();
  end loop;
end $$;
revoke all on function public.btv_sync_coin_challenges(uuid) from public,anon,authenticated;

create or replace function public.btv_claim_coin_challenge(p_challenge uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid()); v_challenge public.btv_coin_challenges%rowtype; v_progress public.btv_coin_challenge_progress%rowtype; v_tx uuid; v_wallet public.btv_wallets%rowtype;
begin
  if v_uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED'); end if;
  perform public.btv_sync_coin_challenges(v_uid);
  select * into v_challenge from public.btv_coin_challenges where id=p_challenge and status='active' and now() between starts_at and ends_at;
  select * into v_progress from public.btv_coin_challenge_progress where challenge_id=p_challenge and user_id=v_uid for update;
  if v_challenge.id is null or v_progress.id is null or v_progress.completed_at is null then return jsonb_build_object('success',false,'code','CHALLENGE_INCOMPLETE'); end if;
  if v_progress.claimed_at is not null then return jsonb_build_object('success',true,'already_claimed',true); end if;
  v_tx:=public.btv_coin_credit(v_uid,v_challenge.coin_reward,'challenge_reward',v_challenge.name,'challenge:'||p_challenge::text,'coin_challenge',p_challenge::text,'completed',null,'system');
  update public.btv_coin_challenge_progress set claimed_at=now(),reward_transaction_id=v_tx,updated_at=now() where id=v_progress.id;
  select * into v_wallet from public.btv_wallets where user_id=v_uid;
  return jsonb_build_object('success',true,'coins',v_challenge.coin_reward,'available_balance',v_wallet.balance);
end $$;
revoke all on function public.btv_claim_coin_challenge(uuid) from public,anon;
grant execute on function public.btv_claim_coin_challenge(uuid) to authenticated;

create or replace function public.btv_get_or_create_referral_code()
returns text language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid()); v_code text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select code into v_code from public.btv_referral_codes where user_id=v_uid;
  if v_code is null then
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    insert into public.btv_referral_codes(user_id,code) values(v_uid,v_code) on conflict(user_id) do update set code=public.btv_referral_codes.code returning code into v_code;
  end if;
  return v_code;
end $$;
revoke all on function public.btv_get_or_create_referral_code() from public,anon;
grant execute on function public.btv_get_or_create_referral_code() to authenticated;

create or replace function public.btv_process_referral(p_referral_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid()); v_referrer uuid; v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED'); end if;
  select user_id into v_referrer from public.btv_referral_codes where code=upper(trim(p_referral_code)) and is_active;
  if v_referrer is null then return jsonb_build_object('success',false,'code','INVALID_CODE'); end if;
  if v_referrer=v_uid then return jsonb_build_object('success',false,'code','SELF_REFERRAL'); end if;
  if exists(select 1 from public.btv_referrals where referred_user_id=v_uid) then return jsonb_build_object('success',false,'code','ALREADY_REFERRED'); end if;
  insert into public.btv_referrals(referrer_id,referred_user_id,referral_code,status) values(v_referrer,v_uid,upper(trim(p_referral_code)),'pending') returning id into v_id;
  return jsonb_build_object('success',true,'referral_id',v_id,'status','pending','message','Referral recorded. Coins are released only after eligibility checks.');
end $$;
revoke all on function public.btv_process_referral(text) from public,anon;
grant execute on function public.btv_process_referral(text) to authenticated;

create or replace function public.btv_admin_release_pending_coin_reward(p_reward uuid,p_approve boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid:=(select auth.uid()); v_reward public.btv_coin_rewards%rowtype; v_wallet public.btv_wallets%rowtype; v_tx uuid;
begin
  if not public.btv_is_admin() and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Administrator access required'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'A reason is required'; end if;
  select * into v_reward from public.btv_coin_rewards where id=p_reward and status='pending' for update;
  if not found then return jsonb_build_object('success',false,'code','PENDING_REWARD_UNAVAILABLE'); end if;
  select * into v_wallet from public.btv_wallets where user_id=v_reward.user_id for update;
  update public.btv_wallets set pending_balance=greatest(0,pending_balance-v_reward.coin_amount),updated_at=now() where user_id=v_reward.user_id;
  if p_approve then
    v_tx:=public.btv_coin_credit(v_reward.user_id,v_reward.coin_amount,'released','Pending reward released','release:'||v_reward.id::text,'coin_reward',v_reward.id::text,'completed',v_reward.expires_at,'admin');
    update public.btv_coin_rewards set status='released',available_at=now() where id=v_reward.id;
    update public.btv_referrals set status='rewarded',rewarded_at=now(),reviewed_by=v_admin,review_note=p_reason where reward_claim_id=v_reward.id;
  else
    insert into public.btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,related_feature,created_by,remaining_amount)
    values(v_reward.user_id,v_reward.user_id,-v_reward.coin_amount,v_wallet.balance,v_wallet.balance,'reversal','coin_reward',v_reward.id::text,'Pending reward reversed','pending-reversal:'||v_reward.id::text,jsonb_build_object('skip_fifo',true),'reversed','coin_reward','admin',0) returning id into v_tx;
    update public.btv_coin_rewards set status='reversed' where id=v_reward.id;
    update public.btv_referrals set status='rejected',reviewed_by=v_admin,review_note=p_reason where reward_claim_id=v_reward.id;
  end if;
  insert into public.btv_admin_coin_audit(admin_id,affected_user_id,action,previous_value,new_value,reason,reference)
  values(v_admin,v_reward.user_id,case when p_approve then 'release_pending_reward' else 'reverse_pending_reward' end,jsonb_build_object('status','pending'),jsonb_build_object('status',case when p_approve then 'released' else 'reversed' end,'transaction_id',v_tx),p_reason,v_reward.id::text);
  return jsonb_build_object('success',true,'status',case when p_approve then 'released' else 'reversed' end,'transaction_id',v_tx);
end $$;
revoke all on function public.btv_admin_release_pending_coin_reward(uuid,boolean,text) from public,anon;
grant execute on function public.btv_admin_release_pending_coin_reward(uuid,boolean,text) to authenticated,service_role;

create or replace function public.btv_admin_qualify_referral(p_referral uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid:=(select auth.uid()); v_ref public.btv_referrals%rowtype; v_rule public.btv_coin_opportunities%rowtype; v_reward uuid; v_tx uuid;
begin
  if not public.btv_is_admin() and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Administrator access required'; end if;
  select * into v_ref from public.btv_referrals where id=p_referral and status in ('pending','review') for update;
  if not found then return jsonb_build_object('success',false,'code','REFERRAL_UNAVAILABLE'); end if;
  if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=v_ref.referred_user_id and u.email_confirmed_at is not null and p.onboarding_completed_at is not null) then return jsonb_build_object('success',false,'code','QUALIFYING_ACTION_INCOMPLETE'); end if;
  select * into v_rule from public.btv_coin_opportunities where code='successful-referral' and is_active;
  if not found then return jsonb_build_object('success',false,'code','REWARD_RULE_UNAVAILABLE'); end if;
  v_tx:=public.btv_coin_credit(v_ref.referrer_id,v_rule.coin_reward,'pending','Successful referral pending review','referral-pending:'||v_ref.id::text,'referral',v_ref.id::text,'pending',null,'system');
  insert into public.btv_coin_rewards(user_id,opportunity_code,coin_amount,evidence,claim_key,status,related_record_id,transaction_id)
  values(v_ref.referrer_id,v_rule.code,v_rule.coin_reward,jsonb_build_object('qualified_at',now()),v_ref.id::text,'pending',v_ref.id::text,v_tx)
  on conflict(user_id,opportunity_code,claim_key) do update set id=public.btv_coin_rewards.id returning id into v_reward;
  update public.btv_referrals set status='qualified',qualified_at=now(),reward_amount=v_rule.coin_reward,reward_claim_id=v_reward,reviewed_by=v_admin,review_note=p_reason where id=v_ref.id;
  return jsonb_build_object('success',true,'status','qualified','pending_coins',v_rule.coin_reward,'reward_id',v_reward);
end $$;
revoke all on function public.btv_admin_qualify_referral(uuid,text) from public,anon;
grant execute on function public.btv_admin_qualify_referral(uuid,text) to authenticated,service_role;

create or replace function public.btv_admin_set_coin_config_status(p_kind text,p_identifier text,p_enabled boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid:=(select auth.uid()); v_before jsonb; v_after jsonb;
begin
  if not public.btv_is_admin() then raise exception 'Administrator access required'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'A reason is required'; end if;
  if p_kind='opportunity' then
    select to_jsonb(x) into v_before from public.btv_coin_opportunities x where code=p_identifier for update;
    update public.btv_coin_opportunities set is_active=p_enabled where code=p_identifier returning to_jsonb(btv_coin_opportunities.*) into v_after;
  elsif p_kind='level' then
    select to_jsonb(x) into v_before from public.btv_coin_levels x where code=p_identifier for update;
    update public.btv_coin_levels set is_active=p_enabled,updated_at=now() where code=p_identifier returning to_jsonb(btv_coin_levels.*) into v_after;
  elsif p_kind='challenge' then
    select to_jsonb(x) into v_before from public.btv_coin_challenges x where id=p_identifier::uuid for update;
    update public.btv_coin_challenges set status=case when p_enabled then 'active' else 'paused' end,updated_at=now() where id=p_identifier::uuid returning to_jsonb(btv_coin_challenges.*) into v_after;
  elsif p_kind='campaign' then
    select to_jsonb(x) into v_before from public.btv_coin_campaigns x where id=p_identifier::uuid for update;
    update public.btv_coin_campaigns set status=case when p_enabled then 'active' else 'paused' end,updated_at=now() where id=p_identifier::uuid returning to_jsonb(btv_coin_campaigns.*) into v_after;
  else raise exception 'Unsupported configuration type';
  end if;
  if v_after is null then raise exception 'Configuration record not found'; end if;
  insert into public.btv_admin_coin_audit(admin_id,action,previous_value,new_value,reason,reference)
  values(v_admin,'coin_config_status:'||p_kind,v_before,v_after,p_reason,p_identifier);
  return jsonb_build_object('success',true,'kind',p_kind,'identifier',p_identifier,'enabled',p_enabled);
end $$;
revoke all on function public.btv_admin_set_coin_config_status(text,text,boolean,text) from public,anon;
grant execute on function public.btv_admin_set_coin_config_status(text,text,boolean,text) to authenticated;

create or replace function public.btv_coin_expire_due()
returns integer language plpgsql security definer set search_path='' as $$
declare v_credit record; v_wallet public.btv_wallets%rowtype; v_expire integer; v_count integer:=0;
begin
  if not public.btv_is_admin() and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Privileged access required'; end if;
  if not coalesce((select coins_expire from public.btv_currency_settings where id=true),false) then return 0; end if;
  for v_credit in select * from public.btv_wallet_transactions where status='completed' and amount>0 and remaining_amount>0 and expires_at<=now() order by expires_at for update loop
    select * into v_wallet from public.btv_wallets where user_id=v_credit.user_id for update;
    v_expire:=least(v_credit.remaining_amount,v_wallet.balance);
    if v_expire>0 then
      update public.btv_wallet_transactions set remaining_amount=remaining_amount-v_expire where id=v_credit.id;
      update public.btv_wallets set balance=balance-v_expire,lifetime_expired=lifetime_expired+v_expire,updated_at=now() where user_id=v_credit.user_id;
      insert into public.btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,reversal_of,related_feature,created_by,remaining_amount)
      values(v_credit.user_id,v_credit.user_id,-v_expire,v_wallet.balance,v_wallet.balance-v_expire,'expiry','coin_expiry',v_credit.id::text,'Beyond Coins expired after advance notice','expiry:'||v_credit.id::text,jsonb_build_object('skip_fifo',true),'completed',v_credit.id,'expiry','system',0)
      on conflict(user_id,idempotency_key) do nothing;
      v_count:=v_count+1;
    end if;
  end loop;
  return v_count;
end $$;
revoke all on function public.btv_coin_expire_due() from public,anon,authenticated;
grant execute on function public.btv_coin_expire_due() to service_role;

create or replace function public.btv_coin_wallet_snapshot(p_history_limit integer default 20,p_history_before timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid()); v_wallet public.btv_wallets%rowtype; v_progress public.btv_coin_user_progress%rowtype; v_level public.btv_coin_levels%rowtype; v_next public.btv_coin_levels%rowtype; v_today date:=current_date; v_limit integer:=least(greatest(coalesce(p_history_limit,20),1),50); v_ref text;
begin
  if v_uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED'); end if;
  perform public.btv_bootstrap_user(v_uid);
  insert into public.btv_coin_user_progress(user_id,current_level_code) values(v_uid,'explorer') on conflict(user_id) do nothing;
  select * into v_progress from public.btv_coin_user_progress where user_id=v_uid for update;
  if v_progress.last_active_on is distinct from v_today then
    update public.btv_coin_user_progress set current_streak=case when last_active_on=v_today-1 then current_streak+1 else 1 end,longest_streak=greatest(longest_streak,case when last_active_on=v_today-1 then current_streak+1 else 1 end),last_active_on=v_today,updated_at=now() where user_id=v_uid;
  end if;
  begin perform public.btv_coin_claim_reward('daily-login',null); exception when others then null; end;
  perform public.btv_sync_coin_challenges(v_uid);
  select * into v_wallet from public.btv_wallets where user_id=v_uid;
  select * into v_level from public.btv_coin_levels where is_active and minimum_lifetime_earned<=v_wallet.lifetime_earned order by minimum_lifetime_earned desc limit 1;
  select * into v_next from public.btv_coin_levels where is_active and minimum_lifetime_earned>v_wallet.lifetime_earned order by minimum_lifetime_earned limit 1;
  update public.btv_coin_user_progress set current_level_code=v_level.code,updated_at=now() where user_id=v_uid;
  select * into v_progress from public.btv_coin_user_progress where user_id=v_uid;
  begin v_ref:=public.btv_get_or_create_referral_code(); exception when others then v_ref:=null; end;
  return jsonb_build_object(
    'success',true,
    'wallet',to_jsonb(v_wallet),
    'earned_today',(select coalesce(sum(amount),0) from public.btv_wallet_transactions where user_id=v_uid and amount>0 and status='completed' and created_at>=date_trunc('day',now())),
    'expiring_soon',(select coalesce(sum(remaining_amount),0) from public.btv_wallet_transactions where user_id=v_uid and status='completed' and amount>0 and remaining_amount>0 and expires_at between now() and now()+interval '30 days'),
    'progress',to_jsonb(v_progress),
    'level',to_jsonb(v_level),
    'next_level',to_jsonb(v_next),
    'referral_code',v_ref,
    'history',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select * from public.btv_wallet_transactions where user_id=v_uid and (p_history_before is null or created_at<p_history_before) order by created_at desc limit v_limit) x),
    'opportunities',(select coalesce(jsonb_agg(to_jsonb(o) order by sort_order),'[]'::jsonb) from public.btv_coin_opportunities o where is_active and now() between coalesce(starts_at,'-infinity') and coalesce(ends_at,'infinity')),
    'rewards',(select coalesce(jsonb_agg(to_jsonb(p) order by featured desc,display_order,name),'[]'::jsonb) from public.btv_coin_products p where is_active and now() between coalesce(available_from,'-infinity') and coalesce(available_until,'infinity')),
    'challenges',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('progress',coalesce(cp.progress,0),'completed_at',cp.completed_at,'claimed_at',cp.claimed_at) order by c.ends_at),'[]'::jsonb) from public.btv_coin_challenges c left join public.btv_coin_challenge_progress cp on cp.challenge_id=c.id and cp.user_id=v_uid where c.status='active' and now() between c.starts_at and c.ends_at),
    'campaigns',(select coalesce(jsonb_agg(to_jsonb(c) order by c.ends_at),'[]'::jsonb) from public.btv_coin_campaigns c where c.status='active' and now() between c.starts_at and c.ends_at),
    'entitlements',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb) from (select id,product_id,status,attempts_total,attempts_used,expires_at,created_at from public.btv_entitlements where user_id=v_uid order by created_at desc limit 20) e)
  );
end $$;
revoke all on function public.btv_coin_wallet_snapshot(integer,timestamptz) from public,anon;
grant execute on function public.btv_coin_wallet_snapshot(integer,timestamptz) to authenticated;

-- Configuration defaults. Existing welcome grants are untouched and cannot be reissued.
insert into public.btv_coin_levels(code,name,sort_order,minimum_lifetime_earned,badge,benefits) values
 ('explorer','Explorer',1,0,'Explorer','["Core rewards","Standard challenges"]'),
 ('pathfinder','Pathfinder',2,500,'Pathfinder','["Bonus challenges","Profile badge"]'),
 ('navigator','Navigator',3,1500,'Navigator','["Early access","Selected learning bonuses"]'),
 ('trailblazer','Trailblazer',4,3500,'Trailblazer','["Marketplace benefits","Exclusive resources"]'),
 ('global-achiever','Global Achiever',5,7500,'Global Achiever','["Recognition badge","Priority campaign access"]')
on conflict(code) do update set name=excluded.name,sort_order=excluded.sort_order,minimum_lifetime_earned=excluded.minimum_lifetime_earned,badge=excluded.badge,benefits=excluded.benefits,updated_at=now();

insert into public.btv_coin_opportunities(code,title,description,coin_reward,validation_type,sort_order,category,claim_mode,frequency,max_claims,max_per_day,max_per_week,max_per_month) values
 ('daily-login','Daily check-in','Open your dashboard and review the next useful action in your journey.',5,'daily_login',5,'daily','automatic','daily',null,1,7,31),
 ('complete-profile','Complete your profile','Complete onboarding with your profession and destination.',100,'profile_complete',10,'profile','manual','once',1,null,null,null),
 ('destination-selected','Select your destination','Choose the country for your professional pathway.',20,'destination_selected',15,'profile','manual','once',1,null,null,null),
 ('journey-assessment','Start your pathway assessment','Save your first verified journey milestone.',75,'journey_assessment',20,'journey','manual','once',1,null,null,null),
 ('first-job-save','Save your first suitable job','Save a relevant vacancy to your account.',10,'job_save',30,'jobs','manual','once',1,null,null,null),
 ('verified-job-application','Complete an application','Submit a complete on-platform job application.',30,'job_application',35,'jobs','pending','per_record',null,2,5,12),
 ('learning-module','Complete a learning activity','Finish a recorded learning activity.',40,'learning_activity',40,'learning','manual','per_record',null,3,10,30),
 ('first-mock','Complete your first mock','Finish a timed mock examination.',100,'first_mock',45,'learning','manual','once',1,null,null,null),
 ('journey-five','Complete five journey tasks','Make verified progress across your pathway.',75,'journey_progress',50,'journey','manual','once',1,null,null,null),
 ('mentor-session','Complete a mentor session','Attend a completed, verified mentor booking.',100,'mentor_session',60,'mentors','pending','per_record',null,2,4,8),
 ('mentor-review','Leave a verified mentor review','Review a completed mentor booking.',25,'mentor_review',65,'mentors','manual','per_record',null,2,5,12),
 ('successful-referral','Successful referral','Earn after a referred member verifies email, completes onboarding and passes review.',500,'referral',70,'referrals','pending','per_record',null,1,3,10)
on conflict(code) do update set title=excluded.title,description=excluded.description,coin_reward=excluded.coin_reward,validation_type=excluded.validation_type,sort_order=excluded.sort_order,category=excluded.category,claim_mode=excluded.claim_mode,frequency=excluded.frequency,max_claims=excluded.max_claims,max_per_day=excluded.max_per_day,max_per_week=excluded.max_per_week,max_per_month=excluded.max_per_month;

update public.btv_coin_products set featured=true,benefit_summary=coalesce(benefit_summary,description),usage_terms=coalesce(usage_terms,'One entitlement per confirmed redemption. Usage and refund rules are shown before purchase.'),display_order=case when code like '%_short' then 10 else 20 end where category='mock';

insert into public.btv_coin_challenges(code,name,description,cadence,metric_code,target,coin_reward,starts_at,ends_at,status) values
 ('profile-foundation-2026','Complete your professional profile','Finish onboarding so recommendations and rewards match your pathway.','campaign','profile_complete',1,100,'2026-07-01','2027-01-01','active'),
 ('weekly-learning-2026w31','Complete one learning activity','Finish one recorded learning activity this week.','weekly','learning_activities',1,40,'2026-07-27','2026-08-03','active'),
 ('journey-five-2026','Complete five journey tasks','Complete five meaningful pathway milestones.','campaign','journey_tasks',5,100,'2026-07-01','2027-01-01','active')
on conflict(code) do nothing;

-- Notify only material coin events to avoid notification noise.
create or replace function public.btv_coin_notification_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='completed' and (abs(new.amount)>=25 or new.transaction_type in ('refund','released','challenge_reward','referral_reward','expiry')) then
    insert into public.btv_notifications(user_id,category,title,body,action_url,dedupe_key)
    values(new.user_id,'beyond_coins',case when new.amount>0 then 'Beyond Coins added' else 'Beyond Coins used' end,
      case when new.amount>0 then format('%s Beyond Coins were added to your available balance.',new.amount) else format('%s Beyond Coins were deducted from your available balance.',abs(new.amount)) end,
      '?screen=wallet','coin-transaction:'||new.id::text)
    on conflict(user_id,dedupe_key) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists btv_coin_notification on public.btv_wallet_transactions;
create trigger btv_coin_notification after insert on public.btv_wallet_transactions for each row execute function public.btv_coin_notification_trigger();
revoke all on function public.btv_coin_notification_trigger() from public,anon,authenticated;

-- Reconciliation snapshot for rollback evidence. This does not mutate balances.
create table if not exists public.btv_coin_migration_reconciliation_v178(
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_before integer not null,
  ledger_balance integer not null,
  reconciled boolean not null,
  captured_at timestamptz not null default now()
);
alter table public.btv_coin_migration_reconciliation_v178 enable row level security;
create policy "admins read coin migration reconciliation" on public.btv_coin_migration_reconciliation_v178 for select to authenticated using(public.btv_is_admin());
revoke all on public.btv_coin_migration_reconciliation_v178 from anon,authenticated;
grant select on public.btv_coin_migration_reconciliation_v178 to authenticated;
insert into public.btv_coin_migration_reconciliation_v178(user_id,balance_before,ledger_balance,reconciled)
select w.user_id,w.balance,coalesce(sum(t.amount) filter(where t.status='completed'),0)::integer,w.balance=coalesce(sum(t.amount) filter(where t.status='completed'),0)
from public.btv_wallets w left join public.btv_wallet_transactions t on t.user_id=w.user_id group by w.user_id,w.balance
on conflict(user_id) do update set balance_before=excluded.balance_before,ledger_balance=excluded.ledger_balance,reconciled=excluded.reconciled,captured_at=now();

-- Rollback: disable new challenge/campaign records and remove v178 triggers/functions only.
-- Do not drop columns or tables during rollback; they contain ledger and audit evidence.
