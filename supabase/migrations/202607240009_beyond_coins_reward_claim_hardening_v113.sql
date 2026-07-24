-- Reward claims mutate a member wallet and must never be callable anonymously.
revoke all on function public.btv_claim_coin_opportunity(text) from public, anon;
grant execute on function public.btv_claim_coin_opportunity(text) to authenticated;
