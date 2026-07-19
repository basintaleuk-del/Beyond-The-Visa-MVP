-- Phase 5 foundation. Extends existing CBT/NCLEX tables without replacing reviewed content.
create table if not exists public.btv_learning_settings(
  key text primary key, value jsonb not null, description text, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
insert into public.btv_learning_settings(key,value,description) values
('daily_free_practice_limit','10'::jsonb,'Maximum daily CBT or NCLEX practice answers per user and module')
on conflict(key) do nothing;
alter table public.btv_learning_settings enable row level security;
drop policy if exists learning_settings_read on public.btv_learning_settings;
create policy learning_settings_read on public.btv_learning_settings for select using(true);
drop policy if exists learning_settings_admin on public.btv_learning_settings;
create policy learning_settings_admin on public.btv_learning_settings for all using(public.btv_is_admin()) with check(public.btv_is_admin());
grant select on public.btv_learning_settings to authenticated;
grant insert,update,delete on public.btv_learning_settings to authenticated;

create table if not exists public.btv_question_reports(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check(module in ('cbt','nclex','ielts','osce','calculations')),
  question_id text not null, reason text not null, details text, status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth.users(id)
);
alter table public.btv_question_reports enable row level security;
drop policy if exists question_reports_own on public.btv_question_reports;
create policy question_reports_own on public.btv_question_reports for select using(user_id=auth.uid() or public.btv_is_admin());
drop policy if exists question_reports_submit on public.btv_question_reports;
create policy question_reports_submit on public.btv_question_reports for insert with check(user_id=auth.uid());
drop policy if exists question_reports_admin on public.btv_question_reports;
create policy question_reports_admin on public.btv_question_reports for update using(public.btv_is_admin()) with check(public.btv_is_admin());
grant select,insert,update on public.btv_question_reports to authenticated;

insert into public.btv_mock_catalog(code,title,exam_type,mock_category,coin_cost,duration_minutes,question_count,configuration) values
('cbt_full','CBT Standard Mock','cbt','standard',50,60,60,'{"pass_percentage":68,"autosave":true}'::jsonb),
('cbt_short','CBT Short Mock','cbt','short',25,30,30,'{"pass_percentage":68,"autosave":true}'::jsonb),
('nclex_full','NCLEX Standard Mock','nclex','standard',50,60,60,'{"autosave":true}'::jsonb),
('nclex_short','NCLEX Short Mock','nclex','short',25,30,30,'{"autosave":true}'::jsonb)
on conflict(code) do update set title=excluded.title,exam_type=excluded.exam_type,mock_category=excluded.mock_category,coin_cost=excluded.coin_cost,duration_minutes=excluded.duration_minutes,question_count=excluded.question_count,configuration=excluded.configuration;

create or replace function public.btv_enforce_daily_practice_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare max_answers integer:=10; used integer:=0; table_name text:=tg_table_name;
begin
 if new.mode<>'practice' then return new; end if;
 select coalesce((value#>>'{}')::integer,10) into max_answers from public.btv_learning_settings where key='daily_free_practice_limit';
 if table_name='cbt_attempts' then execute 'select count(*) from public.cbt_attempts where user_id=$1 and mode=''practice'' and created_at>=current_date' into used using new.user_id;
 elsif table_name='nclex_attempts' then execute 'select count(*) from public.nclex_attempts where user_id=$1 and mode=''practice'' and created_at>=current_date' into used using new.user_id;
 end if;
 if used>=max_answers then raise exception 'DAILY_PRACTICE_LIMIT:%',max_answers; end if;return new;
end $$;
do $$ begin
 if to_regclass('public.cbt_attempts') is not null then execute 'drop trigger if exists btv_cbt_daily_limit on public.cbt_attempts';execute 'create trigger btv_cbt_daily_limit before insert on public.cbt_attempts for each row execute function public.btv_enforce_daily_practice_limit()';end if;
 if to_regclass('public.nclex_attempts') is not null then execute 'drop trigger if exists btv_nclex_daily_limit on public.nclex_attempts';execute 'create trigger btv_nclex_daily_limit before insert on public.nclex_attempts for each row execute function public.btv_enforce_daily_practice_limit()';end if;
end $$;
