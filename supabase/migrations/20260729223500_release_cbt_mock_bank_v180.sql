-- CBT free practice already circulates every non-rejected original sample while
-- visibly labelling its review state. Apply the same eligibility rule to generic
-- paid CBT mocks without marking unreviewed content as clinically approved.
create or replace function public.btv_start_paid_exam(p_product_code text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_user uuid:=auth.uid(); v_product btv_mock_catalog%rowtype; v_wallet btv_wallets%rowtype;
 v_attempt btv_exam_attempts%rowtype; v_ids text[]; v_attempt_id uuid; v_tx_id uuid;
 v_before integer; v_after integer; v_source text; v_sql text; v_section text;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 if nullif(trim(p_idempotency_key),'') is null then raise exception using message='EXAM_START_FAILED: idempotency key required'; end if;
 perform btv_bootstrap_user(v_user);
 select * into v_product from btv_mock_catalog where code=p_product_code;
 if not found then raise exception using message='PRODUCT_NOT_FOUND'; end if;
 if not v_product.is_active then raise exception using message='PRODUCT_INACTIVE'; end if;
 if coalesce(v_product.question_count,0)<=0 or coalesce(v_product.duration_minutes,0)<=0 then raise exception using message='PRODUCT_INACTIVE: product requires question count and duration'; end if;
 select * into v_attempt from btv_exam_attempts where user_id=v_user and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 select * into v_attempt from btv_exam_attempts where user_id=v_user and exam_product_id=v_product.id and status='active' order by created_at desc limit 1;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 v_source:=coalesce(v_product.question_source,''); v_section:=coalesce(v_product.section,v_product.mock_category);
 if v_source not in ('cbt_questions','nclex_questions','btv_exam_questions','btv_numeracy_questions') then raise exception using message='QUESTION_BANK_INCOMPLETE: invalid question source'; end if;
 if to_regclass('public.'||v_source) is null then raise exception using message='QUESTION_BANK_INCOMPLETE: source table is missing'; end if;
 select array_agg(question_id order by display_order,question_id) into v_ids from (select question_id,display_order from btv_exam_product_questions where exam_product_id=v_product.id and is_active order by display_order,question_id limit v_product.question_count) mapped;
 if v_product.code like 'adult_nursing_%' and coalesce(array_length(v_ids,1),0)=0 then raise exception using message='QUESTION_BANK_INCOMPLETE: Adult Nursing products require explicit reviewed question mappings'; end if;
 if coalesce(array_length(v_ids,1),0)=0 then
   if v_source='cbt_questions' then
     select array_agg(id::text) into v_ids from (select id from public.cbt_questions where coalesce(quality_status,'')<>'rejected' order by random() limit v_product.question_count) q;
   elsif v_source='btv_exam_questions' then
     v_sql:=format('select array_agg(id::text) from (select id from public.%I where is_active=true and lower(exam_type)=lower($1) and ($2='''' or section is null or lower(section)=lower($2)) order by random() limit $3) q',v_source);
     execute v_sql into v_ids using v_product.exam_type,v_section,v_product.question_count;
   else
     v_sql:=format('select array_agg(id::text) from (select id from public.%I where is_active=true order by random() limit $1) q',v_source);
     execute v_sql into v_ids using v_product.question_count;
   end if;
 end if;
 if coalesce(array_length(v_ids,1),0)<>v_product.question_count then raise exception using message=format('QUESTION_BANK_INCOMPLETE: requires %s eligible questions, found %s',v_product.question_count,coalesce(array_length(v_ids,1),0)); end if;
 select * into v_wallet from btv_wallets where user_id=v_user for update;
 if v_wallet.balance<v_product.coin_cost then raise exception using message=format('INSUFFICIENT_COINS:%s:%s',v_product.coin_cost,v_wallet.balance); end if;
 v_before:=v_wallet.balance; v_after:=v_before-v_product.coin_cost;
 insert into btv_exam_attempts(user_id,exam_product_id,idempotency_key,status,question_source,question_ids,expires_at,total_questions,coin_price_paid) values(v_user,v_product.id,p_idempotency_key,'active',v_source,to_jsonb(v_ids),now()+make_interval(mins=>v_product.duration_minutes),v_product.question_count,v_product.coin_cost) returning id into v_attempt_id;
 insert into btv_exam_attempt_questions(attempt_id,question_id,display_order) select v_attempt_id,x.id,x.ord::integer from unnest(v_ids) with ordinality x(id,ord);
 update btv_wallets set balance=v_after,lifetime_spent=lifetime_spent+v_product.coin_cost,updated_at=now() where user_id=v_user;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,reference_type,reference_id,source_id_text,description,idempotency_key,metadata) values(v_user,v_user,-v_product.coin_cost,v_before,v_after,'exam_charge','exam_purchase','exam_attempt',v_attempt_id,v_attempt_id::text,v_product.title,'exam:'||v_attempt_id,jsonb_build_object('product_code',v_product.code,'question_count',v_product.question_count,'duration_minutes',v_product.duration_minutes)) returning id into v_tx_id;
 update btv_exam_attempts set wallet_transaction_id=v_tx_id where id=v_attempt_id;
 return jsonb_build_object('attempt_id',v_attempt_id,'resumed',false,'balance',v_after,'coin_price',v_product.coin_cost,'duration_minutes',v_product.duration_minutes,'question_count',v_product.question_count);
exception when unique_violation then
 select * into v_attempt from btv_exam_attempts where user_id=v_user and (idempotency_key=p_idempotency_key or (exam_product_id=v_product.id and status='active')) order by created_at desc limit 1;
 if found then return jsonb_build_object('attempt_id',v_attempt.id,'resumed',true,'balance',(select balance from btv_wallets where user_id=v_user),'coin_price',v_attempt.coin_price_paid,'duration_minutes',v_product.duration_minutes,'question_count',v_attempt.total_questions); end if;
 raise;
end $$;

revoke all on function public.btv_start_paid_exam(text,text) from public,anon;
grant execute on function public.btv_start_paid_exam(text,text) to authenticated,service_role;
