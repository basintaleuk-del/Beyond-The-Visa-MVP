-- IELTS Listening only: immutable, approved ElevenLabs audio assets.
-- No other product/module is permitted to use this pipeline.

create table if not exists public.ielts_listening_recordings (
  id uuid primary key default gen_random_uuid(),
  recording_code text not null unique,
  test_id uuid,
  section_id uuid,
  title text not null,
  script text not null,
  dialogue jsonb not null default '[]'::jsonb,
  default_voice_id text not null,
  model_id text not null default 'eleven_v3',
  generation_settings jsonb not null default '{}'::jsonb,
  language_code text not null default 'en',
  accent text,
  access_level text not null default 'premium' check (access_level in ('free','premium')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(dialogue) = 'array')
);

create table if not exists public.ielts_listening_audio_assets (
  id uuid primary key default gen_random_uuid(),
  test_id uuid,
  section_id uuid,
  question_id uuid,
  recording_id uuid not null references public.ielts_listening_recordings(id) on delete restrict,
  source_text text not null,
  source_text_hash text not null,
  voice_id text not null,
  model_id text not null,
  language_code text not null default 'en',
  accent text,
  generation_settings jsonb not null default '{}'::jsonb,
  storage_bucket text not null default 'ielts-listening-audio' check (storage_bucket = 'ielts-listening-audio'),
  storage_path text not null,
  mime_type text not null default 'audio/mpeg',
  file_size_bytes bigint,
  duration_seconds numeric,
  generation_status text not null default 'generating' check (generation_status in ('generating','completed','failed','invalid','archived')),
  generation_error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_approved boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0)
);

create unique index if not exists ielts_listening_audio_asset_generation_key
  on public.ielts_listening_audio_assets(recording_id, source_text_hash, voice_id, model_id, version);
create unique index if not exists ielts_listening_audio_one_live_version
  on public.ielts_listening_audio_assets(recording_id)
  where is_active and is_approved and generation_status = 'completed';
create index if not exists ielts_listening_audio_assets_lookup
  on public.ielts_listening_audio_assets(recording_id, is_active, is_approved, generation_status);

create table if not exists public.ielts_listening_audio_generation_log (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.ielts_listening_audio_assets(id) on delete set null,
  recording_id uuid references public.ielts_listening_recordings(id) on delete set null,
  requested_by uuid references auth.users(id),
  cache_hit boolean not null default false,
  elevenlabs_request_id text,
  character_count integer not null default 0,
  estimated_credits numeric not null default 0,
  generation_duration_ms integer,
  status text not null,
  error text,
  created_at timestamptz not null default now()
);

insert into public.ielts_listening_recordings(
  recording_code, title, script, default_voice_id, model_id, access_level, is_active
) values (
  'ielts-listening-test-instructions',
  'IELTS Listening test instructions',
  'Welcome to your IELTS Listening practice test. You will hear each recording once. There are no pause or replay controls. Read each question carefully, listen, and then choose or enter your answer. When you are ready, select Start my listening test.',
  'JBFqnCBsd6RMkjVDRZzb',
  'eleven_v3',
  'free',
  true
) on conflict (recording_code) do nothing;

create index if not exists ielts_listening_audio_log_recording_idx
  on public.ielts_listening_audio_generation_log(recording_id, created_at desc);

create or replace function public.btv_claim_ielts_listening_audio_generation(
  p_recording_id uuid,
  p_source_text text,
  p_source_text_hash text,
  p_voice_id text,
  p_model_id text,
  p_language_code text,
  p_accent text,
  p_generation_settings jsonb,
  p_storage_path text,
  p_version integer,
  p_requested_by uuid
) returns table(asset_id uuid, claim_state text)
language plpgsql security definer set search_path = public as $$
declare asset public.ielts_listening_audio_assets;
begin
  select * into asset from public.ielts_listening_audio_assets
  where recording_id = p_recording_id and source_text_hash = p_source_text_hash
    and voice_id = p_voice_id and model_id = p_model_id and version = p_version
  for update;

  if found and asset.generation_status = 'completed' then
    return query select asset.id, 'cached'::text;
    return;
  end if;
  if found and asset.generation_status = 'generating' then
    return query select asset.id, 'pending'::text;
    return;
  end if;
  if found then
    update public.ielts_listening_audio_assets set generation_status='generating', generation_error=null,
      storage_path=p_storage_path, updated_at=now(), created_by=p_requested_by
    where id=asset.id;
    return query select asset.id, 'claimed'::text;
    return;
  end if;

  insert into public.ielts_listening_audio_assets(
    recording_id, source_text, source_text_hash, voice_id, model_id, language_code, accent,
    generation_settings, storage_path, version, created_by
  ) values (
    p_recording_id, p_source_text, p_source_text_hash, p_voice_id, p_model_id, p_language_code,
    p_accent, coalesce(p_generation_settings,'{}'::jsonb), p_storage_path, p_version, p_requested_by
  ) returning id into asset.id;
  return query select asset.id, 'claimed'::text;
end;
$$;

create or replace function public.btv_ielts_listening_audio_report()
returns table(total_generated bigint, cache_reuse_count bigint, cache_hit_rate numeric, total_characters bigint, estimated_credits numeric, failed_generations bigint, storage_used bigint)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where status='completed' and not cache_hit),
    count(*) filter (where cache_hit),
    case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where cache_hit) / count(*), 2) end,
    coalesce(sum(character_count) filter (where not cache_hit),0),
    coalesce(sum(estimated_credits) filter (where not cache_hit),0),
    count(*) filter (where status='failed'),
    coalesce((select sum(file_size_bytes) from public.ielts_listening_audio_assets where generation_status='completed' and is_active),0)
  from public.ielts_listening_audio_generation_log;
$$;

create or replace function public.btv_publish_ielts_listening_audio_asset(p_asset_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare selected_asset public.ielts_listening_audio_assets;
begin
  if not public.btv_is_admin() then raise exception using message='ADMIN_REQUIRED'; end if;
  select * into selected_asset from public.ielts_listening_audio_assets where id=p_asset_id for update;
  if not found or selected_asset.generation_status <> 'completed' then raise exception using message='ASSET_NOT_READY'; end if;
  update public.ielts_listening_audio_assets set is_active=false, updated_at=now()
    where recording_id=selected_asset.recording_id and id<>selected_asset.id and is_active;
  update public.ielts_listening_audio_assets set is_active=true, is_approved=true, approved_by=auth.uid(), approved_at=now(), updated_at=now()
    where id=selected_asset.id;
  return selected_asset.id;
end;
$$;

alter table public.ielts_listening_recordings enable row level security;
alter table public.ielts_listening_audio_assets enable row level security;
alter table public.ielts_listening_audio_generation_log enable row level security;

create policy ielts_listening_recordings_admin on public.ielts_listening_recordings
  for all to authenticated using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy ielts_listening_assets_admin on public.ielts_listening_audio_assets
  for all to authenticated using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy ielts_listening_generation_log_admin on public.ielts_listening_audio_generation_log
  for select to authenticated using (public.btv_is_admin());

revoke all on public.ielts_listening_recordings, public.ielts_listening_audio_assets, public.ielts_listening_audio_generation_log from anon, authenticated;
grant select, insert, update, delete on public.ielts_listening_recordings, public.ielts_listening_audio_assets to authenticated;
grant select on public.ielts_listening_audio_generation_log to authenticated;
revoke all on function public.btv_claim_ielts_listening_audio_generation(uuid,text,text,text,text,text,text,jsonb,text,integer,uuid) from public, anon, authenticated;
revoke all on function public.btv_ielts_listening_audio_report() from public, anon;
revoke all on function public.btv_publish_ielts_listening_audio_asset(uuid) from public, anon;
grant execute on function public.btv_ielts_listening_audio_report() to authenticated;
grant execute on function public.btv_publish_ielts_listening_audio_asset(uuid) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('ielts-listening-audio','ielts-listening-audio',false,52428800,array['audio/mpeg'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Learners receive signed URLs from the Edge Function; they never browse this bucket directly.
drop policy if exists ielts_listening_audio_storage_admin on storage.objects;
create policy ielts_listening_audio_storage_admin on storage.objects for all to authenticated
  using (bucket_id='ielts-listening-audio' and public.btv_is_admin())
  with check (bucket_id='ielts-listening-audio' and public.btv_is_admin());
