-- Journey Guidance Centre v133.
-- Extends the existing destination and progress model; no duplicate journey system is introduced.

alter table public.btv_journey_steps
  add column if not exists short_summary text,
  add column if not exists applicable_professions text[] not null default array['nurse','midwife']::text[],
  add column if not exists overview text,
  add column if not exists why_required text,
  add column if not exists stage_timing text,
  add column if not exists can_complete_before_arrival boolean not null default true,
  add column if not exists action_items jsonb not null default '[]'::jsonb,
  add column if not exists required_documents jsonb not null default '[]'::jsonb,
  add column if not exists estimated_cost_min numeric(12,2),
  add column if not exists estimated_cost_max numeric(12,2),
  add column if not exists currency text,
  add column if not exists official_fee_url text,
  add column if not exists preparation_time text,
  add column if not exists processing_time text,
  add column if not exists delay_causes jsonb not null default '[]'::jsonb,
  add column if not exists can_progress_in_parallel boolean not null default true,
  add column if not exists common_mistakes jsonb not null default '[]'::jsonb,
  add column if not exists completion_criteria text,
  add column if not exists next_step_code text,
  add column if not exists deadline_warning text,
  add column if not exists profession_guidance jsonb not null default '{}'::jsonb,
  add column if not exists personal_checklist jsonb not null default '[]'::jsonb,
  add column if not exists content_status text not null default 'published',
  add column if not exists last_reviewed_at date,
  add column if not exists reviewed_by text,
  add column if not exists content_version integer not null default 1,
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_publish_at timestamptz,
  add column if not exists needs_review boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.btv_journey_steps drop constraint if exists btv_journey_steps_professions_check;
alter table public.btv_journey_steps add constraint btv_journey_steps_professions_check
  check (applicable_professions <@ array['nurse','midwife']::text[] and cardinality(applicable_professions)>0);
alter table public.btv_journey_steps drop constraint if exists btv_journey_steps_content_status_check;
alter table public.btv_journey_steps add constraint btv_journey_steps_content_status_check
  check (content_status in ('draft','reviewed','published','outdated','archived'));
alter table public.btv_journey_steps drop constraint if exists btv_journey_steps_currency_check;
alter table public.btv_journey_steps add constraint btv_journey_steps_currency_check
  check (currency is null or currency ~ '^[A-Z]{3}$');
alter table public.btv_journey_steps drop constraint if exists btv_journey_steps_cost_check;
alter table public.btv_journey_steps add constraint btv_journey_steps_cost_check
  check ((estimated_cost_min is null or estimated_cost_min>=0) and (estimated_cost_max is null or estimated_cost_max>=coalesce(estimated_cost_min,0)));

alter table public.btv_user_journey_progress
  add column if not exists status text not null default 'not_started',
  add column if not exists application_reference text,
  add column if not exists submission_date date,
  add column if not exists expected_decision_date date,
  add column if not exists exam_date timestamptz,
  add column if not exists expiry_date date,
  add column if not exists supporting_document_reference text,
  add column if not exists reminder_at timestamptz,
  add column if not exists reminder_kind text;

alter table public.btv_user_journey_progress drop constraint if exists btv_journey_progress_status_check;
alter table public.btv_user_journey_progress add constraint btv_journey_progress_status_check
  check (status in ('not_started','in_progress','waiting_for_documents','submitted','awaiting_decision','action_required','completed','not_applicable'));
alter table public.btv_user_journey_progress drop constraint if exists btv_journey_progress_private_length_check;
alter table public.btv_user_journey_progress add constraint btv_journey_progress_private_length_check
  check (char_length(coalesce(notes,''))<=10000 and char_length(coalesce(application_reference,''))<=300 and char_length(coalesce(supporting_document_reference,''))<=500);

update public.btv_user_journey_progress
set status=case when completed then 'completed' else status end
where completed or status='not_started';

create table if not exists public.btv_journey_step_resources(
  id uuid primary key default gen_random_uuid(),
  step_code text not null references public.btv_journey_steps(code) on delete cascade,
  title text not null,
  description text,
  resource_type text not null default 'official_guidance',
  destination text not null,
  url text not null,
  is_official boolean not null default false,
  last_reviewed_at date,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(step_code,url),
  check (destination in ('uk','us','au','ca','nz','ie')),
  check (url ~ '^https://')
);

create table if not exists public.btv_user_journey_checklist_items(
  user_id uuid not null references auth.users(id) on delete cascade,
  step_code text not null references public.btv_journey_steps(code) on delete cascade,
  item_code text not null,
  label_snapshot text not null,
  checked boolean not null default false,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,step_code,item_code),
  check (char_length(item_code) between 1 and 100),
  check (char_length(label_snapshot) between 1 and 500)
);

create table if not exists public.btv_journey_content_versions(
  id bigint generated always as identity primary key,
  step_code text not null references public.btv_journey_steps(code) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(step_code,version)
);

create table if not exists public.btv_journey_content_reviews(
  id bigint generated always as identity primary key,
  step_code text not null references public.btv_journey_steps(code) on delete cascade,
  review_status text not null default 'needs_review',
  reviewer_id uuid references auth.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  next_review_at date,
  created_at timestamptz not null default now(),
  check (review_status in ('needs_review','in_review','approved','changes_requested','outdated'))
);

create index if not exists btv_journey_steps_published_path_idx
  on public.btv_journey_steps(destination,content_status,is_active,is_archived,sort_order);
create index if not exists btv_journey_resources_step_active_idx
  on public.btv_journey_step_resources(step_code,is_active,sort_order);
create index if not exists btv_journey_progress_user_status_idx
  on public.btv_user_journey_progress(user_id,status,updated_at desc);
create index if not exists btv_journey_checklist_user_step_idx
  on public.btv_user_journey_checklist_items(user_id,step_code);
create index if not exists btv_journey_reviews_step_status_idx
  on public.btv_journey_content_reviews(step_code,review_status,created_at desc);

create or replace function public.btv_sync_journey_progress_status()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  new.updated_at=now();
  if new.status='completed' or new.completed then
    new.status='completed'; new.completed=true; new.completed_at=coalesce(new.completed_at,now());
  elsif new.status='not_applicable' then
    new.completed=false; new.completed_at=null;
  else
    new.completed=false; new.completed_at=null;
  end if;
  if new.reminder_at is null then new.reminder_kind=null; end if;
  return new;
end;
$$;
drop trigger if exists btv_sync_journey_progress_status_trigger on public.btv_user_journey_progress;
create trigger btv_sync_journey_progress_status_trigger before insert or update on public.btv_user_journey_progress
for each row execute function public.btv_sync_journey_progress_status();

create or replace function public.btv_set_journey_step(p_step_code text,p_completed boolean)
returns boolean language plpgsql security invoker set search_path=public as $$
declare v_country text; v_profession text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select destination_country,lower(coalesce(profession,'')) into v_country,v_profession from public.profiles where id=auth.uid();
  if not exists (
    select 1 from public.btv_journey_steps s
    where s.code=p_step_code and s.destination=v_country and s.is_active and not s.is_archived
      and (('midwife'=any(s.applicable_professions) and v_profession like '%midwi%')
        or ('nurse'=any(s.applicable_professions) and (v_profession like '%nurs%' or v_profession='')))
  ) then raise exception 'STEP_NOT_APPLICABLE'; end if;
  insert into public.btv_user_journey_progress(user_id,step_code,status,completed,completed_at,updated_at)
  values(auth.uid(),p_step_code,case when p_completed then 'completed' else 'not_started' end,p_completed,case when p_completed then now() end,now())
  on conflict(user_id,step_code) do update set status=excluded.status,completed=excluded.completed,completed_at=excluded.completed_at,updated_at=now();
  return p_completed;
end;
$$;

-- Add profession-specific branches only where the current destination rows are nursing-specific.
insert into public.btv_journey_steps(code,title,destination,sort_order,description,is_active,is_required,is_archived,applicable_professions,content_status,published_at)
values
 ('us_midwife_credentials','Midwifery credential evaluation','us',3,'Confirm the education, certification and state-specific evidence required for your intended midwifery credential.',true,true,false,array['midwife'], 'published',now()),
 ('us_midwife_licensure','State midwifery licensure or certification','us',4,'Complete the midwifery licensing or certification route required in your chosen state.',true,true,false,array['midwife'], 'published',now()),
 ('ca_midwife_credentials','Provincial midwifery credential assessment','ca',3,'Complete the internationally educated midwife assessment required by your chosen province or territory.',true,true,false,array['midwife'], 'published',now()),
 ('ca_midwife_registration','Provincial midwifery registration','ca',5,'Complete the registration, bridging or examination requirements set by the provincial midwifery regulator.',true,true,false,array['midwife'], 'published',now()),
 ('nz_midwife_registration','Midwifery Council registration','nz',2,'Complete the Midwifery Council of New Zealand pathway for overseas-qualified midwives.',true,true,false,array['midwife'], 'published',now())
on conflict(code) do update set title=excluded.title,destination=excluded.destination,sort_order=excluded.sort_order,description=excluded.description,
  applicable_professions=excluded.applicable_professions,is_active=true,is_required=true,is_archived=false;

update public.btv_journey_steps set applicable_professions=array['nurse']
where code in ('us_credentials','us_nclex','ca_credentials','ca_registration','nz_registration');
update public.btv_journey_steps set applicable_professions=array['nurse','midwife']
where applicable_professions is null or cardinality(applicable_professions)=0;

-- Destination-specific guidance foundation. Exact fees remain null until reviewed by an authorised editor.
update public.btv_journey_steps s set
  short_summary=coalesce(s.short_summary,s.description,'Complete this stage and retain the official evidence.'),
  overview=coalesce(s.overview,format('%s is part of the %s pathway. Use the linked authority to confirm the route that applies to your qualification and profession.',s.title,
    case s.destination when 'uk' then 'United Kingdom' when 'us' then 'United States' when 'au' then 'Australian' when 'ca' then 'Canadian' when 'nz' then 'New Zealand' else 'Irish' end)),
  why_required=coalesce(s.why_required,case
    when s.code similar to '%(visa|immigration|permission)%' then 'The relevant immigration authority requires an approved status before you can lawfully work or remain on this route.'
    when s.code similar to '%(registration|nmc|nclex|assessment|credentials|state|province)%' then 'The responsible professional authority must confirm that you meet its standards before practice.'
    when s.code similar to '%(english|ielts|language)%' then 'The regulator or immigration route may require current evidence that you can communicate safely and effectively.'
    else 'This evidence supports a safe, verifiable and correctly ordered application.' end),
  stage_timing=coalesce(s.stage_timing,case when s.code similar to '%(arrival|travel)%' then 'Complete after the core registration, employment and immigration decisions are confirmed.' else 'Start before travel and as early as the responsible authority allows.' end),
  can_complete_before_arrival=(s.code not similar to '%(arrival)%'),
  action_items=case when jsonb_array_length(s.action_items)>0 then s.action_items else jsonb_build_array(
    'Open the linked official authority and confirm the route for your destination and profession.',
    'Create a secure account only on the official service and record your application identifier privately.',
    'Prepare clear, current documents with names matching your passport and arrange certified translations where required.',
    'Submit through the method specified by the authority, then save the receipt and confirmation email.',
    'Track requests for further information and respond before the stated deadline.',
    'If delayed or refused, use the authority’s official enquiry, review or appeal process before paying any third party.'
  ) end,
  required_documents=case when jsonb_array_length(s.required_documents)>0 then s.required_documents
    when s.code similar to '%(passport|identity)%' then '["Valid passport","Secondary identity evidence","Name-change evidence where applicable","Certified translation where required"]'::jsonb
    when s.code similar to '%(english|ielts|language)%' then '["Passport","Accepted test booking confirmation","Official test result","Regulator account or candidate reference"]'::jsonb
    when s.code similar to '%(visa|immigration|permission)%' then '["Passport","Professional registration evidence","Job offer or sponsorship evidence where applicable","Police or health evidence when requested","Financial evidence where required"]'::jsonb
    when s.code similar to '%(employment|job|interview|cos)%' then '["Professional CV","Registration or eligibility evidence","Employment references","Qualification evidence","Identity and right-to-work evidence"]'::jsonb
    else '["Passport","Professional registration certificate","Nursing or midwifery qualification","Academic transcript","Employment references","English evidence where required","Police or health declarations where requested","Certified translations where applicable"]'::jsonb end,
  official_url=coalesce(s.official_url,case s.destination
    when 'uk' then 'https://www.nmc.org.uk/registration/joining-the-register/register-nurse-midwife/trained-outside-uk/'
    when 'us' then 'https://www.ncsbn.org/nursing-regulation/licensure/internationally-educated-nurses.page'
    when 'au' then 'https://www.ahpra.gov.au/Registration/International-practitioners.aspx'
    when 'ca' then 'https://www.nnas.ca/'
    when 'nz' then 'https://www.nursingcouncil.org.nz/SFEX/IQN/Home.aspx'
    else 'https://www.nmbi.ie/Registration/Qualified-outside-the-EU/Application-Process' end),
  official_fee_url=coalesce(s.official_fee_url,case s.destination
    when 'uk' then 'https://www.nmc.org.uk/registration/joining-the-register/register-nurse-midwife/trained-outside-uk/'
    when 'us' then 'https://www.ncsbn.org/nursing-regulation/licensure/nurse-licensure-guidance.page'
    when 'au' then 'https://www.ahpra.gov.au/Registration/Registration-Standards/Fees.aspx'
    when 'ca' then 'https://www.nnas.ca/'
    when 'nz' then 'https://www.nursingcouncil.org.nz/IQN/IQN/H5.aspx'
    else 'https://www.nmbi.ie/Registration/Registration-Fees' end),
  currency=coalesce(s.currency,case s.destination when 'uk' then 'GBP' when 'us' then 'USD' when 'au' then 'AUD' when 'ca' then 'CAD' when 'nz' then 'NZD' else 'EUR' end),
  preparation_time=coalesce(s.preparation_time,'Allow time to obtain originals, direct-source verification and certified translations.'),
  processing_time=coalesce(s.processing_time,'Processing time varies. Check the current estimate on the official authority website before planning travel or employment.'),
  delay_causes=case when jsonb_array_length(s.delay_causes)>0 then s.delay_causes else '["Missing or inconsistent documents","Third-party verification delays","Unclear scans or uncertified translations","Additional regulator checks","Missed requests for information"]'::jsonb end,
  common_mistakes=case when jsonb_array_length(s.common_mistakes)>0 then s.common_mistakes else '["Using an expired document","Submitting a name that does not match the passport","Uploading an unclear or incomplete scan","Using an uncertified translation","Booking an exam before confirming the correct route","Paying an unofficial agent","Missing an expiry or response deadline"]'::jsonb end,
  completion_criteria=coalesce(s.completion_criteria,format('Mark this step complete only when you hold the official evidence confirming that %s has been completed for your current route.',lower(s.title))),
  profession_guidance=case when s.profession_guidance<>'{}'::jsonb then s.profession_guidance else jsonb_build_object(
    'nurse','Confirm the nursing field, level and scope of practice accepted by the destination regulator.',
    'midwife','Confirm midwifery qualification, maternity placement and midwifery-reference evidence separately where required.'
  ) end,
  personal_checklist=case when jsonb_array_length(s.personal_checklist)>0 then s.personal_checklist else '[{"code":"official_route","label":"Official route confirmed"},{"code":"identity_match","label":"Name matches passport and supporting documents"},{"code":"documents_ready","label":"Required documents prepared"},{"code":"fee_checked","label":"Current official fee checked"},{"code":"submission_saved","label":"Submission receipt or confirmation saved"},{"code":"follow_up","label":"Follow-up or expiry date recorded"}]'::jsonb end,
  content_status=case when s.content_status in ('draft','reviewed','published','outdated','archived') then s.content_status else 'published' end,
  last_reviewed_at=coalesce(s.last_reviewed_at,date '2026-07-25'), reviewed_by=coalesce(s.reviewed_by,'Beyond the Visa content team'),
  published_at=coalesce(s.published_at,now()), updated_at=now();

-- Use destination immigration sources for immigration-focused steps.
update public.btv_journey_steps set official_url=case destination
  when 'uk' then 'https://www.gov.uk/health-care-worker-visa/overview'
  when 'us' then 'https://www.uscis.gov/working-in-the-united-states'
  when 'au' then 'https://immi.homeaffairs.gov.au/visas/working-in-australia'
  when 'ca' then 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html'
  when 'nz' then 'https://www.immigration.govt.nz/new-zealand-visas/visas/visa/accredited-employer-work-visa'
  else 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/' end,
  official_fee_url=case destination
  when 'uk' then 'https://www.gov.uk/health-care-worker-visa/how-much-it-costs'
  when 'us' then 'https://www.uscis.gov/forms/filing-fees'
  when 'au' then 'https://immi.homeaffairs.gov.au/visas/visa-pricing-estimator'
  when 'ca' then 'https://ircc.canada.ca/english/information/fees/fees.asp'
  when 'nz' then 'https://www.immigration.govt.nz/new-zealand-visas/preparing-a-visa-application/the-application-process/office-and-fees-finder'
  else 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/fees/' end
where code similar to '%(visa|immigration|permission)%';

-- Link each step to both its professional authority and its immigration authority.
with refs(destination,regulator_title,regulator_url,immigration_title,immigration_url) as (values
 ('uk','NMC international registration','https://www.nmc.org.uk/registration/joining-the-register/register-nurse-midwife/trained-outside-uk/','UK Health and Care Worker visa','https://www.gov.uk/health-care-worker-visa/overview'),
 ('us','NCSBN internationally educated nurses','https://www.ncsbn.org/nursing-regulation/licensure/internationally-educated-nurses.page','USCIS working in the United States','https://www.uscis.gov/working-in-the-united-states'),
 ('au','Ahpra international practitioner registration','https://www.ahpra.gov.au/Registration/International-practitioners.aspx','Australian visas and working','https://immi.homeaffairs.gov.au/visas/working-in-australia'),
 ('ca','National Nursing Assessment Service','https://www.nnas.ca/','Immigration, Refugees and Citizenship Canada','https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html'),
 ('nz','Nursing Council internationally qualified nurses','https://www.nursingcouncil.org.nz/SFEX/IQN/Home.aspx','Immigration New Zealand','https://www.immigration.govt.nz/new-zealand-visas/visas/visa/accredited-employer-work-visa'),
 ('ie','NMBI overseas application process','https://www.nmbi.ie/Registration/Qualified-outside-the-EU/Application-Process','Ireland employment permits','https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/')
), resources as (
 select s.code,s.destination,r.regulator_title title,'Current professional registration guidance for this destination.' description,'professional_regulator' resource_type,r.regulator_url url,1 sort_order
 from public.btv_journey_steps s join refs r using(destination)
 union all
 select s.code,s.destination,r.immigration_title,'Current official immigration and work-permission guidance.','immigration_authority',r.immigration_url,2
 from public.btv_journey_steps s join refs r using(destination)
)
insert into public.btv_journey_step_resources(step_code,title,description,resource_type,destination,url,is_official,last_reviewed_at,is_active,sort_order)
select code,title,description,resource_type,destination,url,true,date '2026-07-25',true,sort_order from resources
on conflict(step_code,url) do update set title=excluded.title,description=excluded.description,resource_type=excluded.resource_type,
 destination=excluded.destination,is_official=true,last_reviewed_at=excluded.last_reviewed_at,is_active=true,sort_order=excluded.sort_order,updated_at=now();

-- RLS: published guidance is readable; private progress and checklist rows remain owner-only.
alter table public.btv_journey_steps enable row level security;
alter table public.btv_user_journey_progress enable row level security;
alter table public.btv_journey_step_resources enable row level security;
alter table public.btv_user_journey_checklist_items enable row level security;
alter table public.btv_journey_content_versions enable row level security;
alter table public.btv_journey_content_reviews enable row level security;

drop policy if exists journey_read on public.btv_journey_steps;
drop policy if exists journey_guidance_read on public.btv_journey_steps;
create policy journey_guidance_read on public.btv_journey_steps for select to authenticated
using (((content_status='published' or (content_status='reviewed' and scheduled_publish_at<=now())) and is_active and not is_archived and (published_at is null or published_at<=now())) or (select public.btv_is_admin()));
drop policy if exists journey_guidance_admin on public.btv_journey_steps;
create policy journey_guidance_admin on public.btv_journey_steps for all to authenticated
using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));

drop policy if exists own_data on public.btv_user_journey_progress;
drop policy if exists progress_write on public.btv_user_journey_progress;
drop policy if exists journey_progress_own_read on public.btv_user_journey_progress;
create policy journey_progress_own_read on public.btv_user_journey_progress for select to authenticated
using ((select auth.uid())=user_id);
drop policy if exists journey_progress_own_insert on public.btv_user_journey_progress;
create policy journey_progress_own_insert on public.btv_user_journey_progress for insert to authenticated
with check ((select auth.uid())=user_id and exists(select 1 from public.profiles p join public.btv_journey_steps s on s.code=step_code where p.id=(select auth.uid()) and s.destination=p.destination_country and s.is_active and not s.is_archived));
drop policy if exists journey_progress_own_update on public.btv_user_journey_progress;
create policy journey_progress_own_update on public.btv_user_journey_progress for update to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists journey_progress_own_delete on public.btv_user_journey_progress;
create policy journey_progress_own_delete on public.btv_user_journey_progress for delete to authenticated
using ((select auth.uid())=user_id);

create policy journey_resources_published_read on public.btv_journey_step_resources for select to authenticated
using ((is_active and exists(select 1 from public.btv_journey_steps s where s.code=step_code and (s.content_status='published' or (s.content_status='reviewed' and s.scheduled_publish_at<=now())) and s.is_active and not s.is_archived)) or (select public.btv_is_admin()));
create policy journey_resources_admin on public.btv_journey_step_resources for all to authenticated
using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy journey_checklist_own_select on public.btv_user_journey_checklist_items for select to authenticated using ((select auth.uid())=user_id);
create policy journey_checklist_own_insert on public.btv_user_journey_checklist_items for insert to authenticated with check ((select auth.uid())=user_id);
create policy journey_checklist_own_update on public.btv_user_journey_checklist_items for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy journey_checklist_own_delete on public.btv_user_journey_checklist_items for delete to authenticated using ((select auth.uid())=user_id);
create policy journey_versions_admin on public.btv_journey_content_versions for all to authenticated using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));
create policy journey_reviews_admin on public.btv_journey_content_reviews for all to authenticated using ((select public.btv_is_admin())) with check ((select public.btv_is_admin()));

grant select,insert,update,delete on public.btv_journey_steps,public.btv_journey_step_resources to authenticated;
grant select,insert,update,delete on public.btv_user_journey_progress,public.btv_user_journey_checklist_items to authenticated;
grant select,insert,update,delete on public.btv_journey_content_versions,public.btv_journey_content_reviews to authenticated;
grant usage,select on sequence public.btv_journey_content_versions_id_seq,public.btv_journey_content_reviews_id_seq to authenticated;
grant execute on function public.btv_set_journey_step(text,boolean) to authenticated;

comment on table public.btv_journey_step_resources is 'Reviewed official and internal resources attached to the existing Journey steps.';
comment on table public.btv_user_journey_checklist_items is 'Private per-user checklist state for an existing Journey step.';
comment on column public.btv_user_journey_progress.notes is 'Private user notes protected by owner-only RLS.';
