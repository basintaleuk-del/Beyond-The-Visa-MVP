-- Quarantine cosmetic repetitions and establish an auditable, unofficial sample bank.
-- These records are original Beyond The Visa practice items aligned to public blueprints.
-- They are not copied official exam questions and cannot be activated without qualified review.

alter table public.cbt_questions
  add column if not exists content_kind text not null default 'practice_question',
  add column if not exists semantic_hash text,
  add column if not exists source_reference text;

alter table public.nclex_questions
  add column if not exists content_kind text not null default 'practice_question',
  add column if not exists semantic_hash text,
  add column if not exists source_reference text;

alter table public.cbt_questions drop constraint if exists cbt_questions_content_kind_check;
alter table public.cbt_questions add constraint cbt_questions_content_kind_check
  check (content_kind in ('practice_question', 'unofficial_sample'));
alter table public.nclex_questions drop constraint if exists nclex_questions_content_kind_check;
alter table public.nclex_questions add constraint nclex_questions_content_kind_check
  check (content_kind in ('practice_question', 'unofficial_sample'));

create or replace function public.btv_question_semantic_key(value text)
returns text language sql immutable strict set search_path = '' as $$
  select md5(lower(trim(regexp_replace(
    regexp_replace(
      regexp_replace(value, '^\[BTV-(CBT|NCLEX)-(SAMPLE-)?[0-9]+\]\s*', '', 'i'),
      '^Extended practice draft [0-9]+\.\s*', '', 'i'
    ),
    '^[^.]+ is being cared for in [^.]+ during the [^.]+\.\s*', '', 'i'
  ))));
$$;

update public.cbt_questions
set semantic_hash = public.btv_question_semantic_key(question_text),
    content_kind = case when review_status = 'sample_unreviewed' then 'unofficial_sample' else content_kind end,
    source_reference = coalesce(source_reference, 'https://www.nmc.org.uk/registration/joining-the-register/toc/toc-nursing-and-midwifery/resources/');

update public.nclex_questions
set semantic_hash = public.btv_question_semantic_key(question_text),
    content_kind = case when review_status = 'sample_unreviewed' then 'unofficial_sample' else content_kind end,
    source_reference = coalesce(source_reference, 'https://www.ncsbn.org/publications/2026-nclex-rn-test-plan');

with ranked as (
  select id, row_number() over (
    partition by semantic_hash
    order by case when quality_status = 'approved' then 0 else 1 end, id
  ) as duplicate_rank
  from public.cbt_questions
)
update public.cbt_questions q
set is_active = false, quality_status = 'rejected', review_status = 'duplicate_quarantined', reviewed_at = null
from ranked r where q.id = r.id and r.duplicate_rank > 1 and q.quality_status <> 'approved';

with ranked as (
  select id, row_number() over (
    partition by semantic_hash
    order by case when quality_status = 'approved' then 0 else 1 end, id
  ) as duplicate_rank
  from public.nclex_questions
)
update public.nclex_questions q
set is_active = false, quality_status = 'rejected', review_status = 'duplicate_quarantined', reviewed_at = null
from ranked r where q.id = r.id and r.duplicate_rank > 1 and q.quality_status <> 'approved';

insert into public.cbt_questions
  (profession, subject, difficulty, question_text, option_a, option_b, option_c, option_d,
   correct_option, explanation, access_level, is_active, question_type, review_status,
   standard_version, blueprint_domain, quality_status, content_kind, semantic_hash, source_hash, source_reference)
select profession, subject, difficulty, question_text, option_a, option_b, option_c, option_d,
       correct_option, explanation, 'free', false, 'single', 'sample_unreviewed',
       'Unofficial sample aligned to the NMC Test of Competence 2021 blueprint', blueprint_domain,
       'needs_clinical_review', 'unofficial_sample', public.btv_question_semantic_key(question_text),
       md5('btv-original-sample|' || question_text),
       'https://www.nmc.org.uk/registration/joining-the-register/toc/toc-nursing-and-midwifery/resources/'
from (values
  ('both','Adult Nursing','medium','A patient with sepsis has a NEWS2 score that is rising despite initial treatment. What is the most appropriate nursing action?','Wait for the next scheduled observation round','Repeat observations promptly and escalate using the local deterioration pathway','Reduce the observation frequency to avoid distress','Document the score only at the end of the shift','B','A worsening early-warning score requires prompt reassessment, escalation and continued monitoring according to the local deterioration policy.','Nursing practice and decision making'),
  ('both','Medicines Management','medium','A patient taking warfarin is prescribed a new antibiotic. What should the nurse do before administration?','Assume all antibiotics are compatible','Check the prescription, interaction risk and required monitoring, and clarify concerns','Stop warfarin without authorisation','Give both medicines and check interactions later','B','New medicines may alter anticoagulant effect. Confirm safety, monitoring requirements and any prescriber or pharmacist advice before administration.','Nursing practice and decision making'),
  ('both','Documentation','easy','A patient refuses a prescribed treatment after receiving information. Which record is most appropriate?','Treatment refused','Record the information given, the patient decision, relevant assessment and escalation','Do not record it because consent was withheld','Record that the patient was difficult','B','A factual record should show the discussion, capacity or consent considerations, decision, actions and escalation without judgemental language.','Communication and interpersonal skills'),
  ('both','Professional Values','medium','A colleague posts an anonymised photograph from a clinical area on social media. What should the nurse do?','Ignore it because no patient name is visible','Act to protect confidentiality and raise the concern through the appropriate process','Share the post only with colleagues','Ask patients to comment on the post','B','Images and contextual details can breach privacy even without names. The nurse should protect confidentiality and escalate the concern appropriately.','Professional values'),
  ('both','Prioritisation','hard','Four patients require review. Which patient should the nurse assess first?','A patient with new inspiratory stridor after medication','A patient awaiting routine discharge medicines','A patient requesting sleep advice','A patient whose chronic pain score is unchanged','A','New stridor may indicate an immediately threatened airway and takes priority under an ABCDE approach.','Leadership, management and team working'),
  ('both','Mental Health','medium','A detained patient becomes increasingly agitated and asks why they cannot leave. What is the best initial response?','Threaten restraint immediately','Use calm communication, assess risk, explain the legal position and seek appropriate support','Lock the door and walk away','Tell other patients to intervene','B','Use the least restrictive, person-centred approach: communicate clearly, assess immediate risk and involve the appropriate team.','Nursing practice and decision making'),
  ('nurse','Child Nursing','medium','A child receiving intravenous fluids has reduced urine output and increasing facial puffiness. What should the nurse do?','Increase the infusion rate independently','Stop all observations','Reassess fluid balance and the child promptly, then escalate the findings','Encourage unrestricted oral fluids without assessment','C','Reduced output with oedema may indicate fluid imbalance or renal compromise and requires prompt assessment and escalation.','Nursing practice and decision making'),
  ('both','Infection Prevention','medium','A nurse sustains a needlestick injury from a used hollow-bore needle. What action is required first?','Suck the wound','Wash the area, encourage gentle bleeding as appropriate and follow urgent exposure procedures','Wait until symptoms develop','Place the needle back in its sheath','B','Immediate first aid and urgent occupational-exposure assessment reduce risk; the incident must be reported according to policy.','Professional values'),
  ('both','Adult Nursing','hard','A patient receiving an opioid becomes difficult to rouse with a respiratory rate of 7 breaths per minute. What is the priority action?','Allow the patient to sleep','Start an immediate ABCDE assessment, summon urgent help and follow the opioid emergency protocol','Give the next dose early','Offer a hot drink','B','Severe respiratory depression is life-threatening. Support airway and breathing, escalate urgently and follow the local reversal and monitoring protocol.','Nursing practice and decision making'),
  ('both','Prioritisation','medium','A healthcare assistant reports a previously mobile patient has suddenly become unable to stand. What should the registered nurse do?','Ask the assistant to reassess tomorrow','Perform a prompt registered-nurse assessment and escalate acute findings','Document it as normal ageing','Arrange discharge transport','B','A sudden functional change can signal acute deterioration and requires registered-nurse assessment, clinical reasoning and escalation.','Leadership, management and team working')
) as sample(profession,subject,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,blueprint_domain)
where not exists (select 1 from public.cbt_questions q where q.semantic_hash = public.btv_question_semantic_key(sample.question_text) and q.quality_status <> 'rejected');

insert into public.nclex_questions
  (exam, category, client_need, difficulty, question_type, question_text, option_a, option_b, option_c, option_d,
   correct_options, rationale, test_strategy, access_level, is_active, review_status, standard_version,
   blueprint_domain, quality_status, content_kind, semantic_hash, source_hash, source_reference)
select 'NCLEX-RN', category, category, difficulty, 'single', question_text, option_a, option_b, option_c, option_d,
       array[correct_option], rationale, strategy, 'free', false, 'sample_unreviewed',
       'Unofficial sample aligned to the NCSBN 2026 NCLEX-RN Test Plan', category,
       'needs_clinical_review', 'unofficial_sample', public.btv_question_semantic_key(question_text),
       md5('btv-original-sample|' || question_text), 'https://www.ncsbn.org/publications/2026-nclex-rn-test-plan'
from (values
  ('Management of Care','medium','A registered nurse is assigning care for four clients. Which task is appropriate for a licensed practical/vocational nurse?','Develop the initial plan of care for a newly admitted unstable client','Reinforce previously taught wound-care instructions for a stable client','Perform the initial triage assessment in the emergency department','Evaluate a client response to the first dose of an IV medication','B','Reinforcement of established teaching for a stable client may be assigned according to scope and facility policy; initial assessment, planning and evaluation remain RN responsibilities.','Match client stability and task complexity to the team member scope.'),
  ('Safety and Infection Prevention and Control','medium','Which personal protective equipment should the nurse remove first after care that contaminated the gloves and gown?','Gloves','Respirator','Eye protection','Hair covering','A','Gloves are generally the most contaminated item and are removed first while avoiding contact with skin or clothing.','Identify the item with the greatest contamination risk.'),
  ('Health Promotion and Maintenance','easy','Which statement by a pregnant client indicates a need for further teaching about warning signs?','I will report vaginal bleeding promptly','I will seek care for a severe persistent headache','Reduced fetal movement can wait until my next routine visit','A gush of fluid should be evaluated','C','Reduced fetal movement may indicate fetal compromise and requires timely evaluation rather than waiting for a routine appointment.','Distinguish expected discomforts from findings requiring prompt evaluation.'),
  ('Psychosocial Integrity','medium','A client experiencing panic is breathing rapidly and says, “I am dying.” Which response is best?','You have nothing to worry about','Stay with the client, speak briefly and calmly, and guide slow breathing','Ask the client to explain childhood experiences','Leave the client alone in a crowded waiting room','B','During severe anxiety, remain present, reduce stimulation and use short, calm directions that support physiologic control.','Choose an intervention the client can process during severe anxiety.'),
  ('Basic Care and Comfort','medium','A client with dysphagia is beginning a meal. Which nursing action best reduces aspiration risk?','Place the client flat in bed','Position the client upright and follow the prescribed swallowing plan','Offer thin liquids rapidly','Use a straw for every client with dysphagia','B','Upright positioning and an individualized swallowing plan reduce aspiration risk; food and fluid consistency must follow assessment recommendations.','Use assessment-based positioning and consistency modifications.'),
  ('Pharmacological and Parenteral Therapies','hard','A client receiving IV potassium reports burning at the site. What should the nurse do first?','Increase the infusion rate','Assess the IV site and infusion, and stop or pause it if infiltration or unsafe administration is suspected','Inject potassium by IV push','Apply pressure without checking the line','B','IV potassium can cause serious tissue injury and must never be given by IV push. Assess the site and administration parameters immediately.','Prioritize a finding that may signal medication-related tissue injury.'),
  ('Reduction of Risk Potential','medium','Four hours after thyroid surgery, which finding requires immediate action?','Mild incisional discomfort','New neck swelling with difficulty swallowing','A request for water','Sleepiness after analgesia with normal respirations','B','New neck swelling and dysphagia may signal a postoperative hematoma that can rapidly threaten the airway.','Link postoperative findings to the most time-critical complication.'),
  ('Physiological Adaptation','hard','A client with diabetic ketoacidosis is receiving treatment. Which laboratory trend requires the closest cardiac monitoring?','A falling serum potassium level','A decreasing glucose level','A improving bicarbonate level','A lower serum ketone level','A','Insulin and correction of acidosis move potassium into cells, creating a risk of hypokalemia and dysrhythmias.','Anticipate treatment-related shifts, not only disease findings.'),
  ('Management of Care','medium','A competent adult client refuses a blood transfusion after the risks are explained. What should the nurse do?','Administer it because it was prescribed','Respect the refusal, notify the provider and document the informed decision','Ask the family to override the client','Obtain the blood and conceal its identity','B','A competent adult may refuse treatment. The nurse should respect autonomy, ensure informed decision-making, notify the team and document accurately.','Protect client rights while maintaining communication and documentation.'),
  ('Safety and Infection Prevention and Control','easy','The nurse discovers smoke coming from a waste bin in a client room. Which action is first?','Complete an incident form','Remove clients in immediate danger','Open every window','Search for the person who caused it','B','Using the RACE sequence, rescue or remove anyone in immediate danger before alarm, containment and extinguishing actions as appropriate.','Apply the emergency sequence and address immediate danger first.')
) as sample(category,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,rationale,strategy)
where not exists (select 1 from public.nclex_questions q where q.semantic_hash = public.btv_question_semantic_key(sample.question_text) and q.quality_status <> 'rejected');

create unique index if not exists cbt_questions_live_semantic_hash_uidx
  on public.cbt_questions (semantic_hash) where quality_status <> 'rejected';
create unique index if not exists nclex_questions_live_semantic_hash_uidx
  on public.nclex_questions (semantic_hash) where quality_status <> 'rejected';

comment on column public.cbt_questions.content_kind is 'Labels original unofficial samples separately from reviewed practice questions.';
comment on column public.nclex_questions.content_kind is 'Labels original unofficial samples separately from reviewed practice questions.';
comment on column public.cbt_questions.semantic_hash is 'Normalised clinical-stem key used to prevent cosmetic repetitions.';
comment on column public.nclex_questions.semantic_hash is 'Normalised clinical-stem key used to prevent cosmetic repetitions.';
