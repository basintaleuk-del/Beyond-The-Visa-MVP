-- Phase 5: secure, server-authoritative IELTS section unlocks.
do $$ begin
  alter table public.btv_coin_transactions drop constraint if exists btv_coin_transactions_type_check;
  alter table public.btv_coin_transactions add constraint btv_coin_transactions_type_check
    check (type in ('purchase','reward','spend','refund','admin_adjustment','learning_unlock'));
exception when undefined_table then null; end $$;

create table if not exists public.btv_learning_unlock_catalog (
  code text primary key,
  module text not null,
  section text not null,
  title text not null,
  coin_cost integer not null check (coin_cost > 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_user_learning_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  unlock_code text not null references public.btv_learning_unlock_catalog(code),
  coin_cost integer not null check (coin_cost > 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, unlock_code)
);

insert into public.btv_learning_unlock_catalog(code,module,section,title,coin_cost)
values
  ('ielts_reading','ielts','reading','IELTS Academic Reading',100),
  ('ielts_writing','ielts','writing','IELTS Academic Writing',100)
on conflict (code) do update set title=excluded.title, module=excluded.module, section=excluded.section;

alter table public.btv_learning_unlock_catalog enable row level security;
alter table public.btv_user_learning_unlocks enable row level security;
drop policy if exists "catalog readable" on public.btv_learning_unlock_catalog;
create policy "catalog readable" on public.btv_learning_unlock_catalog for select using (is_active);
drop policy if exists "own learning unlocks readable" on public.btv_user_learning_unlocks;
create policy "own learning unlocks readable" on public.btv_user_learning_unlocks for select using (auth.uid()=user_id);

create or replace function public.btv_unlock_learning(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid := auth.uid(); v_cost integer; v_balance integer; v_title text;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if exists(select 1 from btv_user_learning_unlocks where user_id=v_user and unlock_code=p_code) then
    select balance into v_balance from btv_coin_wallets where user_id=v_user;
    return jsonb_build_object('unlocked',true,'already_unlocked',true,'balance',coalesce(v_balance,0));
  end if;
  select coin_cost,title into v_cost,v_title from btv_learning_unlock_catalog where code=p_code and is_active;
  if v_cost is null then raise exception 'This learning section is not available'; end if;
  insert into btv_coin_wallets(user_id,balance,lifetime_earned,lifetime_spent) values(v_user,0,0,0)
    on conflict(user_id) do nothing;
  select balance into v_balance from btv_coin_wallets where user_id=v_user for update;
  if v_balance < v_cost then raise exception 'You need % Beyond Coins to unlock this section',v_cost; end if;
  update btv_coin_wallets set balance=balance-v_cost,lifetime_spent=lifetime_spent+v_cost,updated_at=now()
    where user_id=v_user returning balance into v_balance;
  insert into btv_user_learning_unlocks(user_id,unlock_code,coin_cost) values(v_user,p_code,v_cost);
  insert into btv_coin_transactions(user_id,type,amount,balance_after,description,reference)
    values(v_user,'learning_unlock',-v_cost,v_balance,'Unlocked '||v_title,'learning:'||p_code);
  return jsonb_build_object('unlocked',true,'already_unlocked',false,'balance',v_balance,'cost',v_cost);
end $$;
revoke all on function public.btv_unlock_learning(text) from public;
grant execute on function public.btv_unlock_learning(text) to authenticated;

