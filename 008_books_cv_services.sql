-- Beyond The Visa: books, onboarding and standalone CV services
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(), title text not null, author text, description text,
  pathway text not null default 'all' check (pathway in ('all','osce','cbt','nclex')),
  access_level text not null default 'subscriber' check (access_level in ('subscriber','premium')),
  file_path text not null, cover_path text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  uploaded_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cv_service_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  service_type text not null check (service_type in ('review','rewrite')), career_band text, target_role text,
  deadline date, notes text,
  status text not null default 'payment_pending' check (status in ('payment_pending','requested','in_progress','completed','cancelled')),
  payment_reference text, cv_file_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.books enable row level security;
alter table public.cv_service_requests enable row level security;
create or replace function public.is_btv_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
drop policy if exists "subscribers read published books" on public.books;
create policy "subscribers read published books" on public.books for select to authenticated using (status='published');
drop policy if exists "admins manage books" on public.books;
create policy "admins manage books" on public.books for all to authenticated using (public.is_btv_admin()) with check (public.is_btv_admin());
drop policy if exists "users read own cv requests" on public.cv_service_requests;
create policy "users read own cv requests" on public.cv_service_requests for select to authenticated using (user_id=auth.uid() or public.is_btv_admin());
drop policy if exists "users create own cv requests" on public.cv_service_requests;
create policy "users create own cv requests" on public.cv_service_requests for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "users update own cv requests" on public.cv_service_requests;
create policy "users update own cv requests" on public.cv_service_requests for update to authenticated using (user_id=auth.uid() or public.is_btv_admin()) with check (user_id=auth.uid() or public.is_btv_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('btv-books','btv-books',false,52428800,array['application/pdf']),
 ('btv-cv-services','btv-cv-services',false,10485760,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "admins manage book files" on storage.objects;
create policy "admins manage book files" on storage.objects for all to authenticated using (bucket_id='btv-books' and public.is_btv_admin()) with check (bucket_id='btv-books' and public.is_btv_admin());
drop policy if exists "subscribers read book files" on storage.objects;
create policy "subscribers read book files" on storage.objects for select to authenticated using (bucket_id='btv-books');
drop policy if exists "users upload own cv" on storage.objects;
create policy "users upload own cv" on storage.objects for insert to authenticated with check (bucket_id='btv-cv-services' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "users read own cv" on storage.objects;
create policy "users read own cv" on storage.objects for select to authenticated using (bucket_id='btv-cv-services' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_btv_admin()));
drop policy if exists "admins manage cv files" on storage.objects;
create policy "admins manage cv files" on storage.objects for all to authenticated using (bucket_id='btv-cv-services' and public.is_btv_admin()) with check (bucket_id='btv-cv-services' and public.is_btv_admin());
