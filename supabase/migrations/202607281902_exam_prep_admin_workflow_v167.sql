-- Administrator content workflow. Imported and AI-assisted content is always draft.

create or replace function public.btv_exam_prep_admin_import(p_items jsonb,p_origin text default 'internal_original',p_commit boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_item jsonb;v_errors jsonb:='[]'::jsonb;v_preview jsonb:='[]'::jsonb;v_exam uuid;v_topic uuid;v_question uuid;v_options jsonb;v_correct integer;v_total integer:=0;v_inserted integer:=0;v_text text;
begin
 if not public.btv_is_admin() then raise exception 'ADMIN_REQUIRED';end if;
 if p_origin not in ('internal_original','licensed','ai_assisted_draft') then raise exception 'INVALID_ORIGIN';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>250 then raise exception 'INVALID_IMPORT';end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_total:=v_total+1;v_text:=trim(v_item->>'question_text');v_options:=v_item->'options';
  select id into v_exam from btv_exam_prep_exams where slug=v_item->>'exam_slug';
  select id into v_topic from btv_exam_prep_topics where exam_id=v_exam and slug=v_item->>'topic_slug';
  v_correct:=coalesce((select count(*) from jsonb_array_elements(v_options) x where coalesce((x->>'is_correct')::boolean,false)),0);
  if v_exam is null or v_topic is null or length(v_text)<20 or jsonb_typeof(v_options)<>'array' or jsonb_array_length(v_options)<>4 or length(coalesce(v_item->>'rationale',''))<20 or v_correct=0 or ((coalesce(v_item->>'question_type','single')='single') and v_correct<>1) then
   v_errors:=v_errors||jsonb_build_array(jsonb_build_object('row',v_total,'question_text',v_text,'error','Missing/invalid exam, topic, stem, four options, rationale or correct-answer configuration'));
   continue;
  end if;
  if exists(select 1 from btv_exam_prep_questions where exam_id=v_exam and content_hash=md5(lower(regexp_replace(v_text,'\s+',' ','g'))) and review_status<>'rejected') then
   v_errors:=v_errors||jsonb_build_array(jsonb_build_object('row',v_total,'question_text',v_text,'error','Duplicate question'));
   continue;
  end if;
  v_preview:=v_preview||jsonb_build_array(jsonb_build_object('row',v_total,'question_text',v_text,'status','valid draft'));
  if p_commit then
   insert into btv_exam_prep_questions(exam_id,topic_id,question_type,clinical_scenario,question_text,difficulty,rationale,learning_objective,nursing_principle,source_reference,content_origin,review_status,clinical_safety_check,is_active,created_by)
   values(v_exam,v_topic,coalesce(v_item->>'question_type','single'),v_item->>'clinical_scenario',v_text,coalesce(v_item->>'difficulty','medium'),v_item->>'rationale',coalesce(v_item->>'learning_objective','Apply safe evidence-informed nursing judgement.'),coalesce(v_item->>'nursing_principle','Person-centred safe nursing practice.'),coalesce(v_item->>'source_reference','Public competency standard supplied by the content author.'),p_origin,'draft',v_item->>'clinical_safety_check',false,v_actor) returning id into v_question;
   insert into btv_exam_prep_answer_options(question_id,option_text,is_correct,option_rationale,display_order)
   select v_question,x->>'text',coalesce((x->>'is_correct')::boolean,false),x->>'rationale',ord::integer from jsonb_array_elements(v_options) with ordinality a(x,ord);
   insert into btv_exam_prep_audit_log(question_id,actor_id,action,to_status,details) values(v_question,v_actor,case when p_origin='ai_assisted_draft' then 'ai_draft_created' else 'draft_imported' end,'draft',jsonb_build_object('origin',p_origin));
   v_inserted:=v_inserted+1;
  end if;
 end loop;
 return jsonb_build_object('total',v_total,'valid',jsonb_array_length(v_preview),'inserted',v_inserted,'preview',v_preview,'errors',v_errors,'committed',p_commit);
end $$;

create or replace function public.btv_exam_prep_admin_transition(p_question_id uuid,p_status text,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_old text;v_active boolean:=false;
begin
 if not public.btv_is_admin() then raise exception 'ADMIN_REQUIRED';end if;
 if p_status not in ('draft','clinical_review','approved','published','rejected','archived') then raise exception 'INVALID_STATUS';end if;
 select review_status into v_old from btv_exam_prep_questions where id=p_question_id for update;if not found then raise exception 'QUESTION_NOT_FOUND';end if;
 if p_status='published' and v_old<>'approved' then raise exception 'QUESTION_MUST_BE_APPROVED_FIRST';end if;
 v_active:=p_status='published';
 update btv_exam_prep_questions set review_status=p_status,is_active=v_active,updated_at=now(),
   reviewed_by=case when p_status in ('approved','published') then coalesce(reviewed_by,v_actor) else reviewed_by end,
   reviewed_at=case when p_status in ('approved','published') then coalesce(reviewed_at,now()) else reviewed_at end,
   approved_by=case when p_status in ('approved','published') then coalesce(approved_by,v_actor) else approved_by end,
   approved_at=case when p_status in ('approved','published') then coalesce(approved_at,now()) else approved_at end
 where id=p_question_id;
 insert into btv_exam_prep_audit_log(question_id,actor_id,action,from_status,to_status,details) values(p_question_id,v_actor,'status_changed',v_old,p_status,jsonb_build_object('notes',p_notes));
 return jsonb_build_object('question_id',p_question_id,'from_status',v_old,'to_status',p_status,'is_active',v_active);
end $$;

create or replace function public.btv_exam_prep_admin_summary()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select case when public.btv_is_admin() then jsonb_build_object(
  'total_questions',(select count(*) from btv_exam_prep_questions),
  'published_questions',(select count(*) from btv_exam_prep_questions where review_status='published' and is_active),
  'awaiting_review',(select count(*) from btv_exam_prep_questions where review_status in ('draft','clinical_review')),
  'reported_questions',(select count(*) from btv_exam_prep_question_reports where status in ('open','reviewing')),
  'by_exam',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select e.id,e.slug,e.name,e.is_active,count(q.id) total,count(*) filter(where q.review_status='published' and q.is_active) published from btv_exam_prep_exams e left join btv_exam_prep_questions q on q.exam_id=e.id group by e.id order by e.name)x),
  'by_difficulty',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select difficulty,count(*) total from btv_exam_prep_questions group by difficulty)x)
 ) else null end;
$$;

grant execute on function public.btv_exam_prep_admin_import(jsonb,text,boolean) to authenticated;
grant execute on function public.btv_exam_prep_admin_transition(uuid,text,text) to authenticated;
grant execute on function public.btv_exam_prep_admin_summary() to authenticated;
