-- Beyond Coins v112 follow-up: explicit Data API grants and audited pricing.
create or replace function public.btv_admin_set_product_price(p_product_code text,p_coin_price integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); prod btv_coin_products%rowtype;
begin
 if not btv_is_admin() then raise exception 'Administrator access required'; end if;
 if p_coin_price<0 or nullif(trim(p_reason),'') is null then raise exception 'A valid price and reason are required'; end if;
 select * into prod from btv_coin_products where code=p_product_code for update;
 if not found then raise exception 'Product not found'; end if;
 update btv_coin_products set coin_price=p_coin_price,updated_at=now() where id=prod.id;
 insert into btv_admin_coin_audit(admin_id,action,previous_value,new_value,reason,reference)
 values(admin_uid,'product_price_change',jsonb_build_object('code',prod.code,'coin_price',prod.coin_price),jsonb_build_object('code',prod.code,'coin_price',p_coin_price),p_reason,prod.id::text);
 return jsonb_build_object('success',true,'product_code',prod.code,'previous_price',prod.coin_price,'coin_price',p_coin_price);
end $$;

drop policy if exists "admins manage coin products" on public.btv_coin_products;
drop policy if exists "admins manage wallet alerts" on public.btv_wallet_alerts;
create policy "admins manage coin products" on public.btv_coin_products for all to authenticated using(btv_is_admin()) with check(btv_is_admin());
create policy "admins manage wallet alerts" on public.btv_wallet_alerts for update to authenticated using(btv_is_admin()) with check(btv_is_admin());

grant insert,update,delete on public.btv_coin_products to authenticated;
grant update on public.btv_wallet_alerts to authenticated;
revoke all on function public.btv_purchase_resource(text,text),public.btv_start_entitled_mock(uuid),public.btv_admin_adjust_coins(uuid,integer,text,text,text,text),public.btv_admin_set_product_price(text,integer,text),public.btv_use_free_practice(text) from public,anon;
grant execute on function public.btv_purchase_resource(text,text),public.btv_start_entitled_mock(uuid),public.btv_admin_adjust_coins(uuid,integer,text,text,text,text),public.btv_admin_set_product_price(text,integer,text),public.btv_use_free_practice(text) to authenticated;
