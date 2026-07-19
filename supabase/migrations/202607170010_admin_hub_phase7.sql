create or replace function public.btv_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := false;
begin
  if to_regclass('public.profiles') is null then
    return false;
  end if;

  execute $query$
    select exists (
      select 1
      from public.profiles
      where id = $1
        and lower(coalesce(role, '')) = 'admin'
    )
  $query$
  into v_is_admin
  using auth.uid();

  return coalesce(v_is_admin, false);
exception
  when undefined_table or undefined_column then
    return false;
end;
$$;

create table if not exists public.btv_wallets(
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 150 check(balance>=0),
  lifetime_earned integer not null default 150 check(lifetime_earned>=0),
  lifetime_spent integer not null default 0 check(lifetime_spent>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.btv_wallet_transactions(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check(amount<>0), balance_after integer not null check(balance_after>=0),
  transaction_type text not null check(transaction_type in ('welcome','mock_charge','mock_refund','mentor_charge','mentor_refund','reward','admin_adjustment')),
  description text not null, reference_type text, reference_id uuid, idempotency_key text not null,
  created_at timestamptz not null default now(), unique(user_id,idempotency_key)
);
create index if not exists btv_wallet_transactions_user_created_idx on public.btv_wallet_transactions(user_id,created_at desc);

create table if not exists public.btv_mock_catalog(
  id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
  exam_type text not null, mock_category text not null, coin_cost integer not null default 50 check(coin_cost>=0),
  duration_minutes integer, question_count integer, is_active boolean not null default true,
  configuration jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.btv_mock_sessions(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  catalog_id uuid not null references public.btv_mock_catalog(id), client_session_key text not null,
  status text not null default 'active' check(status in ('active','completed','expired','technical_failure','refunded')),
  coin_cost integer not null, started_at timestamptz not null default now(), expires_at timestamptz,
  completed_at timestamptz, time_used_seconds integer, score numeric, estimated_band numeric,
  answers jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  unique(user_id,client_session_key)
);
create index if not exists btv_mock_sessions_user_idx on public.btv_mock_sessions(user_id,started_at desc);
create table if not exists public.btv_mock_refund_requests(
  id uuid primary key default gen_random_uuid(), session_id uuid not null unique references public.btv_mock_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, reason text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.btv_gamification(
  user_id uuid primary key references auth.users(id) on delete cascade, xp integer not null default 0 check(xp>=0),
  level integer not null default 1 check(level>=1), current_streak integer not null default 0,
  longest_streak integer not null default 0, last_activity_date date, daily_goal integer not null default 10,
  questions_today integer not null default 0, week_xp integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.btv_achievements(
  code text primary key, title text not null, description text not null, xp_reward integer not null default 0,
  coin_reward integer not null default 0, icon text not null default 'award', threshold integer, is_active boolean not null default true
);
create table if not exists public.btv_user_achievements(
  user_id uuid not null references auth.users(id) on delete cascade, achievement_code text not null references public.btv_achievements(code),
  awarded_at timestamptz not null default now(), primary key(user_id,achievement_code)
);
create table if not exists public.btv_study_activity(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null, exam_type text, topic text, questions_answered integer not null default 0,
  correct_answers integer not null default 0, study_seconds integer not null default 0, score numeric,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.btv_journey_steps(
  code text primary key, title text not null, destination text not null default 'uk', sort_order integer not null,
  description text, official_url text, is_active boolean not null default true
);
create table if not exists public.btv_user_journey_progress(
  user_id uuid not null references auth.users(id) on delete cascade, step_code text not null references public.btv_journey_steps(code),
  completed boolean not null default false, completed_at timestamptz, notes text, updated_at timestamptz not null default now(),
  primary key(user_id,step_code)
);

create table if not exists public.btv_notifications(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category text not null, title text not null, body text not null, action_url text, dedupe_key text,
  read_at timestamptz, created_at timestamptz not null default now(), unique(user_id,dedupe_key)
);
create table if not exists public.btv_notification_preferences(
  user_id uuid primary key references auth.users(id) on delete cascade, study_reminders boolean not null default true,
  wallet_alerts boolean not null default true, mock_updates boolean not null default true, job_matches boolean not null default true,
  mentor_updates boolean not null default true, journey_updates boolean not null default true, timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_jobs(
  id uuid primary key default gen_random_uuid(), title text not null, employer text not null, location text,
  country text not null, specialty text, band text, salary_min numeric, salary_max numeric, currency text,
  registration_required text, experience_years numeric, visa_sponsorship boolean,
  sponsorship_source_url text, application_url text not null, closing_date date, status text not null default 'published',
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.btv_saved_jobs(
  user_id uuid not null references auth.users(id) on delete cascade, job_id uuid not null references public.btv_jobs(id) on delete cascade,
  saved_at timestamptz not null default now(), primary key(user_id,job_id)
);
create table if not exists public.btv_job_applications(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.btv_jobs(id) on delete cascade,
  status text not null default 'saved', notes text, applied_at timestamptz, updated_at timestamptz not null default now(), unique(user_id,job_id)
);

create table if not exists public.btv_success_stories(
  id uuid primary key default gen_random_uuid(), title text not null, member_name text not null, profession text,
  origin_country text, destination_country text, quote text, story text not null, timeline jsonb not null default '[]'::jsonb,
  image_url text, video_url text, status text not null default 'draft' check(status in ('draft','review','approved','rejected')),
  featured boolean not null default false, submitted_by uuid references auth.users(id), approved_by uuid references auth.users(id),
  approved_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.btv_mentors(
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  biography text not null, experience_years integer not null default 0, specialty text, languages text[] not null default '{}',
  areas_of_support text[] not null default '{}', coin_price integer not null default 50 check(coin_price>=0),
  status text not null default 'pending' check(status in ('pending','approved','suspended','rejected')),
  rating numeric not null default 0, review_count integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.btv_mentor_availability(
  id uuid primary key default gen_random_uuid(), mentor_id uuid not null references public.btv_mentors(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, is_booked boolean not null default false, check(ends_at>starts_at)
);
create table if not exists public.btv_mentor_bookings(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid not null references public.btv_mentors(id), availability_id uuid references public.btv_mentor_availability(id),
  status text not null default 'confirmed' check(status in ('confirmed','completed','cancelled','refunded')),
  coin_cost integer not null, topic text, starts_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.btv_mentor_reviews(
  id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.btv_mentor_bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, mentor_id uuid not null references public.btv_mentors(id),
  rating integer not null check(rating between 1 and 5), review text, created_at timestamptz not null default now()
);

create or replace function public.btv_bootstrap_user(p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into btv_wallets(user_id) values(p_user) on conflict(user_id) do nothing;
  insert into btv_wallet_transactions(user_id,amount,balance_after,transaction_type,description,idempotency_key)
    values(p_user,150,150,'welcome','Welcome to Beyond The Visa — 150 Beyond Coins','welcome-bonus')
    on conflict(user_id,idempotency_key) do nothing;
  insert into btv_gamification(user_id) values(p_user) on conflict(user_id) do nothing;
  insert into btv_notification_preferences(user_id) values(p_user) on conflict(user_id) do nothing;
end $$;
create or replace function public.btv_auth_user_created() returns trigger language plpgsql security definer set search_path=public as $$
begin perform btv_bootstrap_user(new.id); return new; end $$;
drop trigger if exists btv_on_auth_user_created on auth.users;
create trigger btv_on_auth_user_created after insert on auth.users for each row execute function public.btv_auth_user_created();
do $$ declare r record; begin for r in select id from auth.users loop perform public.btv_bootstrap_user(r.id); end loop; end $$;

create or replace function public.btv_start_mock(p_mock_code text,p_client_session_key text)
returns table(session_id uuid,balance integer,coin_cost integer,resumed boolean)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); cat btv_mock_catalog%rowtype; existing btv_mock_sessions%rowtype; w btv_wallets%rowtype; sid uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if nullif(trim(p_client_session_key),'') is null then raise exception 'A session key is required'; end if;
 perform btv_bootstrap_user(uid);
 select * into existing from btv_mock_sessions where user_id=uid and client_session_key=p_client_session_key;
 if found then return query select existing.id,(select balance from btv_wallets where user_id=uid),existing.coin_cost,true; return; end if;
 select * into cat from btv_mock_catalog where code=p_mock_code and is_active=true;
 if not found then raise exception 'This mock is unavailable'; end if;
 select * into w from btv_wallets where user_id=uid for update;
 if w.balance<cat.coin_cost then raise exception 'INSUFFICIENT_BC:%:%',cat.coin_cost,w.balance; end if;
 insert into btv_mock_sessions(user_id,catalog_id,client_session_key,coin_cost,expires_at)
 values(uid,cat.id,p_client_session_key,cat.coin_cost,now()+interval '7 days') returning id into sid;
 update btv_wallets set balance=balance-cat.coin_cost,lifetime_spent=lifetime_spent+cat.coin_cost,updated_at=now() where user_id=uid returning * into w;
 insert into btv_wallet_transactions(user_id,amount,balance_after,transaction_type,description,reference_type,reference_id,idempotency_key)
 values(uid,-cat.coin_cost,w.balance,'mock_charge',cat.title||' Mock','mock_session',sid,'mock-charge:'||sid);
 return query select sid,w.balance,cat.coin_cost,false;
end $$;

create or replace function public.btv_complete_mock(p_session_id uuid,p_score numeric,p_time_used integer,p_answers jsonb default '{}'::jsonb,p_estimated_band numeric default null)
returns public.btv_mock_sessions language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); s btv_mock_sessions%rowtype; xp_gain integer:=100;
begin
 update btv_mock_sessions set status='completed',score=p_score,time_used_seconds=greatest(0,p_time_used),answers=coalesce(p_answers,'{}'),estimated_band=p_estimated_band,completed_at=now()
 where id=p_session_id and user_id=uid and status='active' returning * into s;
 if not found then select * into s from btv_mock_sessions where id=p_session_id and user_id=uid; return s; end if;
 insert into btv_study_activity(user_id,activity_type,exam_type,questions_answered,correct_answers,study_seconds,score,metadata)
 select uid,'mock_completed',c.exam_type,coalesce(c.question_count,0),round(coalesce(c.question_count,0)*coalesce(p_score,0)/100),greatest(0,p_time_used),p_score,jsonb_build_object('session_id',p_session_id)
 from btv_mock_catalog c where c.id=s.catalog_id;
 update btv_gamification set xp=xp+xp_gain,level=greatest(1,1+((xp+xp_gain)/500)),week_xp=week_xp+xp_gain,current_streak=case when last_activity_date=current_date then current_streak when last_activity_date=current_date-1 then current_streak+1 else 1 end,longest_streak=greatest(longest_streak,case when last_activity_date=current_date then current_streak when last_activity_date=current_date-1 then current_streak+1 else 1 end),last_activity_date=current_date,updated_at=now() where user_id=uid;
 return s;
end $$;

create or replace function public.btv_request_mock_refund(p_session_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 insert into btv_mock_refund_requests(session_id,user_id,reason)
 select id,auth.uid(),left(trim(p_reason),1000) from btv_mock_sessions where id=p_session_id and user_id=auth.uid() and status in ('active','technical_failure')
 on conflict(session_id) do update set reason=excluded.reason returning id into rid;
 if rid is null then raise exception 'Session not eligible for refund review'; end if; return rid;
end $$;

create or replace function public.btv_approve_mock_refund(p_request_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path=public as $$
declare r btv_mock_refund_requests%rowtype; s btv_mock_sessions%rowtype; bal integer;
begin
 if not btv_is_admin() then raise exception 'Administrator access required'; end if;
 select * into r from btv_mock_refund_requests where id=p_request_id for update;
 if not found or r.status<>'pending' then raise exception 'Refund request is unavailable'; end if;
 select * into s from btv_mock_sessions where id=r.session_id for update;
 if p_approve then
   update btv_wallets set balance=balance+s.coin_cost,lifetime_earned=lifetime_earned+s.coin_cost,updated_at=now() where user_id=r.user_id returning balance into bal;
   insert into btv_wallet_transactions(user_id,amount,balance_after,transaction_type,description,reference_type,reference_id,idempotency_key)
   values(r.user_id,s.coin_cost,bal,'mock_refund','Approved technical refund','mock_session',s.id,'mock-refund:'||s.id) on conflict(user_id,idempotency_key) do nothing;
   update btv_mock_sessions set status='refunded' where id=s.id;
 end if;
 update btv_mock_refund_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
end $$;

create or replace function public.btv_book_mentor(p_mentor_id uuid,p_availability_id uuid,p_topic text)
returns table(booking_id uuid,balance integer,coin_cost integer)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); m btv_mentors%rowtype; a btv_mentor_availability%rowtype; w btv_wallets%rowtype; bid uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if; perform btv_bootstrap_user(uid);
 select * into m from btv_mentors where id=p_mentor_id and status='approved'; if not found then raise exception 'Mentor unavailable'; end if;
 select * into a from btv_mentor_availability where id=p_availability_id and mentor_id=m.id and not is_booked and starts_at>now() for update; if not found then raise exception 'Time unavailable'; end if;
 select * into w from btv_wallets where user_id=uid for update; if w.balance<m.coin_price then raise exception 'INSUFFICIENT_BC:%:%',m.coin_price,w.balance; end if;
 insert into btv_mentor_bookings(user_id,mentor_id,availability_id,coin_cost,topic,starts_at) values(uid,m.id,a.id,m.coin_price,left(p_topic,500),a.starts_at) returning id into bid;
 update btv_mentor_availability set is_booked=true where id=a.id;
 update btv_wallets set balance=balance-m.coin_price,lifetime_spent=lifetime_spent+m.coin_price,updated_at=now() where user_id=uid returning * into w;
 insert into btv_wallet_transactions(user_id,amount,balance_after,transaction_type,description,reference_type,reference_id,idempotency_key) values(uid,-m.coin_price,w.balance,'mentor_charge','Mentor session','mentor_booking',bid,'mentor-charge:'||bid);
 return query select bid,w.balance,m.coin_price;
end $$;

insert into btv_mock_catalog(code,title,exam_type,mock_category,coin_cost,duration_minutes,question_count,configuration) values
('ielts-reading','IELTS Academic Reading','ielts','reading',50,30,30,'{"flags":true,"autosave":true}'::jsonb),
('ielts-listening','IELTS Academic Listening','ielts','listening',50,30,30,'{"autosave":true}'::jsonb),
('ielts-writing','IELTS Academic Writing','ielts','writing',50,60,null,'{"task1":true,"task2":true,"autosave":true}'::jsonb),
('ielts-speaking','IELTS Academic Speaking','ielts','speaking',50,null,null,'{"parts":3,"recording":true}'::jsonb),
('cbt','UK CBT','cbt','nursing',50,20,null,'{}'::jsonb),('nclex','NCLEX-RN','nclex','nursing',50,60,null,'{}'::jsonb),
('adult-nursing','Adult Nursing','cbt','adult-nursing',50,30,null,'{}'::jsonb),('midwifery','Midwifery','cbt','midwifery',50,30,null,'{}'::jsonb),
('drug-calculations','Drug Calculations','clinical','drug-calculations',50,30,null,'{}'::jsonb)
on conflict(code) do update set title=excluded.title,exam_type=excluded.exam_type,mock_category=excluded.mock_category,configuration=excluded.configuration;
insert into btv_achievements(code,title,description,xp_reward,coin_reward,threshold,icon) values
('first-mock','First Mock','Complete your first mock',100,0,1,'award'),('questions-100','100 Questions','Answer 100 questions',150,0,100,'target'),('questions-1000','1000 Questions','Answer 1000 questions',500,25,1000,'trophy'),('streak-7','7 Day Streak','Study for seven consecutive days',200,10,7,'flame'),('streak-30','30 Day Streak','Study for thirty consecutive days',750,50,30,'flame'),('drug-master','Drug Calculation Master','Reach mastery in drug calculations',400,25,null,'calculator'),('cbt-ready','CBT Ready','Reach the CBT readiness milestone',400,25,null,'shield'),('ielts-starter','IELTS Starter','Complete your first IELTS activity',100,0,1,'book'),('journey-half','Journey Halfway','Complete half your journey',300,25,50,'route') on conflict(code) do nothing;
insert into btv_journey_steps(code,title,sort_order,description) values
('passport','Passport',1,'Confirm validity and secure copies'),('ielts','IELTS',2,'Complete accepted English evidence'),('cbt','CBT',3,'Complete the required competence test'),('nmc','NMC',4,'Complete professional registration'),('decision-letter','Decision Letter',5,'Receive your regulator decision'),('job-search','Job Search',6,'Find a suitable verified role'),('interview','Interview',7,'Prepare and complete interviews'),('cos','Certificate of Sponsorship',8,'Receive and verify your COS'),('visa','Visa',9,'Submit the correct visa application'),('travel','Travel',10,'Prepare documents and arrival'),('arrival','Arrival',11,'Complete essential arrival steps'),('osce','OSCE',12,'Prepare for and complete OSCE'),('pin','PIN',13,'Receive professional registration PIN'),('first-nhs-job','First NHS Job',14,'Begin supported employment'),('career-development','Career Development',15,'Continue professional growth') on conflict(code) do update set title=excluded.title,sort_order=excluded.sort_order,description=excluded.description;

alter table public.btv_wallets enable row level security; alter table public.btv_wallet_transactions enable row level security; alter table public.btv_mock_catalog enable row level security; alter table public.btv_mock_sessions enable row level security; alter table public.btv_mock_refund_requests enable row level security; alter table public.btv_gamification enable row level security; alter table public.btv_achievements enable row level security; alter table public.btv_user_achievements enable row level security; alter table public.btv_study_activity enable row level security; alter table public.btv_journey_steps enable row level security; alter table public.btv_user_journey_progress enable row level security; alter table public.btv_notifications enable row level security; alter table public.btv_notification_preferences enable row level security; alter table public.btv_jobs enable row level security; alter table public.btv_saved_jobs enable row level security; alter table public.btv_job_applications enable row level security; alter table public.btv_success_stories enable row level security; alter table public.btv_mentors enable row level security; alter table public.btv_mentor_availability enable row level security; alter table public.btv_mentor_bookings enable row level security; alter table public.btv_mentor_reviews enable row level security;

do $$ declare t text; begin
 foreach t in array array['btv_wallets','btv_wallet_transactions','btv_mock_sessions','btv_mock_refund_requests','btv_gamification','btv_user_achievements','btv_study_activity','btv_user_journey_progress','btv_notifications','btv_notification_preferences','btv_saved_jobs','btv_job_applications','btv_mentor_bookings','btv_mentor_reviews'] loop
   execute format('drop policy if exists own_data on public.%I',t);
   execute format('create policy own_data on public.%I for select using (user_id=auth.uid() or btv_is_admin())',t);
 end loop;
end $$;
drop policy if exists catalog_read on public.btv_mock_catalog; create policy catalog_read on public.btv_mock_catalog for select using(is_active or btv_is_admin());
drop policy if exists achievement_read on public.btv_achievements; create policy achievement_read on public.btv_achievements for select using(is_active or btv_is_admin());
drop policy if exists journey_read on public.btv_journey_steps; create policy journey_read on public.btv_journey_steps for select using(is_active or btv_is_admin());
drop policy if exists jobs_read on public.btv_jobs; create policy jobs_read on public.btv_jobs for select using(status='published' or btv_is_admin());
drop policy if exists saved_jobs_write on public.btv_saved_jobs; create policy saved_jobs_write on public.btv_saved_jobs for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists applications_write on public.btv_job_applications; create policy applications_write on public.btv_job_applications for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists progress_write on public.btv_user_journey_progress; create policy progress_write on public.btv_user_journey_progress for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists preferences_write on public.btv_notification_preferences; create policy preferences_write on public.btv_notification_preferences for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists notifications_update on public.btv_notifications; create policy notifications_update on public.btv_notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists stories_public on public.btv_success_stories; create policy stories_public on public.btv_success_stories for select using(status='approved' or submitted_by=auth.uid() or btv_is_admin());
drop policy if exists stories_submit on public.btv_success_stories; create policy stories_submit on public.btv_success_stories for insert with check(submitted_by=auth.uid());
drop policy if exists mentors_public on public.btv_mentors; create policy mentors_public on public.btv_mentors for select using(status='approved' or user_id=auth.uid() or btv_is_admin());
drop policy if exists availability_public on public.btv_mentor_availability; create policy availability_public on public.btv_mentor_availability for select using(exists(select 1 from btv_mentors m where m.id=mentor_id and (m.status='approved' or m.user_id=auth.uid() or btv_is_admin())));
drop policy if exists reviews_public on public.btv_mentor_reviews; create policy reviews_public on public.btv_mentor_reviews for select using(true);
drop policy if exists review_insert on public.btv_mentor_reviews; create policy review_insert on public.btv_mentor_reviews for insert with check(user_id=auth.uid() and exists(select 1 from btv_mentor_bookings b where b.id=booking_id and b.user_id=auth.uid() and b.status='completed'));

grant execute on function public.btv_start_mock(text,text) to authenticated;
grant execute on function public.btv_complete_mock(uuid,numeric,integer,jsonb,numeric) to authenticated;
grant execute on function public.btv_request_mock_refund(uuid,text) to authenticated;
grant execute on function public.btv_approve_mock_refund(uuid,boolean) to authenticated;
grant execute on function public.btv_book_mentor(uuid,uuid,text) to authenticated;
revoke all on public.btv_wallets,public.btv_wallet_transactions from anon,authenticated;
grant select on public.btv_wallets,public.btv_wallet_transactions to authenticated;
grant select on public.btv_mock_catalog,public.btv_mock_sessions,public.btv_mock_refund_requests,public.btv_gamification,public.btv_achievements,public.btv_user_achievements,public.btv_study_activity,public.btv_journey_steps,public.btv_notifications,public.btv_jobs,public.btv_success_stories,public.btv_mentors,public.btv_mentor_availability,public.btv_mentor_bookings,public.btv_mentor_reviews to authenticated;
grant select,insert,update,delete on public.btv_saved_jobs,public.btv_job_applications,public.btv_user_journey_progress,public.btv_notification_preferences to authenticated;