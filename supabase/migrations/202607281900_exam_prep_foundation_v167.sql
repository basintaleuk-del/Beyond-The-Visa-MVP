-- Beyond The Visa Exam Prep v167
-- Secure, original-practice-question platform. Correct answers are never readable
-- through ordinary client table access; they are revealed only by submit RPCs.

create extension if not exists pgcrypto;

create table if not exists public.btv_exam_prep_exams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country text not null,
  description text not null,
  disclaimer text not null default 'These are independent practice questions created for educational purposes. They are not official examination questions and are not affiliated with or endorsed by Pearson VUE or any examination provider.',
  duration_minutes integer not null default 60 check (duration_minutes between 1 and 600),
  default_question_count integer not null default 50 check (default_question_count between 1 and 300),
  estimated_pass_percentage numeric(5,2) check (estimated_pass_percentage between 0 and 100),
  preparation_level text not null default 'Intermediate',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_exam_prep_topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.btv_exam_prep_exams(id) on delete cascade,
  parent_topic_id uuid references public.btv_exam_prep_topics(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  unique(exam_id, slug)
);

create table if not exists public.btv_exam_prep_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.btv_exam_prep_exams(id) on delete cascade,
  topic_id uuid not null references public.btv_exam_prep_topics(id) on delete restrict,
  question_type text not null default 'single' check (question_type in ('single','multiple_response')),
  clinical_scenario text,
  question_text text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  rationale text not null,
  learning_objective text not null,
  nursing_principle text not null,
  source_reference text not null,
  content_origin text not null default 'internal_original' check (content_origin in ('internal_original','licensed','demonstration_seed','ai_assisted_draft')),
  review_status text not null default 'draft' check (review_status in ('draft','clinical_review','approved','published','rejected','archived')),
  clinical_safety_check text,
  is_active boolean not null default false,
  created_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  content_hash text generated always as (md5(lower(regexp_replace(trim(question_text),'\s+',' ','g')))) stored,
  constraint exam_prep_publication_gate check (
    not is_active or (review_status = 'published' and reviewed_by is not null and approved_by is not null and reviewed_at is not null and approved_at is not null)
  )
);

create table if not exists public.btv_exam_prep_answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.btv_exam_prep_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  option_rationale text not null,
  display_order integer not null check (display_order between 1 and 12),
  unique(question_id, display_order)
);

create table if not exists public.btv_exam_prep_study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.btv_exam_prep_exams(id) on delete restrict,
  mode text not null check (mode in ('quick','topic','mock','mistakes','saved','adaptive','daily')),
  status text not null default 'in_progress' check (status in ('in_progress','completed','expired','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  duration_seconds integer not null default 0,
  total_questions integer not null check (total_questions between 1 and 300),
  correct_answers integer not null default 0,
  score_percentage numeric(5,2),
  session_settings jsonb not null default '{}'::jsonb,
  client_session_key text,
  practice_date date,
  unique(user_id, client_session_key),
  unique(user_id, exam_id, mode, practice_date)
);

create table if not exists public.btv_exam_prep_session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.btv_exam_prep_study_sessions(id) on delete cascade,
  question_id uuid not null references public.btv_exam_prep_questions(id) on delete restrict,
  display_order integer not null,
  selected_answer_ids uuid[],
  is_correct boolean,
  is_flagged boolean not null default false,
  answered_at timestamptz,
  time_spent_seconds integer not null default 0,
  unique(session_id, question_id),
  unique(session_id, display_order)
);

create table if not exists public.btv_exam_prep_user_question_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.btv_exam_prep_questions(id) on delete cascade,
  attempts integer not null default 0,
  correct_attempts integer not null default 0,
  incorrect_attempts integer not null default 0,
  mastery_score numeric(5,2) not null default 0,
  last_attempted_at timestamptz,
  next_review_at timestamptz,
  unique(user_id, question_id)
);

create table if not exists public.btv_exam_prep_saved_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.btv_exam_prep_questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, question_id)
);

create table if not exists public.btv_exam_prep_user_exam_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.btv_exam_prep_exams(id) on delete cascade,
  questions_attempted integer not null default 0,
  questions_correct integer not null default 0,
  accuracy_percentage numeric(5,2) not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_practice_date date,
  updated_at timestamptz not null default now(),
  unique(user_id, exam_id)
);

create table if not exists public.btv_exam_prep_question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.btv_exam_prep_questions(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.btv_exam_prep_audit_log (
  id bigint generated always as identity primary key,
  question_id uuid references public.btv_exam_prep_questions(id) on delete set null,
  actor_id uuid references auth.users(id),
  action text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists exam_prep_questions_selection_idx on public.btv_exam_prep_questions(exam_id,topic_id,difficulty,is_active,review_status);
create unique index if not exists exam_prep_questions_live_hash_uidx on public.btv_exam_prep_questions(exam_id,content_hash) where review_status <> 'rejected';
create index if not exists exam_prep_sessions_user_idx on public.btv_exam_prep_study_sessions(user_id,status,started_at desc);
create index if not exists exam_prep_session_questions_order_idx on public.btv_exam_prep_session_questions(session_id,display_order);
create index if not exists exam_prep_progress_review_idx on public.btv_exam_prep_user_question_progress(user_id,next_review_at);
create index if not exists exam_prep_reports_status_idx on public.btv_exam_prep_question_reports(status,created_at);

alter table public.btv_exam_prep_exams enable row level security;
alter table public.btv_exam_prep_topics enable row level security;
alter table public.btv_exam_prep_questions enable row level security;
alter table public.btv_exam_prep_answer_options enable row level security;
alter table public.btv_exam_prep_study_sessions enable row level security;
alter table public.btv_exam_prep_session_questions enable row level security;
alter table public.btv_exam_prep_user_question_progress enable row level security;
alter table public.btv_exam_prep_saved_questions enable row level security;
alter table public.btv_exam_prep_user_exam_progress enable row level security;
alter table public.btv_exam_prep_question_reports enable row level security;
alter table public.btv_exam_prep_audit_log enable row level security;

drop policy if exists exam_prep_exams_public_catalog on public.btv_exam_prep_exams;
drop policy if exists exam_prep_topics_public_catalog on public.btv_exam_prep_topics;
drop policy if exists exam_prep_questions_admin_only on public.btv_exam_prep_questions;
drop policy if exists exam_prep_options_admin_only on public.btv_exam_prep_answer_options;
drop policy if exists exam_prep_exams_admin_write on public.btv_exam_prep_exams;
drop policy if exists exam_prep_topics_admin_write on public.btv_exam_prep_topics;
drop policy if exists exam_prep_sessions_own on public.btv_exam_prep_study_sessions;
drop policy if exists exam_prep_session_questions_own on public.btv_exam_prep_session_questions;
drop policy if exists exam_prep_question_progress_own on public.btv_exam_prep_user_question_progress;
drop policy if exists exam_prep_saved_own on public.btv_exam_prep_saved_questions;
drop policy if exists exam_prep_exam_progress_own on public.btv_exam_prep_user_exam_progress;
drop policy if exists exam_prep_reports_own_insert on public.btv_exam_prep_question_reports;
drop policy if exists exam_prep_reports_own_read on public.btv_exam_prep_question_reports;
drop policy if exists exam_prep_reports_admin_update on public.btv_exam_prep_question_reports;
drop policy if exists exam_prep_audit_admin on public.btv_exam_prep_audit_log;

create policy exam_prep_exams_public_catalog on public.btv_exam_prep_exams for select using (is_active or public.btv_is_admin());
create policy exam_prep_topics_public_catalog on public.btv_exam_prep_topics for select using (is_active or public.btv_is_admin());
create policy exam_prep_questions_admin_only on public.btv_exam_prep_questions for all using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy exam_prep_options_admin_only on public.btv_exam_prep_answer_options for all using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy exam_prep_exams_admin_write on public.btv_exam_prep_exams for all using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy exam_prep_topics_admin_write on public.btv_exam_prep_topics for all using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy exam_prep_sessions_own on public.btv_exam_prep_study_sessions for select using (user_id=auth.uid() or public.btv_is_admin());
create policy exam_prep_session_questions_own on public.btv_exam_prep_session_questions for select using (exists(select 1 from public.btv_exam_prep_study_sessions s where s.id=session_id and (s.user_id=auth.uid() or public.btv_is_admin())));
create policy exam_prep_question_progress_own on public.btv_exam_prep_user_question_progress for select using (user_id=auth.uid() or public.btv_is_admin());
create policy exam_prep_saved_own on public.btv_exam_prep_saved_questions for all using (user_id=auth.uid() or public.btv_is_admin()) with check (user_id=auth.uid() or public.btv_is_admin());
create policy exam_prep_exam_progress_own on public.btv_exam_prep_user_exam_progress for select using (user_id=auth.uid() or public.btv_is_admin());
create policy exam_prep_reports_own_insert on public.btv_exam_prep_question_reports for insert with check (user_id=auth.uid());
create policy exam_prep_reports_own_read on public.btv_exam_prep_question_reports for select using (user_id=auth.uid() or public.btv_is_admin());
create policy exam_prep_reports_admin_update on public.btv_exam_prep_question_reports for update using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy exam_prep_audit_admin on public.btv_exam_prep_audit_log for select using (public.btv_is_admin());

revoke all on public.btv_exam_prep_questions, public.btv_exam_prep_answer_options from anon, authenticated;
grant select,insert,update,delete on public.btv_exam_prep_questions, public.btv_exam_prep_answer_options to authenticated;
grant select on public.btv_exam_prep_exams, public.btv_exam_prep_topics to authenticated;
grant select on public.btv_exam_prep_study_sessions, public.btv_exam_prep_user_question_progress, public.btv_exam_prep_saved_questions, public.btv_exam_prep_user_exam_progress, public.btv_exam_prep_question_reports to authenticated;
grant insert,delete on public.btv_exam_prep_saved_questions to authenticated;
grant insert on public.btv_exam_prep_question_reports to authenticated;

create or replace function public.btv_exam_prep_catalog()
returns table(id uuid,slug text,name text,country text,description text,disclaimer text,duration_minutes integer,default_question_count integer,estimated_pass_percentage numeric,preparation_level text,question_count bigint,completion_percentage numeric)
language sql security definer set search_path=public,pg_temp as $$
  select e.id,e.slug,e.name,e.country,e.description,e.disclaimer,e.duration_minutes,e.default_question_count,e.estimated_pass_percentage,e.preparation_level,
    count(q.id),least(100,coalesce(round(100.0*max(up.questions_attempted)/nullif(count(q.id),0),1),0))
  from btv_exam_prep_exams e
  join btv_exam_prep_questions q on q.exam_id=e.id and q.is_active and q.review_status='published'
  left join btv_exam_prep_user_exam_progress up on up.exam_id=e.id and up.user_id=auth.uid()
  where e.is_active
  group by e.id
  having count(q.id)>0
  order by e.name;
$$;

create or replace function public.btv_exam_prep_topics_for_exam(p_exam_id uuid)
returns table(id uuid,parent_topic_id uuid,name text,slug text,description text,display_order integer,question_count bigint)
language sql security definer set search_path=public,pg_temp as $$
  select t.id,t.parent_topic_id,t.name,t.slug,t.description,t.display_order,count(q.id)
  from btv_exam_prep_topics t
  join btv_exam_prep_questions q on q.topic_id=t.id and q.is_active and q.review_status='published'
  where t.exam_id=p_exam_id and t.is_active
  group by t.id order by t.display_order,t.name;
$$;

create or replace function public.btv_start_exam_prep_session(
  p_exam_slug text,p_mode text default 'quick',p_topic_ids uuid[] default null,p_difficulty text default null,
  p_question_count integer default 10,p_immediate_feedback boolean default true,p_timezone text default 'UTC',p_client_key text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_exam btv_exam_prep_exams%rowtype;v_session btv_exam_prep_study_sessions%rowtype;v_count integer:=least(greatest(coalesce(p_question_count,10),1),100);v_day date;v_available integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode not in ('quick','topic','mock','mistakes','saved','adaptive','daily') then raise exception 'INVALID_MODE'; end if;
  if p_difficulty is not null and p_difficulty not in ('easy','medium','hard') then raise exception 'INVALID_DIFFICULTY'; end if;
  select * into v_exam from btv_exam_prep_exams where slug=p_exam_slug and is_active;
  if not found then raise exception 'EXAM_NOT_AVAILABLE'; end if;
  begin v_day:=(now() at time zone p_timezone)::date; exception when others then v_day:=(now() at time zone 'UTC')::date; end;
  if p_mode='daily' then
    select * into v_session from btv_exam_prep_study_sessions where user_id=v_user and exam_id=v_exam.id and mode='daily' and practice_date=v_day;
    if found then return jsonb_build_object('session_id',v_session.id,'resumed',true,'total_questions',v_session.total_questions,'expires_at',v_session.expires_at); end if;
    v_count:=10;
  end if;
  select count(*) into v_available from btv_exam_prep_questions q
   where q.exam_id=v_exam.id and q.is_active and q.review_status='published'
     and (p_topic_ids is null or q.topic_id=any(p_topic_ids)) and (p_difficulty is null or q.difficulty=p_difficulty)
     and (p_mode<>'mistakes' or exists(select 1 from btv_exam_prep_user_question_progress up where up.user_id=v_user and up.question_id=q.id and up.incorrect_attempts>0))
     and (p_mode<>'saved' or exists(select 1 from btv_exam_prep_saved_questions sq where sq.user_id=v_user and sq.question_id=q.id));
  if v_available=0 then raise exception 'NO_REVIEWED_QUESTIONS'; end if;
  v_count:=least(v_count,v_available);
  insert into btv_exam_prep_study_sessions(user_id,exam_id,mode,total_questions,expires_at,session_settings,client_session_key,practice_date)
  values(v_user,v_exam.id,p_mode,v_count,case when p_mode='mock' then now()+make_interval(mins=>v_exam.duration_minutes) end,
    jsonb_build_object('immediate_feedback',p_immediate_feedback,'difficulty',p_difficulty,'topic_ids',p_topic_ids,'timezone',p_timezone),nullif(p_client_key,''),case when p_mode='daily' then v_day end)
  returning * into v_session;
  insert into btv_exam_prep_session_questions(session_id,question_id,display_order)
  select v_session.id,q.id,row_number() over(order by
    case when p_mode in ('adaptive','daily') then coalesce(up.mastery_score,0) else 0 end asc,
    case when up.last_attempted_at is null then 0 else 1 end,random())
  from btv_exam_prep_questions q
  left join btv_exam_prep_user_question_progress up on up.question_id=q.id and up.user_id=v_user
  where q.exam_id=v_exam.id and q.is_active and q.review_status='published'
    and (p_topic_ids is null or q.topic_id=any(p_topic_ids)) and (p_difficulty is null or q.difficulty=p_difficulty)
    and (p_mode<>'mistakes' or coalesce(up.incorrect_attempts,0)>0)
    and (p_mode<>'saved' or exists(select 1 from btv_exam_prep_saved_questions sq where sq.user_id=v_user and sq.question_id=q.id))
  order by case when p_mode in ('adaptive','daily') then coalesce(up.mastery_score,0) else 0 end asc,
    case when up.last_attempted_at is null then 0 else 1 end,random() limit v_count;
  return jsonb_build_object('session_id',v_session.id,'resumed',false,'total_questions',v_count,'expires_at',v_session.expires_at);
end $$;

create or replace function public.btv_exam_prep_session_question(p_session_id uuid,p_position integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_s btv_exam_prep_study_sessions%rowtype;v_row record;
begin
  select * into v_s from btv_exam_prep_study_sessions where id=p_session_id and user_id=v_user;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.status<>'in_progress' then raise exception 'SESSION_CLOSED'; end if;
  select sq.id as session_question_id,sq.display_order,sq.is_flagged,sq.answered_at,q.id,q.question_type,q.clinical_scenario,q.question_text,q.difficulty,q.learning_objective,t.name topic,e.name exam_name,
    jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'display_order',o.display_order) order by o.display_order) options
  into v_row from btv_exam_prep_session_questions sq join btv_exam_prep_questions q on q.id=sq.question_id join btv_exam_prep_answer_options o on o.question_id=q.id join btv_exam_prep_topics t on t.id=q.topic_id join btv_exam_prep_exams e on e.id=q.exam_id
  where sq.session_id=v_s.id and sq.display_order=p_position group by sq.id,sq.display_order,sq.is_flagged,sq.answered_at,q.id,t.name,e.name;
  if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
  return jsonb_build_object('session_id',v_s.id,'status',v_s.status,'mode',v_s.mode,'total_questions',v_s.total_questions,'expires_at',v_s.expires_at,'question',to_jsonb(v_row));
end $$;

create or replace function public.btv_submit_exam_prep_answer(p_session_id uuid,p_question_id uuid,p_selected_answer_ids uuid[],p_time_spent_seconds integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_s btv_exam_prep_study_sessions%rowtype;v_sq btv_exam_prep_session_questions%rowtype;v_q btv_exam_prep_questions%rowtype;v_correct uuid[];v_selected uuid[];v_ok boolean;v_today date:=current_date;v_prev date;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from btv_exam_prep_study_sessions where id=p_session_id and user_id=v_user for update;
  if not found or v_s.status<>'in_progress' then raise exception 'SESSION_NOT_AVAILABLE'; end if;
  if v_s.expires_at is not null and now()>v_s.expires_at then update btv_exam_prep_study_sessions set status='expired',completed_at=now() where id=v_s.id;raise exception 'SESSION_EXPIRED';end if;
  select * into v_sq from btv_exam_prep_session_questions where session_id=v_s.id and question_id=p_question_id for update;
  if not found then raise exception 'QUESTION_NOT_IN_SESSION'; end if;
  if v_sq.answered_at is not null then raise exception 'QUESTION_ALREADY_ANSWERED'; end if;
  select * into v_q from btv_exam_prep_questions where id=p_question_id;
  select array_agg(id order by id) into v_correct from btv_exam_prep_answer_options where question_id=p_question_id and is_correct;
  select array_agg(distinct x order by x) into v_selected from unnest(coalesce(p_selected_answer_ids,'{}'::uuid[])) x;
  if exists(select 1 from unnest(coalesce(v_selected,'{}'::uuid[])) x where not exists(select 1 from btv_exam_prep_answer_options o where o.id=x and o.question_id=p_question_id)) then raise exception 'INVALID_ANSWER_OPTION';end if;
  v_ok:=coalesce(v_selected,'{}'::uuid[])=coalesce(v_correct,'{}'::uuid[]);
  update btv_exam_prep_session_questions set selected_answer_ids=v_selected,is_correct=v_ok,answered_at=now(),time_spent_seconds=greatest(0,coalesce(p_time_spent_seconds,0)) where id=v_sq.id;
  insert into btv_exam_prep_user_question_progress(user_id,question_id,attempts,correct_attempts,incorrect_attempts,mastery_score,last_attempted_at,next_review_at)
  values(v_user,p_question_id,1,case when v_ok then 1 else 0 end,case when v_ok then 0 else 1 end,case when v_ok then 25 else 0 end,now(),now()+case when v_ok then interval '7 days' else interval '1 day' end)
  on conflict(user_id,question_id) do update set attempts=btv_exam_prep_user_question_progress.attempts+1,correct_attempts=btv_exam_prep_user_question_progress.correct_attempts+case when v_ok then 1 else 0 end,incorrect_attempts=btv_exam_prep_user_question_progress.incorrect_attempts+case when v_ok then 0 else 1 end,mastery_score=least(100,greatest(0,btv_exam_prep_user_question_progress.mastery_score+case when v_ok then 15 else -12 end)),last_attempted_at=now(),next_review_at=now()+case when v_ok then interval '7 days' else interval '1 day' end;
  select last_practice_date into v_prev from btv_exam_prep_user_exam_progress where user_id=v_user and exam_id=v_s.exam_id;
  insert into btv_exam_prep_user_exam_progress(user_id,exam_id,questions_attempted,questions_correct,accuracy_percentage,current_streak,longest_streak,last_practice_date)
  values(v_user,v_s.exam_id,1,case when v_ok then 1 else 0 end,case when v_ok then 100 else 0 end,1,1,v_today)
  on conflict(user_id,exam_id) do update set questions_attempted=btv_exam_prep_user_exam_progress.questions_attempted+1,questions_correct=btv_exam_prep_user_exam_progress.questions_correct+case when v_ok then 1 else 0 end,accuracy_percentage=round(100.0*(btv_exam_prep_user_exam_progress.questions_correct+case when v_ok then 1 else 0 end)/(btv_exam_prep_user_exam_progress.questions_attempted+1),2),current_streak=case when btv_exam_prep_user_exam_progress.last_practice_date=v_today then btv_exam_prep_user_exam_progress.current_streak when btv_exam_prep_user_exam_progress.last_practice_date=v_today-1 then btv_exam_prep_user_exam_progress.current_streak+1 else 1 end,longest_streak=greatest(btv_exam_prep_user_exam_progress.longest_streak,case when btv_exam_prep_user_exam_progress.last_practice_date=v_today then btv_exam_prep_user_exam_progress.current_streak when btv_exam_prep_user_exam_progress.last_practice_date=v_today-1 then btv_exam_prep_user_exam_progress.current_streak+1 else 1 end),last_practice_date=v_today,updated_at=now();
  if v_s.mode='mock' then return jsonb_build_object('recorded',true); end if;
  return jsonb_build_object('is_correct',v_ok,'correct_answer_ids',v_correct,'rationale',v_q.rationale,'nursing_principle',v_q.nursing_principle,'learning_objective',v_q.learning_objective,'topic',(select name from btv_exam_prep_topics where id=v_q.topic_id),'difficulty',v_q.difficulty,'options',(select jsonb_agg(jsonb_build_object('id',id,'is_correct',is_correct,'rationale',option_rationale,'text',option_text) order by display_order) from btv_exam_prep_answer_options where question_id=p_question_id));
end $$;

create or replace function public.btv_complete_exam_prep_session(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_s btv_exam_prep_study_sessions%rowtype;v_answered integer;v_correct integer;v_unanswered integer;v_seconds integer;v_score numeric;v_by_topic jsonb;v_by_difficulty jsonb;
begin
  select * into v_s from btv_exam_prep_study_sessions where id=p_session_id and user_id=v_user for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  select count(*) filter(where answered_at is not null),count(*) filter(where is_correct),count(*) filter(where answered_at is null),coalesce(sum(time_spent_seconds),0) into v_answered,v_correct,v_unanswered,v_seconds from btv_exam_prep_session_questions where session_id=v_s.id;
  v_score:=case when v_s.total_questions=0 then 0 else round(100.0*v_correct/v_s.total_questions,2) end;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_by_topic from (select t.name topic,count(*) total,count(*) filter(where sq.is_correct) correct,round(100.0*count(*) filter(where sq.is_correct)/count(*),2) percentage from btv_exam_prep_session_questions sq join btv_exam_prep_questions q on q.id=sq.question_id join btv_exam_prep_topics t on t.id=q.topic_id where sq.session_id=v_s.id group by t.name order by percentage) x;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_by_difficulty from (select q.difficulty,count(*) total,count(*) filter(where sq.is_correct) correct,round(100.0*count(*) filter(where sq.is_correct)/count(*),2) percentage from btv_exam_prep_session_questions sq join btv_exam_prep_questions q on q.id=sq.question_id where sq.session_id=v_s.id group by q.difficulty order by q.difficulty) x;
  update btv_exam_prep_study_sessions set status='completed',completed_at=now(),duration_seconds=v_seconds,correct_answers=v_correct,score_percentage=v_score where id=v_s.id;
  return jsonb_build_object('session_id',v_s.id,'score_percentage',v_score,'correct_answers',v_correct,'incorrect_answers',v_answered-v_correct,'unanswered_questions',v_unanswered,'time_used_seconds',v_seconds,'average_time_seconds',case when v_answered=0 then 0 else round(v_seconds::numeric/v_answered,1) end,'score_by_topic',v_by_topic,'score_by_difficulty',v_by_difficulty,'pass_status_estimate',case when v_score>=coalesce((select estimated_pass_percentage from btv_exam_prep_exams where id=v_s.exam_id),70) then 'Practice threshold met' else 'Further preparation recommended' end,'estimate_disclaimer','Unofficial practice estimate only. It does not predict or guarantee an official exam result.');
end $$;

create or replace function public.btv_exam_prep_set_flag(p_session_id uuid,p_question_id uuid,p_flagged boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin update btv_exam_prep_session_questions sq set is_flagged=p_flagged from btv_exam_prep_study_sessions s where sq.session_id=s.id and s.id=p_session_id and s.user_id=auth.uid() and sq.question_id=p_question_id;return found;end $$;

create or replace function public.btv_exam_prep_review_session(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_status text;
begin
 select status into v_status from btv_exam_prep_study_sessions where id=p_session_id and user_id=v_user;
 if v_status<>'completed' then raise exception 'SESSION_NOT_COMPLETED';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('display_order',sq.display_order,'question_id',q.id,'question_text',q.question_text,'selected_answer_ids',sq.selected_answer_ids,'is_correct',sq.is_correct,'rationale',q.rationale,'learning_objective',q.learning_objective,'nursing_principle',q.nursing_principle,'options',(select jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'is_correct',o.is_correct,'rationale',o.option_rationale) order by o.display_order) from btv_exam_prep_answer_options o where o.question_id=q.id)) order by sq.display_order),'[]'::jsonb) from btv_exam_prep_session_questions sq join btv_exam_prep_questions q on q.id=sq.question_id where sq.session_id=p_session_id);
end $$;

create or replace function public.btv_exam_prep_toggle_saved(p_question_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin if exists(select 1 from btv_exam_prep_saved_questions where user_id=auth.uid() and question_id=p_question_id) then delete from btv_exam_prep_saved_questions where user_id=auth.uid() and question_id=p_question_id;return false;else insert into btv_exam_prep_saved_questions(user_id,question_id) values(auth.uid(),p_question_id);return true;end if;end $$;

create or replace function public.btv_exam_prep_dashboard()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
select jsonb_build_object(
 'questions_completed',coalesce(sum(questions_attempted),0),'overall_accuracy',coalesce(round(100.0*sum(questions_correct)/nullif(sum(questions_attempted),0),1),0),
 'current_streak',coalesce(max(current_streak),0),'best_streak',coalesce(max(longest_streak),0),
 'saved_questions',(select count(*) from btv_exam_prep_saved_questions where user_id=auth.uid()),
 'review_due',(select count(*) from btv_exam_prep_user_question_progress where user_id=auth.uid() and next_review_at<=now()),
 'recent_session',(select to_jsonb(x) from (select s.id,s.mode,s.status,s.total_questions,count(sq.answered_at) answered,e.name exam_name from btv_exam_prep_study_sessions s join btv_exam_prep_exams e on e.id=s.exam_id left join btv_exam_prep_session_questions sq on sq.session_id=s.id where s.user_id=auth.uid() and s.status='in_progress' group by s.id,e.name order by s.started_at desc limit 1)x),
 'recent_mock_score',(select score_percentage from btv_exam_prep_study_sessions where user_id=auth.uid() and mode='mock' and status='completed' order by completed_at desc limit 1)
) from btv_exam_prep_user_exam_progress where user_id=auth.uid();
$$;

grant execute on function public.btv_exam_prep_catalog() to authenticated;
grant execute on function public.btv_exam_prep_topics_for_exam(uuid) to authenticated;
grant execute on function public.btv_start_exam_prep_session(text,text,uuid[],text,integer,boolean,text,text) to authenticated;
grant execute on function public.btv_exam_prep_session_question(uuid,integer) to authenticated;
grant execute on function public.btv_submit_exam_prep_answer(uuid,uuid,uuid[],integer) to authenticated;
grant execute on function public.btv_complete_exam_prep_session(uuid) to authenticated;
grant execute on function public.btv_exam_prep_set_flag(uuid,uuid,boolean) to authenticated;
grant execute on function public.btv_exam_prep_review_session(uuid) to authenticated;
grant execute on function public.btv_exam_prep_toggle_saved(uuid) to authenticated;
grant execute on function public.btv_exam_prep_dashboard() to authenticated;

comment on table public.btv_exam_prep_questions is 'Original or licensed educational content only. Direct learner access is denied; safe RPCs omit answers until submission.';
comment on table public.btv_exam_prep_answer_options is 'Correctness is server-confidential until btv_submit_exam_prep_answer validates a submitted session answer.';
