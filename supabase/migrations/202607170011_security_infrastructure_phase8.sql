-- Phase 8: storage, monitoring, and secure upload boundaries.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('learning-media','learning-media',false,52428800,array['image/png','image/jpeg','image/webp','application/pdf','text/vtt','video/mp4']),
('btv-books','btv-books',false,52428800,array['application/pdf']),
('btv-cv-services','btv-cv-services',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
('ielts-audio','ielts-audio',false,26214400,array['audio/mpeg','audio/wav','audio/mp4','audio/webm']),
('profile-photos','profile-photos',true,5242880,array['image/png','image/jpeg','image/webp']),
('user-documents','user-documents',false,15728640,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id)do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types,public=excluded.public;

drop policy if exists phase8_admin_learning_media on storage.objects;
create policy phase8_admin_learning_media on storage.objects for all to authenticated using(bucket_id in('learning-media','btv-books','ielts-audio') and public.btv_is_admin()) with check(bucket_id in('learning-media','btv-books','ielts-audio') and public.btv_is_admin());
drop policy if exists phase8_member_learning_read on storage.objects;
create policy phase8_member_learning_read on storage.objects for select to authenticated using(bucket_id in('learning-media','btv-books','ielts-audio'));
drop policy if exists phase8_own_cv_files on storage.objects;
create policy phase8_own_cv_files on storage.objects for all to authenticated using(bucket_id='btv-cv-services' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='btv-cv-services' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists phase8_own_documents on storage.objects;
create policy phase8_own_documents on storage.objects for all to authenticated using(bucket_id='user-documents' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='user-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists phase8_own_profile_write on storage.objects;
create policy phase8_own_profile_write on storage.objects for all to authenticated using(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists phase8_profile_public_read on storage.objects;
create policy phase8_profile_public_read on storage.objects for select to public using(bucket_id='profile-photos');

create table if not exists public.btv_client_events(id bigint generated always as identity primary key,user_id uuid references auth.users(id) on delete set null,event_type text not null,message text not null,route text,app_version text,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create index if not exists btv_client_events_recent on public.btv_client_events(created_at desc);
alter table public.btv_client_events enable row level security;
drop policy if exists own_event_insert on public.btv_client_events;create policy own_event_insert on public.btv_client_events for insert to authenticated with check(user_id=auth.uid());
drop policy if exists admin_event_read on public.btv_client_events;create policy admin_event_read on public.btv_client_events for select to authenticated using(public.btv_is_admin());
grant insert,select on public.btv_client_events to authenticated;grant usage,select on sequence public.btv_client_events_id_seq to authenticated;

