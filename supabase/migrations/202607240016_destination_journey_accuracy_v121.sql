-- Destination country and journey accuracy v121.
-- The account-scoped destination_country field is authoritative; destination is retained as a compatibility mirror.

alter table public.profiles
  add column if not exists destination_country text;

alter table public.profiles drop constraint if exists profiles_destination_country_check;
alter table public.profiles add constraint profiles_destination_country_check
  check (destination_country is null or destination_country in ('uk','us','ca','au','nz','ie'));

update public.profiles
set destination_country = lower(trim(destination))
where destination_country is null
  and lower(trim(destination)) in ('uk','us','ca','au','nz','ie');

alter table public.btv_journey_steps
  add column if not exists is_required boolean not null default true,
  add column if not exists is_archived boolean not null default false;

insert into public.btv_journey_steps (code,title,destination,sort_order,description,is_active,is_required,is_archived)
values
 ('au_passport','Passport and identity','au',1,'Confirm passport validity and retain certified identity evidence.',true,true,false),
 ('au_english','English language evidence','au',2,'Meet the English language standard accepted for your registration route.',true,true,false),
 ('au_registration','Ahpra and NMBA registration','au',3,'Complete the applicable registration pathway and evidence checks.',true,true,false),
 ('au_assessment','Qualification assessment','au',4,'Complete any outcomes-based assessment or bridging requirement issued for your application.',true,true,false),
 ('au_checks','Police and health checks','au',5,'Complete the character, police and health checks required for registration or migration.',true,true,false),
 ('au_employment','Employment preparation','au',6,'Prepare applications and verify employer and role requirements.',true,true,false),
 ('au_visa','Visa pathway','au',7,'Confirm and complete the appropriate Australian visa pathway.',true,true,false),
 ('au_arrival','Travel and settlement','au',8,'Plan documents, accommodation and essential arrival tasks.',true,true,false),
 ('ca_passport','Passport and identity','ca',1,'Confirm passport validity and retain certified identity evidence.',true,true,false),
 ('ca_province','Choose a province or territory','ca',2,'Select the jurisdiction where you intend to register and practise.',true,true,false),
 ('ca_credentials','Credential assessment','ca',3,'Complete the nursing credential assessment required for your jurisdiction.',true,true,false),
 ('ca_language','Language evidence','ca',4,'Meet the language requirement accepted by the relevant regulator.',true,true,false),
 ('ca_registration','Registration examination','ca',5,'Complete the registration examination and any regulator-directed requirements.',true,true,false),
 ('ca_immigration','Immigration pathway','ca',6,'Confirm the appropriate federal or provincial immigration route.',true,true,false),
 ('ca_employment','Employment preparation','ca',7,'Prepare applications and verify provincial practice requirements.',true,true,false),
 ('ca_arrival','Travel and settlement','ca',8,'Plan insurance, accommodation and essential arrival tasks.',true,true,false),
 ('nz_passport','Passport and identity','nz',1,'Confirm passport validity and retain certified identity evidence.',true,true,false),
 ('nz_registration','Professional registration','nz',2,'Complete the Nursing Council registration pathway that applies to you.',true,true,false),
 ('nz_english','English language evidence','nz',3,'Meet the English language standard accepted for registration.',true,true,false),
 ('nz_verification','Document verification','nz',4,'Prepare and verify education, identity and employment records.',true,true,false),
 ('nz_employment','Employment preparation','nz',5,'Research suitable roles and accredited employers.',true,true,false),
 ('nz_visa','Visa pathway','nz',6,'Confirm and complete the appropriate New Zealand visa pathway.',true,true,false),
 ('nz_arrival','Travel and settlement','nz',7,'Plan documents, accommodation and essential arrival tasks.',true,true,false),
 ('ie_passport','Passport and identity','ie',1,'Confirm passport validity and retain certified identity evidence.',true,true,false),
 ('ie_registration','NMBI registration','ie',2,'Complete the Irish professional registration pathway that applies to you.',true,true,false),
 ('ie_english','English language evidence','ie',3,'Meet the English language standard accepted for registration.',true,true,false),
 ('ie_verification','Document verification','ie',4,'Prepare verified education, identity and employment records.',true,true,false),
 ('ie_employment','Employment preparation','ie',5,'Research suitable employers and prepare role applications.',true,true,false),
 ('ie_permission','Employment permit or visa','ie',6,'Confirm and complete the immigration permission that applies to you.',true,true,false),
 ('ie_arrival','Travel and settlement','ie',7,'Plan documents, accommodation and essential arrival tasks.',true,true,false),
 ('us_passport','Passport and identity','us',1,'Confirm passport validity and retain certified identity evidence.',true,true,false),
 ('us_state','Choose a state board','us',2,'Select the state where you intend to obtain licensure.',true,true,false),
 ('us_credentials','Credential evaluation','us',3,'Complete the credential evaluation required by the state board.',true,true,false),
 ('us_nclex','NCLEX-RN examination','us',4,'Meet eligibility requirements and complete the NCLEX-RN.',true,true,false),
 ('us_english','English language evidence','us',5,'Complete language evidence when required for licensure or immigration.',true,true,false),
 ('us_immigration','Employer and immigration route','us',6,'Confirm an eligible employer and appropriate immigration pathway.',true,true,false),
 ('us_arrival','Travel and settlement','us',7,'Plan insurance, accommodation and essential arrival tasks.',true,true,false)
on conflict (code) do update set
 title=excluded.title,destination=excluded.destination,sort_order=excluded.sort_order,
 description=excluded.description,is_active=true,is_required=true,is_archived=false;

update public.btv_journey_steps
set is_required=true,is_archived=false
where destination='uk' and is_active=true;

create index if not exists btv_journey_steps_destination_active_order_idx
  on public.btv_journey_steps(destination,is_active,is_archived,is_required,sort_order);

create or replace function public.btv_set_destination_country(p_country text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare v_country text := lower(trim(p_country));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_country not in ('uk','us','ca','au','nz','ie') then raise exception 'Unsupported destination country'; end if;
  update public.profiles
     set destination_country=v_country,destination=v_country,updated_at=now()
   where id=auth.uid();
  if not found then raise exception 'Profile not found'; end if;
  return v_country;
end;
$$;

create or replace function public.btv_set_journey_step(p_step_code text,p_completed boolean)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare v_country text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select destination_country into v_country from public.profiles where id=auth.uid();
  if not exists (select 1 from public.btv_journey_steps where code=p_step_code and destination=v_country and is_active and not is_archived and is_required)
    then raise exception 'Journey step is not part of the current destination'; end if;
  insert into public.btv_user_journey_progress(user_id,step_code,completed,completed_at,updated_at)
  values(auth.uid(),p_step_code,p_completed,case when p_completed then now() else null end,now())
  on conflict(user_id,step_code) do update set completed=excluded.completed,completed_at=excluded.completed_at,updated_at=now();
  return p_completed;
end;
$$;

create or replace function public.btv_get_journey_diagnostics(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := coalesce(p_user_id,auth.uid()); v_country text; v_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_is_admin := public.btv_is_admin();
  if v_user <> auth.uid() and not v_is_admin then raise exception 'Administrator access required'; end if;
  select destination_country into v_country from public.profiles where id=v_user;
  return jsonb_build_object(
    'user_id',v_user,'destination_country',v_country,
    'required_total',(select count(*) from public.btv_journey_steps where destination=v_country and is_active and not is_archived and is_required),
    'completed_total',(select count(distinct p.step_code) from public.btv_user_journey_progress p join public.btv_journey_steps s on s.code=p.step_code where p.user_id=v_user and p.completed and s.destination=v_country and s.is_active and not s.is_archived and s.is_required),
    'orphan_progress',(select count(*) from public.btv_user_journey_progress p left join public.btv_journey_steps s on s.code=p.step_code where p.user_id=v_user and s.code is null),
    'other_destination_progress',(select count(*) from public.btv_user_journey_progress p join public.btv_journey_steps s on s.code=p.step_code where p.user_id=v_user and s.destination<>v_country and p.completed)
  );
end;
$$;

revoke all on function public.btv_set_destination_country(text) from public,anon;
revoke all on function public.btv_set_journey_step(text,boolean) from public,anon;
revoke all on function public.btv_get_journey_diagnostics(uuid) from public,anon;
grant execute on function public.btv_set_destination_country(text) to authenticated;
grant execute on function public.btv_set_journey_step(text,boolean) to authenticated;
grant execute on function public.btv_get_journey_diagnostics(uuid) to authenticated;
grant select on public.btv_journey_steps to authenticated;
grant select,insert,update on public.btv_user_journey_progress to authenticated;
