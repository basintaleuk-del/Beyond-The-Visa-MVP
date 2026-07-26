-- Keep one permissive SELECT policy while retaining explicit admin-only writes.
drop policy if exists approved_sources_admin_write on public.btv_approved_sources;
drop policy if exists approved_sources_admin_insert on public.btv_approved_sources;
drop policy if exists approved_sources_admin_update on public.btv_approved_sources;
drop policy if exists approved_sources_admin_delete on public.btv_approved_sources;
create policy approved_sources_admin_insert on public.btv_approved_sources for insert to authenticated
  with check ((select public.btv_is_admin()));
create policy approved_sources_admin_update on public.btv_approved_sources for update to authenticated
  using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy approved_sources_admin_delete on public.btv_approved_sources for delete to authenticated
  using ((select public.btv_is_admin()));
