-- Add 500 original sample items to each CBT, NCLEX-RN and IELTS Academic bank.
-- Clinical samples remain inactive and review-gated. IELTS tasks are original and
-- are not copied from live or official sample questions.

create or replace function public.btv_question_semantic_key(value text)
returns text language sql immutable strict set search_path = '' as $$
 select md5(lower(trim(regexp_replace(
  regexp_replace(
   regexp_replace(value,'^\[BTV-(CBT|NCLEX)-(SAMPLE(-V[0-9]+)?-)?[0-9]+\]\s*','','i'),
   '^Extended practice draft [0-9]+\.\s*','','i'),
  '^[^.]+ is being cared for in [^.]+ during the [^.]+\.\s*','','i'))));
$$;

with clinical_topics(topic_no, topic, cue, priority_action, unsafe_action, cbt_subject, cbt_domain, nclex_domain) as (values
 (1,'sepsis','new confusion, mottled skin and worsening observations','complete an immediate ABCDE reassessment and escalate the sepsis concern','delay escalation until every laboratory result is available','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (2,'acute asthma','inability to complete sentences with a falling oxygen saturation','assess airway and breathing, give prescribed emergency treatment and summon urgent help','leave the patient alone to find an inhaler','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (3,'anaphylaxis','wheeze, facial swelling and hypotension after a medicine','call for emergency help and follow the anaphylaxis protocol immediately','offer oral fluids and wait for the rash to settle','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (4,'severe hypoglycaemia','diaphoresis, altered behaviour and a low capillary glucose','treat hypoglycaemia promptly using the prescribed route and recheck glucose','give long-acting insulin before treating the low glucose','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (5,'diabetic ketoacidosis','dehydration, deep respirations and ketones','begin structured assessment and the prescribed DKA pathway with close electrolyte monitoring','administer an unverified insulin dose without checking potassium or the prescription','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (6,'suspected stroke','new facial weakness, arm drift and speech disturbance','record onset or last-known-well time and activate the urgent stroke pathway','give food or drink before swallow safety is assessed','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (7,'acute coronary syndrome','central pressure-like chest pain with diaphoresis','start an immediate assessment, obtain urgent help and follow the chest-pain pathway','ask the patient to walk to test whether the pain improves','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (8,'pulmonary embolism','sudden dyspnoea, pleuritic pain and tachycardia','support breathing, assess urgently and escalate possible pulmonary embolism','massage a painful swollen calf','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (9,'major haemorrhage','rapid blood loss with hypotension and increasing pallor','activate emergency help, support ABCDE care and follow the major haemorrhage protocol','leave the patient unattended while searching for paperwork','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (10,'opioid-induced respiratory depression','marked drowsiness and a respiratory rate below eight','support airway and breathing, summon urgent help and follow the opioid reversal protocol','administer another opioid dose because pain may still be present','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (11,'acute delirium','a sudden fluctuating change in attention and cognition','assess promptly for delirium and reversible physiological causes','assume the change is chronic dementia without assessment','Adult Nursing','Nursing practice and decision making','Psychosocial Integrity'),
 (12,'high falls risk','new dizziness and unsteadiness after a medication change','assess contributing factors and implement an individual falls-prevention plan','apply physical restraint routinely without assessment or authorisation','Adult Nursing','Nursing practice and decision making','Safety and Infection Prevention and Control'),
 (13,'pressure injury risk','non-blanching erythema over a bony prominence','relieve pressure, assess the skin and update the prevention plan','massage the non-blanching area vigorously','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (14,'acute kidney injury','falling urine output with rising creatinine','review fluid balance and medicines, assess the patient and escalate deterioration','encourage unrestricted fluid regardless of cardiac or renal assessment','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (15,'hyperkalaemia','muscle weakness with ECG changes and a high potassium result','obtain urgent clinical review and follow the hyperkalaemia pathway with cardiac monitoring','give a potassium supplement before verifying the result','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (16,'acute transfusion reaction','fever, breathlessness and back pain during a transfusion','stop the transfusion, maintain IV access with appropriate fluid and follow the reaction protocol','discard the blood bag before the reaction is investigated','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (17,'suspected medicine allergy','a new widespread rash and lip tingling after the first dose','withhold further doses, assess severity and seek prompt clinical review','document the reaction as a minor side effect without assessment','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (18,'Clostridioides difficile infection','new profuse diarrhoea after antibiotic exposure','apply appropriate contact precautions, assess hydration and follow the testing pathway','use alcohol hand rub as the only hand-cleaning method after care','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (19,'suspected meningitis','fever, neck stiffness and a non-blanching rash','initiate urgent assessment, infection precautions and emergency escalation','delay precautions until culture results are final','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (20,'suspected pulmonary tuberculosis','persistent cough, weight loss and haemoptysis','apply airborne precautions and arrange prompt specialist assessment','place the patient in a shared bay with the door open','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (21,'suicide risk','a stated plan, available means and intent to die','maintain immediate safety and arrange an urgent suicide-risk assessment','promise secrecy and leave the person alone','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (22,'acute mania','minimal sleep, escalating activity and unsafe impulsivity','reduce stimulation, assess immediate risks and obtain mental-health support','challenge the patient loudly in a crowded room','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (23,'alcohol withdrawal','tremor, agitation and increasing autonomic signs after stopping alcohol','use the prescribed withdrawal assessment and escalate for timely treatment','offer alcohol as an undocumented treatment','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (24,'postpartum haemorrhage','heavy vaginal bleeding with a boggy uterus','summon help, assess circulation and begin the postpartum haemorrhage protocol','delay assessment while completing routine newborn paperwork','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (25,'severe pre-eclampsia','severe headache, visual symptoms and hypertension in pregnancy','arrange urgent obstetric assessment and seizure precautions','advise the patient to drive home and rest','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (26,'newborn hypoglycaemia','jitteriness, poor feeding and a low blood glucose','support thermoregulation and follow the neonatal hypoglycaemia feeding or treatment pathway','delay feeding and glucose reassessment until the next shift','Child Nursing','Nursing practice and decision making','Health Promotion and Maintenance'),
 (27,'paediatric dehydration','reduced urine, lethargy and delayed capillary refill','assess severity, begin the prescribed rehydration plan and monitor response','give an adult-volume fluid bolus without a weight-based prescription','Child Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (28,'upper-airway obstruction in croup','stridor at rest with increasing work of breathing','keep the child calm, support the airway and obtain urgent help','inspect the throat forcefully with a tongue blade','Child Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (29,'febrile seizure','generalised seizure activity in a febrile young child','protect from injury, time the seizure and assess airway and breathing','place an object in the child''s mouth','Child Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (30,'child safeguarding concern','an injury pattern inconsistent with the history provided','document objectively and follow the safeguarding escalation procedure','confront the suspected person alone and promise a specific outcome','Professional Values','Professional values','Management of Care'),
 (31,'insulin administration','a prescribed insulin dose that does not match the meal or current glucose','pause and clarify the prescription and timing before administration','estimate and alter the insulin dose independently','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (32,'anticoagulant safety','new bleeding and an unexpectedly high anticoagulation result','withhold the dose when indicated and obtain urgent prescriber or pharmacist advice','give an extra anticoagulant dose to normalise the result','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (33,'digoxin toxicity','nausea, visual disturbance and bradycardia','withhold the medicine and seek prompt review of rhythm, level and renal function','administer the dose early to prevent a missed dose','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (34,'lithium toxicity','coarse tremor, ataxia and gastrointestinal symptoms','withhold lithium and arrange urgent level, renal and hydration assessment','encourage a sudden low-sodium diet','Mental Health','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (35,'neutropenic sepsis','fever or rigors during profound neutropenia','treat the presentation as an emergency and activate the neutropenic sepsis pathway','give a rectal suppository before infection assessment','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (36,'chemotherapy extravasation','pain and swelling around a vesicant infusion site','stop the infusion, leave access in place and follow the drug-specific extravasation protocol','flush the cannula rapidly with normal saline','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (37,'central-line infection','fever and erythema with discharge at a central-line site','assess for sepsis and follow the line-infection culture and escalation pathway','apply an unprescribed topical product and continue using the line','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (38,'acute urinary retention','suprapubic pain with inability to void and a palpable bladder','assess bladder volume and obtain prompt review for prescribed decompression','force repeated large oral fluid volumes despite severe discomfort','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (39,'bowel obstruction','colicky pain, vomiting and abdominal distension','keep the patient nil by mouth as prescribed, assess fluid status and escalate','give an unprescribed stimulant laxative','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (40,'compartment syndrome','severe escalating limb pain and pain on passive stretch','perform urgent neurovascular assessment and escalate immediately','elevate the limb far above heart level and delay review','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (41,'spinal cord compression','new limb weakness with bladder or bowel dysfunction','arrange emergency neurological assessment and protect safe movement','encourage unassisted walking to test strength','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (42,'raised intracranial pressure','declining consciousness with unequal pupils','support ABCDE care and obtain immediate neurological and medical review','place the patient head-down without an indication','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (43,'major burn','airway soot, facial burns and hoarseness','prioritise early airway assessment and urgent burns support','apply ice directly over extensive burned tissue','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (44,'tracheostomy obstruction','sudden respiratory distress with poor airflow through the tube','call for help and follow the emergency tracheostomy airway algorithm','remove all oxygen while waiting for specialist staff','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (45,'chest-drain disconnection','a disconnected drainage system with sudden breathlessness','support the patient, call for help and restore a safe system according to protocol','clamp the chest tube routinely for a prolonged period','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (46,'postoperative haemorrhage','increasing wound drainage, tachycardia and hypotension','start urgent ABCDE assessment and escalate possible postoperative bleeding','remove the wound dressing and leave the site exposed without help','Prioritisation','Leadership, management and team working','Reduction of Risk Potential'),
 (47,'aspiration','coughing, wet voice and oxygen desaturation during feeding','stop oral intake, support breathing and obtain urgent swallowing and clinical assessment','continue feeding quickly to finish the meal','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (48,'dysphagia care','recurrent coughing with thin fluids after stroke','use upright positioning and the prescribed texture and swallowing plan','use a straw automatically regardless of the swallowing assessment','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (49,'end-of-life symptom distress','uncontrolled pain and breathlessness despite the current plan','reassess symptoms and obtain timely palliative review for individualised treatment','withhold all comfort medicine to avoid sedation','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (50,'capacity and informed refusal','a patient who may not understand the consequences of refusing treatment','assess decision-specific capacity, support understanding and respect a valid informed decision','assume incapacity solely because the decision appears unwise','Professional Values','Professional values','Management of Care')
), competencies(competency_no, label) as (values
 (1,'priority action'),(2,'urgent finding'),(3,'unsafe action'),(4,'handover'),(5,'evaluation'),
 (6,'patient education'),(7,'documentation'),(8,'delegation'),(9,'structured communication'),(10,'reassessment')
), generated as (
 select t.*, c.competency_no, c.label,
   case c.competency_no
    when 1 then format('A patient with %s develops %s. What should the nurse do first?',t.topic,t.cue)
    when 2 then format('Which finding in a patient at risk of %s requires the most urgent escalation?',t.topic)
    when 3 then format('Which nursing action should be avoided when caring for a patient with possible %s?',t.topic)
    when 4 then format('Which information is most important to include in an urgent handover about possible %s?',t.topic)
    when 5 then format('Which outcome best indicates that immediate care for %s is effective?',t.topic)
    when 6 then format('Which safety instruction is most important for a patient at risk of %s?',t.topic)
    when 7 then format('Which record entry best documents the nursing response to possible %s?',t.topic)
    when 8 then format('Which responsibility must remain with the registered nurse when %s is suspected?',t.topic)
    when 9 then format('Which SBAR message most clearly communicates concern about %s?',t.topic)
    else format('After the initial response to %s, what should the nurse do next?',t.topic) end as question_text,
   case c.competency_no
    when 1 then t.priority_action
    when 2 then t.cue
    when 3 then t.unsafe_action
    when 4 then format('Report %s, relevant observations and that the plan is to %s',t.cue,t.priority_action)
    when 5 then 'The concerning findings improve and repeat observations stabilise after the planned response'
    when 6 then format('Seek prompt help if %s develops',t.cue)
    when 7 then format('Record the time, %s, assessment findings, escalation, action and response',t.cue)
    when 8 then 'Assessment, clinical judgement, escalation and evaluation of the patient response'
    when 9 then format('Situation: possible %s; Background: relevant risks; Assessment: %s; Recommendation: urgent review and the planned response',t.topic,t.cue)
    else 'Repeat a structured assessment, trend observations and escalate again if the response is inadequate' end as correct_text,
   case c.competency_no when 3 then 'Complete a relevant assessment and follow the agreed escalation plan' else 'Wait until the next routine observation round without reassessment' end as distractor_1,
   case c.competency_no when 3 then 'Document factual findings and the patient response' else 'Ask a relative to decide whether clinical escalation is necessary' end as distractor_2,
   case c.competency_no when 3 then 'Communicate changes promptly to the appropriate clinician' else 'Record that the patient appears fine without objective findings' end as distractor_3
 from clinical_topics t cross join competencies c
), positioned as (
 select g.*, ((topic_no + competency_no) % 4) pos from generated g
)
insert into public.cbt_questions
 (profession,subject,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,
  access_level,is_active,question_type,review_status,standard_version,blueprint_domain,quality_status,content_kind,
  semantic_hash,source_hash,source_reference)
select case when cbt_subject='Child Nursing' then 'nurse' else 'both' end, cbt_subject,
 case (topic_no+competency_no)%3 when 0 then 'easy' when 1 then 'medium' else 'hard' end,
 format('[BTV-CBT-SAMPLE-V116-%s] %s',lpad(((topic_no-1)*10+competency_no)::text,4,'0'),question_text),
 case pos when 0 then correct_text else distractor_1 end,
 case pos when 1 then correct_text when 0 then distractor_1 else distractor_2 end,
 case pos when 2 then correct_text when 3 then distractor_3 else distractor_2 end,
 case pos when 3 then correct_text else distractor_3 end,
 chr(65+pos),
 format('This unofficial sample tests %s in the context of %s. The safest response is to %s. A qualified reviewer must verify the item before publication.',label,topic,correct_text),
 'free',false,'single','sample_unreviewed','Unofficial sample aligned to the NMC Test of Competence 2021 blueprint',cbt_domain,
 'needs_clinical_review','unofficial_sample',public.btv_question_semantic_key(question_text),
 md5('cbt-v116|'||question_text),'https://www.nmc.org.uk/registration/joining-the-register/toc/toc-nursing-and-midwifery/resources/'
from positioned p
where not exists(select 1 from public.cbt_questions q where q.semantic_hash=public.btv_question_semantic_key(p.question_text) and q.quality_status<>'rejected');

with clinical_topics(topic_no, topic, cue, priority_action, unsafe_action, nclex_domain) as (
 select topic_no,topic,cue,priority_action,unsafe_action,nclex_domain from (values
 (1,'sepsis','new confusion, mottled skin and worsening observations','perform immediate focused reassessment and activate the sepsis escalation pathway','wait for all cultures before responding','Physiological Adaptation'),
 (2,'acute asthma','inability to speak in sentences with falling oxygen saturation','support oxygenation, give prescribed rescue therapy and obtain emergency help','leave the client alone to locate an inhaler','Physiological Adaptation'),
 (3,'anaphylaxis','wheezing, facial swelling and hypotension after medication','activate emergency response and follow the anaphylaxis protocol','give an oral drink and reassess in one hour','Pharmacological and Parenteral Therapies'),
 (4,'severe hypoglycemia','diaphoresis, altered behavior and low bedside glucose','give the indicated rapid glucose treatment and recheck the level','administer scheduled insulin before treating the low glucose','Physiological Adaptation'),
 (5,'diabetic ketoacidosis','dehydration, deep respirations and ketones','follow the prescribed DKA pathway with close potassium monitoring','start an unverified insulin infusion without reviewing potassium','Physiological Adaptation'),
 (6,'suspected stroke','new facial droop, arm weakness and speech change','identify last-known-well time and activate the stroke pathway','give oral medication before a swallow screen','Reduction of Risk Potential'),
 (7,'acute coronary syndrome','pressure-like chest pain with diaphoresis','begin rapid assessment and activate the emergency chest-pain pathway','have the client ambulate to determine whether pain resolves','Physiological Adaptation'),
 (8,'pulmonary embolism','sudden dyspnea, pleuritic pain and tachycardia','support oxygenation and obtain immediate evaluation','massage a tender swollen calf','Reduction of Risk Potential'),
 (9,'major hemorrhage','rapid blood loss with hypotension and pallor','activate emergency response and support circulation','leave the client unattended while locating paperwork','Physiological Adaptation'),
 (10,'opioid respiratory depression','marked somnolence and respirations below eight','support ventilation and follow the opioid reversal protocol','administer another opioid for possible pain','Pharmacological and Parenteral Therapies'),
 (11,'acute delirium','sudden fluctuating inattention and confusion','assess for delirium and reversible physiological causes','assume chronic dementia without assessment','Psychosocial Integrity'),
 (12,'falls risk','new dizziness and unsteadiness after a medication change','assess causes and implement individualized fall precautions','apply restraints routinely without assessment','Safety and Infection Prevention and Control'),
 (13,'pressure injury risk','nonblanching erythema over a bony prominence','offload pressure and update the prevention plan','massage the nonblanching area','Basic Care and Comfort'),
 (14,'acute kidney injury','decreasing urine output with rising creatinine','review volume status and nephrotoxic medications and notify the provider','force unrestricted fluids despite cardiac status','Reduction of Risk Potential'),
 (15,'hyperkalemia','weakness with ECG changes and elevated potassium','initiate cardiac monitoring and obtain emergency treatment orders','give a potassium supplement','Reduction of Risk Potential'),
 (16,'transfusion reaction','fever, dyspnea and back pain during transfusion','stop the transfusion and follow the reaction protocol','discard the blood product before investigation','Pharmacological and Parenteral Therapies'),
 (17,'medication allergy','new generalized rash and lip tingling after a first dose','hold further doses and assess for progression to anaphylaxis','label the reaction minor without assessment','Pharmacological and Parenteral Therapies'),
 (18,'Clostridioides difficile infection','profuse diarrhea after antibiotic exposure','initiate contact precautions and use soap-and-water hand hygiene','use alcohol hand rub as the only hand hygiene','Safety and Infection Prevention and Control'),
 (19,'suspected meningitis','fever, nuchal rigidity and a nonblanching rash','initiate indicated precautions and emergency evaluation','delay precautions until cultures are final','Safety and Infection Prevention and Control'),
 (20,'suspected tuberculosis','persistent cough, weight loss and hemoptysis','initiate airborne precautions and specialist evaluation','place the client in a shared room with the door open','Safety and Infection Prevention and Control'),
 (21,'suicide risk','a stated plan with available means and intent','maintain safety and complete immediate suicide-risk evaluation','promise secrecy and leave the client alone','Psychosocial Integrity'),
 (22,'acute mania','minimal sleep, escalating activity and unsafe impulsivity','reduce stimulation and set clear consistent limits while assessing risk','argue loudly with the client in a group area','Psychosocial Integrity'),
 (23,'alcohol withdrawal','tremor, agitation and autonomic hyperactivity','use the withdrawal scale and administer prescribed treatment promptly','offer alcohol as undocumented treatment','Psychosocial Integrity'),
 (24,'postpartum hemorrhage','heavy bleeding with a boggy uterus','massage the fundus as indicated, summon help and follow the hemorrhage protocol','delay care for routine newborn documentation','Physiological Adaptation'),
 (25,'severe preeclampsia','severe headache, visual change and hypertension','initiate seizure precautions and urgent obstetric evaluation','advise the client to drive home','Reduction of Risk Potential'),
 (26,'newborn hypoglycemia','jitteriness, poor feeding and low blood glucose','support warmth and follow the neonatal feeding or glucose protocol','delay feeding and recheck next shift','Health Promotion and Maintenance'),
 (27,'pediatric dehydration','oliguria, lethargy and delayed capillary refill','assess severity and begin prescribed weight-based rehydration','give an adult fluid bolus without an order','Physiological Adaptation'),
 (28,'croup with airway compromise','stridor at rest and increased work of breathing','keep the child calm and obtain urgent airway support','forcefully inspect the throat with a tongue blade','Physiological Adaptation'),
 (29,'febrile seizure','generalized seizure activity with fever','protect from injury, time the event and support airway and breathing','place an object in the mouth','Reduction of Risk Potential'),
 (30,'child maltreatment concern','injuries inconsistent with the reported history','document objectively and follow mandatory reporting procedures','confront the suspected caregiver alone','Management of Care'),
 (31,'insulin safety','an insulin order inconsistent with the meal and glucose','hold and clarify the order before administration','independently estimate a replacement dose','Pharmacological and Parenteral Therapies'),
 (32,'anticoagulant complication','new bleeding with an unexpectedly high result','hold medication as indicated and obtain prompt treatment guidance','administer an extra anticoagulant dose','Pharmacological and Parenteral Therapies'),
 (33,'digoxin toxicity','nausea, visual changes and bradycardia','hold digoxin and notify the provider for rhythm and level evaluation','give the dose early','Pharmacological and Parenteral Therapies'),
 (34,'lithium toxicity','coarse tremor, ataxia and gastrointestinal symptoms','hold lithium and obtain urgent level and renal assessment','start a sudden low-sodium diet','Pharmacological and Parenteral Therapies'),
 (35,'neutropenic sepsis','fever during profound neutropenia','activate the neutropenic fever emergency pathway','perform a rectal procedure','Physiological Adaptation'),
 (36,'chemotherapy extravasation','pain and swelling at a vesicant infusion site','stop the infusion and follow the agent-specific extravasation protocol','flush the line rapidly','Pharmacological and Parenteral Therapies'),
 (37,'central-line infection','fever and drainage at the insertion site','assess for sepsis and obtain cultures as ordered','continue using the line without evaluation','Safety and Infection Prevention and Control'),
 (38,'acute urinary retention','suprapubic pain and inability to void','assess bladder volume and obtain an order for decompression','force repeated large oral fluid volumes','Basic Care and Comfort'),
 (39,'bowel obstruction','colicky pain, emesis and distention','maintain prescribed bowel rest and address fluid loss','give an unprescribed stimulant laxative','Physiological Adaptation'),
 (40,'compartment syndrome','severe escalating pain and pain with passive stretch','perform urgent neurovascular assessment and notify the surgeon','delay evaluation after elevating far above the heart','Reduction of Risk Potential'),
 (41,'spinal cord compression','new weakness with bladder or bowel dysfunction','obtain emergency neurological evaluation','encourage unassisted ambulation','Reduction of Risk Potential'),
 (42,'increased intracranial pressure','declining consciousness with unequal pupils','support airway and obtain immediate neurological intervention','place the client head-down','Physiological Adaptation'),
 (43,'major burn with inhalation injury','facial burns, soot and hoarseness','prioritize early airway management and burn-center support','apply ice directly to extensive burns','Physiological Adaptation'),
 (44,'tracheostomy obstruction','acute distress with poor airflow through the tube','call for help and follow the emergency tracheostomy algorithm','remove oxygen while waiting','Physiological Adaptation'),
 (45,'chest-tube disconnection','a disconnected drainage system with dyspnea','support the client and restore a safe drainage system per protocol','clamp the tube for a prolonged period','Reduction of Risk Potential'),
 (46,'postoperative hemorrhage','increasing drainage, tachycardia and hypotension','begin rapid assessment and notify the surgical team','leave the wound exposed while seeking supplies','Reduction of Risk Potential'),
 (47,'aspiration during feeding','coughing, wet voice and oxygen desaturation','stop feeding and support airway and breathing','continue feeding rapidly','Basic Care and Comfort'),
 (48,'dysphagia after stroke','coughing repeatedly with thin liquids','use upright positioning and prescribed texture modifications','use a straw automatically','Basic Care and Comfort'),
 (49,'end-of-life symptom distress','uncontrolled pain and dyspnea despite the plan','reassess and obtain timely palliative medication adjustment','withhold all comfort medication','Basic Care and Comfort'),
 (50,'informed refusal','possible difficulty understanding treatment consequences','assess decision-specific capacity and respect a valid informed refusal','declare incapacity because the choice seems unwise','Management of Care')
 ) x(topic_no,topic,cue,priority_action,unsafe_action,nclex_domain)
), competencies(competency_no,label) as (values
 (1,'priority'),(2,'recognition'),(3,'contraindication'),(4,'handoff'),(5,'evaluation'),
 (6,'teaching'),(7,'documentation'),(8,'delegation'),(9,'SBAR'),(10,'follow-up')
), generated as (
 select t.*,c.competency_no,c.label,
 case c.competency_no
  when 1 then format('A client with %s develops %s. Which action should the nurse take first?',topic,cue)
  when 2 then format('Which finding in a client with possible %s requires immediate follow-up?',topic)
  when 3 then format('Which action by the nurse caring for a client with %s requires intervention?',topic)
  when 4 then format('Which information is the priority during handoff for a client with suspected %s?',topic)
  when 5 then format('Which finding best demonstrates an effective response to initial care for %s?',topic)
  when 6 then format('Which discharge instruction is most important for a client at risk for %s?',topic)
  when 7 then format('Which documentation entry best reflects care of a client with possible %s?',topic)
  when 8 then format('Which responsibility must the RN retain when assigning care for a client with suspected %s?',topic)
  when 9 then format('Which SBAR statement best communicates a change related to %s?',topic)
  else format('After implementing the priority intervention for %s, which action should the nurse take next?',topic) end question_text,
 case c.competency_no
  when 1 then priority_action when 2 then cue when 3 then unsafe_action
  when 4 then format('Report %s, current trends and the need to %s',cue,priority_action)
  when 5 then 'The urgent findings improve and repeat assessment trends toward baseline'
  when 6 then format('Seek immediate care if %s occurs',cue)
  when 7 then format('Chart the time, %s, focused assessment, notification, intervention and response',cue)
  when 8 then 'Focused assessment, clinical judgment, escalation and evaluation'
  when 9 then format('Situation: possible %s; Assessment: %s; Recommendation: immediate evaluation and planned intervention',topic,cue)
  else 'Reassess the client, trend objective findings and escalate an inadequate response' end correct_text,
 case c.competency_no when 3 then 'Complete focused assessment and follow the care pathway' else 'Wait for the next scheduled round without reassessment' end d1,
 case c.competency_no when 3 then 'Document objective findings and response' else 'Ask the family to decide whether escalation is needed' end d2,
 case c.competency_no when 3 then 'Notify the appropriate clinician of acute changes' else 'Chart that the client is stable without objective data' end d3
 from clinical_topics t cross join competencies c
), positioned as(select g.*,((topic_no+competency_no+1)%4)pos from generated g)
insert into public.nclex_questions
 (exam,category,client_need,difficulty,question_type,question_text,option_a,option_b,option_c,option_d,
  option_e,option_f,correct_options,rationale,test_strategy,access_level,is_active,review_status,standard_version,
  blueprint_domain,quality_status,content_kind,semantic_hash,source_hash,source_reference)
select 'NCLEX-RN',nclex_domain,nclex_domain,
 case (topic_no+competency_no)%3 when 0 then 'easy' when 1 then 'medium' else 'hard' end,'single',
 format('[BTV-NCLEX-SAMPLE-V116-%s] %s',lpad(((topic_no-1)*10+competency_no)::text,4,'0'),question_text),
 case pos when 0 then correct_text else d1 end,
 case pos when 1 then correct_text when 0 then d1 else d2 end,
 case pos when 2 then correct_text when 3 then d3 else d2 end,
 case pos when 3 then correct_text else d3 end,null,null,array[chr(65+pos)],
 format('This original sample tests %s for %s. The best response is to %s. It remains review-gated.',label,topic,correct_text),
 'Apply priority frameworks, client stability, scope of practice and reassessment.','free',false,'sample_unreviewed',
 'Unofficial sample aligned to the NCSBN 2026 NCLEX-RN Test Plan',nclex_domain,'needs_clinical_review','unofficial_sample',
 public.btv_question_semantic_key(question_text),md5('nclex-v116|'||question_text),
 'https://www.ncsbn.org/publications/2026-nclex-rn-test-plan'
from positioned p
where not exists(select 1 from public.nclex_questions q where q.semantic_hash=public.btv_question_semantic_key(p.question_text) and q.quality_status<>'rejected');

alter table public.btv_exam_questions
 add column if not exists content_kind text not null default 'practice_question',
 add column if not exists semantic_hash text,
 add column if not exists review_status text not null default 'pending',
 add column if not exists source_reference text;

update public.btv_exam_questions
set semantic_hash=md5(lower(regexp_replace(question_text,'\s+','','g')))
where semantic_hash is null;

with topics as (
 select row_number() over() topic_no, topic from unnest(array[
 'urban tree planting','renewable energy storage','sleep and memory','public transport planning','water conservation',
 'museum participation','remote working','food-waste reduction','coastal adaptation','bilingual education',
 'community exercise','digital privacy','wildlife corridors','air-quality monitoring','library redesign',
 'agricultural innovation','ocean research','recycling incentives','telemedicine access','workplace wellbeing',
 'ageing populations','electric bicycle use','school meal programmes','citizen science','housing insulation',
 'wetland restoration','online learning','local food markets','heatwave planning','scientific collaboration',
 'public art funding','rainwater harvesting','flexible working hours','nature-based tourism','adult literacy',
 'battery recycling','urban noise reduction','community gardens','railway modernisation','marine conservation',
 'health information design','university mentoring','plastic packaging policy','walking infrastructure','festival attendance',
 'home energy monitoring','river restoration','shared workspaces','public speaking courses','regional innovation hubs'
 ]) topic
), sets as (
 select topic_no,topic,2012+(topic_no%12) start_year,180+topic_no*13 participants,8+(topic_no%9) months,
  12+(topic_no%31) improvement,
  (array['Northbridge University','Riverside Institute','Harbour Research Centre','Westford College','Greenfield Council'])[((topic_no-1)%5)+1] place,
  (array['Dr Amina Cole','Professor Daniel Wu','Maya Singh','Samuel Mensah','Dr Grace Okafor'])[((topic_no-1)%5)+1] lead
 from topics
), passages as (
 select *,format('Researchers at %s began a study of %s in %s. They recruited %s adult volunteers and observed them for %s months. Participants were divided into an intervention group, which received practical guidance and monthly feedback, and a comparison group, which continued its usual routine. Independent observers collected the main outcome, while participants also kept weekly diaries. The diary reports were slightly more positive than the observer records. At the end of the study, the intervention group improved by %s percent, while the comparison group changed very little. %s concluded that regular feedback was more influential than the initial guidance. Participants with irregular working hours benefited less. The study did not measure outcomes after the formal follow-up and did not calculate financial savings. The researchers therefore recommended trials in other occupations and regions before national policy was considered.',place,topic,start_year,participants,months,improvement,lead) passage
 from sets
), tasks(task_no,task_type) as(values
 (1,'multiple_choice'),(2,'true_false_not_given'),(3,'true_false_not_given'),(4,'short_answer'),(5,'sentence_completion'),
 (6,'multiple_choice'),(7,'yes_no_not_given'),(8,'short_answer'),(9,'multiple_choice'),(10,'summary_completion')
), generated as (
 select p.*,t.task_no,t.task_type,
 case task_no
  when 1 then 'What was the principal purpose of the study?'
  when 2 then 'The investigation relied only on participants'' diaries.'
  when 3 then 'Every participant worked in healthcare.'
  when 4 then 'How many adult volunteers took part?'
  when 5 then 'The intervention group improved by ______ percent.'
  when 6 then 'Which element did the lead researcher consider most influential?'
  when 7 then 'The researchers claimed the results should immediately determine national policy.'
  when 8 then 'For how many months were participants observed?'
  when 9 then 'Which group benefited less from the intervention?'
  else 'The study did not calculate financial ______.' end question_text,
 case task_no
  when 1 then format('To evaluate a practical intervention concerning %s',topic)
  when 2 then 'False' when 3 then 'Not Given' when 4 then participants::text when 5 then improvement::text
  when 6 then 'Monthly feedback' when 7 then 'No' when 8 then months::text||' months'
  when 9 then 'Participants with irregular working hours' else 'savings' end answer,
 case task_no
  when 1 then jsonb_build_array(format('To evaluate a practical intervention concerning %s',topic),'To recruit specialist researchers','To calculate national taxation','To replace all existing policy')
  when 2 then '["True","False","Not Given"]'::jsonb when 3 then '["True","False","Not Given"]'::jsonb
  when 6 then '["Monthly feedback","The first diary entry","Financial rewards","National legislation"]'::jsonb
  when 7 then '["Yes","No","Not Given"]'::jsonb
  when 9 then '["Participants with irregular working hours","Independent observers","All volunteers equally","The comparison group only"]'::jsonb
  else '[]'::jsonb end options
 from passages p cross join tasks t
)
insert into public.btv_exam_questions
 (exam_type,section,question_text,options,correct_answer,explanation,metadata,is_active,content_kind,semantic_hash,review_status,source_reference)
select 'ielts','reading',format('[BTV-IELTS-SAMPLE-V116-%s] %s [Study: %s at %s]',lpad(((topic_no-1)*10+task_no)::text,4,'0'),question_text,topic,place),
 options,to_jsonb(answer),
 'The answer is stated or logically determined by the original passage. Use only passage evidence and observe any word limit.',
 jsonb_build_object('task_type',task_type,'set_number',topic_no,'topic',topic,'passage',passage,'sample_label','Original unofficial IELTS Academic sample','editorial_status','sample_unreviewed'),
 false,'unofficial_sample',md5(lower(question_text||'|'||topic||'|'||place)),'sample_unreviewed',
 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test'
from generated g
where not exists(select 1 from public.btv_exam_questions q where lower(q.exam_type)='ielts' and q.semantic_hash=md5(lower(g.question_text||'|'||g.topic||'|'||g.place)));

create unique index if not exists btv_exam_questions_ielts_semantic_uidx
 on public.btv_exam_questions(semantic_hash) where lower(exam_type)='ielts';

comment on column public.btv_exam_questions.content_kind is 'Distinguishes original unofficial samples from editorially reviewed practice content.';
comment on column public.btv_exam_questions.review_status is 'Editorial status; sample_unreviewed items remain inactive.';
