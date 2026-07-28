-- Direct NHS Jobs centre v148: widen the shared vacancy table to all NHS
-- staff families and configure the approved NHS Jobs feed for daily coverage.

alter table public.btv_jobs drop constraint if exists btv_jobs_profession_check;
alter table public.btv_jobs add constraint btv_jobs_profession_check check (
  profession in (
    'nurse','midwife','both','medical_dental','allied_health','pharmacy',
    'scientific_technical','healthcare_support','administrative_clerical',
    'estates_facilities','ambulance','social_care','other'
  )
);

update public.btv_approved_sources
set configuration = configuration || jsonb_build_object(
      'staff_group', 'ALL',
      'max_pages', 10,
      'max_records', 1000,
      'initial_days', 14,
      'cursor_overlap_days', 2,
      'full_snapshot', false
    ),
    last_cursor = null,
    updated_at = now()
where name = 'NHS Jobs';
