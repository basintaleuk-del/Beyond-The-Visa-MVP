-- Make the existing 200-row btv_golden_questions bank authoritative for v126 Centre services.

alter table public.btv_golden_questions
  add column if not exists publication_date date,
  add column if not exists eligible_for_random boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists last_released_at timestamptz;

alter table public.golden_question_daily_assignments
  drop constraint if exists golden_question_daily_assignments_question_id_fkey;
alter table public.golden_question_daily_assignments
  add constraint golden_question_daily_assignments_question_id_fkey
  foreign key(question_id) references public.btv_golden_questions(id);

alter table public.golden_question_attempts
  drop constraint if exists golden_question_attempts_question_id_fkey;
alter table public.golden_question_attempts
  add constraint golden_question_attempts_question_id_fkey
  foreign key(question_id) references public.btv_golden_questions(id);

create index if not exists btv_golden_release_pool_idx
  on public.btv_golden_questions(audience,is_active,eligible_for_random,publication_date,sort_order)
  where archived_at is null;
create index if not exists golden_assignments_question_date_idx
  on public.golden_question_daily_assignments(question_id,assignment_date desc);

drop policy if exists "Authenticated users read active golden questions" on public.btv_golden_questions;
revoke select on public.btv_golden_questions from anon, authenticated;

alter table public.golden_question_sponsors
  add column if not exists website_url text,
  add column if not exists message text,
  add column if not exists prize_description text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists sponsored_month date,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists golden_sponsors_active_dates_idx
  on public.golden_question_sponsors(is_active,start_date,end_date,sponsored_month);

create or replace function private.btv_stamp_golden_release() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if new.status='active' then
    update public.btv_golden_questions
       set last_released_at=greatest(coalesce(last_released_at,'-infinity'::timestamptz),new.assignment_date::timestamptz),
           updated_at=now()
     where id=new.question_id;
  end if;
  return new;
end $$;
drop trigger if exists btv_stamp_golden_release on public.golden_question_daily_assignments;
create trigger btv_stamp_golden_release after insert or update of status
on public.golden_question_daily_assignments for each row execute function private.btv_stamp_golden_release();

create or replace function public.btv_record_golden_attempt(
 p_user uuid,p_daily uuid,p_question uuid,p_profession text,p_answer jsonb,p_correct boolean,p_base integer,p_speed integer,p_duration integer,p_review text default 'not_required'
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare d date; m date; streak integer:=1; bonus integer:=0; total integer; prior date; bonuses jsonb; score golden_question_monthly_scores%rowtype; prior_attempt golden_question_attempts%rowtype;
begin
 select assignment_date into d from golden_question_daily_assignments where id=p_daily and question_id=p_question and profession=p_profession and status='active' for update;
 if d is null then raise exception 'QUESTION_UNAVAILABLE'; end if;
 select * into prior_attempt from golden_question_attempts where user_id=p_user and daily_question_id=p_daily;
 if found then
   select * into score from golden_question_monthly_scores where competition_month=date_trunc('month',d)::date and profession=p_profession and user_id=p_user;
   return jsonb_build_object('points_awarded',prior_attempt.points_awarded,'streak_bonus',prior_attempt.streak_bonus,'current_streak',coalesce(score.current_streak,1),'monthly_points',coalesce(score.points,prior_attempt.points_awarded),'idempotent',true);
 end if;
 if p_review='pending' then p_correct:=null; p_base:=0; p_speed:=0; end if;
 prior:=d-1;
 while exists(select 1 from golden_question_attempts a join golden_question_daily_assignments x on x.id=a.daily_question_id where a.user_id=p_user and a.profession=p_profession and x.assignment_date=prior) loop streak:=streak+1; prior:=prior-1; end loop;
 select streak_bonuses into bonuses from golden_question_settings where id=true;
 if p_correct then bonus:=case when streak>=14 then coalesce((bonuses->>'14')::integer,10) when streak>=7 then coalesce((bonuses->>'7')::integer,5) when streak>=3 then coalesce((bonuses->>'3')::integer,2) else 0 end; end if;
 total:=greatest(0,p_base)+greatest(0,p_speed)+bonus; m:=date_trunc('month',d)::date;
 insert into golden_question_attempts(user_id,daily_question_id,question_id,profession,answer,is_correct,review_status,points_awarded,base_points,streak_bonus,speed_bonus,answer_duration_seconds)
 values(p_user,p_daily,p_question,p_profession,p_answer,p_correct,p_review,total,p_base,bonus,p_speed,p_duration);
 insert into golden_question_monthly_scores(competition_month,profession,user_id,points,correct_answers,attempts,current_streak,longest_streak,final_score_achieved_at)
 values(m,p_profession,p_user,total,case when p_correct then 1 else 0 end,1,streak,streak,now())
 on conflict(competition_month,profession,user_id) do update set points=golden_question_monthly_scores.points+excluded.points,
  correct_answers=golden_question_monthly_scores.correct_answers+excluded.correct_answers,attempts=golden_question_monthly_scores.attempts+1,
  current_streak=excluded.current_streak,longest_streak=greatest(golden_question_monthly_scores.longest_streak,excluded.longest_streak),
  final_score_achieved_at=case when excluded.points>0 then now() else golden_question_monthly_scores.final_score_achieved_at end,updated_at=now()
 returning * into score;
 return jsonb_build_object('points_awarded',total,'streak_bonus',bonus,'current_streak',streak,'monthly_points',score.points,'idempotent',false);
end $$;
revoke all on function public.btv_record_golden_attempt(uuid,uuid,uuid,text,jsonb,boolean,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.btv_record_golden_attempt(uuid,uuid,uuid,text,jsonb,boolean,integer,integer,integer,text) to service_role;

comment on table public.golden_questions is 'Obsolete v126 draft bank; runtime source of truth is public.btv_golden_questions.';
comment on table public.golden_question_options is 'Obsolete v126 option store; options are authoritative in public.btv_golden_questions.';
