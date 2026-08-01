-- Job alerts v277: keep the existing notification systems, but only create
-- USA alerts when the saved professional profile supports the role.

create or replace function public.btv_generate_usa_job_alerts(p_since timestamptz default (now()-interval '13 hours'))
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer;
begin
  insert into public.btv_notifications(user_id,category,title,body,action_url,dedupe_key)
  select p.id,'usa_jobs','New USA nursing job: '||j.job_title,
         j.employer_name||' · '||concat_ws(', ',j.city,j.state),
         '/jobs/usa/'||j.id,'usa-job:'||j.id
  from public.profiles p
  join public.btv_professional_profiles pp on pp.user_id=p.id
  left join public.btv_notification_preferences np on np.user_id=p.id
  left join public.btv_usa_job_alert_preferences ap on ap.user_id=p.id
  cross join lateral (
    select u.* from public.btv_usa_jobs u
    where u.status='active' and u.date_posted>=p_since and (u.closing_date is null or u.closing_date>=now())
      and coalesce(ap.enabled,true)
      and (ap.keyword is null or concat_ws(' ',u.job_title,u.description,u.qualifications) ilike '%'||ap.keyword||'%')
      and (ap.state is null or u.state=ap.state)
      and (ap.city is null or u.city=ap.city)
      and (ap.nursing_specialty is null or u.nursing_specialty=ap.nursing_specialty)
      and (ap.employment_type is null or u.employment_type=ap.employment_type)
      and (ap.visa_sponsorship_status is null or u.visa_sponsorship_status=ap.visa_sponsorship_status)
      and (ap.relocation_assistance is null or u.relocation_assistance=ap.relocation_assistance)
      and (ap.remote_status is null or u.remote_status=ap.remote_status)
      and (
        concat_ws(' ',u.job_title,u.nursing_specialty) !~* '(nurse practitioner|advanced practice|nurse an(a)?esthetist|CRNA)'
        or concat_ws(' ',pp.clinical_specialty,pp.nursing_field,pp.qualification_title) ~* '(nurse practitioner|advanced practice|an(a)?esthet|CRNA)'
      )
      and (
        coalesce(u.licence_requirements,'') !~* '(registr|licen[cs]e|board)'
        or coalesce(p.registration_stage,'') ~* '(registered|active|complete|license|licence)'
        or exists (
          select 1 from public.btv_professional_registrations pr
          where pr.user_id=p.id and pr.status='Active'
            and lower(pr.country) in ('us','usa','united states','united states of america')
        )
      )
    order by u.featured desc,u.date_posted desc nulls last limit 3
  ) j
  where p.destination_country='us'
    and coalesce(np.job_matches,true)
    and lower(coalesce(pp.profession,p.profession,'')) ~ '(nurse|nursing)'
  on conflict(user_id,dedupe_key) do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

revoke all on function public.btv_generate_usa_job_alerts(timestamptz) from public,anon,authenticated;
grant execute on function public.btv_generate_usa_job_alerts(timestamptz) to service_role;

comment on function public.btv_generate_usa_job_alerts(timestamptz)
  is 'Creates at most three new USA job alerts per qualified destination-matched professional profile.';
