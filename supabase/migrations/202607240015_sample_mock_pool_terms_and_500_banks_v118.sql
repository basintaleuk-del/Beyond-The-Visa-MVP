-- Expose every non-rejected question through clearly labelled sample mocks,
-- record a versioned user acknowledgement, and add 500 further original
-- blueprint-aligned sample items to each CBT, NCLEX-RN and IELTS bank.

create table if not exists public.btv_exam_sample_acceptances(
 user_id uuid not null references auth.users(id) on delete cascade,
 terms_version text not null,
 terms_text_hash text not null,
 accepted_at timestamptz not null default now(),
 primary key(user_id,terms_version)
);
alter table public.btv_exam_sample_acceptances enable row level security;
drop policy if exists "users read own sample acceptances" on public.btv_exam_sample_acceptances;
drop policy if exists "users record own sample acceptances" on public.btv_exam_sample_acceptances;
create policy "users read own sample acceptances" on public.btv_exam_sample_acceptances for select to authenticated
 using((select auth.uid())=user_id);
create policy "users record own sample acceptances" on public.btv_exam_sample_acceptances for insert to authenticated
 with check((select auth.uid())=user_id);
grant select,insert on public.btv_exam_sample_acceptances to authenticated;

create or replace function public.btv_accept_sample_mock_terms()
returns jsonb language plpgsql security invoker set search_path=public as $$
declare uid uuid:=(select auth.uid()); version constant text:='2026-07-24-sample-mocks-v1';
begin
 if uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED'); end if;
 insert into public.btv_exam_sample_acceptances(user_id,terms_version,terms_text_hash,accepted_at)
 values(uid,version,md5('Original unofficial sample questions; not official exam questions; not clinically reviewed; educational guidance only; never replaces official materials, professional training, local policy or clinical judgement.'),now())
 on conflict(user_id,terms_version) do update set terms_text_hash=excluded.terms_text_hash,accepted_at=excluded.accepted_at;
 return jsonb_build_object('success',true,'terms_version',version,'accepted_at',now());
end $$;
revoke all on function public.btv_accept_sample_mock_terms() from public,anon;
grant execute on function public.btv_accept_sample_mock_terms() to authenticated;

-- Fifty existing v117 clinical cases receive ten new, independently worded
-- assessment objectives. This expands coverage without cosmetic stem renaming.
with source_rows as (
 select row_number() over(order by question_text) topic_no,subject,profession,blueprint_domain,
  (regexp_match(question_text,'possible (.+) develops (.+)\. What should','i'))[1] topic,
  (regexp_match(question_text,'possible (.+) develops (.+)\. What should','i'))[2] cue,
  (regexp_match(explanation,'safest response is to (.+)\. It requires','i'))[1] priority_action
 from public.cbt_questions
 where question_text like '[BTV-CBT-SAMPLE-V117-%'
   and ((substring(question_text from 'V117-([0-9]{4})')::integer-1)%10)=0
   and quality_status<>'rejected'
 order by question_text limit 50
), competencies(no,label) as (values
 (1,'baseline assessment'),(2,'preparation for intervention'),(3,'monitoring response'),(4,'recognising recurrence'),(5,'safe transfer'),
 (6,'patient involvement'),(7,'failed-plan escalation'),(8,'preference documentation'),(9,'team briefing'),(10,'safety-netting')
), generated as (
 select s.*,c.no,c.label,
  case c.no
   when 1 then format('Before implementing urgent care for %s, which baseline information is most important to obtain without delaying treatment?',topic)
   when 2 then format('Which preparation best supports safe implementation of the priority response to %s?',topic)
   when 3 then format('Which monitoring plan best evaluates the immediate response to care for %s?',topic)
   when 4 then format('After initial stabilisation of %s, which change most strongly suggests recurrence or deterioration?',topic)
   when 5 then format('Which action is essential when transferring a patient recently treated for %s?',topic)
   when 6 then format('How should the nurse involve the patient or carer in the immediate plan for %s?',topic)
   when 7 then format('The first response to %s has not improved the patient. What should the nurse do next?',topic)
   when 8 then format('Which documentation best records the patient''s preferences during care for %s?',topic)
   when 9 then format('Which team briefing best supports coordinated care for %s?',topic)
   else format('Which safety-netting advice is most appropriate after a patient has been treated for %s?',topic) end question_text,
  case c.no
   when 1 then format('Record the onset and trend of %s with relevant observations while urgent care proceeds',cue)
   when 2 then format('Confirm prescriptions, equipment, monitoring and roles needed to %s',priority_action)
   when 3 then 'Repeat the relevant objective observations at an appropriate frequency and compare them with baseline'
   when 4 then cue
   when 5 then 'Give a structured handover of the event, interventions, response, outstanding risks and monitoring plan'
   when 6 then 'Explain what is happening in accessible language, check understanding and respect valid preferences'
   when 7 then format('Repeat a structured assessment, call for more senior help and escalate the need to %s',priority_action)
   when 8 then 'Record the discussion, information provided, questions, decision, capacity or consent considerations and agreed plan'
   when 9 then format('State the concern about %s, current findings, roles, immediate plan and reassessment point',topic)
   else format('Seek urgent help if %s returns, worsens or is accompanied by any new concern',cue) end correct_text
 from source_rows s cross join competencies c
), positioned as (
 select g.*,((topic_no+no*3)%4)pos,
  'Delay reassessment until the next routine shift handover' d1,
  'Rely on a relative to decide whether clinical escalation is required' d2,
  'Document that the patient is stable without recording objective evidence' d3 from generated g
)
insert into public.cbt_questions
 (profession,subject,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,
  access_level,is_active,question_type,review_status,standard_version,blueprint_domain,quality_status,content_kind,
  semantic_hash,source_hash,source_reference)
select profession,subject,case (topic_no+no)%3 when 0 then 'easy' when 1 then 'medium' else 'hard' end,
 format('[BTV-CBT-SAMPLE-V118-%s] %s',lpad(((topic_no-1)*10+no)::text,4,'0'),question_text),
 case pos when 0 then correct_text else d1 end,case pos when 1 then correct_text when 0 then d1 else d2 end,
 case pos when 2 then correct_text when 3 then d3 else d2 end,case pos when 3 then correct_text else d3 end,chr((65+pos)::integer),
 format('This original sample assesses %s for %s. The best response is: %s. It is structurally validated but requires qualified clinical review.',label,topic,correct_text),
 'free',false,'single','sample_unreviewed','Unofficial sample aligned to the NMC Test of Competence 2021 blueprint',blueprint_domain,
 'needs_clinical_review','unofficial_sample',public.btv_question_semantic_key(question_text),md5('cbt-v118|'||question_text),
 'https://www.nmc.org.uk/registration/joining-the-register/toc/toc-nursing-and-midwifery/resources/'
from positioned p
where not exists(select 1 from public.cbt_questions q where q.semantic_hash=public.btv_question_semantic_key(p.question_text) and q.quality_status<>'rejected');

with source_rows as (
 select row_number() over(order by question_text) topic_no,category,client_need,blueprint_domain,
  (regexp_match(question_text,'possible (.+) develops (.+)\. Which action','i'))[1] topic,
  (regexp_match(question_text,'possible (.+) develops (.+)\. Which action','i'))[2] cue,
  (regexp_match(rationale,'best response is to (.+)\. It remains','i'))[1] priority_action
 from public.nclex_questions
 where question_text like '[BTV-NCLEX-SAMPLE-V117-%'
   and ((substring(question_text from 'V117-([0-9]{4})')::integer-1)%10)=0
   and quality_status<>'rejected'
 order by question_text limit 50
), competencies(no,label) as (values
 (1,'baseline data'),(2,'intervention preparation'),(3,'response monitoring'),(4,'recurrence recognition'),(5,'continuity of care'),
 (6,'client participation'),(7,'escalation'),(8,'preference documentation'),(9,'interprofessional communication'),(10,'return precautions')
), generated as (
 select s.*,c.no,c.label,
  case c.no
   when 1 then format('Before urgent treatment for %s, which baseline data should the nurse obtain without delaying care?',topic)
   when 2 then format('Which preparation is most important before the planned intervention for %s?',topic)
   when 3 then format('Which monitoring plan best evaluates a client''s response to treatment for %s?',topic)
   when 4 then format('Which finding after initial stabilisation of %s requires immediate follow-up?',topic)
   when 5 then format('Which action best maintains continuity when transferring a client treated for %s?',topic)
   when 6 then format('Which nursing action best supports client participation during care for %s?',topic)
   when 7 then format('Initial interventions for %s have not improved the client. Which action is the priority?',topic)
   when 8 then format('Which entry best documents a client''s preferences during treatment for %s?',topic)
   when 9 then format('Which interprofessional update best coordinates care for %s?',topic)
   else format('Which return precaution is most important after treatment for %s?',topic) end question_text,
  case c.no
   when 1 then format('Document onset and trends in %s with relevant objective data while treatment proceeds',cue)
   when 2 then format('Verify prescriptions, equipment, monitoring and roles required to %s',priority_action)
   when 3 then 'Repeat relevant objective measurements at the indicated frequency and compare them with baseline'
   when 4 then cue
   when 5 then 'Provide a structured report of findings, interventions, response, unresolved risks and monitoring needs'
   when 6 then 'Explain the immediate plan, check understanding and incorporate informed preferences when safe'
   when 7 then format('Reassess, activate a higher level of support and escalate the need to %s',priority_action)
   when 8 then 'Chart the information given, client questions, decision, consent considerations and agreed plan'
   when 9 then format('Report concern for %s, current assessment, completed interventions, response and requested next action',topic)
   else format('Seek immediate care if %s recurs, worsens or is joined by a new symptom',cue) end correct_text
 from source_rows s cross join competencies c
), positioned as (
 select g.*,((topic_no*2+no)%4)pos,'Wait until the next scheduled assessment' d1,
  'Ask the family to determine whether the change is urgent' d2,'Record stability without objective findings' d3 from generated g
)
insert into public.nclex_questions
 (exam,category,client_need,difficulty,question_type,question_text,option_a,option_b,option_c,option_d,option_e,option_f,
  correct_options,rationale,test_strategy,access_level,is_active,review_status,standard_version,blueprint_domain,
  quality_status,content_kind,semantic_hash,source_hash,source_reference)
select 'NCLEX-RN',category,client_need,case (topic_no+no)%3 when 0 then 'easy' when 1 then 'medium' else 'hard' end,'single',
 format('[BTV-NCLEX-SAMPLE-V118-%s] %s',lpad(((topic_no-1)*10+no)::text,4,'0'),question_text),
 case pos when 0 then correct_text else d1 end,case pos when 1 then correct_text when 0 then d1 else d2 end,
 case pos when 2 then correct_text when 3 then d3 else d2 end,case pos when 3 then correct_text else d3 end,null,null,array[chr((65+pos)::integer)],
 format('This original sample assesses %s for %s. The best response is: %s. It is structurally validated but requires qualified clinical review.',label,topic,correct_text),
 'Use clinical judgment, priority frameworks and reassessment.','free',false,'sample_unreviewed',
 'Unofficial sample aligned to the NCSBN 2026 NCLEX-RN Test Plan',blueprint_domain,'needs_clinical_review','unofficial_sample',
 public.btv_question_semantic_key(question_text),md5('nclex-v118|'||question_text),
 'https://www.ncsbn.org/publications/2026-nclex-rn-test-plan'
from positioned p
where not exists(select 1 from public.nclex_questions q where q.semantic_hash=public.btv_question_semantic_key(p.question_text) and q.quality_status<>'rejected');

with source_sets as (
 select distinct on (metadata->>'set_number') row_number() over(order by (metadata->>'set_number')::integer) topic_no,
  metadata->>'topic' topic,metadata->>'passage' passage,metadata->>'set_number' set_number
 from public.btv_exam_questions
 where question_text like '[BTV-IELTS-SAMPLE-V117-%' and review_status<>'rejected'
 order by metadata->>'set_number',id limit 50
), tasks(no,task_type,question_text,answer,options) as (values
 (1,'short_answer','In what year did the project begin?','__YEAR__','[]'::jsonb),
 (2,'short_answer','How many neighbourhoods supplied participants?','three','[]'::jsonb),
 (3,'sentence_completion','Participants in one group received ______ reminders.','fortnightly','[]'::jsonb),
 (4,'true_false_not_given','The information-only group continued improving throughout the study.','False','["True","False","Not Given"]'::jsonb),
 (5,'multiple_choice','Why were self-reported diaries used?','To record activities that could not be directly observed','["To record activities that could not be directly observed","To replace every independent measurement","To calculate the financial cost","To recruit participants"]'::jsonb),
 (6,'true_false_not_given','The study included communities outside the region.','False','["True","False","Not Given"]'::jsonb),
 (7,'yes_no_not_given','The authors recommended a longer multi-region trial.','Yes','["Yes","No","Not Given"]'::jsonb),
 (8,'sentence_completion','______ was not associated with completion.','Age','[]'::jsonb),
 (9,'multiple_choice','What did the second participant group receive?','Written information only','["Written information only","Two workshops and reminders","A cash payment","No project material"]'::jsonb),
 (10,'summary_completion','The team collected attendance records and independent ______.','measurements','[]'::jsonb)
), generated as (
 select s.*,t.no,t.task_type,t.question_text,replace(t.answer,'__YEAR__',(regexp_match(s.passage,'In ([0-9]{4}),'))[1]) answer,t.options
 from source_sets s cross join tasks t
)
insert into public.btv_exam_questions
 (exam_type,section,question_text,options,correct_answer,explanation,metadata,is_active,content_kind,semantic_hash,review_status,source_reference)
select 'ielts','reading',format('[BTV-IELTS-SAMPLE-V118-%s] %s [Project: %s]',lpad(((topic_no-1)*10+no)::text,4,'0'),question_text,topic),
 options,to_jsonb(answer),'The answer is stated, contradicted or not supplied by the original passage. Follow the task instructions and word limit.',
 jsonb_build_object('task_type',task_type,'set_number',200+topic_no,'source_set',set_number,'topic',topic,'passage',passage,
  'sample_label','Original unofficial IELTS Academic sample','editorial_status','sample_unreviewed','validation','structure_and_answer_key_checked'),
 false,'unofficial_sample',md5(lower(question_text||'|'||topic||'|v118')),'sample_unreviewed',
 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test'
from generated g
where not exists(select 1 from public.btv_exam_questions q where lower(q.exam_type)='ielts' and q.semantic_hash=md5(lower(g.question_text||'|'||g.topic||'|v118')));

-- Paid sample mocks draw from every non-rejected item, regardless of clinical
-- review status. Review status is preserved and never upgraded by this migration.
create or replace function public.btv_purchase_resource(p_product_code text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); prod btv_coin_products%rowtype; w btv_wallets%rowtype; ent btv_entitlements%rowtype; cat btv_mock_catalog%rowtype; rule btv_currency_settings%rowtype;
 tx uuid; before_bal integer; after_bal integer; effective_price integer; available_questions integer; spent_today integer; expiry_days integer; dyn text;
begin
 if uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED','message','Please sign in to continue.'); end if;
 if nullif(trim(p_product_code),'') is null or nullif(trim(p_idempotency_key),'') is null then return jsonb_build_object('success',false,'code','INVALID_REQUEST','message','The product or purchase reference is missing.'); end if;
 select * into ent from btv_entitlements where user_id=uid and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('success',true,'resumed',true,'entitlement_id',ent.id,'status',ent.status,'balance',(select balance from btv_wallets where user_id=uid)); end if;
 select * into prod from btv_coin_products where code=p_product_code and is_active for share;
 if not found then return jsonb_build_object('success',false,'code','PRODUCT_UNAVAILABLE','message','This resource is not currently available.'); end if;
 select * into rule from btv_currency_settings where id=true;
 if prod.category='mock' then
  if not exists(select 1 from btv_exam_sample_acceptances where user_id=uid and terms_version='2026-07-24-sample-mocks-v1') then
   return jsonb_build_object('success',false,'code','SAMPLE_TERMS_REQUIRED','message','Please accept the Sample Mock acknowledgement before purchase. No coins were deducted.');
  end if;
  select * into cat from btv_mock_catalog where code=prod.linked_resource and is_active;
  if not found or cat.question_source not in ('cbt_questions','nclex_questions','btv_exam_questions') or to_regclass('public.'||cat.question_source) is null then return jsonb_build_object('success',false,'code','MOCK_CONFIGURATION_ERROR','message','This mock is not fully configured. No coins were deducted.'); end if;
  if cat.question_source='btv_exam_questions' then dyn:=format('select count(*) from public.%I where lower(exam_type)=lower($1) and review_status<>''rejected''',cat.question_source); execute dyn into available_questions using cat.exam_type;
  else dyn:=format('select count(*) from public.%I where quality_status<>''rejected''',cat.question_source); execute dyn into available_questions; end if;
  if available_questions<prod.question_count then return jsonb_build_object('success',false,'code','QUESTION_BANK_INCOMPLETE','message',format('This sample mock requires %s available questions. No coins were deducted.',prod.question_count),'available_questions',available_questions,'required_questions',prod.question_count); end if;
 end if;
 effective_price:=case when prod.promotional_price is not null and now() between coalesce(prod.promotion_starts_at,'-infinity') and coalesce(prod.promotion_ends_at,'infinity') then prod.promotional_price else prod.coin_price end;
 perform btv_bootstrap_user(uid); select * into w from btv_wallets where user_id=uid for update;
 if w.wallet_status<>'active' then return jsonb_build_object('success',false,'code','WALLET_RESTRICTED','message','Your Beyond Coins wallet is currently restricted.'); end if;
 if prod.access_type='permanent' then select * into ent from btv_entitlements where user_id=uid and product_id=prod.id and status in ('ready','active','consumed') order by created_at desc limit 1; if found then return jsonb_build_object('success',true,'resumed',true,'entitlement_id',ent.id,'status',ent.status,'balance',w.balance); end if; end if;
 if rule.maximum_daily_spend is not null then select coalesce(abs(sum(amount)),0) into spent_today from btv_wallet_transactions where user_id=uid and amount<0 and status='completed' and created_at>=(date_trunc('day',now() at time zone rule.reset_timezone) at time zone rule.reset_timezone); if spent_today+effective_price>rule.maximum_daily_spend then return jsonb_build_object('success',false,'code','DAILY_SPEND_LIMIT','message','This purchase exceeds your daily Beyond Coins spending limit. No coins were deducted.'); end if; end if;
 if w.balance<effective_price then return jsonb_build_object('success',false,'code','INSUFFICIENT_BALANCE','message',format('You need %s more Beyond Coins to unlock this resource.',effective_price-w.balance),'required',effective_price,'available',w.balance); end if;
 before_bal:=w.balance; after_bal:=before_bal-effective_price; expiry_days:=coalesce(prod.expiry_days,case when prod.category='mock' then rule.mock_entitlement_expiry_days else null end);
 insert into btv_entitlements(user_id,product_id,access_type,attempts_total,idempotency_key,expires_at) values(uid,prod.id,prod.access_type,prod.attempts,p_idempotency_key,case when expiry_days is null then null else now()+make_interval(days=>expiry_days) end) returning * into ent;
 update btv_wallets set balance=after_bal,lifetime_spent=lifetime_spent+effective_price,updated_at=now() where user_id=uid;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,description,idempotency_key,metadata,status,item_code)
 values(uid,uid,-effective_price,before_bal,after_bal,'spend','resource_purchase',ent.id::text,prod.name,'purchase:'||p_idempotency_key,jsonb_build_object('product_code',prod.code,'entitlement_id',ent.id,'sample_terms_version','2026-07-24-sample-mocks-v1'),'completed',prod.code) returning id into tx;
 update btv_entitlements set purchase_transaction_id=tx where id=ent.id;
 return jsonb_build_object('success',true,'resumed',false,'entitlement_id',ent.id,'transaction_id',tx,'status','ready','balance',after_bal,'coin_price',effective_price,'product_code',prod.code,'route',prod.linked_route,'expires_at',ent.expires_at,'sample_mock',true);
exception when unique_violation then select * into ent from btv_entitlements where user_id=uid and idempotency_key=p_idempotency_key; return jsonb_build_object('success',true,'resumed',true,'entitlement_id',ent.id,'status',ent.status,'balance',(select balance from btv_wallets where user_id=uid));
end $$;

create or replace function public.btv_start_entitled_mock(p_entitlement_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); ent btv_entitlements%rowtype; prod btv_coin_products%rowtype; cat btv_mock_catalog%rowtype; attempt btv_exam_attempts%rowtype; ids text[]; source text; dyn text;
begin
 if uid is null then return jsonb_build_object('success',false,'code','AUTH_REQUIRED','message','Please sign in to start this mock.'); end if;
 if not exists(select 1 from btv_exam_sample_acceptances where user_id=uid and terms_version='2026-07-24-sample-mocks-v1') then return jsonb_build_object('success',false,'code','SAMPLE_TERMS_REQUIRED','message','Please accept the Sample Mock acknowledgement before starting.'); end if;
 select * into ent from btv_entitlements where id=p_entitlement_id and user_id=uid for update;
 if not found then return jsonb_build_object('success',false,'code','ENTITLEMENT_NOT_FOUND','message','This mock purchase could not be found.'); end if;
 select * into prod from btv_coin_products where id=ent.product_id and category='mock'; if not found then return jsonb_build_object('success',false,'code','INVALID_ENTITLEMENT'); end if;
 select * into attempt from btv_exam_attempts where entitlement_id=ent.id order by created_at desc limit 1;
 if found then return jsonb_build_object('success',true,'resumed',true,'attempt_id',attempt.id,'status',attempt.status,'question_count',attempt.total_questions,'duration_minutes',prod.duration_minutes,'sample_mock',true); end if;
 if ent.status<>'ready' or ent.attempts_used>=ent.attempts_total or (ent.expires_at is not null and ent.expires_at<=now()) then return jsonb_build_object('success',false,'code','ENTITLEMENT_UNAVAILABLE','message','This mock attempt has already been used or expired.'); end if;
 select * into cat from btv_mock_catalog where code=prod.linked_resource and is_active;
 if not found or cat.question_count is null or cat.duration_minutes is null then return jsonb_build_object('success',false,'code','MOCK_CONFIGURATION_ERROR'); end if;
 source:=cat.question_source;
 if source='btv_exam_questions' then dyn:=format('select array_agg(id::text) from (select id from public.%I where lower(exam_type)=lower($1) and review_status<>''rejected'' order by random() limit $2) q',source); execute dyn into ids using cat.exam_type,cat.question_count;
 else dyn:=format('select array_agg(id::text) from (select id from public.%I where quality_status<>''rejected'' order by random() limit $1) q',source); execute dyn into ids using cat.question_count; end if;
 if coalesce(array_length(ids,1),0)<>cat.question_count then return jsonb_build_object('success',false,'code','QUESTION_BANK_INCOMPLETE','message','The sample question pool cannot fulfil this mock. No additional coins were deducted.'); end if;
 insert into btv_exam_attempts(user_id,exam_product_id,wallet_transaction_id,idempotency_key,status,question_source,question_ids,started_at,expires_at,total_questions,coin_price_paid,metadata,entitlement_id)
 values(uid,cat.id,ent.purchase_transaction_id,'entitlement:'||ent.id,'active',source,to_jsonb(ids),now(),now()+make_interval(mins=>cat.duration_minutes),cat.question_count,cat.coin_cost,jsonb_build_object('entitlement_id',ent.id,'sample_mock',true,'sample_terms_version','2026-07-24-sample-mocks-v1'),ent.id) returning * into attempt;
 insert into btv_exam_attempt_questions(attempt_id,question_id,display_order) select attempt.id,x.id,x.ord::integer from unnest(ids) with ordinality x(id,ord);
 update btv_entitlements set status='active',attempts_used=attempts_used+1,updated_at=now() where id=ent.id;
 return jsonb_build_object('success',true,'resumed',false,'attempt_id',attempt.id,'status','active','question_count',cat.question_count,'duration_minutes',cat.duration_minutes,'coin_price',cat.coin_cost,'sample_mock',true);
end $$;

create or replace function public.btv_get_exam_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_attempt btv_exam_attempts%rowtype; v_product btv_mock_catalog%rowtype; r record; v_q jsonb; v_questions jsonb:='[]'::jsonb;
begin
 if v_user is null then raise exception using message='AUTH_REQUIRED'; end if;
 select * into v_attempt from btv_exam_attempts where id=p_attempt_id and user_id=v_user; if not found then raise exception using message='ATTEMPT_NOT_FOUND'; end if;
 select * into v_product from btv_mock_catalog where id=v_attempt.exam_product_id;
 for r in select * from btv_exam_attempt_questions where attempt_id=v_attempt.id order by display_order loop
  execute format('select to_jsonb(q) from public.%I q where q.id::text=$1',v_attempt.question_source) into v_q using r.question_id;
  v_q:=v_q||jsonb_build_object('sample_question',true,'sample_label','SAMPLE QUESTION — NOT CLINICALLY REVIEWED','sample_notice','Original unofficial educational sample. It is not an official examination question and does not replace official materials, supervised training, local policy or clinical judgement.');
  if v_attempt.status in ('submitted','completed','refunded') then v_q:=v_q||jsonb_build_object('selected_answer',r.selected_answer,'is_correct',r.is_correct);
  elsif v_attempt.question_source='cbt_questions' then v_q:=v_q-'correct_option'-'explanation';
  elsif v_attempt.question_source='nclex_questions' then v_q:=v_q-'correct_options'-'rationale'-'test_strategy';
  else v_q:=v_q-'correct_answer'-'explanation'; end if;
  v_questions:=v_questions||jsonb_build_array(v_q||jsonb_build_object('display_order',r.display_order));
 end loop;
 return jsonb_build_object('attempt',to_jsonb(v_attempt),'product',to_jsonb(v_product),'questions',v_questions,'server_time',now(),'sample_mock',true,'sample_terms_version','2026-07-24-sample-mocks-v1');
end $$;

revoke all on function public.btv_purchase_resource(text,text),public.btv_start_entitled_mock(uuid),public.btv_get_exam_attempt(uuid) from public,anon;
grant execute on function public.btv_purchase_resource(text,text),public.btv_start_entitled_mock(uuid),public.btv_get_exam_attempt(uuid) to authenticated;

do $$ declare c integer; n integer; i integer; begin
 select count(*) into c from cbt_questions where question_text like '[BTV-CBT-SAMPLE-V118-%';
 select count(*) into n from nclex_questions where question_text like '[BTV-NCLEX-SAMPLE-V118-%';
 select count(*) into i from btv_exam_questions where question_text like '[BTV-IELTS-SAMPLE-V118-%';
 if c<>500 or n<>500 or i<>500 then raise exception 'v118 expected 500 items per bank; CBT %, NCLEX %, IELTS %',c,n,i; end if;
 if exists(select 1 from cbt_questions where question_text like '[BTV-CBT-SAMPLE-V118-%' and (is_active or review_status<>'sample_unreviewed' or quality_status<>'needs_clinical_review'))
  or exists(select 1 from nclex_questions where question_text like '[BTV-NCLEX-SAMPLE-V118-%' and (is_active or review_status<>'sample_unreviewed' or quality_status<>'needs_clinical_review'))
  or exists(select 1 from btv_exam_questions where question_text like '[BTV-IELTS-SAMPLE-V118-%' and (is_active or review_status<>'sample_unreviewed')) then raise exception 'v118 review-state validation failed'; end if;
end $$;
