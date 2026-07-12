-- Run once in Supabase Dashboard > SQL Editor.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('btv-user-files','btv-user-files',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "btv users read own files" on storage.objects;
drop policy if exists "btv users upload own files" on storage.objects;
drop policy if exists "btv users update own files" on storage.objects;
drop policy if exists "btv users delete own files" on storage.objects;

create policy "btv users read own files" on storage.objects for select to authenticated
using (bucket_id='btv-user-files' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "btv users upload own files" on storage.objects for insert to authenticated
with check (bucket_id='btv-user-files' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "btv users update own files" on storage.objects for update to authenticated
using (bucket_id='btv-user-files' and (storage.foldername(name))[1]=(select auth.uid()::text))
with check (bucket_id='btv-user-files' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "btv users delete own files" on storage.objects for delete to authenticated
using (bucket_id='btv-user-files' and (storage.foldername(name))[1]=(select auth.uid()::text));
