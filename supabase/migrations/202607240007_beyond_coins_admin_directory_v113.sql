-- Permission-protected member directory for wallet search; auth email never comes from a client table.
create or replace function public.btv_admin_coin_users()
returns table(user_id uuid,email text,full_name text,profession text,destination text,wallet_id uuid,balance integer,wallet_status text)
language sql security definer stable set search_path=public,auth as $$
 select u.id,u.email,p.full_name,p.profession,p.destination,w.user_id,w.balance,w.wallet_status
 from auth.users u left join public.profiles p on p.id=u.id left join public.btv_wallets w on w.user_id=u.id
 where public.btv_has_admin_permission('view_wallets')
 order by coalesce(p.full_name,u.email,u.id::text)
$$;
revoke all on function public.btv_admin_coin_users() from public,anon;
grant execute on function public.btv_admin_coin_users() to authenticated;
