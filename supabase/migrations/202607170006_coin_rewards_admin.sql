drop policy if exists coin_packages_admin on public.btv_coin_packages;
create policy coin_packages_admin on public.btv_coin_packages for all using(public.btv_is_admin()) with check(public.btv_is_admin());
drop policy if exists coin_opportunities_admin on public.btv_coin_opportunities;
create policy coin_opportunities_admin on public.btv_coin_opportunities for all using(public.btv_is_admin()) with check(public.btv_is_admin());
grant insert,update,delete on public.btv_coin_packages,public.btv_coin_opportunities to authenticated;

create or replace function public.btv_claim_coin_opportunity(p_code text)
returns integer language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); opportunity public.btv_coin_opportunities%rowtype; eligible boolean:=false; new_balance integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into opportunity from public.btv_coin_opportunities where code=p_code and is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now());
 if not found then raise exception 'Opportunity unavailable'; end if;
 if opportunity.validation_type='profile_complete' then select count(*)>0 into eligible from public.profiles where id=uid;
 elsif opportunity.validation_type='first_mock' then select exists(select 1 from public.btv_mock_sessions where user_id=uid and status='completed') into eligible;
 elsif opportunity.validation_type='study_streak' then select coalesce(current_streak,0)>=7 into eligible from public.btv_gamification where user_id=uid;
 elsif opportunity.validation_type='journey_percent' then select coalesce(count(*) filter(where p.completed),0)*100>=greatest(count(*),1)*50 into eligible from public.btv_journey_steps s left join public.btv_user_journey_progress p on p.step_code=s.code and p.user_id=uid where s.is_active;
 end if;
 if not eligible then raise exception 'Complete this activity before claiming the reward'; end if;
 insert into public.btv_coin_rewards(user_id,opportunity_code,coin_amount,evidence) values(uid,p_code,opportunity.coin_reward,jsonb_build_object('validated_at',now())) on conflict(user_id,opportunity_code) do nothing;
 if not found then select balance into new_balance from public.btv_wallets where user_id=uid; return new_balance; end if;
 perform public.btv_bootstrap_user(uid);update public.btv_wallets set balance=balance+opportunity.coin_reward,lifetime_earned=lifetime_earned+opportunity.coin_reward,updated_at=now() where user_id=uid returning balance into new_balance;
 insert into public.btv_wallet_transactions(user_id,amount,balance_after,transaction_type,description,reference_type,idempotency_key) values(uid,opportunity.coin_reward,new_balance,'reward',opportunity.title,'coin_opportunity','reward:'||p_code) on conflict(user_id,idempotency_key) do nothing;
 return new_balance;
end $$;
grant execute on function public.btv_claim_coin_opportunity(text) to authenticated;
