create table if not exists public.btv_clinical_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  subtitle text not null default '',
  summary text not null default '',
  category text not null,
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  estimated_minutes integer not null default 45 check (estimated_minutes between 5 and 600),
  icon text not null default 'CLINICAL',
  tags text[] not null default '{}',
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','unpublished','archived')),
  published boolean generated always as (status = 'published') stored,
  clinical_review_status text not null default 'awaiting_clinical_review'
    check (clinical_review_status in ('awaiting_clinical_review','in_clinical_review','changes_requested','clinically_reviewed','review_expired')),
  reviewer_name text,
  reviewer_role text,
  reviewed_at timestamptz,
  next_review_at timestamptz,
  review_notes text,
  version text not null default '1.0.0',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    clinical_review_status <> 'clinically_reviewed'
    or (reviewer_name is not null and reviewer_role is not null and reviewed_at is not null)
  )
);

create table if not exists public.btv_clinical_module_versions (
  id bigint generated always as identity primary key,
  module_id uuid not null references public.btv_clinical_modules(id) on delete cascade,
  version text not null,
  snapshot jsonb not null,
  action text not null check (action in ('created','updated','submitted_for_review','reviewed','published','unpublished','archived')),
  change_summary text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.btv_clinical_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_slug text not null,
  viewed_sections text[] not null default '{}',
  attempted_checks text[] not null default '{}',
  correct_checks integer not null default 0 check (correct_checks >= 0),
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  last_section_id text,
  opened_at timestamptz,
  last_studied_at timestamptz not null default now(),
  completed_at timestamptz,
  confidence_rating smallint check (confidence_rating between 1 and 5),
  primary key (user_id,module_slug)
);

create table if not exists public.btv_clinical_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id,module_slug)
);

create table if not exists public.btv_clinical_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_slug text not null,
  section_id text not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id,module_slug,section_id)
);

create table if not exists public.btv_clinical_check_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_slug text not null,
  check_id text not null,
  answer text not null default '',
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists btv_clinical_modules_public_idx on public.btv_clinical_modules(status,sort_order);
create index if not exists btv_clinical_versions_module_idx on public.btv_clinical_module_versions(module_id,created_at desc);
create index if not exists btv_clinical_attempts_user_idx on public.btv_clinical_check_attempts(user_id,module_slug,attempted_at desc);

alter table public.btv_clinical_modules enable row level security;
alter table public.btv_clinical_module_versions enable row level security;
alter table public.btv_clinical_progress enable row level security;
alter table public.btv_clinical_bookmarks enable row level security;
alter table public.btv_clinical_notes enable row level security;
alter table public.btv_clinical_check_attempts enable row level security;

create policy clinical_modules_learner_read on public.btv_clinical_modules
for select to authenticated using (status = 'published' or public.btv_is_admin());
create policy clinical_modules_admin_all on public.btv_clinical_modules
for all to authenticated using (public.btv_is_admin()) with check (public.btv_is_admin());
create policy clinical_versions_admin_all on public.btv_clinical_module_versions
for all to authenticated using (public.btv_is_admin()) with check (public.btv_is_admin());

create policy clinical_progress_owner on public.btv_clinical_progress
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy clinical_bookmarks_owner on public.btv_clinical_bookmarks
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy clinical_notes_owner on public.btv_clinical_notes
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy clinical_attempts_owner on public.btv_clinical_check_attempts
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.btv_clinical_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := now();
    new.published_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists btv_clinical_modules_updated on public.btv_clinical_modules;
create trigger btv_clinical_modules_updated before update on public.btv_clinical_modules
for each row execute function public.btv_clinical_set_updated_at();

create or replace function public.btv_clinical_capture_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.btv_clinical_module_versions(module_id,version,snapshot,action,changed_by)
  values (
    new.id,
    new.version,
    to_jsonb(new),
    case
      when tg_op = 'INSERT' then 'created'
      when new.status = 'published' and old.status is distinct from 'published' then 'published'
      when new.status = 'archived' and old.status is distinct from 'archived' then 'archived'
      when new.status = 'unpublished' and old.status is distinct from 'unpublished' then 'unpublished'
      when new.clinical_review_status = 'clinically_reviewed' and old.clinical_review_status is distinct from 'clinically_reviewed' then 'reviewed'
      when new.clinical_review_status = 'in_clinical_review' and old.clinical_review_status is distinct from 'in_clinical_review' then 'submitted_for_review'
      else 'updated'
    end,
    auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists btv_clinical_modules_versioned on public.btv_clinical_modules;
create trigger btv_clinical_modules_versioned after insert or update on public.btv_clinical_modules
for each row execute function public.btv_clinical_capture_version();

grant select on public.btv_clinical_modules to authenticated;
grant all on public.btv_clinical_progress, public.btv_clinical_bookmarks, public.btv_clinical_notes, public.btv_clinical_check_attempts to authenticated;
grant all on public.btv_clinical_modules, public.btv_clinical_module_versions to authenticated;
grant usage,select on all sequences in schema public to authenticated;
