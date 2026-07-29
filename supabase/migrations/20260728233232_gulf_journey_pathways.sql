-- Add reviewed, destination-specific Journey pathways for the UAE and Saudi Arabia.
-- Existing destinations and progress rows are deliberately left unchanged.

alter table public.btv_journey_step_resources
  drop constraint if exists btv_journey_step_resources_destination_check;
alter table public.btv_journey_step_resources
  add constraint btv_journey_step_resources_destination_check
  check (destination in ('uk','us','au','ca','nz','ie','ae','sa'));

with seed(
  code,title,destination,sort_order,short_summary,overview,why_required,stage_timing,
  can_complete_before_arrival,official_url,official_fee_url,preparation_time,processing_time,
  completion_criteria,next_step_code,deadline_warning
) as (values
  ('ae_authority','Choose your UAE licensing authority','ae',10,
   'Choose DHA for Dubai, DoH for Abu Dhabi, or the relevant MOHAP route before opening an application.',
   'The UAE does not use one universal healthcare-professional application. Your intended emirate and employer determine whether you use Dubai Health Authority (DHA/Sheryan), Department of Health Abu Dhabi (DoH/TAMM), or Ministry of Health and Prevention (MOHAP) services.',
   'Applications, assessments and licence activation are authority-specific. Starting with the wrong authority can duplicate verification, fees and processing.',
   'Complete first, before ordering verification or booking any assessment.',true,
   'https://www.dha.gov.ae/en/dubai-health-licensing-system-shreyan','https://www.dha.gov.ae/en/dubai-health-licensing-system-shreyan',
   'Allow several days to confirm the emirate, facility and exact professional title.','Research is immediate; written clarification from an authority may take longer.',
   'Mark complete when your intended emirate, employing facility and responsible licensing authority are confirmed in writing or from the authority service.',
   'ae_pqr','Changing emirate later may require a different authority process or licence transfer.'),
  ('ae_pqr','Check the Unified PQR and professional title','ae',20,
   'Match your nursing or midwifery education, registration, experience and practice history to the UAE Unified PQR.',
   'The Unified Healthcare Professional Qualification Requirements (PQR) sets shared qualification rules, while the licensing authority decides the title and route for the individual application. Check the current nurse or midwife title, education, experience, home-country registration and gap-of-practice rules.',
   'The approved title controls the licence scope, assessment route and roles for which an employer can appoint you.',
   'Complete before primary-source verification so the correct documents and title are submitted.',true,
   'https://www.doh.gov.ae/en/pqr','https://www.doh.gov.ae/en/pqr',
   'Allow one to two weeks to compare the PQR with transcripts, clinical training and experience.','Authority eligibility review times vary by route and document completeness.',
   'Mark complete when you have recorded the current PQR title, qualification and experience route that matches your evidence.',
   'ae_verification','Do not rely on a recruiter summary; title and experience rules vary by qualification and practice history.'),
  ('ae_verification','Complete primary-source verification','ae',30,
   'Arrange authority-directed verification of qualifications, registration, good standing and employment history.',
   'DHA, DoH and MOHAP applications can require documents to be checked with their original issuers through the authority-approved primary-source verification route. Use the link and provider shown inside your official application.',
   'The regulator must be able to trust that professional records are authentic and issued by the named institutions and regulators.',
   'Start after confirming the authority and title; allow issuing organisations time to respond.',true,
   'https://www.doh.gov.ae/en/faq','https://www.doh.gov.ae/en/faq',
   'Allow several weeks to collect records, good standing and certified translations.','Completion depends on issuer response times and whether discrepancies need review.',
   'Mark complete when the required verification report is available to the licensing authority and every discrepancy is resolved.',
   'ae_assessment','Good-standing evidence and verification reports can expire; check validity before submission.'),
  ('ae_assessment','Complete the regulator-directed assessment','ae',40,
   'Take the exam, oral assessment or other evaluation only if your licensing authority assigns one.',
   'After document and eligibility review, the responsible UAE authority may direct the applicant to an assessment appropriate to the profession, title and route. Follow only the assessment instruction in the official account.',
   'Assessment confirms that the applicant meets the competence standard attached to the requested licence title.',
   'Book only after the authority confirms eligibility and provides the correct assessment route.',true,
   'https://www.doh.gov.ae/en/faq','https://www.doh.gov.ae/en/faq',
   'Allow time for authority review, revision and appointment availability.','Result and licensing-review times vary by authority and assessment type.',
   'Mark complete when the authority account records a passing or exempt assessment outcome for the selected title.',
   'ae_eligibility','Assessment attempts and eligibility notices may have validity limits; follow the dates in the official account.'),
  ('ae_eligibility','Obtain eligibility or initial approval','ae',50,
   'Save the authority decision confirming that you can proceed to employment and licence activation.',
   'Depending on the authority and route, the document-review and assessment stages lead to an eligibility, evaluation or approval outcome. This is not always the final active professional licence.',
   'Employers use the authority outcome to confirm that the professional can move to facility-linked licensing or activation.',
   'Complete after verification and any assigned assessment, before treating yourself as licensed to practise.',true,
   'https://www.dha.gov.ae/en/dubai-health-licensing-system-shreyan','https://www.dha.gov.ae/en/dubai-health-licensing-system-shreyan',
   'Prepare by clearing all application requests and checking name and title details.','Authority decision times vary and may pause for additional information.',
   'Mark complete when the official eligibility or approval is issued, saved and checked for title, authority and expiry.',
   'ae_employment','An eligibility outcome is not permission to practise and may expire before activation.'),
  ('ae_employment','Secure an authorised facility offer and activate the licence','ae',60,
   'Verify the healthcare facility, written offer and facility-led steps needed to issue or activate your professional licence.',
   'A UAE healthcare facility normally participates in the final professional-licensing stage. Confirm the facility is authorised by the same regulator, the role matches your approved title, and the employer will complete the facility-side licensing and credentialing actions.',
   'An eligibility result alone does not authorise clinical practice; the professional licence and facility relationship must be completed.',
   'Begin job search while eligibility is progressing, but accept only a verified written offer with accurate licensing terms.',true,
   'https://mohap.gov.ae/en/w/licensing-of-a-doctor','https://mohap.gov.ae/en/w/licensing-of-a-doctor',
   'Allow several weeks for applications, interviews, references and employer credentialing.','Recruitment and licence activation depend on the employer and authority.',
   'Mark complete when the employer and role are verified, the contract is signed, and the active professional-licence evidence is issued or formally in progress with the facility.',
   'ae_work_residence','Never pay for a job offer or begin clinical duties before the required active licence is confirmed.'),
  ('ae_work_residence','Complete UAE work and residence formalities','ae',70,
   'Follow the employer-led work permit, entry, medical fitness, Emirates ID and residence process.',
   'For an overseas private-sector hire, the employer initiates the lawful employment and residence route. The official process can include a work entry permit, employment contract and work permit, medical fitness examination, Emirates ID and residence formalities.',
   'Professional licensing and immigration are separate approvals; both must permit the intended work.',
   'Start when the verified employer is ready to sponsor or process the correct work route.',false,
   'https://u.ae/en/information-and-services/business/doing-business-on-the-mainland/recruiting-on-the-mainland-','https://u.ae/en/information-and-services/business/doing-business-on-the-mainland/recruiting-on-the-mainland-',
   'Prepare passport, contract, professional evidence and civil documents before the employer starts the case.','Timing varies by employer, emirate, medical appointment and government checks.',
   'Mark complete when work and residence approvals, medical fitness and Emirates ID steps required for your case are complete and evidence is saved.',
   'ae_arrival','Entry permits and post-entry formalities have deadlines; follow the dates provided by the employer and authorities.'),
  ('ae_arrival','Complete UAE arrival and clinical onboarding','ae',80,
   'Finish identity, residence, facility credentialing, induction and scope-of-practice checks before independent work.',
   'After arrival, complete any outstanding biometrics, Emirates ID, residence, employer credentialing, malpractice-cover, orientation and competency requirements. Confirm the professional licence is active for the correct facility and title.',
   'Local onboarding connects the regulatory approval to safe, lawful practice in the employing facility.',
   'Complete immediately after arrival and before undertaking duties outside authorised induction or supervision.',false,
   'https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/general-provisions-for-the-residence-visa','https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/general-provisions-for-the-residence-visa',
   'Prepare a secure arrival pack and confirm first-week appointments before travel.','Employer onboarding and outstanding government appointments vary.',
   'Mark complete when local identity and residence tasks, active licence confirmation, facility induction and authorised scope are documented.',
   null,'Track professional-licence, residence, Emirates ID, insurance and employer renewal dates separately.'),

  ('sa_mumaris','Create or recover your Mumaris+ account','sa',10,
   'Use one SCFHS Mumaris+ identity and select the correct first-time practitioner service.',
   'Mumaris+ is the Saudi Commission for Health Specialties (SCFHS) practitioner service channel. First-time overseas applicants normally begin with Professional Classification; if the qualification is not listed, SCFHS may direct a Qualification Study first.',
   'Duplicate accounts or the wrong service can separate records and delay the classification sequence.',
   'Complete first; professional classification can be started from outside Saudi Arabia.',true,
   'https://scfhs.org.sa/en/mumaris-faq','https://scfhs.org.sa/en/mumaris-faq',
   'Allow time to recover an existing account and reconcile passport names and contact details.','Account setup is usually immediate; support or record-merging queries can take longer.',
   'Mark complete when you can access the correct Mumaris+ account and have identified Professional Classification or the SCFHS-directed prerequisite service.',
   'sa_classification','Do not create a second account if you already have an SCFHS or previous Mumaris record.'),
  ('sa_classification','Apply for SCFHS Professional Classification','sa',20,
   'Submit your qualification, transcript, training, registration and experience evidence for the correct nurse or midwife classification.',
   'Professional Classification is the first legal SCFHS stage for a new practitioner. SCFHS reviews education, internship or clinical training, professional registration, verified overseas evidence and experience to assign the appropriate professional degree and specialty.',
   'Classification determines the professional category and is required before first Professional Registration.',
   'Start from abroad after confirming the qualification is recognised and the correct service is available in Mumaris+.',true,
   'https://scfhs.org.sa/en/professional-classification-requirements','https://scfhs.org.sa/en/professional-classification-requirements',
   'Allow several weeks to obtain academic records, registration, experience and translations.','SCFHS lists different service levels for direct decisions and assessment routes; incomplete evidence pauses review.',
   'Mark complete when SCFHS issues the classification outcome showing the correct nursing or midwifery category and specialty.',
   'sa_verification','Non-Saudi experience and current professional-standing rules must be checked against the latest SCFHS requirements.'),
  ('sa_verification','Complete SCFHS-approved verification','sa',30,
   'Obtain the final approved verification result for overseas qualifications, registration and other documents SCFHS identifies.',
   'SCFHS requires specified overseas documents to be authenticated through its approved verification company. The exact set depends on the qualification and application; the final report must be attached when required.',
   'Primary-source authentication lets SCFHS confirm that overseas professional records are genuine.',
   'Run alongside the classification preparation, but follow the document set and provider shown by SCFHS.',true,
   'https://scfhs.org.sa/en/professional-classification-requirements','https://scfhs.org.sa/en/professional-classification-requirements',
   'Allow several weeks and ask issuing institutions to respond promptly.','Verification depends on source response and discrepancy review.',
   'Mark complete when the final accepted verification result is attached to or visible in the SCFHS application and discrepancies are closed.',
   'sa_assessment','SCFHS states the final verification report is necessary where verification applies; do not submit a pending receipt as the result.'),
  ('sa_assessment','Complete the SCFHS-directed assessment or exam','sa',40,
   'Take a written, practical or other professional evaluation only when SCFHS assigns it to your classification route.',
   'Professional evaluation is part of classification where SCFHS does not issue a direct decision. Nursing applicants may be directed to a professional licensure examination or another evaluation route shown in Mumaris+.',
   'The assessment supports the competence decision for the requested professional classification.',
   'Book after SCFHS confirms eligibility, assessment type and candidate instructions.',true,
   'https://scfhs.org.sa/en/Mumares/SPLE/DATES','https://scfhs.org.sa/en/Mumares/SPLE/DATES',
   'Allow time for revision, booking and a possible further attempt under current rules.','Scheduling and result approval depend on the assigned assessment route.',
   'Mark complete when the required assessment result is accepted in Mumaris+ and the classification can proceed.',
   'sa_employment','Use the examination named in your SCFHS application; do not assume every nurse or midwife has the same assessment.'),
  ('sa_employment','Secure a verified Saudi healthcare offer','sa',50,
   'Confirm the employer, role, professional category, contract and support for work and residence formalities.',
   'Choose a licensed healthcare employer whose vacancy matches the SCFHS classification. Review the written contract, work location, duties, benefits, probation, accommodation or relocation terms and the employer actions required for entry and residence.',
   'The employer initiates key labour and immigration steps and later provides employment identification used in professional registration where applicable.',
   'Search while classification is progressing, but describe your status accurately and verify every offer independently.',true,
   'https://www.hrsd.gov.sa/en','https://www.hrsd.gov.sa/en',
   'Allow several weeks for employer checks, interviews, references and contract review.','Recruitment timing depends on the facility and its government processing readiness.',
   'Mark complete when the facility, vacancy and contract are verified and the employer confirms the lawful onboarding route in writing.',
   'sa_work_residence','Never pay for a job offer or surrender original documents to an unauthorised recruiter.'),
  ('sa_work_residence','Complete employer-led work and residence processing','sa',60,
   'Follow the employer process for the employment visa, documented contract, work authorisation and lawful residence.',
   'Saudi labour services are managed through official government channels including Qiwa for relevant private-sector transactions. The employer coordinates the correct entry and work route; after arrival, residence identity (Iqama) and related formalities must match the job and sponsor.',
   'SCFHS classification does not itself grant immigration status or permission to work.',
   'Start after the verified employer confirms the offer and begins the authorised government process.',false,
   'https://www.hrsd.gov.sa/en','https://www.hrsd.gov.sa/en',
   'Prepare passport, attested professional records, contract details and medical evidence requested for the route.','Timing varies by employer readiness, visa processing, medical checks and government review.',
   'Mark complete when the required entry, work and lawful-residence evidence for your case is issued and its conditions match the role.',
   'sa_registration','Do not travel or work on a status that does not authorise the agreed healthcare employment.'),
  ('sa_registration','Complete SCFHS Professional Registration','sa',70,
   'After classification and lawful residence, register with SCFHS before beginning regular professional practice.',
   'Professional Registration follows Professional Classification and records the practitioner in the SCFHS database for lawful practice. SCFHS states that first registration for a non-Saudi requires lawful residence and current identity; an employer identification letter may apply for practitioners on the job.',
   'Classification assigns the professional degree; registration is the later step required to practise regularly in Saudi Arabia.',
   'Complete after classification and when the lawful residence and employment evidence required by SCFHS is available.',false,
   'https://scfhs.org.sa/en/professional-registration-requirements','https://scfhs.org.sa/en/node/1985',
   'Prepare the classification outcome, valid resident identity and current employer letter where required.','SCFHS currently publishes a service target, but cases can take longer if evidence is incomplete.',
   'Mark complete when the SCFHS Professional Registration certificate is issued with the correct category, specialty and validity dates.',
   'sa_arrival','SCFHS states registration follows classification and requires lawful residence; do not treat classification alone as authority to practise.'),
  ('sa_arrival','Complete Saudi arrival and facility onboarding','sa',80,
   'Finish Iqama, SCFHS, facility credentialing, induction and authorised-scope checks before independent clinical work.',
   'Coordinate outstanding residence identity, SCFHS registration, employer credentialing, occupational health, orientation and competency steps. Confirm that the job title and clinical duties match both the contract and active SCFHS registration.',
   'Facility onboarding connects professional and immigration approvals to safe practice in the named role.',
   'Complete immediately after arrival and before independent duties.',false,
   'https://scfhs.org.sa/en/professional-registration-requirements','https://scfhs.org.sa/en/professional-registration-requirements',
   'Carry secure copies of professional, employment, immigration and identity evidence.','Employer, residence and facility credentialing times vary.',
   'Mark complete when lawful residence, active SCFHS registration, facility credentialing, induction and authorised scope are documented.',
   null,'Track Iqama, passport, SCFHS registration, contract and required professional-development renewal dates.')
), expanded as (
  select seed.*,
    jsonb_build_array(
      jsonb_build_object('title','Confirm the official route','description','Read the linked authority page and save the route, service name and current requirements that apply to your profession.'),
      jsonb_build_object('title','Check your professional title','description','Match nursing or midwifery qualification, field, experience and intended scope to the title requested.'),
      jsonb_build_object('title','Prepare source documents','description','Collect clear identity, qualification, transcript, training, registration, good-standing and employment evidence as applicable.'),
      jsonb_build_object('title','Use the official channel','description','Submit through the named regulator, employer or government platform and use only its approved verification or assessment provider.'),
      jsonb_build_object('title','Monitor and respond','description','Check the official account and email, answer information requests by their deadlines and record every reference number.'),
      jsonb_build_object('title','Save the outcome','description','Keep the application copy, receipt, result and formal decision; verify the professional title and validity before moving on.')
    ) action_items,
    case
      when code in ('ae_work_residence','ae_arrival','sa_work_residence','sa_arrival') then
        '["Current passport and entry evidence","Verified employment contract and employer contact","Professional eligibility, classification or registration evidence","Medical or occupational-health evidence requested for the route","Residence identity application or issued card","Certified civil documents and translations where required"]'::jsonb
      when code in ('ae_employment','sa_employment') then
        '["Professional CV tailored to the role","Qualification and current registration evidence","Employment references and experience certificates","Regulator eligibility or classification outcome","Saved vacancy description and written contract","Identity and current immigration-status evidence"]'::jsonb
      else
        '["Current passport","Nursing or midwifery qualification","Academic transcript and clinical-training evidence","Current or previous professional registration and good standing","Employment and experience certificates","Certified translations where required"]'::jsonb
    end required_documents,
    jsonb_build_array(
      'Opening the wrong authority or service route','Name, date or professional-title mismatch','Missing primary-source or good-standing evidence','Unclear scan or unaccepted translation','Using an unofficial agent or payment channel','Missing an information request or validity deadline'
    ) common_mistakes,
    jsonb_build_array(
      jsonb_build_object('code','official_route','label','Correct official authority and service confirmed'),
      jsonb_build_object('code','professional_title','label','Nursing or midwifery title and scope confirmed'),
      jsonb_build_object('code','identity_match','label','Names and dates match my passport and records'),
      jsonb_build_object('code','documents_ready','label','Required source documents and translations are ready'),
      jsonb_build_object('code','submission_saved','label','Receipt, reference and official messages are saved'),
      jsonb_build_object('code','follow_up','label','Next action, expiry or decision date is recorded')
    ) personal_checklist
  from seed
)
insert into public.btv_journey_steps(
  code,title,destination,sort_order,description,is_active,is_required,is_archived,
  short_summary,applicable_professions,overview,why_required,stage_timing,can_complete_before_arrival,
  action_items,required_documents,estimated_cost_min,estimated_cost_max,currency,official_url,official_fee_url,
  preparation_time,processing_time,delay_causes,can_progress_in_parallel,common_mistakes,completion_criteria,
  next_step_code,deadline_warning,profession_guidance,personal_checklist,content_status,last_reviewed_at,
  reviewed_by,content_version,published_at,needs_review,updated_at
)
select
  code,title,destination,sort_order,short_summary,true,true,false,
  short_summary,array['nurse','midwife']::text[],overview,why_required,stage_timing,can_complete_before_arrival,
  action_items,required_documents,null,null,case destination when 'ae' then 'AED' else 'SAR' end,official_url,official_fee_url,
  preparation_time,processing_time,
  '["Missing or inconsistent evidence","Issuer or verification delay","Additional authority review","Missed response deadline"]'::jsonb,
  true,common_mistakes,completion_criteria,next_step_code,deadline_warning,
  case destination
    when 'ae' then jsonb_build_object(
      'nurse','Confirm the nurse title, field, experience and gap-of-practice position under the Unified PQR and selected emirate authority.',
      'midwife','Confirm the midwife title, midwifery education, maternity clinical training, experience and current registration evidence under the Unified PQR and selected authority.')
    else jsonb_build_object(
      'nurse','Confirm the SCFHS nursing category, specialty, qualification, verified registration and experience evidence for your classification.',
      'midwife','Confirm the SCFHS midwifery classification, education, maternity clinical training, verified registration and experience evidence for your route.')
  end,
  personal_checklist,'published',date '2026-07-29','Beyond the Visa content team',1,now(),false,now()
from expanded
on conflict(code) do update set
  title=excluded.title,destination=excluded.destination,sort_order=excluded.sort_order,description=excluded.description,
  is_active=true,is_required=true,is_archived=false,short_summary=excluded.short_summary,
  applicable_professions=excluded.applicable_professions,overview=excluded.overview,why_required=excluded.why_required,
  stage_timing=excluded.stage_timing,can_complete_before_arrival=excluded.can_complete_before_arrival,
  action_items=excluded.action_items,required_documents=excluded.required_documents,currency=excluded.currency,
  official_url=excluded.official_url,official_fee_url=excluded.official_fee_url,preparation_time=excluded.preparation_time,
  processing_time=excluded.processing_time,delay_causes=excluded.delay_causes,
  can_progress_in_parallel=excluded.can_progress_in_parallel,common_mistakes=excluded.common_mistakes,
  completion_criteria=excluded.completion_criteria,next_step_code=excluded.next_step_code,
  deadline_warning=excluded.deadline_warning,profession_guidance=excluded.profession_guidance,
  personal_checklist=excluded.personal_checklist,content_status='published',last_reviewed_at=excluded.last_reviewed_at,
  reviewed_by=excluded.reviewed_by,content_version=greatest(public.btv_journey_steps.content_version,1),
  published_at=coalesce(public.btv_journey_steps.published_at,excluded.published_at),needs_review=false,updated_at=now();

with resources(step_code,title,description,resource_type,destination,url,sort_order) as (values
  ('ae_authority','DHA Sheryan','Dubai healthcare-professional licensing services.','professional_regulator','ae','https://www.dha.gov.ae/en/dubai-health-licensing-system-shreyan',1),
  ('ae_authority','DoH Abu Dhabi e-services','Abu Dhabi healthcare-professional licensing services.','professional_regulator','ae','https://www.doh.gov.ae/en/eservices/',2),
  ('ae_authority','MOHAP professional licensing','Federal healthcare-professional licensing service information.','professional_regulator','ae','https://mohap.gov.ae/en/w/licensing-of-a-doctor',3),
  ('ae_pqr','UAE Unified PQR','Official qualification requirements used by UAE healthcare authorities.','official_guidance','ae','https://www.doh.gov.ae/en/pqr',1),
  ('ae_verification','DoH licensing FAQ','Official sequence for document verification, review and assessment.','official_guidance','ae','https://www.doh.gov.ae/en/faq',1),
  ('ae_assessment','DoH licensing FAQ','Official assessment-stage information.','official_guidance','ae','https://www.doh.gov.ae/en/faq',1),
  ('ae_eligibility','DHA Sheryan','Official Dubai licensing gateway and application services.','professional_regulator','ae','https://www.dha.gov.ae/en/dubai-health-licensing-system-shreyan',1),
  ('ae_employment','MOHAP professional licensing','Official facility-linked professional licensing requirements.','professional_regulator','ae','https://mohap.gov.ae/en/w/licensing-of-a-doctor',1),
  ('ae_work_residence','UAE official recruitment process','Official employer-led employment, residence, medical fitness and Emirates ID sequence.','immigration_authority','ae','https://u.ae/en/information-and-services/business/doing-business-on-the-mainland/recruiting-on-the-mainland-',1),
  ('ae_arrival','UAE residence provisions','Official residence, medical fitness and Emirates ID guidance.','immigration_authority','ae','https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/general-provisions-for-the-residence-visa',1),
  ('sa_mumaris','SCFHS Mumaris+ FAQ','Official first-time classification and registration sequence.','professional_regulator','sa','https://scfhs.org.sa/en/mumaris-faq',1),
  ('sa_classification','SCFHS classification requirements','Official evidence and verification requirements for Professional Classification.','professional_regulator','sa','https://scfhs.org.sa/en/professional-classification-requirements',1),
  ('sa_verification','SCFHS classification requirements','Official primary-source verification requirements.','official_guidance','sa','https://scfhs.org.sa/en/professional-classification-requirements',1),
  ('sa_assessment','SCFHS professional licensure exams','Official professional-practice examination information.','professional_regulator','sa','https://scfhs.org.sa/en/Mumares/SPLE/DATES',1),
  ('sa_employment','Saudi Ministry of Human Resources','Official labour services and Qiwa information.','employment_authority','sa','https://www.hrsd.gov.sa/en',1),
  ('sa_work_residence','Saudi Ministry of Human Resources','Official labour and work-authorisation services.','immigration_authority','sa','https://www.hrsd.gov.sa/en',1),
  ('sa_registration','SCFHS registration requirements','Official first Professional Registration requirements.','professional_regulator','sa','https://scfhs.org.sa/en/professional-registration-requirements',1),
  ('sa_arrival','SCFHS registration requirements','Official evidence required to complete professional registration.','professional_regulator','sa','https://scfhs.org.sa/en/professional-registration-requirements',1)
)
insert into public.btv_journey_step_resources(
  step_code,title,description,resource_type,destination,url,is_official,last_reviewed_at,is_active,sort_order
)
select step_code,title,description,resource_type,destination,url,true,date '2026-07-29',true,sort_order
from resources
on conflict(step_code,url) do update set
  title=excluded.title,description=excluded.description,resource_type=excluded.resource_type,
  destination=excluded.destination,is_official=true,last_reviewed_at=excluded.last_reviewed_at,
  is_active=true,sort_order=excluded.sort_order,updated_at=now();

do $$
declare
  destination_code text;
begin
  foreach destination_code in array array['ae','sa'] loop
    if (select count(*) from public.btv_journey_steps
        where destination=destination_code and is_active and not is_archived and content_status='published') <> 8 then
      raise exception 'Expected exactly eight published Journey steps for destination %',destination_code;
    end if;
    if exists(
      select 1 from public.btv_journey_steps
      where destination=destination_code and is_active and not is_archived and content_status='published'
        and (jsonb_array_length(action_items)<6 or jsonb_array_length(required_documents)<5
          or jsonb_array_length(common_mistakes)<5 or jsonb_array_length(personal_checklist)<6
          or nullif(trim(overview),'') is null or official_url !~ '^https://')
    ) then
      raise exception 'Incomplete Journey guidance for destination %',destination_code;
    end if;
  end loop;
end;
$$;
