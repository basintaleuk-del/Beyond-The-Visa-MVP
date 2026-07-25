-- Today's Golden Question: secure daily competition, moderation and prizes.
create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function private.btv_is_admin(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.profiles where id=p_user and role in ('admin','owner'))
$$;
revoke all on function private.btv_is_admin(uuid) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.btv_is_admin(uuid) to authenticated;

alter table public.profiles add column if not exists golden_profession text;
alter table public.profiles add column if not exists golden_profession_locked_at timestamptz;
alter table public.profiles add column if not exists golden_public_name text;
alter table public.profiles add column if not exists golden_leaderboard_opt_out boolean not null default false;
alter table public.profiles add column if not exists golden_show_location boolean not null default false;
create or replace function private.btv_guard_golden_profession() returns trigger language plpgsql security invoker as $$
begin
 if old.golden_profession_locked_at is not null and new.golden_profession is distinct from old.golden_profession
    and auth.uid()=old.id and not private.btv_is_admin(auth.uid()) then raise exception 'PROFESSION_LOCKED'; end if;
 return new;
end $$;
drop trigger if exists btv_guard_golden_profession on public.profiles;
create trigger btv_guard_golden_profession before update of golden_profession on public.profiles for each row execute function private.btv_guard_golden_profession();

create table if not exists public.golden_question_professions(
  code text primary key check(code ~ '^[a-z][a-z0-9_-]{1,31}$'), label text not null,
  is_active boolean not null default true, sort_order integer not null default 0
);
insert into public.golden_question_professions(code,label,sort_order) values
 ('nursing','Nursing',10),('midwifery','Midwifery',20) on conflict(code) do nothing;
alter table public.profiles drop constraint if exists profiles_golden_profession_fkey;
alter table public.profiles add constraint profiles_golden_profession_fkey foreign key(golden_profession) references public.golden_question_professions(code);
alter table public.btv_notification_preferences add column if not exists golden_question_daily boolean not null default true;
alter table public.btv_notification_preferences add column if not exists golden_question_results boolean not null default true;
alter table public.btv_notification_preferences add column if not exists golden_question_leaderboard boolean not null default true;
alter table public.btv_notification_preferences add column if not exists golden_question_prizes boolean not null default true;

create table if not exists public.golden_question_settings(
  id boolean primary key default true check(id), reset_timezone text not null default 'Europe/London',
  correct_points integer not null default 10, streak_bonuses jsonb not null default '{"3":2,"7":5,"14":10}',
  max_speed_bonus integer not null default 3, monthly_bc_reward integer not null default 500,
  full_month_badge_code text not null default 'golden_full_month',
  leaderboard_limit integer not null default 50, feature_paused boolean not null default false,
  sharing_enabled boolean not null default true, commenting_enabled boolean not null default true,
  competition_terms text not null default 'One account and one scored answer per daily question. Winners are verified before prizes are awarded.',
  sponsor_prize_wording text not null default 'plus a surprise sponsor package', updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.golden_question_settings(id) values(true) on conflict(id) do nothing;
insert into public.btv_achievements(code,title,description,xp_reward,coin_reward,icon,is_active)
values('golden_full_month','Golden Month','Attempted every Golden Question day in a calendar month.',0,0,'award',true)
on conflict(code) do nothing;

create table if not exists public.golden_questions(
  id uuid primary key default gen_random_uuid(), profession text not null references public.golden_question_professions(code),
  question_type text not null check(question_type in ('multiple_choice','equipment','clinical_scenario','true_false','short_answer')),
  question_text text not null, teaser text, category text not null, subcategory text, difficulty text not null check(difficulty in ('easy','medium','hard','expert')),
  correct_answer jsonb not null default '[]', acceptable_answers text[] not null default '{}', explanation text not null,
  safety_points text, clinical_reference text, image_path text, image_alt text, image_credit text, copyright_notes text,
  post_answer_annotations jsonb not null default '[]', status text not null default 'draft' check(status in ('draft','pending_review','approved','rejected','archived')),
  is_active boolean not null default false, publication_date date, base_points integer, speed_bonus_enabled boolean not null default false,
  max_speed_bonus integer, sharing_enabled boolean not null default true, created_by uuid references auth.users(id), approved_by uuid references auth.users(id),
  approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.golden_question_options(
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.golden_questions(id) on delete cascade,
  option_key text not null, option_text text not null, sort_order integer not null default 0, unique(question_id,option_key)
);
create table if not exists public.golden_question_daily_assignments(
  id uuid primary key default gen_random_uuid(), assignment_date date not null, profession text not null references public.golden_question_professions(code),
  question_id uuid not null references public.golden_questions(id), assignment_source text not null default 'automatic' check(assignment_source in ('automatic','scheduled','override','emergency')),
  status text not null default 'active' check(status in ('scheduled','active','replaced','cancelled','expired')),
  replaced_by uuid references public.golden_question_daily_assignments(id), resolution_notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create unique index if not exists golden_daily_one_active_uq on public.golden_question_daily_assignments(assignment_date,profession) where status in ('scheduled','active');

create table if not exists public.golden_question_attempts(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  daily_question_id uuid not null references public.golden_question_daily_assignments(id), question_id uuid not null references public.golden_questions(id),
  profession text not null references public.golden_question_professions(code), answer jsonb not null, submitted_at timestamptz not null default now(),
  is_correct boolean, review_status text not null default 'not_required' check(review_status in ('not_required','pending','approved','rejected')),
  points_awarded integer not null default 0, base_points integer not null default 0, streak_bonus integer not null default 0,
  speed_bonus integer not null default 0, answer_duration_seconds integer not null check(answer_duration_seconds between 0 and 86400),
  suspicious_flags jsonb not null default '[]', client_fingerprint_hash text, unique(user_id,daily_question_id)
);
create table if not exists public.golden_question_monthly_scores(
  id uuid primary key default gen_random_uuid(), competition_month date not null, profession text not null references public.golden_question_professions(code),
  user_id uuid not null references auth.users(id) on delete cascade, points integer not null default 0, correct_answers integer not null default 0,
  attempts integer not null default 0, current_streak integer not null default 0, longest_streak integer not null default 0,
  final_score_achieved_at timestamptz, is_disqualified boolean not null default false, disqualification_reason text,
  updated_at timestamptz not null default now(), unique(competition_month,profession,user_id)
);
create table if not exists public.golden_question_leaderboard_snapshots(
  id uuid primary key default gen_random_uuid(), competition_month date not null, profession text not null,
  rankings jsonb not null, frozen_at timestamptz not null default now(), frozen_by uuid references auth.users(id), unique(competition_month,profession)
);
create table if not exists public.golden_question_winners(
  id uuid primary key default gen_random_uuid(), competition_month date not null, profession text not null, user_id uuid not null references auth.users(id),
  verification_status text not null default 'pending_review' check(verification_status in ('pending_review','approved','rejected')),
  verification_notes text, reward_status text not null default 'pending' check(reward_status in ('pending','awarded','withheld')),
  bc_reward integer not null default 500, wallet_transaction_id uuid references public.btv_wallet_transactions(id), approved_by uuid references auth.users(id),
  approved_at timestamptz, created_at timestamptz not null default now(), unique(competition_month,profession), unique(wallet_transaction_id)
);
create table if not exists public.golden_question_comments(
  id uuid primary key default gen_random_uuid(), daily_question_id uuid not null references public.golden_question_daily_assignments(id),
  user_id uuid not null references auth.users(id) on delete cascade, body text not null check(char_length(body) between 2 and 2000),
  status text not null default 'visible' check(status in ('visible','hidden','removed')), educator_reviewed boolean not null default false,
  like_count integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.golden_question_comment_reports(
  id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.golden_question_comments(id) on delete cascade,
  reported_by uuid not null references auth.users(id), category text not null check(category in ('unsafe_clinical_advice','harassment','spam','confidentiality_breach','misinformation')),
  details text, status text not null default 'open', reviewed_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(comment_id,reported_by)
);
create table if not exists public.golden_question_comment_likes(
  comment_id uuid not null references public.golden_question_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(comment_id,user_id)
);
create table if not exists public.golden_question_share_events(
  id uuid primary key default gen_random_uuid(), daily_question_id uuid references public.golden_question_daily_assignments(id), user_id uuid references auth.users(id),
  channel text not null, created_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create table if not exists public.golden_question_sponsors(
  id uuid primary key default gen_random_uuid(), name text not null, logo_path text, logo_permission_notes text, is_active boolean not null default true,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.golden_question_prize_fulfilments(
  id uuid primary key default gen_random_uuid(), winner_id uuid not null unique references public.golden_question_winners(id), sponsor_id uuid references public.golden_question_sponsors(id),
  prize_description text, winner_contacted_at timestamptz, delivery_information_requested_at timestamptz,
  dispatch_status text not null default 'not_started', tracking_reference text, private_notes text, completed_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.golden_question_admin_audit_logs(
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users(id), action text not null,
  entity_type text not null, entity_id uuid, before_data jsonb, after_data jsonb, reason text, created_at timestamptz not null default now()
);
create table if not exists public.golden_question_terms_acceptances(
  user_id uuid not null references auth.users(id) on delete cascade, terms_version text not null, accepted_at timestamptz not null default now(),
  primary key(user_id,terms_version)
);
create table if not exists public.golden_question_analytics_events(
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  daily_question_id uuid references public.golden_question_daily_assignments(id) on delete cascade,
  event_type text not null check(event_type in ('impression','attempt_started','attempt_completed','history_view','leaderboard_view','discussion_view')),
  profession text, duration_seconds integer, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create unique index if not exists golden_impression_once_uq on public.golden_question_analytics_events(user_id,daily_question_id,event_type) where event_type='impression';
create index if not exists golden_analytics_type_date_idx on public.golden_question_analytics_events(event_type,created_at desc);
create table if not exists public.golden_question_request_events(
  id bigint generated always as identity primary key, actor_hash text not null, action text not null, created_at timestamptz not null default now()
);
create index if not exists golden_request_limit_idx on public.golden_question_request_events(actor_hash,action,created_at desc);

create index if not exists golden_questions_pool_idx on public.golden_questions(profession,status,is_active,publication_date);
create index if not exists golden_attempts_user_idx on public.golden_question_attempts(user_id,submitted_at desc);
create index if not exists golden_attempts_question_idx on public.golden_question_attempts(daily_question_id);
create index if not exists golden_scores_rank_idx on public.golden_question_monthly_scores(competition_month,profession,is_disqualified,points desc,correct_answers desc);
create index if not exists golden_comments_question_idx on public.golden_question_comments(daily_question_id,created_at);
create index if not exists golden_winners_reward_idx on public.golden_question_winners(reward_status,verification_status);

do $$ declare t text; begin foreach t in array array[
 'golden_question_professions','golden_question_settings','golden_questions','golden_question_options','golden_question_daily_assignments',
 'golden_question_attempts','golden_question_monthly_scores','golden_question_leaderboard_snapshots','golden_question_winners',
 'golden_question_comments','golden_question_comment_reports','golden_question_comment_likes','golden_question_share_events','golden_question_sponsors',
 'golden_question_prize_fulfilments','golden_question_admin_audit_logs','golden_question_terms_acceptances','golden_question_analytics_events','golden_question_request_events'
] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

-- Admins can manage competition records. Participant access is deliberately narrow; answer payloads stay server-side.
do $$ declare t text; begin foreach t in array array[
 'golden_question_professions','golden_question_settings','golden_questions','golden_question_options','golden_question_daily_assignments',
 'golden_question_attempts','golden_question_monthly_scores','golden_question_leaderboard_snapshots','golden_question_winners',
 'golden_question_comments','golden_question_comment_reports','golden_question_comment_likes','golden_question_share_events','golden_question_sponsors',
 'golden_question_prize_fulfilments','golden_question_admin_audit_logs','golden_question_terms_acceptances','golden_question_analytics_events','golden_question_request_events'
] loop execute format('create policy %I on public.%I for all to authenticated using (private.btv_is_admin()) with check (private.btv_is_admin())','golden_admin_'||t,t); end loop; end $$;
create policy golden_own_attempts on public.golden_question_attempts for select to authenticated using((select auth.uid())=user_id);
create policy golden_own_scores on public.golden_question_monthly_scores for select to authenticated using((select auth.uid())=user_id);
create policy golden_visible_comments on public.golden_question_comments for select to authenticated using(status='visible');
create policy golden_own_terms on public.golden_question_terms_acceptances for select to authenticated using((select auth.uid())=user_id);

revoke all on public.golden_question_professions,public.golden_question_settings,public.golden_questions,public.golden_question_options,
 public.golden_question_daily_assignments,public.golden_question_attempts,public.golden_question_monthly_scores,
 public.golden_question_leaderboard_snapshots,public.golden_question_winners,public.golden_question_comments,
 public.golden_question_comment_reports,public.golden_question_comment_likes,public.golden_question_share_events,public.golden_question_sponsors,
 public.golden_question_prize_fulfilments,public.golden_question_admin_audit_logs,public.golden_question_terms_acceptances from anon,authenticated;
revoke all on public.golden_question_analytics_events,public.golden_question_request_events from anon,authenticated;
grant select on public.golden_question_attempts,public.golden_question_monthly_scores,public.golden_question_comments,public.golden_question_terms_acceptances to authenticated;
grant select,insert,update,delete on public.golden_question_professions,public.golden_question_settings,public.golden_questions,
 public.golden_question_options,public.golden_question_daily_assignments,public.golden_question_attempts,
 public.golden_question_monthly_scores,public.golden_question_leaderboard_snapshots,public.golden_question_winners,
 public.golden_question_comments,public.golden_question_comment_reports,public.golden_question_comment_likes,public.golden_question_share_events,
 public.golden_question_sponsors,public.golden_question_prize_fulfilments,public.golden_question_admin_audit_logs,
 public.golden_question_terms_acceptances,public.golden_question_analytics_events,public.golden_question_request_events to service_role;
grant usage,select on sequence public.golden_question_request_events_id_seq to service_role;

alter table public.btv_wallet_transactions drop constraint if exists btv_wallet_transactions_transaction_type_check;
alter table public.btv_wallet_transactions add constraint btv_wallet_transactions_transaction_type_check check(transaction_type in
 ('welcome','mock_charge','mock_refund','mentor_charge','mentor_refund','reward','purchase','purchase_refund','admin_adjustment','spend','refund','reversal','correction','expiry','promotional_credit','admin_credit','admin_deduction','golden_question_monthly_prize'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('golden-question-images','golden-question-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
create policy golden_images_admin_read on storage.objects for select to authenticated using(bucket_id='golden-question-images' and private.btv_is_admin());
create policy golden_images_admin_insert on storage.objects for insert to authenticated with check(bucket_id='golden-question-images' and private.btv_is_admin() and (storage.foldername(name))[1]='questions');
create policy golden_images_admin_update on storage.objects for update to authenticated using(bucket_id='golden-question-images' and private.btv_is_admin()) with check(bucket_id='golden-question-images' and private.btv_is_admin());
create policy golden_images_admin_delete on storage.objects for delete to authenticated using(bucket_id='golden-question-images' and private.btv_is_admin());

-- Atomic attempt ledger update. Only the service role may call it after secure answer validation.
create or replace function public.btv_record_golden_attempt(
 p_user uuid,p_daily uuid,p_question uuid,p_profession text,p_answer jsonb,p_correct boolean,p_base integer,p_speed integer,p_duration integer,p_review text default 'not_required'
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare d date; m date; streak integer:=1; bonus integer:=0; total integer; prior date; bonuses jsonb; score golden_question_monthly_scores%rowtype;
begin
 select assignment_date into d from golden_question_daily_assignments where id=p_daily and question_id=p_question and profession=p_profession and status='active' for update;
 if d is null then raise exception 'QUESTION_UNAVAILABLE'; end if;
 if exists(select 1 from golden_question_attempts where user_id=p_user and daily_question_id=p_daily) then raise exception 'ALREADY_ANSWERED'; end if;
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
 return jsonb_build_object('points_awarded',total,'streak_bonus',bonus,'current_streak',streak,'monthly_points',score.points);
end $$;
revoke all on function public.btv_record_golden_attempt(uuid,uuid,uuid,text,jsonb,boolean,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.btv_record_golden_attempt(uuid,uuid,uuid,text,jsonb,boolean,integer,integer,integer,text) to service_role;

create or replace function public.btv_review_golden_short_answer(p_attempt uuid,p_correct boolean,p_admin uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare a golden_question_attempts%rowtype; q golden_questions%rowtype; d date; m date; award integer:=0;
begin
 select * into a from golden_question_attempts where id=p_attempt for update;
 if not found or a.review_status<>'pending' then raise exception 'ANSWER_NOT_PENDING'; end if;
 select * into q from golden_questions where id=a.question_id; select assignment_date into d from golden_question_daily_assignments where id=a.daily_question_id; m:=date_trunc('month',d)::date;
 if p_correct then award:=coalesce(q.base_points,(select correct_points from golden_question_settings where id=true)); end if;
 update golden_question_attempts set is_correct=p_correct,review_status=case when p_correct then 'approved' else 'rejected' end,base_points=award,points_awarded=award where id=p_attempt;
 update golden_question_monthly_scores set points=points+award,correct_answers=correct_answers+case when p_correct then 1 else 0 end,final_score_achieved_at=case when award>0 then now() else final_score_achieved_at end,updated_at=now() where competition_month=m and profession=a.profession and user_id=a.user_id;
 insert into golden_question_admin_audit_logs(admin_id,action,entity_type,entity_id,after_data,reason) values(p_admin,'short_answer_reviewed','attempt',p_attempt,jsonb_build_object('correct',p_correct,'points',award),'Manual educator review');
 return jsonb_build_object('reviewed',true,'correct',p_correct,'points_awarded',award);
end $$;
revoke all on function public.btv_review_golden_short_answer(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.btv_review_golden_short_answer(uuid,boolean,uuid) to service_role;

-- Idempotent winner reward using the existing Beyond Coins wallet and immutable ledger.
create or replace function public.btv_award_golden_winner(p_winner uuid,p_admin uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare win golden_question_winners%rowtype; w btv_wallets%rowtype; tx uuid; new_balance integer;
begin
 select * into win from golden_question_winners where id=p_winner for update;
 if not found or win.verification_status<>'approved' then raise exception 'WINNER_NOT_APPROVED'; end if;
 if win.reward_status='awarded' then return jsonb_build_object('awarded',true,'transaction_id',win.wallet_transaction_id,'idempotent',true); end if;
 select * into w from btv_wallets where user_id=win.user_id for update;
 if not found then insert into btv_wallets(user_id,balance) values(win.user_id,0) returning * into w; end if;
 new_balance:=w.balance+win.bc_reward;
 insert into btv_wallet_transactions(user_id,wallet_id,amount,balance_before,balance_after,transaction_type,source_type,source_id_text,reference_type,reference_id,description,idempotency_key,metadata,status,admin_id)
 values(win.user_id,win.user_id,win.bc_reward,w.balance,new_balance,'golden_question_monthly_prize','golden_question',win.id::text,'golden_question_winner',win.id,
  initcap(win.profession)||' Golden Question monthly prize','golden-question-winner:'||win.id,jsonb_build_object('competition_month',win.competition_month,'profession',win.profession,'winner_id',win.id),'completed',p_admin)
 returning id into tx;
 update btv_wallets set balance=new_balance,updated_at=now() where user_id=win.user_id;
 update golden_question_winners set reward_status='awarded',wallet_transaction_id=tx,approved_by=p_admin,approved_at=coalesce(approved_at,now()) where id=win.id;
 insert into btv_notifications(user_id,category,title,body,action_url,dedupe_key) values(win.user_id,'golden_question','Golden Question Champion','Congratulations! You received '||win.bc_reward||' BC and a surprise sponsor package.','/?golden=leaderboard','golden-winner:'||win.id);
 return jsonb_build_object('awarded',true,'transaction_id',tx,'balance',new_balance);
exception when unique_violation then
 select wallet_transaction_id into tx from golden_question_winners where id=p_winner;
 return jsonb_build_object('awarded',true,'transaction_id',tx,'idempotent',true);
end $$;
revoke all on function public.btv_award_golden_winner(uuid,uuid) from public,anon,authenticated;
grant execute on function public.btv_award_golden_winner(uuid,uuid) to service_role;

-- Server cron can call this after month end, then admins verify the pending winners.
create or replace function public.btv_freeze_golden_month(p_month date,p_admin uuid default null) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare prof record; rankings jsonb; champion uuid; made integer:=0;
begin
 for prof in select code from golden_question_professions where is_active loop
  select coalesce(jsonb_agg(to_jsonb(r) order by r.position),'[]') into rankings from (
   select row_number() over(order by points desc,correct_answers desc,(correct_answers::numeric/nullif(attempts,0)) desc,longest_streak desc,final_score_achieved_at asc) position,user_id,points,correct_answers,attempts,longest_streak
   from golden_question_monthly_scores where competition_month=date_trunc('month',p_month)::date and profession=prof.code and not is_disqualified) r;
  insert into golden_question_leaderboard_snapshots(competition_month,profession,rankings,frozen_by) values(date_trunc('month',p_month)::date,prof.code,rankings,p_admin) on conflict do nothing;
  select user_id into champion from golden_question_monthly_scores where competition_month=date_trunc('month',p_month)::date and profession=prof.code and not is_disqualified order by points desc,correct_answers desc,(correct_answers::numeric/nullif(attempts,0)) desc,longest_streak desc,final_score_achieved_at asc limit 1;
  if champion is not null then insert into golden_question_winners(competition_month,profession,user_id) values(date_trunc('month',p_month)::date,prof.code,champion) on conflict do nothing; made:=made+1; end if;
  insert into btv_user_achievements(user_id,achievement_code)
   select user_id,(select full_month_badge_code from golden_question_settings where id=true)
   from golden_question_monthly_scores where competition_month=date_trunc('month',p_month)::date and profession=prof.code
    and attempts>=extract(day from (date_trunc('month',p_month)+interval '1 month - 1 day'))::integer
   on conflict do nothing;
 end loop; return made;
end $$;
revoke all on function public.btv_freeze_golden_month(date,uuid) from public,anon,authenticated;
grant execute on function public.btv_freeze_golden_month(date,uuid) to service_role;
