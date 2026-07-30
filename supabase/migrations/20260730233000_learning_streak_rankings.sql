-- Authoritative learning streaks and privacy-safe rankings.
-- A calendar day counts when a learner answers at least one free-practice
-- or mock question. Accuracy does not affect streak eligibility.

create table if not exists public.btv_learning_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  questions_answered integer not null default 0 check (questions_answered >= 0),
  free_questions integer not null default 0 check (free_questions >= 0),
  mock_questions integer not null default 0 check (mock_questions >= 0),
  sources jsonb not null default '{}'::jsonb,
  first_answered_at timestamptz not null,
  last_answered_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create table if not exists public.btv_learning_streak_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  active_days_total integer not null default 0 check (active_days_total >= 0),
  questions_total integer not null default 0 check (questions_total >= 0),
  free_questions_total integer not null default 0 check (free_questions_total >= 0),
  mock_questions_total integer not null default 0 check (mock_questions_total >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists btv_learning_days_rank_idx
  on public.btv_learning_activity_days (activity_date desc, user_id);
create index if not exists btv_learning_streak_rank_idx
  on public.btv_learning_streak_profiles
  (current_streak desc, longest_streak desc, active_days_total desc, questions_total desc);

alter table public.btv_learning_activity_days enable row level security;
alter table public.btv_learning_streak_profiles enable row level security;

drop policy if exists btv_learning_days_owner_read on public.btv_learning_activity_days;
create policy btv_learning_days_owner_read
  on public.btv_learning_activity_days for select
  using (user_id = (select auth.uid()) or public.btv_is_admin());

drop policy if exists btv_learning_streak_owner_read on public.btv_learning_streak_profiles;
create policy btv_learning_streak_owner_read
  on public.btv_learning_streak_profiles for select
  using (user_id = (select auth.uid()) or public.btv_is_admin());

revoke all on public.btv_learning_activity_days, public.btv_learning_streak_profiles
  from public, anon, authenticated;
grant select on public.btv_learning_activity_days, public.btv_learning_streak_profiles
  to authenticated;
grant all on public.btv_learning_activity_days, public.btv_learning_streak_profiles
  to service_role;

create or replace function public.btv_record_learning_answer(
  p_user uuid,
  p_answered_at timestamptz,
  p_questions integer,
  p_mode text,
  p_source text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_at timestamptz := coalesce(p_answered_at, now());
  v_day date := (timezone('UTC', coalesce(p_answered_at, now())))::date;
  v_questions integer := greatest(coalesce(p_questions, 1), 1);
  v_mode text := case when lower(coalesce(p_mode, 'free')) = 'mock' then 'mock' else 'free' end;
  v_source text := left(regexp_replace(lower(coalesce(p_source, 'question')), '[^a-z0-9_-]+', '_', 'g'), 48);
  v_existing boolean;
  v_profile public.btv_learning_streak_profiles%rowtype;
begin
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    return;
  end if;

  select exists (
    select 1 from public.btv_learning_activity_days
    where user_id = p_user and activity_date = v_day
  ) into v_existing;

  insert into public.btv_learning_activity_days (
    user_id, activity_date, questions_answered, free_questions, mock_questions,
    sources, first_answered_at, last_answered_at
  ) values (
    p_user, v_day, v_questions,
    case when v_mode = 'free' then v_questions else 0 end,
    case when v_mode = 'mock' then v_questions else 0 end,
    jsonb_build_object(v_source, v_questions), v_at, v_at
  )
  on conflict (user_id, activity_date) do update set
    questions_answered = public.btv_learning_activity_days.questions_answered + excluded.questions_answered,
    free_questions = public.btv_learning_activity_days.free_questions + excluded.free_questions,
    mock_questions = public.btv_learning_activity_days.mock_questions + excluded.mock_questions,
    sources = jsonb_set(
      public.btv_learning_activity_days.sources,
      array[v_source],
      to_jsonb(coalesce((public.btv_learning_activity_days.sources ->> v_source)::integer, 0) + v_questions),
      true
    ),
    first_answered_at = least(public.btv_learning_activity_days.first_answered_at, excluded.first_answered_at),
    last_answered_at = greatest(public.btv_learning_activity_days.last_answered_at, excluded.last_answered_at),
    updated_at = now();

  insert into public.btv_learning_streak_profiles (
    user_id, current_streak, longest_streak, last_activity_date, active_days_total,
    questions_total, free_questions_total, mock_questions_total
  ) values (
    p_user, 1, 1, v_day, case when v_existing then 0 else 1 end,
    v_questions,
    case when v_mode = 'free' then v_questions else 0 end,
    case when v_mode = 'mock' then v_questions else 0 end
  )
  on conflict (user_id) do update set
    current_streak = case
      when public.btv_learning_streak_profiles.last_activity_date >= v_day
        then public.btv_learning_streak_profiles.current_streak
      when public.btv_learning_streak_profiles.last_activity_date = v_day - 1
        then public.btv_learning_streak_profiles.current_streak + 1
      else 1
    end,
    longest_streak = greatest(
      public.btv_learning_streak_profiles.longest_streak,
      case
        when public.btv_learning_streak_profiles.last_activity_date >= v_day
          then public.btv_learning_streak_profiles.current_streak
        when public.btv_learning_streak_profiles.last_activity_date = v_day - 1
          then public.btv_learning_streak_profiles.current_streak + 1
        else 1
      end
    ),
    last_activity_date = greatest(public.btv_learning_streak_profiles.last_activity_date, v_day),
    active_days_total = public.btv_learning_streak_profiles.active_days_total
      + case when v_existing then 0 else 1 end,
    questions_total = public.btv_learning_streak_profiles.questions_total + v_questions,
    free_questions_total = public.btv_learning_streak_profiles.free_questions_total
      + case when v_mode = 'free' then v_questions else 0 end,
    mock_questions_total = public.btv_learning_streak_profiles.mock_questions_total
      + case when v_mode = 'mock' then v_questions else 0 end,
    updated_at = now()
  returning * into v_profile;

  update public.btv_gamification
  set current_streak = v_profile.current_streak,
      longest_streak = greatest(longest_streak, v_profile.longest_streak),
      last_activity_date = v_profile.last_activity_date,
      updated_at = now()
  where user_id = p_user;
end;
$$;

revoke all on function public.btv_record_learning_answer(uuid, timestamptz, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.btv_record_learning_answer(uuid, timestamptz, integer, text, text)
  to service_role;

create or replace function public.btv_rebuild_learning_streak_profile(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_previous date;
  v_current integer := 0;
  v_longest integer := 0;
  v_last date;
  v_days integer := 0;
  v_questions integer := 0;
  v_free integer := 0;
  v_mock integer := 0;
begin
  if p_user is null then return; end if;
  for r in
    select activity_date, questions_answered, free_questions, mock_questions
    from public.btv_learning_activity_days
    where user_id = p_user
    order by activity_date
  loop
    v_days := v_days + 1;
    v_questions := v_questions + r.questions_answered;
    v_free := v_free + r.free_questions;
    v_mock := v_mock + r.mock_questions;
    v_current := case when v_previous is not null and r.activity_date = v_previous + 1
      then v_current + 1 else 1 end;
    v_longest := greatest(v_longest, v_current);
    v_previous := r.activity_date;
    v_last := r.activity_date;
  end loop;

  insert into public.btv_learning_streak_profiles (
    user_id, current_streak, longest_streak, last_activity_date, active_days_total,
    questions_total, free_questions_total, mock_questions_total, updated_at
  ) values (
    p_user, v_current, v_longest, v_last, v_days,
    v_questions, v_free, v_mock, now()
  )
  on conflict (user_id) do update set
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    last_activity_date = excluded.last_activity_date,
    active_days_total = excluded.active_days_total,
    questions_total = excluded.questions_total,
    free_questions_total = excluded.free_questions_total,
    mock_questions_total = excluded.mock_questions_total,
    updated_at = now();

  update public.btv_gamification
  set current_streak = v_current,
      longest_streak = greatest(longest_streak, v_longest),
      last_activity_date = v_last,
      updated_at = now()
  where user_id = p_user;
end;
$$;

revoke all on function public.btv_rebuild_learning_streak_profile(uuid)
  from public, anon, authenticated;
grant execute on function public.btv_rebuild_learning_streak_profile(uuid) to service_role;

create or replace function public.btv_track_basic_question_attempt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.btv_record_learning_answer(
    new.user_id, new.attempted_at, 1,
    case when lower(coalesce(new.mode, 'practice')) = 'mock' then 'mock' else 'free' end,
    tg_table_name
  );
  return new;
end;
$$;

drop trigger if exists btv_track_cbt_streak on public.cbt_attempts;
create trigger btv_track_cbt_streak
after insert on public.cbt_attempts
for each row execute function public.btv_track_basic_question_attempt();

drop trigger if exists btv_track_nclex_streak on public.nclex_attempts;
create trigger btv_track_nclex_streak
after insert on public.nclex_attempts
for each row execute function public.btv_track_basic_question_attempt();

create or replace function public.btv_track_exam_prep_question()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_session public.btv_exam_prep_study_sessions%rowtype;
begin
  if new.answered_at is null or (tg_op = 'UPDATE' and old.answered_at is not null) then return new; end if;
  select * into v_session from public.btv_exam_prep_study_sessions where id = new.session_id;
  if found then
    perform public.btv_record_learning_answer(
      v_session.user_id, new.answered_at, 1,
      case when v_session.mode = 'mock' then 'mock' else 'free' end,
      'exam_prep'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists btv_track_exam_prep_streak on public.btv_exam_prep_session_questions;
create trigger btv_track_exam_prep_streak
after insert or update of answered_at on public.btv_exam_prep_session_questions
for each row execute function public.btv_track_exam_prep_question();

create or replace function public.btv_track_paid_exam_question()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid;
begin
  if new.answered_at is null or (tg_op = 'UPDATE' and old.answered_at is not null) then return new; end if;
  select user_id into v_user from public.btv_exam_attempts where id = new.attempt_id;
  if v_user is not null then
    perform public.btv_record_learning_answer(v_user, new.answered_at, 1, 'mock', 'paid_exam');
  end if;
  return new;
end;
$$;

drop trigger if exists btv_track_paid_exam_streak on public.btv_exam_attempt_questions;
create trigger btv_track_paid_exam_streak
after insert or update of answered_at on public.btv_exam_attempt_questions
for each row execute function public.btv_track_paid_exam_question();

create or replace function public.btv_track_numeracy_question()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.btv_record_learning_answer(new.user_id, new.created_at, 1, 'free', 'numeracy');
  return new;
end;
$$;

drop trigger if exists btv_track_numeracy_streak on public.btv_numeracy_daily_answers;
create trigger btv_track_numeracy_streak
after insert on public.btv_numeracy_daily_answers
for each row execute function public.btv_track_numeracy_question();

create or replace function public.btv_track_golden_question()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.btv_record_learning_answer(new.user_id, new.submitted_at, 1, 'free', 'golden_question');
  return new;
end;
$$;

drop trigger if exists btv_track_golden_streak on public.golden_question_attempts;
create trigger btv_track_golden_streak
after insert on public.golden_question_attempts
for each row execute function public.btv_track_golden_question();

create or replace function public.btv_track_study_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.questions_answered, 0) > 0 then
    perform public.btv_record_learning_answer(
      new.user_id, new.created_at, new.questions_answered,
      case when lower(coalesce(new.activity_type, '')) like '%mock%' then 'mock' else 'free' end,
      'study_activity'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists btv_track_study_activity_streak on public.btv_study_activity;
create trigger btv_track_study_activity_streak
after insert on public.btv_study_activity
for each row execute function public.btv_track_study_activity();

-- Backfill the daily ledger from every existing answer-bearing learning path.
with source_events as (
  select user_id, attempted_at as answered_at, 1 as questions,
    case when mode = 'mock' then 'mock' else 'free' end as mode
  from public.cbt_attempts
  union all
  select user_id, attempted_at, 1,
    case when mode = 'mock' then 'mock' else 'free' end
  from public.nclex_attempts
  union all
  select s.user_id, q.answered_at, 1,
    case when s.mode = 'mock' then 'mock' else 'free' end
  from public.btv_exam_prep_session_questions q
  join public.btv_exam_prep_study_sessions s on s.id = q.session_id
  where q.answered_at is not null
  union all
  select a.user_id, q.answered_at, 1, 'mock'
  from public.btv_exam_attempt_questions q
  join public.btv_exam_attempts a on a.id = q.attempt_id
  where q.answered_at is not null
  union all
  select user_id, created_at, 1, 'free'
  from public.btv_numeracy_daily_answers
  union all
  select user_id, submitted_at, 1, 'free'
  from public.golden_question_attempts
  union all
  select user_id, created_at, greatest(questions_answered, 1),
    case when lower(activity_type) like '%mock%' then 'mock' else 'free' end
  from public.btv_study_activity
  where questions_answered > 0
), grouped as (
  select user_id, (timezone('UTC', answered_at))::date as activity_date,
    sum(questions)::integer as questions_answered,
    sum(questions) filter (where mode = 'free')::integer as free_questions,
    sum(questions) filter (where mode = 'mock')::integer as mock_questions,
    min(answered_at) as first_answered_at,
    max(answered_at) as last_answered_at
  from source_events
  group by user_id, (timezone('UTC', answered_at))::date
)
insert into public.btv_learning_activity_days (
  user_id, activity_date, questions_answered, free_questions, mock_questions,
  sources, first_answered_at, last_answered_at
)
select user_id, activity_date, questions_answered, coalesce(free_questions, 0),
  coalesce(mock_questions, 0), jsonb_build_object('historical_backfill', questions_answered),
  first_answered_at, last_answered_at
from grouped
on conflict (user_id, activity_date) do nothing;

do $$
declare r record;
begin
  for r in select distinct user_id from public.btv_learning_activity_days loop
    perform public.btv_rebuild_learning_streak_profile(r.user_id);
  end loop;
end;
$$;

create or replace function public.btv_learning_streak_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (timezone('UTC', now()))::date;
  v_profile public.btv_learning_streak_profiles%rowtype;
  v_current integer := 0;
  v_rank integer;
  v_total integer := 0;
  v_percentile integer;
  v_active_30 integer := 0;
  v_questions_30 integer := 0;
  v_today_questions integer := 0;
  v_calendar jsonb := '[]'::jsonb;
  v_leaderboard jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_profile from public.btv_learning_streak_profiles where user_id = v_user;
  if found and v_profile.last_activity_date >= v_today - 1 then
    v_current := v_profile.current_streak;
  end if;

  select count(*), coalesce(sum(questions_answered), 0)
  into v_active_30, v_questions_30
  from public.btv_learning_activity_days
  where user_id = v_user and activity_date >= v_today - 29;

  select coalesce(max(questions_answered), 0) into v_today_questions
  from public.btv_learning_activity_days
  where user_id = v_user and activity_date = v_today;

  with ranked as (
    select p.user_id,
      case when p.last_activity_date >= v_today - 1 then p.current_streak else 0 end as effective_streak,
      p.longest_streak, p.active_days_total, p.questions_total,
      row_number() over (
        order by
          case when p.last_activity_date >= v_today - 1 then p.current_streak else 0 end desc,
          p.longest_streak desc, p.active_days_total desc, p.questions_total desc, p.user_id
      )::integer as position
    from public.btv_learning_streak_profiles p
    where p.active_days_total > 0
  )
  select r.position, (select count(*) from ranked)::integer
  into v_rank, v_total
  from ranked r where r.user_id = v_user;

  if v_rank is not null and v_total > 0 then
    v_percentile := greatest(1, least(100, round(100.0 * (v_total - v_rank + 1) / v_total)::integer));
  end if;

  with ranked as (
    select p.user_id,
      case when p.last_activity_date >= v_today - 1 then p.current_streak else 0 end as effective_streak,
      p.longest_streak,
      row_number() over (
        order by
          case when p.last_activity_date >= v_today - 1 then p.current_streak else 0 end desc,
          p.longest_streak desc, p.active_days_total desc, p.questions_total desc, p.user_id
      )::integer as position
    from public.btv_learning_streak_profiles p
    where p.active_days_total > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position', position,
    'label', case when user_id = v_user then 'You'
      else 'Learner ' || upper(substr(md5(user_id::text), 1, 4)) end,
    'current_streak', effective_streak,
    'longest_streak', longest_streak,
    'is_you', user_id = v_user
  ) order by position), '[]'::jsonb)
  into v_leaderboard
  from ranked where position <= 7;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', d.day::date,
    'questions', coalesce(a.questions_answered, 0),
    'active', a.user_id is not null
  ) order by d.day), '[]'::jsonb)
  into v_calendar
  from generate_series(v_today - 13, v_today, interval '1 day') d(day)
  left join public.btv_learning_activity_days a
    on a.user_id = v_user and a.activity_date = d.day::date;

  return jsonb_build_object(
    'current_streak', v_current,
    'longest_streak', coalesce(v_profile.longest_streak, 0),
    'last_activity_date', v_profile.last_activity_date,
    'active_days_total', coalesce(v_profile.active_days_total, 0),
    'questions_total', coalesce(v_profile.questions_total, 0),
    'free_questions_total', coalesce(v_profile.free_questions_total, 0),
    'mock_questions_total', coalesce(v_profile.mock_questions_total, 0),
    'active_days_30', v_active_30,
    'questions_30', v_questions_30,
    'today_questions', v_today_questions,
    'rank_position', v_rank,
    'ranked_learners', v_total,
    'percentile', v_percentile,
    'calendar', v_calendar,
    'leaderboard', v_leaderboard,
    'day_boundary', 'UTC'
  );
end;
$$;

revoke all on function public.btv_learning_streak_summary() from public, anon;
grant execute on function public.btv_learning_streak_summary() to authenticated, service_role;

comment on table public.btv_learning_activity_days is
  'Private authoritative daily ledger of answered free-practice and mock questions.';
comment on function public.btv_learning_streak_summary() is
  'Returns the signed-in learner streak, anonymous rank, recent calendar and answer totals.';
