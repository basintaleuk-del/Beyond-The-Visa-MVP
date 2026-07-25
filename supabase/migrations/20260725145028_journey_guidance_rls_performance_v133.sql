-- Keep admin writes separate from the shared read policy so Postgres evaluates
-- only one permissive SELECT policy for each guidance table.
drop policy if exists journey_guidance_admin on public.btv_journey_steps;
create policy journey_guidance_admin_insert on public.btv_journey_steps
  for insert to authenticated with check ((select public.btv_is_admin()));
create policy journey_guidance_admin_update on public.btv_journey_steps
  for update to authenticated using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy journey_guidance_admin_delete on public.btv_journey_steps
  for delete to authenticated using ((select public.btv_is_admin()));

drop policy if exists journey_resources_admin on public.btv_journey_step_resources;
create policy journey_resources_admin_insert on public.btv_journey_step_resources
  for insert to authenticated with check ((select public.btv_is_admin()));
create policy journey_resources_admin_update on public.btv_journey_step_resources
  for update to authenticated using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy journey_resources_admin_delete on public.btv_journey_step_resources
  for delete to authenticated using ((select public.btv_is_admin()));

create index if not exists btv_journey_versions_created_by_idx
  on public.btv_journey_content_versions(created_by);
create index if not exists btv_journey_reviews_reviewer_idx
  on public.btv_journey_content_reviews(reviewer_id);

-- The checklist primary key already covers (user_id, step_code).
drop index if exists public.btv_journey_checklist_user_step_idx;
