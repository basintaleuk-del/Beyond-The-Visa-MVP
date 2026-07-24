-- Audited catalogue, package and reward administration.
create or replace function public.btv_admin_update_product(p_code text,p_patch jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); old_row btv_coin_products%rowtype; new_row btv_coin_products%rowtype;
begin
 if not btv_has_admin_permission('manage_products_and_prices') then raise exception 'Product management permission required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
 select * into old_row from btv_coin_products where code=p_code for update; if not found then raise exception 'Product not found'; end if;
 update btv_coin_products set
  name=coalesce(nullif(p_patch->>'name',''),name),category=coalesce(nullif(p_patch->>'category',''),category),
  coin_price=coalesce((p_patch->>'coin_price')::integer,coin_price),access_type=coalesce(nullif(p_patch->>'access_type',''),access_type),
  duration_minutes=coalesce((p_patch->>'duration_minutes')::integer,duration_minutes),question_count=coalesce((p_patch->>'question_count')::integer,question_count),
  attempts=coalesce((p_patch->>'attempts')::integer,attempts),expiry_days=coalesce((p_patch->>'expiry_days')::integer,expiry_days),
  is_active=coalesce((p_patch->>'is_active')::boolean,is_active),featured=coalesce((p_patch->>'featured')::boolean,featured),
  description=coalesce(p_patch->>'description',description),linked_route=coalesce(nullif(p_patch->>'linked_route',''),linked_route),
  linked_resource=coalesce(nullif(p_patch->>'linked_resource',''),linked_resource),refund_eligible=coalesce((p_patch->>'refund_eligible')::boolean,refund_eligible),
  promotional_price=coalesce((p_patch->>'promotional_price')::integer,promotional_price),
  promotion_starts_at=coalesce((p_patch->>'promotion_starts_at')::timestamptz,promotion_starts_at),promotion_ends_at=coalesce((p_patch->>'promotion_ends_at')::timestamptz,promotion_ends_at),updated_at=now()
 where code=p_code returning * into new_row;
 insert into btv_admin_coin_audit(admin_id,action,previous_value,new_value,reason,reference) values(admin_uid,'product_update',to_jsonb(old_row),to_jsonb(new_row),p_reason,old_row.id::text);
 return to_jsonb(new_row);
end $$;

create or replace function public.btv_admin_upsert_coin_package(p_id uuid,p_patch jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); old_value jsonb:='{}'; new_row btv_coin_packages%rowtype;
begin
 if not btv_has_admin_permission('manage_coin_packages') then raise exception 'Coin package permission required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
 if p_id is null then
  insert into btv_coin_packages(code,title,coin_amount,price_minor,currency,bonus_coins,is_active,sort_order,provider_product_reference,promotional_label,starts_at,ends_at)
  values(p_patch->>'code',p_patch->>'title',(p_patch->>'coin_amount')::integer,(p_patch->>'price_minor')::integer,upper(coalesce(p_patch->>'currency','GBP')),coalesce((p_patch->>'bonus_coins')::integer,0),coalesce((p_patch->>'is_active')::boolean,true),coalesce((p_patch->>'sort_order')::integer,0),p_patch->>'provider_product_reference',p_patch->>'promotional_label',(p_patch->>'starts_at')::timestamptz,(p_patch->>'ends_at')::timestamptz) returning * into new_row;
 else
  select to_jsonb(x) into old_value from btv_coin_packages x where id=p_id for update; if old_value is null then raise exception 'Package not found'; end if;
  update btv_coin_packages set title=coalesce(nullif(p_patch->>'title',''),title),coin_amount=coalesce((p_patch->>'coin_amount')::integer,coin_amount),price_minor=coalesce((p_patch->>'price_minor')::integer,price_minor),currency=upper(coalesce(nullif(p_patch->>'currency',''),currency)),bonus_coins=coalesce((p_patch->>'bonus_coins')::integer,bonus_coins),is_active=coalesce((p_patch->>'is_active')::boolean,is_active),sort_order=coalesce((p_patch->>'sort_order')::integer,sort_order),provider_product_reference=coalesce(p_patch->>'provider_product_reference',provider_product_reference),promotional_label=coalesce(p_patch->>'promotional_label',promotional_label),starts_at=coalesce((p_patch->>'starts_at')::timestamptz,starts_at),ends_at=coalesce((p_patch->>'ends_at')::timestamptz,ends_at),updated_at=now() where id=p_id returning * into new_row;
 end if;
 insert into btv_admin_coin_audit(admin_id,action,previous_value,new_value,reason,reference) values(admin_uid,'coin_package_upsert',old_value,to_jsonb(new_row),p_reason,new_row.id::text);
 return to_jsonb(new_row);
end $$;

create or replace function public.btv_admin_update_reward_rule(p_code text,p_patch jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare admin_uid uuid:=auth.uid(); old_row btv_coin_opportunities%rowtype; new_row btv_coin_opportunities%rowtype;
begin
 if not btv_has_admin_permission('manage_reward_rules') then raise exception 'Reward rule permission required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
 select * into old_row from btv_coin_opportunities where code=p_code for update; if not found then raise exception 'Reward rule not found'; end if;
 update btv_coin_opportunities set title=coalesce(nullif(p_patch->>'title',''),title),description=coalesce(p_patch->>'description',description),coin_reward=coalesce((p_patch->>'coin_reward')::integer,coin_reward),validation_type=coalesce(nullif(p_patch->>'validation_type',''),validation_type),validation_config=coalesce(p_patch->'validation_config',validation_config),is_active=coalesce((p_patch->>'is_active')::boolean,is_active),starts_at=coalesce((p_patch->>'starts_at')::timestamptz,starts_at),ends_at=coalesce((p_patch->>'ends_at')::timestamptz,ends_at),max_claims=coalesce((p_patch->>'max_claims')::integer,max_claims),frequency=coalesce(p_patch->>'frequency',frequency),reward_expiry_days=coalesce((p_patch->>'reward_expiry_days')::integer,reward_expiry_days),anti_abuse_config=coalesce(p_patch->'anti_abuse_config',anti_abuse_config) where code=p_code returning * into new_row;
 insert into btv_admin_coin_audit(admin_id,action,previous_value,new_value,reason,reference) values(admin_uid,'reward_rule_update',to_jsonb(old_row),to_jsonb(new_row),p_reason,p_code);
 return to_jsonb(new_row);
end $$;

revoke all on function public.btv_admin_update_product(text,jsonb,text),public.btv_admin_upsert_coin_package(uuid,jsonb,text),public.btv_admin_update_reward_rule(text,jsonb,text) from public,anon;
grant execute on function public.btv_admin_update_product(text,jsonb,text),public.btv_admin_upsert_coin_package(uuid,jsonb,text),public.btv_admin_update_reward_rule(text,jsonb,text) to authenticated;
