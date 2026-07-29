-- Secure, owner-only application workspace for Jobs.
-- Existing application tracking rows are preserved and enriched in place.

alter table public.btv_job_applications
  add column if not exists applicant_name text,
  add column if not exists applicant_email text,
  add column if not exists applicant_phone text,
  add column if not exists current_country text,
  add column if not exists professional_title text,
  add column if not exists professional_registration text,
  add column if not exists work_authorisation text,
  add column if not exists sponsorship_required boolean,
  add column if not exists experience_summary text,
  add column if not exists supporting_statement text,
  add column if not exists consent_confirmed boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists employer_submission_required boolean not null default true,
  add column if not exists source_application_url text;

alter table public.btv_job_applications drop constraint if exists btv_job_applications_content_check;
alter table public.btv_job_applications add constraint btv_job_applications_content_check check (
  char_length(coalesce(applicant_name,'')) <= 200 and char_length(coalesce(applicant_email,'')) <= 320
  and char_length(coalesce(applicant_phone,'')) <= 80 and char_length(coalesce(current_country,'')) <= 120
  and char_length(coalesce(professional_title,'')) <= 160 and char_length(coalesce(professional_registration,'')) <= 300
  and char_length(coalesce(work_authorisation,'')) <= 300 and char_length(coalesce(experience_summary,'')) <= 3000
  and char_length(coalesce(supporting_statement,'')) <= 8000
  and (source_application_url is null or source_application_url ~ '^https://')
);

create index if not exists btv_job_applications_user_status_v174_idx on public.btv_job_applications(user_id,status,updated_at desc);
alter table public.btv_job_applications enable row level security;
drop policy if exists applications_write on public.btv_job_applications;
drop policy if exists job_applications_own_select_v174 on public.btv_job_applications;
create policy job_applications_own_select_v174 on public.btv_job_applications for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists job_applications_own_insert_v174 on public.btv_job_applications;
create policy job_applications_own_insert_v174 on public.btv_job_applications for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists job_applications_own_update_v174 on public.btv_job_applications;
create policy job_applications_own_update_v174 on public.btv_job_applications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists job_applications_own_delete_v174 on public.btv_job_applications;
create policy job_applications_own_delete_v174 on public.btv_job_applications for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.btv_job_applications to authenticated;

comment on column public.btv_job_applications.employer_submission_required is 'True when Beyond The Visa stores the application workspace but the applicant must still submit through the employer-controlled channel.';
comment on column public.btv_job_applications.consent_confirmed is 'Applicant confirmation that their supplied information may be stored for this job application workspace.';
