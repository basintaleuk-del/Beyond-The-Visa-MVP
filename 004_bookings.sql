-- 003: video courses, lessons, progress and resources
create table if not exists public.video_courses (
 id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
 description text not null default '', country text, exam text, category text,
 thumbnail_url text, access_level text not null default 'free' check(access_level in ('free','premium')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 sort_order int not null default 0, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.video_lessons (
 id uuid primary key default gen_random_uuid(), course_id uuid references public.video_courses(id) on delete cascade,
 title text not null, description text not null default '', presenter text, duration_seconds int not null default 0,
 video_provider text not null default 'youtube' check(video_provider in ('youtube','vimeo','storage','external')),
 video_url text not null, thumbnail_url text, captions text, transcript text,
 access_level text not null default 'free' check(access_level in ('free','premium')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.video_progress (
 user_id uuid references auth.users(id) on delete cascade, lesson_id uuid references public.video_lessons(id) on delete cascade,
 seconds_watched int not null default 0, completed boolean not null default false,
 last_watched_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table if not exists public.video_bookmarks (
 user_id uuid references auth.users(id) on delete cascade, lesson_id uuid references public.video_lessons(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table if not exists public.lesson_resources (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.video_lessons(id) on delete cascade,
 title text not null, resource_type text not null check(resource_type in ('pdf','link','notes')),
 external_url text, storage_path text, access_level text not null default 'free' check(access_level in ('free','premium')),
 sort_order int not null default 0, created_at timestamptz not null default now(), check(external_url is not null or storage_path is not null)
);
create index if not exists courses_library_idx on public.video_courses(status,country,exam,category,sort_order);
create index if not exists lessons_course_idx on public.video_lessons(course_id,status,sort_order);
create index if not exists progress_continue_idx on public.video_progress(user_id,completed,last_watched_at desc);
alter table public.video_courses enable row level security;
alter table public.video_lessons enable row level security;
alter table public.video_progress enable row level security;
alter table public.video_bookmarks enable row level security;
alter table public.lesson_resources enable row level security;
drop policy if exists "courses audience read" on public.video_courses;
create policy "courses audience read" on public.video_courses for select to authenticated using(public.btv_is_admin() or (status='published' and (access_level='free' or public.btv_is_premium())));
drop policy if exists "courses admin write" on public.video_courses;
create policy "courses admin write" on public.video_courses for all to authenticated using(public.btv_is_admin()) with check(public.btv_is_admin());
drop policy if exists "lessons audience read" on public.video_lessons;
create policy "lessons audience read" on public.video_lessons for select to authenticated using(public.btv_is_admin() or (status='published' and (access_level='free' or public.btv_is_premium())));
drop policy if exists "lessons admin write" on public.video_lessons;
create policy "lessons admin write" on public.video_lessons for all to authenticated using(public.btv_is_admin()) with check(public.btv_is_admin());
drop policy if exists "progress owner" on public.video_progress;
create policy "progress owner" on public.video_progress for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "video bookmarks owner" on public.video_bookmarks;
create policy "video bookmarks owner" on public.video_bookmarks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "lesson resources audience" on public.lesson_resources;
create policy "lesson resources audience" on public.lesson_resources for select to authenticated using(public.btv_is_admin() or access_level='free' or public.btv_is_premium());
drop policy if exists "lesson resources admin" on public.lesson_resources;
create policy "lesson resources admin" on public.lesson_resources for all to authenticated using(public.btv_is_admin()) with check(public.btv_is_admin());
do $$ declare t text; begin foreach t in array array['video_courses','video_lessons','lesson_resources'] loop execute format('drop trigger if exists btv_admin_audit on public.%I',t);execute format('create trigger btv_admin_audit after insert or update or delete on public.%I for each row execute function public.btv_audit_admin_change()',t);end loop;end $$;
