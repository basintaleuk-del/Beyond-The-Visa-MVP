-- Run once in Supabase Dashboard > SQL Editor before deploying v31.
-- Adds an auditable terms record and a cross-device profile-photo pointer.

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

-- Defence in depth: ordinary users can edit their profile but cannot promote
-- their account or rewrite an acceptance record after it has been recorded.
create or replace function public.btv_protect_profile_v31_fields()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if not public.btv_is_admin() then
    new.role := old.role;
    new.account_type := old.account_type;
  end if;
  new.terms_version := coalesce(old.terms_version,new.terms_version);
  new.terms_accepted_at := coalesce(old.terms_accepted_at,new.terms_accepted_at);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists btv_protect_profile_v31_fields_trigger on public.profiles;
create trigger btv_protect_profile_v31_fields_trigger
before update on public.profiles
for each row execute function public.btv_protect_profile_v31_fields();

-- Users may read and update only their own profile. Admin policies remain additive.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile" on public.profiles
for insert to authenticated with check (
  id = (select auth.uid())
  and terms_version is not null
  and terms_accepted_at is not null
);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- The existing private btv-user-files bucket policies restrict every object to
-- a first folder matching auth.uid(). Avatars are stored at:
--   <user-id>/avatar/profile.<extension>
