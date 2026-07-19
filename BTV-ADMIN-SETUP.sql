-- Beyond The Visa Admin Portal database permissions
-- Run once in Supabase SQL Editor after the profile, CBT and NCLEX setup scripts.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Prevent ordinary users from changing protected account fields through profile updates.
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.account_type := old.account_type;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
create trigger protect_profile_admin_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_admin_fields();

-- Admin access to user profiles.
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
on public.profiles for select to authenticated
using (public.is_admin());

drop policy if exists "Admins update all profiles" on public.profiles;
create policy "Admins update all profiles"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CBT question management.
drop policy if exists "Admins manage CBT questions" on public.cbt_questions;
create policy "Admins manage CBT questions"
on public.cbt_questions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read all CBT attempts" on public.cbt_attempts;
create policy "Admins read all CBT attempts"
on public.cbt_attempts for select to authenticated
using (public.is_admin());

drop policy if exists "Admins read all CBT results" on public.mock_exam_results;
create policy "Admins read all CBT results"
on public.mock_exam_results for select to authenticated
using (public.is_admin());

-- NCLEX question management.
drop policy if exists "Admins manage NCLEX questions" on public.nclex_questions;
create policy "Admins manage NCLEX questions"
on public.nclex_questions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read all NCLEX attempts" on public.nclex_attempts;
create policy "Admins read all NCLEX attempts"
on public.nclex_attempts for select to authenticated
using (public.is_admin());

drop policy if exists "Admins read all NCLEX results" on public.nclex_exam_results;
create policy "Admins read all NCLEX results"
on public.nclex_exam_results for select to authenticated
using (public.is_admin());

-- Make the project owner an administrator. Change this email if needed.
update public.profiles p
set role = 'admin', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('basintaleuk@gmail.com');
