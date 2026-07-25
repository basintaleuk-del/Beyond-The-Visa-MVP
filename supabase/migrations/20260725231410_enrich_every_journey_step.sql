-- Complete the guidance already attached to every active Journey step.
-- This enriches the existing source-of-truth rows; it does not create another journey model.

with destination_context(destination,country,regulator,immigration_authority) as (values
  ('uk','United Kingdom','Nursing and Midwifery Council (NMC)','UK Visas and Immigration'),
  ('us','United States','the relevant state licensing or certification authority','US Citizenship and Immigration Services'),
  ('au','Australia','Ahpra and the Nursing and Midwifery Board of Australia','Department of Home Affairs'),
  ('ca','Canada','the regulator for the selected province or territory','Immigration, Refugees and Citizenship Canada'),
  ('nz','New Zealand','the Nursing Council or Midwifery Council of New Zealand','Immigration New Zealand'),
  ('ie','Ireland','Nursing and Midwifery Board of Ireland (NMBI)','the Department of Enterprise, Tourism and Employment or Immigration Service Delivery')
), classified as (
  select s.code,s.destination,s.title,s.sort_order,c.country,c.regulator,c.immigration_authority,
    case
      when s.code ~ '(passport|identity)' then 'identity'
      when s.code ~ '(english|ielts|language)' then 'language'
      when s.code ~ '(visa|immigration|permission)' then 'immigration'
      when s.code ~ '(travel|arrival)' then 'arrival'
      when s.code ~ '(employment|job-search|interview|cos|first-nhs-job)' then 'employment'
      when s.code ~ '(state|province)' then 'jurisdiction'
      when s.code ~ '(checks)' then 'checks'
      when s.code ~ '(career-development)' then 'career'
      else 'registration'
    end kind
  from public.btv_journey_steps s join destination_context c using(destination)
  where s.is_active and not s.is_archived
), ordered as (
  select classified.*,lead(code) over(partition by destination order by sort_order,code) next_code
  from classified
)
update public.btv_journey_steps s set
  short_summary=case o.kind
    when 'identity' then 'Check that your passport and identity evidence are current, consistent and ready for certification or verification.'
    when 'language' then format('Confirm the English evidence accepted by %s, complete the correct test or evidence route, and retain the official result.',o.regulator)
    when 'immigration' then format('Identify the correct permission to work in %s and prepare the evidence required by %s.',o.country,o.immigration_authority)
    when 'arrival' then format('Prepare a safe, documented move to %s and complete the practical and professional tasks required after arrival.',o.country)
    when 'employment' then 'Prepare a verified professional application, assess the employer and role carefully, and retain written recruitment evidence.'
    when 'jurisdiction' then format('Choose the jurisdiction in %s that matches your intended role because registration rules can differ by location.',o.country)
    when 'checks' then 'Complete the official character, police and health checks requested for registration, employment or immigration.'
    when 'career' then 'Keep your registration, competence and career plan current after entering practice.'
    else format('Complete the evidence, assessment or registration decision required by %s and retain the formal outcome.',o.regulator)
  end,
  overview=format('%s is a %s stage of your %s pathway. The requirements depend on your profession, training history and intended place of practice. Use the official links in this step to verify the current route before submitting documents or paying a fee.',s.title,replace(o.kind,'_',' '),o.country),
  why_required=case o.kind
    when 'identity' then 'Authorities use identity evidence to match qualifications, registrations, checks and immigration records to the same person.'
    when 'language' then format('%s may require current evidence that you can communicate safely and effectively in professional practice.',o.regulator)
    when 'immigration' then format('%s must confirm that you have a lawful route to enter, remain and work in %s.',o.immigration_authority,o.country)
    when 'arrival' then 'A documented arrival plan reduces avoidable risk and helps you complete time-sensitive employment, immigration and registration tasks.'
    when 'employment' then 'Employers need reliable evidence of identity, competence, registration status and work eligibility before making or confirming an offer.'
    when 'jurisdiction' then 'The selected state, province or territory determines the regulator, application route and some evidence or examination requirements.'
    when 'checks' then 'Regulators, employers or immigration authorities may require current evidence of character and health before approval.'
    when 'career' then 'Ongoing competence and renewal activity protect your registration and support safe career progression.'
    else format('%s must assess your education, identity, professional standing and competence before granting the relevant outcome.',o.regulator)
  end,
  stage_timing=case o.kind
    when 'identity' then 'Complete first. Identity details must be consistent before tests, verification, registration or immigration applications are opened.'
    when 'language' then 'Confirm the accepted evidence early; complete it before any registration stage that requires a valid result.'
    when 'immigration' then 'Begin route research early, but submit only when the required registration, offer, sponsorship and supporting evidence are ready.'
    when 'arrival' then 'Plan after the key registration, employment and immigration decisions are confirmed; complete local actions immediately after arrival.'
    when 'employment' then 'Prepare while registration is progressing, but describe your status accurately and do not claim approval before it is issued.'
    when 'jurisdiction' then 'Decide before ordering credential reports or starting a jurisdiction-specific registration application.'
    when 'checks' then 'Order only when requested or when validity will cover the submission window; many checks expire.'
    when 'career' then 'Start after joining practice and revisit throughout each registration and appraisal cycle.'
    else 'Start after confirming the correct professional route and complete it before dependent employment or immigration stages.'
  end,
  can_complete_before_arrival=(o.kind not in ('arrival','career')),
  action_items=case o.kind
    when 'identity' then jsonb_build_array(
      jsonb_build_object('title','Check validity','description','Confirm your passport is valid for the expected application and travel period; check authority-specific validity rules.'),
      jsonb_build_object('title','Reconcile names','description','List every name variation and obtain official marriage, birth or name-change evidence where records differ.'),
      jsonb_build_object('title','Prepare copies','description','Make clear colour scans of every requested page without cropped edges, glare or hidden security details.'),
      jsonb_build_object('title','Arrange certification','description','Use an accepted certifier or identity-verification service and certified translations where the authority requires them.'),
      jsonb_build_object('title','Submit securely','description','Upload or send identity evidence only through the official channel stated for this application.'),
      jsonb_build_object('title','Save evidence','description','Keep the submission receipt, certified-copy details and a private record of any identity enquiry or correction.')
    )
    when 'language' then jsonb_build_array(
      jsonb_build_object('title','Confirm your route','description',format('Read the current language standard published by %s and identify exemptions or alternative evidence that may apply.',o.regulator)),
      jsonb_build_object('title','Choose the accepted test','description','Check the exact test type, delivery format, score profile, combination rules and result-validity period before booking.'),
      jsonb_build_object('title','Prepare and book','description','Use the official test provider, enter your name exactly as shown on your passport and allow time for a resit if needed.'),
      jsonb_build_object('title','Take the test','description','Bring the required identity document and follow provider rules so the result can be verified.'),
      jsonb_build_object('title','Send the result','description','Use the regulator-approved result-sharing method or verification code; do not rely on an unverified screenshot.'),
      jsonb_build_object('title','Save and review','description','Keep the official result, submission confirmation and expiry date. If unsuccessful, review component scores and the permitted retake route.')
    )
    when 'immigration' then jsonb_build_array(
      jsonb_build_object('title','Identify the route','description',format('Use %s to compare the work, sponsorship and family conditions that apply to your circumstances.',o.immigration_authority)),
      jsonb_build_object('title','Check dependencies','description','Confirm whether you need registration, an eligible job offer, sponsorship, credential evidence or a labour-market step before applying.'),
      jsonb_build_object('title','Prepare evidence','description','Collect identity, offer or sponsorship, professional, financial, police, health and family evidence requested for the route.'),
      jsonb_build_object('title','Complete the official form','description','Answer from source documents, disclose prior refusals where asked and check dates, names and document numbers before submission.'),
      jsonb_build_object('title','Complete post-submission tasks','description','Attend biometrics or medical appointments, monitor the official account and respond to information requests by the deadline.'),
      jsonb_build_object('title','Protect the decision','description','Save the application copy, receipt and decision. If delayed or refused, use the official enquiry, review or appeal route before paying an adviser.')
    )
    when 'arrival' then jsonb_build_array(
      jsonb_build_object('title','Confirm permission and start date','description','Do not book non-refundable travel until immigration, employment and any required professional decisions are confirmed.'),
      jsonb_build_object('title','Create a document pack','description','Carry secure copies of passport, permission, offer, sponsorship, registration evidence, accommodation and emergency contacts.'),
      jsonb_build_object('title','Plan accommodation and travel','description','Verify the address, transport, cancellation terms, arrival time and safe onward journey.'),
      jsonb_build_object('title','Prepare first-week tasks','description','List employer checks, immigration registration, banking, tax, telephone, healthcare and local transport actions that apply.'),
      jsonb_build_object('title','Complete employer onboarding','description','Present original evidence only to authorised staff and record induction, supervision and competency requirements.'),
      jsonb_build_object('title','Save local evidence','description','Keep proof of entry, address, employment checks and any local registration or identity number issued after arrival.')
    )
    when 'employment' then jsonb_build_array(
      jsonb_build_object('title','Define a suitable role','description','Match the role, setting, professional field, registration stage, supervision and location to your experience and route.'),
      jsonb_build_object('title','Verify the employer','description','Use the employer website and relevant official registers; confirm sponsorship claims directly and never pay for a job offer.'),
      jsonb_build_object('title','Prepare evidence','description','Tailor your CV and supporting statement, and organise registration status, qualification and employment references.'),
      jsonb_build_object('title','Apply accurately','description','Use the named recruitment channel, declare your current registration and work-permission status, and save the vacancy description.'),
      jsonb_build_object('title','Complete selection','description','Prepare evidence-based examples, verify interview arrangements and ask how overseas applicants are supported.'),
      jsonb_build_object('title','Check the written outcome','description','Review duties, pay, location, conditions, sponsorship and repayment clauses. Save all correspondence and query discrepancies before accepting.')
    )
    when 'jurisdiction' then jsonb_build_array(
      jsonb_build_object('title','Compare jurisdictions','description','Compare regulator rules, professional scope, credential services, examinations, employment demand and location constraints.'),
      jsonb_build_object('title','Check profession and field','description','Confirm that the jurisdiction accepts your nursing field or midwifery qualification and identify any additional education requirement.'),
      jsonb_build_object('title','Check mobility rules','description','Do not assume registration automatically transfers; read endorsement, compact, interprovincial or mutual-recognition rules.'),
      jsonb_build_object('title','Confirm application sequence','description','Ask which report or regulator application must be opened first and where third parties must send documents.'),
      jsonb_build_object('title','Record the decision','description','Save the regulator name, route, current checklist, fees page and contact channel for the selected jurisdiction.'),
      jsonb_build_object('title','Recheck before paying','description','If the intended jurisdiction changes, reassess the whole route before ordering reports or booking an exam.')
    )
    when 'checks' then jsonb_build_array(
      jsonb_build_object('title','Confirm the requested check','description','Identify which authority needs the check, the countries or periods covered, the accepted provider and the validity window.'),
      jsonb_build_object('title','Gather identity and history','description','Prepare passports, address history, previous names, consent forms, vaccination or medical records where requested.'),
      jsonb_build_object('title','Use the official provider','description','Apply through the authority or its named provider and follow fingerprint, medical or document-certification instructions.'),
      jsonb_build_object('title','Attend appointments','description','Bring original identity documents and disclose relevant history accurately when the form requests it.'),
      jsonb_build_object('title','Send the result correctly','description','Follow direct-send rules where required and save the receipt or tracking reference.'),
      jsonb_build_object('title','Handle delays or findings','description','Respond through the official channel, provide explanations or corrections requested, and obtain qualified advice for material findings.')
    )
    when 'career' then jsonb_build_array(
      jsonb_build_object('title','Review your role','description','Identify the competencies, mandatory training and professional standards attached to your current scope of practice.'),
      jsonb_build_object('title','Set development goals','description','Choose measurable clinical, leadership or specialist goals with appropriate supervision and timeframes.'),
      jsonb_build_object('title','Record learning','description','Keep certificates, reflections, feedback, practice hours and evidence required for appraisal or renewal.'),
      jsonb_build_object('title','Protect registration','description','Track renewal, indemnity, continuing-development and immigration or employment deadlines.'),
      jsonb_build_object('title','Use safe progression routes','description','Verify education providers and role requirements before paying for a course or accepting expanded duties.'),
      jsonb_build_object('title','Review regularly','description','Discuss progress with a supervisor or mentor and update the plan after appraisal, role or regulatory changes.')
    )
    else jsonb_build_array(
      jsonb_build_object('title','Confirm the correct route','description',format('Use %s guidance for your profession, qualification country and intended scope of practice.',o.regulator)),
      jsonb_build_object('title','Open the official application','description','Create the correct account and record the application or candidate identifier in your private Journey notes.'),
      jsonb_build_object('title','Arrange primary-source evidence','description','Ask institutions and regulators to send transcripts, verification or good-standing evidence exactly as instructed.'),
      jsonb_build_object('title','Submit your part','description','Upload clear identity, qualification, employment and language evidence; review declarations before payment and submission.'),
      jsonb_build_object('title','Monitor assessment','description','Check the official account and email, respond to requests by the deadline and complete any regulator-directed test or adaptation.'),
      jsonb_build_object('title','Save the formal outcome','description','Keep the decision, eligibility notice, result or registration evidence. If refused, use the stated correction, review or appeal process.')
    )
  end,
  required_documents=case o.kind
    when 'identity' then '["Current passport","Secondary identity evidence where requested","Birth, marriage or name-change evidence where applicable","Accepted certified copies","Certified translations where applicable"]'::jsonb
    when 'language' then '["Passport used for the booking","Official booking confirmation","Official score report or accepted alternative evidence","Candidate or result verification number","Regulator submission confirmation"]'::jsonb
    when 'immigration' then '["Current passport and travel history","Professional registration or eligibility evidence where required","Job offer and sponsorship evidence where applicable","Police and health evidence when requested","Financial and relationship evidence where required","Certified translations"]'::jsonb
    when 'arrival' then '["Passport and immigration decision","Professional registration evidence","Offer, contract and employer contact details","Accommodation and onward-travel confirmation","Insurance and essential health records","Certified copies and secure digital backups"]'::jsonb
    when 'employment' then '["Tailored professional CV","Qualification and registration evidence","Employment references","Continuing-development evidence where relevant","Identity and current work-permission status","Saved vacancy description and written offer"]'::jsonb
    when 'jurisdiction' then '["Qualification and transcript summary","Current professional registration details","Employment-history summary","Language evidence status","Comparison notes and saved official checklist"]'::jsonb
    when 'checks' then '["Current passport and previous identity details","Complete address and travel history","Official request or application reference","Police, fingerprint, vaccination or medical evidence as applicable","Certified translations where required"]'::jsonb
    when 'career' then '["Current registration and renewal details","Practice-hour record","Continuing-development certificates","Reflections, feedback and appraisal evidence","Updated CV and development plan"]'::jsonb
    else '["Current passport","Nursing or midwifery qualification","Academic transcript and clinical-placement evidence","Professional registration and good-standing verification","Employment references","English-language evidence where required","Certified translations"]'::jsonb
  end,
  preparation_time=case o.kind when 'identity' then 'Allow one to six weeks if documents need renewal, certification, translation or correction.' when 'language' then 'Allow time for preparation, booking availability, result release and a possible resit.' when 'immigration' then 'Allow several weeks to gather route-specific evidence after registration, employment or sponsorship dependencies are ready.' when 'arrival' then 'Begin planning several weeks before travel, but wait for key decisions before making non-refundable commitments.' when 'employment' then 'Allow one to three weeks to verify roles, tailor evidence and prepare for selection.' when 'jurisdiction' then 'Allow several days to compare official requirements before ordering paid reports.' when 'checks' then 'Allow time to collect address history and attend provider appointments before the check expires.' when 'career' then 'Review goals at induction and at least at each appraisal or renewal cycle.' else 'Allow several weeks to obtain primary-source records, certification and translations before submission.' end,
  processing_time=case o.kind when 'identity' then 'Document issue and certification times vary by issuing country and provider.' when 'language' then 'Booking and result-release times vary by provider; confirm current dates before relying on a result deadline.' when 'immigration' then 'Decision times vary by route, location and case complexity. Use the official processing-time service.' when 'arrival' then 'Most planning is user-controlled; local onboarding and registration tasks may have fixed appointment times.' when 'employment' then 'Recruitment can take several weeks or longer depending on checks, interviews and sponsorship.' when 'jurisdiction' then 'Research is user-controlled, but written regulator clarification may take additional time.' when 'checks' then 'Police, fingerprint and health-check processing varies by country, provider and whether further review is needed.' when 'career' then 'Ongoing; complete evidence before appraisal and registration-renewal deadlines.' else 'Professional assessment may take weeks or months and can pause while third-party evidence or further information is outstanding.' end,
  delay_causes=case o.kind
    when 'identity' then '["Passport renewal or identity-record correction","Unaccepted certifier","Name mismatch across documents","Missing translation or cropped scan"]'::jsonb
    when 'language' then '["Booking availability","Incorrect test type","Identity mismatch","Result below a required component score","Result-verification or expiry issue"]'::jsonb
    when 'immigration' then '["Missing sponsorship or registration evidence","Biometrics or medical appointment availability","Incomplete travel or address history","Additional security or document checks","Missed information request"]'::jsonb
    when 'employment' then '["Incomplete references","Registration status unclear","Employer sponsorship checks","Interview scheduling","Pre-employment check delays"]'::jsonb
    else '["Missing primary-source evidence","Unclear or uncertified documents","Name or date mismatch","Third-party verification delay","Additional assessment or information request"]'::jsonb
  end,
  common_mistakes=case o.kind
    when 'identity' then '["Using an expired passport","Cropping document edges","Ignoring a name difference","Using an unaccepted certifier","Sending originals when not requested"]'::jsonb
    when 'language' then '["Booking the wrong test or delivery format","Looking only at an overall score","Using a different name from the passport","Missing result-sharing instructions","Letting the result expire"]'::jsonb
    when 'immigration' then '["Applying before dependencies are ready","Using an incorrect route or form","Omitting previous refusals or travel history","Paying an unofficial agent","Booking non-refundable travel before a decision"]'::jsonb
    when 'arrival' then '["Travelling without accessible evidence","Using unverified accommodation","Missing an employer or immigration appointment","Carrying sensitive documents insecurely","Assuming registration is complete before local checks"]'::jsonb
    when 'employment' then '["Paying for a job offer","Using a generic CV","Overstating registration or work status","Not verifying sponsorship claims","Accepting unclear repayment or relocation terms"]'::jsonb
    when 'jurisdiction' then '["Choosing only by salary","Ordering a report before selecting the regulator","Assuming requirements transfer automatically","Ignoring profession or field restrictions","Relying on an unofficial summary"]'::jsonb
    when 'checks' then '["Ordering too early and letting the check expire","Leaving gaps in address history","Using the wrong provider","Failing to disclose a previous name","Sending a result by an unaccepted method"]'::jsonb
    when 'career' then '["Missing renewal deadlines","Keeping no evidence of learning","Working beyond competence without support","Using an unrecognised course provider","Failing to update immigration or employer records"]'::jsonb
    else '["Starting the wrong application route","Sending documents yourself when primary-source delivery is required","Uploading unclear scans","Missing a regulator message","Booking an assessment before eligibility is confirmed"]'::jsonb
  end,
  completion_criteria=case o.kind
    when 'identity' then 'Mark complete when every required identity document is current, names are reconciled, and accepted certified or verified copies are ready.'
    when 'language' then 'Mark complete only when you hold accepted, verifiable English-language evidence that meets the current requirement and remains valid for the next application stage.'
    when 'immigration' then 'Mark complete only after the official permission or decision is issued, its conditions are understood, and the decision evidence is saved.'
    when 'arrival' then format('Mark complete after arriving in %s and finishing the immediate immigration, employer, accommodation and local professional actions that apply to you.',o.country)
    when 'employment' then 'Mark complete when the required recruitment outcome is in writing, the employer and terms are verified, and all related evidence is saved.'
    when 'jurisdiction' then 'Mark complete when you have selected the jurisdiction, confirmed the profession-specific route on the regulator website and saved its current checklist.'
    when 'checks' then 'Mark complete when every requested check has been issued or sent through the accepted channel and will remain valid for the dependent application.'
    when 'career' then 'Mark complete for the current review cycle when goals, required learning, evidence and renewal dates are documented.'
    else 'Mark complete only when the responsible authority has issued the formal eligibility, assessment, examination or registration outcome required for the next stage.'
  end,
  next_step_code=o.next_code,
  deadline_warning=case o.kind when 'identity' then 'Check passport and certification validity before submission.' when 'language' then 'Language results expire; confirm the validity window for the next stage.' when 'immigration' then 'Application, biometrics and information-request deadlines are strict.' when 'checks' then 'Police and health evidence may expire before the next application.' when 'career' then 'Track appraisal and registration-renewal dates.' else 'Check every official response and document-expiry date.' end,
  profession_guidance=jsonb_build_object(
    'nurse',case o.kind when 'registration' then format('Confirm the accepted nursing field, qualification level, clinical hours and scope of practice with %s.',o.regulator) else 'Check whether the requirement differs by nursing field, level, employer or intended scope of practice.' end,
    'midwife',case o.kind when 'registration' then format('Confirm midwifery education, maternity placement, birth-experience and professional-reference evidence separately with %s.',o.regulator) else 'Check whether the requirement needs separate midwifery qualification, maternity-placement or professional-reference evidence.' end
  ),
  personal_checklist=jsonb_build_array(
    jsonb_build_object('code','official_route','label','Current official route and authority confirmed'),
    jsonb_build_object('code','identity_match','label','Names and dates match my passport and records'),
    jsonb_build_object('code','documents_ready','label','Step-specific documents and translations are ready'),
    jsonb_build_object('code','fee_checked','label','Current official fee and payment channel checked'),
    jsonb_build_object('code','submission_saved','label','Application, receipt and official messages saved'),
    jsonb_build_object('code','follow_up','label','Follow-up, expiry or decision date recorded')
  ),
  content_version=greatest(s.content_version,2),
  updated_at=now()
from ordered o
where s.code=o.code;

-- Guard the release: every published active step must have complete modal content.
do $$
begin
  if exists(
    select 1 from public.btv_journey_steps
    where is_active and not is_archived and content_status='published'
      and (nullif(trim(short_summary),'') is null
        or nullif(trim(overview),'') is null
        or nullif(trim(why_required),'') is null
        or nullif(trim(stage_timing),'') is null
        or jsonb_array_length(action_items)<6
        or jsonb_array_length(required_documents)<5
        or jsonb_array_length(common_mistakes)<5
        or jsonb_array_length(personal_checklist)<6
        or nullif(trim(completion_criteria),'') is null)
  ) then
    raise exception 'Journey guidance enrichment left one or more active steps incomplete';
  end if;
end;
$$;
