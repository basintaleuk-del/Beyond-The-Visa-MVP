-- Exam Prep v167 demonstration seed.
-- All content is original Beyond The Visa educational material. It remains inactive
-- and in draft until a qualified clinician reviews and an authorised admin publishes it.

insert into public.btv_exam_prep_exams(slug,name,country,description,duration_minutes,default_question_count,estimated_pass_percentage,preparation_level,is_active)
values
 ('uk-nmc-cbt','UK NMC CBT','United Kingdom','Part A numeracy and Part B clinical practice preparation aligned to public NMC competencies.',115,115,68,'Intermediate',false),
 ('nclex-rn','NCLEX-RN','United States / Canada','Original clinical-judgement practice aligned to public NCLEX-RN client-needs categories.',300,85,70,'Advanced',false),
 ('nclex-pn','NCLEX-PN','United States / Canada','Original practical-nursing preparation aligned to public NCLEX-PN learning objectives.',300,85,70,'Intermediate',false),
 ('ahpra-rn','Australian nursing registration preparation','Australia','Independent preparation based on publicly available registered-nurse standards and safe practice principles.',120,100,70,'Advanced',false),
 ('ncnz-rn','New Zealand nursing registration preparation','New Zealand','Independent preparation based on public competence and culturally safe nursing principles.',120,100,70,'Advanced',false),
 ('dha-nurse','DHA nursing examination preparation','United Arab Emirates','Independent nursing practice questions for Dubai-focused registration preparation.',120,100,70,'Intermediate',false),
 ('doh-haad-nurse','DOH/HAAD nursing examination preparation','United Arab Emirates','Independent nursing practice questions for Abu Dhabi-focused registration preparation.',120,100,70,'Intermediate',false),
 ('moh-prometric-nurse','MOH and Prometric nursing preparation','International','Independent clinical-practice preparation for nursing assessment formats used across several jurisdictions.',120,100,70,'Intermediate',false)
on conflict(slug) do nothing;

with topic_names(name,slug,display_order) as (values
 ('Adult nursing','adult-nursing',1),('Child nursing','child-nursing',2),('Mental health nursing','mental-health-nursing',3),('Maternity','maternity',4),
 ('Pharmacology','pharmacology',5),('Medication safety','medication-safety',6),('Anatomy and physiology','anatomy-physiology',7),
 ('Infection prevention and control','infection-prevention-control',8),('Safeguarding','safeguarding',9),('Professional practice','professional-practice',10),
 ('Ethics and accountability','ethics-accountability',11),('Communication','communication',12),('Clinical leadership','clinical-leadership',13),
 ('Documentation','documentation',14),('Assessment and observations','assessment-observations',15),('Deteriorating patient','deteriorating-patient',16),
 ('Emergency care','emergency-care',17),('Fluid and electrolyte balance','fluid-electrolyte-balance',18),('Pain management','pain-management',19),
 ('Wound care','wound-care',20),('Diabetes','diabetes',21),('Respiratory care','respiratory-care',22),('Cardiovascular care','cardiovascular-care',23),
 ('Neurological care','neurological-care',24),('Renal care','renal-care',25),('Gastrointestinal care','gastrointestinal-care',26),
 ('Perioperative care','perioperative-care',27),('Public health','public-health',28),('Evidence-based practice','evidence-based-practice',29)
)
insert into public.btv_exam_prep_topics(exam_id,name,slug,display_order,description)
select e.id,t.name,t.slug,t.display_order,'Flexible exam-preparation topic for original educational practice.'
from public.btv_exam_prep_exams e cross join topic_names t
on conflict(exam_id,slug) do nothing;

-- Reuse the 20 explicitly original BTV sample stems previously seeded by v115.
with source as (
 (select e.id exam_id,t.id topic_id,'single'::text question_type,null::text clinical_scenario,
   regexp_replace(q.question_text,'^\[BTV-CBT-[^]]+\]\s*','','i') question_text,q.difficulty,q.explanation rationale,
   'Choose the safest evidence-informed nursing action and escalate deterioration appropriately.' learning_objective,
   'Person-centred, proportionate and timely nursing action.' nursing_principle,q.source_reference,
   q.option_a,q.option_b,q.option_c,q.option_d,upper(q.correct_option) correct_code
 from public.cbt_questions q join public.btv_exam_prep_exams e on e.slug='uk-nmc-cbt'
 join public.btv_exam_prep_topics t on t.exam_id=e.id and t.slug=case q.subject
   when 'Child Nursing' then 'child-nursing' when 'Mental Health' then 'mental-health-nursing' when 'Medicines Management' then 'medication-safety'
   when 'Infection Prevention' then 'infection-prevention-control' when 'Documentation' then 'documentation' when 'Professional Values' then 'professional-practice'
   when 'Prioritisation' then 'clinical-leadership' else 'adult-nursing' end
 where q.content_kind='unofficial_sample' and q.quality_status<>'rejected' order by q.id limit 10)
 union all
 (select e.id,t.id,q.question_type,null,regexp_replace(q.question_text,'^\[BTV-NCLEX-[^]]+\]\s*','','i'),q.difficulty,q.rationale,
   coalesce(q.test_strategy,'Apply safe nursing clinical judgement.'),'Prioritise safety, scope, assessment and evidence-informed care.',q.source_reference,
   q.option_a,q.option_b,q.option_c,q.option_d,coalesce(q.correct_options[1],'A')
 from public.nclex_questions q join public.btv_exam_prep_exams e on e.slug='nclex-rn'
 join public.btv_exam_prep_topics t on t.exam_id=e.id and t.slug=case
   when q.category ilike '%infection%' then 'infection-prevention-control' when q.category ilike '%pharm%' then 'pharmacology'
   when q.category ilike '%psych%' then 'mental-health-nursing' when q.category ilike '%health promotion%' then 'public-health'
   when q.category ilike '%management%' then 'clinical-leadership' else 'adult-nursing' end
 where q.content_kind='unofficial_sample' and q.quality_status<>'rejected' order by q.id limit 10)
), inserted as (
 insert into public.btv_exam_prep_questions(exam_id,topic_id,question_type,clinical_scenario,question_text,difficulty,rationale,learning_objective,nursing_principle,source_reference,content_origin,review_status,clinical_safety_check,is_active)
 select exam_id,topic_id,question_type,clinical_scenario,question_text,difficulty,rationale,learning_objective,nursing_principle,source_reference,'demonstration_seed','draft','Requires independent qualified clinical review before publication.',false from source
 on conflict do nothing returning id,exam_id,question_text
)
insert into public.btv_exam_prep_answer_options(question_id,option_text,is_correct,option_rationale,display_order)
select i.id,v.option_text,v.code=s.correct_code,
 case when v.code=s.correct_code then s.rationale else 'This option is unsuitable because it does not provide the safest evidence-informed response to the scenario and may delay appropriate assessment, escalation or care.' end,v.ord
from source s join inserted i using(exam_id,question_text)
cross join lateral (values('A',s.option_a,1),('B',s.option_b,2),('C',s.option_c,3),('D',s.option_d,4)) v(code,option_text,ord);

-- Ten further original demonstrations broaden the scalable international structure.
with seeds(exam_slug,topic_slug,difficulty,scenario,question_text,a,b,c,d,correct_code,rationale,objective,principle,source_reference) as (values
 ('ahpra-rn','professional-practice','medium','A registered nurse is asked to perform a procedure for which they have not been assessed as competent.','What is the safest response?','Proceed because a colleague is busy','Decline silently and leave the ward','Explain the competence concern, seek supervision and follow the escalation process','Ask an unregulated worker to perform it','C','The nurse must practise within competence, communicate limitations and obtain appropriate supervision without abandoning care.','Apply scope-of-practice and escalation principles.','Professional accountability and safe delegation.','https://www.nursingmidwiferyboard.gov.au/Codes-Guidelines-Statements/Professional-standards.aspx'),
 ('ahpra-rn','medication-safety','hard','A patient with renal impairment has a new medicine prescribed at the usual adult dose.','What should the nurse do before administration?','Administer it because the electronic chart accepted it','Check renal dosing guidance and clarify the prescription with the prescriber or pharmacist','Skip every medicine for the shift','Ask the patient to choose the dose','B','Renal impairment can alter medicine clearance. Verification and timely clarification reduce preventable harm.','Recognise factors requiring prescription clarification.','Medication safety and interprofessional communication.','https://www.safetyandquality.gov.au/standards/nsqhs-standards'),
 ('ncnz-rn','communication','medium','A Māori patient asks for whānau to participate in a care-planning conversation.','Which response best supports culturally safe care?','Exclude whānau automatically','Ask the patient how they want whānau involved and document their preferences','Tell the patient culture cannot affect clinical care','Discuss the plan only with whānau','B','The patient should direct consent and whānau involvement. Asking preferences supports partnership, dignity and culturally safe communication.','Support patient-led participation in care planning.','Cultural safety, consent and partnership.','https://www.nursingcouncil.org.nz/Public/Nursing/Standards_and_guidelines/NCNZ/nursing-section/Standards_and_guidelines_for_nurses.aspx'),
 ('ncnz-rn','deteriorating-patient','hard','A postoperative patient becomes pale and restless with a rising pulse and falling blood pressure.','What is the priority nursing action?','Reassure the patient and recheck in two hours','Begin an immediate structured assessment, call for urgent help and prepare for escalation','Offer a large meal','Remove monitoring equipment','B','The pattern may indicate shock or bleeding and requires immediate assessment, escalation and ongoing monitoring.','Identify and escalate time-critical postoperative deterioration.','Early recognition and response to deterioration.','https://www.hqsc.govt.nz/our-work/improved-service-delivery/patient-deterioration/'),
 ('dha-nurse','infection-prevention-control','easy','A nurse is preparing to insert a peripheral intravenous cannula.','When should hand hygiene be performed?','Only after the procedure','Before preparing equipment and again after the procedure or glove removal as indicated','Only if hands look dirty','After touching the patient but never before','B','Hand hygiene before an aseptic task and after exposure or glove removal reduces transmission risk.','Apply hand-hygiene moments to an invasive procedure.','Standard precautions and aseptic technique.','https://www.who.int/teams/integrated-health-services/infection-prevention-control'),
 ('dha-nurse','diabetes','medium','A conscious patient using insulin reports sweating and tremor before lunch.','What should the nurse do first?','Give the scheduled insulin immediately','Check capillary blood glucose promptly and follow the hypoglycaemia protocol','Encourage exercise','Withhold all food for six hours','B','Symptoms suggest hypoglycaemia. Prompt confirmation and protocol-based treatment prevent neurological harm.','Recognise and respond to suspected hypoglycaemia.','Timely assessment and treatment of metabolic risk.','https://www.who.int/health-topics/diabetes'),
 ('doh-haad-nurse','emergency-care','hard','A patient develops wheeze, facial swelling and hypotension minutes after an intravenous antibiotic begins.','What is the priority response?','Slow the infusion and continue observing','Stop the infusion, activate emergency help and follow the anaphylaxis protocol','Ask the patient to walk','Document it at discharge','B','This is a life-threatening hypersensitivity pattern. Stop exposure and initiate emergency airway, breathing and circulation management.','Recognise and respond to anaphylaxis.','Emergency escalation and ABC assessment.','https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis'),
 ('doh-haad-nurse','documentation','easy','A nurse notices that an observation was entered under the wrong patient record.','What should the nurse do?','Delete all evidence without explanation','Follow the approved correction process and ensure the accurate observation is recorded for the correct patient','Leave both records unchanged','Ask a colleague to use their login to edit it','B','Corrections must preserve an auditable record, protect confidentiality and place accurate information in the correct record.','Apply safe electronic-record correction principles.','Accurate, timely and accountable documentation.','https://www.who.int/teams/integrated-health-services/patient-safety'),
 ('moh-prometric-nurse','respiratory-care','medium','A patient receiving oxygen becomes increasingly drowsy and has shallow respirations.','What should the nurse do first?','Turn off all oxygen and leave','Perform an immediate respiratory assessment and escalate urgently while maintaining prescribed support','Offer a sedative','Wait for routine rounds','B','Drowsiness with shallow breathing may signal respiratory failure and requires urgent assessment, monitoring and escalation.','Prioritise respiratory deterioration.','Airway and breathing assessment with timely escalation.','https://www.who.int/teams/integrated-health-services/patient-safety'),
 ('nclex-pn','wound-care','medium','A surgical wound has new spreading redness, warmth and purulent drainage.','Which action is most appropriate?','Cover it and omit documentation','Assess the patient, report the findings promptly and follow the wound-infection plan','Apply an unprescribed product','Tell the patient this is always expected','B','New inflammatory changes and purulent drainage require assessment, documentation and prompt escalation for possible infection.','Recognise wound findings requiring escalation.','Assessment, infection prevention and communication.','https://www.cdc.gov/infection-control/hcp/core-practices/index.html')
), inserted as (
 insert into public.btv_exam_prep_questions(exam_id,topic_id,question_type,clinical_scenario,question_text,difficulty,rationale,learning_objective,nursing_principle,source_reference,content_origin,review_status,clinical_safety_check,is_active)
 select e.id,t.id,'single',s.scenario,s.question_text,s.difficulty,s.rationale,s.objective,s.principle,s.source_reference,'demonstration_seed','draft','Requires independent qualified clinical review before publication.',false
 from seeds s join public.btv_exam_prep_exams e on e.slug=s.exam_slug join public.btv_exam_prep_topics t on t.exam_id=e.id and t.slug=s.topic_slug
 on conflict do nothing returning id,exam_id,question_text
)
insert into public.btv_exam_prep_answer_options(question_id,option_text,is_correct,option_rationale,display_order)
select i.id,v.option_text,v.code=s.correct_code,
 case when v.code=s.correct_code then s.rationale else 'This option does not safely address the assessed risk, required escalation or evidence-informed nursing action in the scenario.' end,v.ord
from seeds s join public.btv_exam_prep_exams e on e.slug=s.exam_slug join inserted i on i.exam_id=e.id and i.question_text=s.question_text
cross join lateral(values('A',s.a,1),('B',s.b,2),('C',s.c,3),('D',s.d,4))v(code,option_text,ord);

comment on table public.btv_exam_prep_exams is 'Exam records remain hidden until active published clinically reviewed questions exist.';
