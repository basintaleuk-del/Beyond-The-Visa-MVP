-- Add 1,000 further original, unofficial samples to each CBT, NCLEX-RN and IELTS bank.
-- Nothing in this batch is copied from a live examination. Every item remains inactive
-- until the applicable clinical or editorial review is completed.

create temporary table btv_v117_clinical_topics (
  topic_no integer primary key,
  topic text not null,
  cue text not null,
  priority_action text not null,
  unsafe_action text not null,
  cbt_subject text not null,
  cbt_domain text not null,
  nclex_domain text not null
) on commit drop;

insert into btv_v117_clinical_topics values
 (1,'COPD exacerbation','increasing work of breathing, drowsiness and worsening oxygenation','perform an immediate respiratory assessment, use prescribed oxygen targets and escalate deterioration','apply unmonitored high-flow oxygen without considering the prescribed target','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (2,'tension pneumothorax','sudden unilateral absent breath sounds, hypotension and severe distress','activate emergency help and support airway and breathing while preparing for urgent decompression','wait for a routine chest radiograph before escalating','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (3,'acute pulmonary oedema','new crackles, severe breathlessness and pink frothy sputum','sit the patient upright, support oxygenation and activate urgent heart-failure treatment','encourage the patient to lie flat and drink freely','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (4,'unstable atrial fibrillation','an irregular rapid pulse with chest discomfort and hypotension','begin urgent assessment, cardiac monitoring and escalation for unstable tachyarrhythmia','delay review until the rhythm has persisted for several hours','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (5,'hypertensive emergency','very high blood pressure with new confusion and visual disturbance','obtain urgent clinical review and monitor for acute target-organ injury','lower the pressure rapidly with an unprescribed medicine','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (6,'suspected aortic dissection','abrupt tearing chest pain radiating to the back with unequal pulses','activate emergency assessment and minimise exertion while monitoring circulation','ask the patient to walk to determine whether the pain changes','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (7,'upper gastrointestinal bleeding','coffee-ground emesis, melaena and postural hypotension','assess circulation, establish urgent support and escalate possible major blood loss','give food and an oral anti-inflammatory medicine','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (8,'acute pancreatitis','severe epigastric pain radiating to the back with persistent vomiting','assess severity, maintain prescribed bowel rest and support fluids and analgesia','encourage a high-fat meal to test tolerance','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (9,'hepatic encephalopathy','increasing confusion, asterixis and altered sleep pattern','assess neurological status, identify triggers and begin prescribed treatment','give a sedative without assessing the change in consciousness','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (10,'oesophageal variceal bleeding','large-volume haematemesis with tachycardia and falling pressure','activate major-haemorrhage support and urgent specialist management','insert an oral airway blindly while the patient is alert and vomiting','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (11,'status epilepticus','continuous seizure activity lasting five minutes or repeated seizures without recovery','protect the airway, time the seizure and activate the emergency seizure protocol','place an object in the patient''s mouth','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (12,'deteriorating pneumonia','rising respiratory rate, new confusion and worsening oxygen saturation','repeat structured observations and escalate possible respiratory failure or sepsis','wait for the next routine observation round','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (13,'acute epiglottitis','drooling, muffled voice and inspiratory stridor','keep the patient calm and obtain immediate expert airway support','inspect the throat forcefully with a tongue blade','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (14,'sickle-cell acute chest syndrome','new chest pain, fever and falling oxygen saturation during a pain crisis','support oxygenation and activate urgent haematology and medical assessment','treat the presentation as uncomplicated pain without respiratory assessment','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (15,'thyroid storm','high fever, marked tachycardia, agitation and gastrointestinal symptoms','begin urgent supportive care and follow the prescribed thyroid-emergency pathway','apply warming blankets despite severe hyperthermia','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (16,'myxoedema coma','hypothermia, bradycardia, hypoventilation and reduced consciousness','support airway and breathing and obtain immediate endocrine and critical-care review','rewarm rapidly with direct high heat without monitoring','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (17,'adrenal crisis','profound weakness, hypotension, vomiting and hyponatraemia','activate urgent fluid and prescribed corticosteroid treatment','withhold corticosteroids until every laboratory result is final','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (18,'symptomatic hyponatraemia from SIADH','headache, confusion and seizure risk with low sodium','initiate seizure precautions, review fluid orders and escalate urgently','encourage unrestricted free-water intake','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (19,'diabetes insipidus','large volumes of dilute urine with intense thirst and rising sodium','monitor fluid balance and sodium closely and replace fluids as prescribed','restrict all fluids without clinical review','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (20,'tumour lysis syndrome','weakness, reduced urine output and rapidly abnormal potassium, phosphate and urate','initiate cardiac and renal monitoring and follow the oncology emergency pathway','give a potassium-containing supplement','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (21,'serotonin syndrome','agitation, clonus, diaphoresis and hyperthermia after serotonergic medicines','withhold suspected agents and obtain urgent supportive and medical management','administer another serotonergic dose for agitation','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (22,'neuroleptic malignant syndrome','rigidity, high fever and altered consciousness after an antipsychotic','withhold the suspected medicine and activate emergency assessment and cooling','continue the antipsychotic and cover the fever with blankets','Mental Health','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (23,'malignant hyperthermia','rapid temperature rise, muscle rigidity and increasing carbon dioxide during anaesthesia','activate the malignant-hyperthermia protocol and prepare prescribed dantrolene','delay action until the procedure is complete','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (24,'local anaesthetic systemic toxicity','metallic taste, tinnitus, seizure activity and dysrhythmia after local anaesthetic','stop administration, summon emergency help and follow the toxicity protocol','give another local-anaesthetic dose to settle discomfort','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (25,'contrast-media reaction','wheeze, urticaria and hypotension during contrast administration','stop the exposure, call for emergency help and treat the reaction promptly','continue the contrast study to obtain complete images','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (26,'heparin-induced thrombocytopenia','a major platelet fall with new thrombosis after heparin exposure','stop all heparin and obtain urgent specialist anticoagulation advice','flush the line with heparin while awaiting confirmation','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (27,'warfarin-associated major bleeding','active bleeding with a markedly elevated anticoagulation result','withhold warfarin and activate the prescribed reversal and haemorrhage pathway','give the next warfarin dose early','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (28,'methotrexate toxicity','mouth ulcers, fever and unexpected bruising during therapy','withhold the medicine and obtain urgent blood-count and specialist review','advise taking an extra weekly dose','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (29,'phenytoin toxicity','nystagmus, ataxia and slurred speech with an elevated level','withhold further doses and obtain medicine-level and neurological review','increase the dose because seizure risk exists','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (30,'aminoglycoside toxicity','new tinnitus, balance difficulty and rising creatinine','withhold the next dose pending level, renal and prescribing review','administer the dose before checking the trough level','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (31,'peripheral IV infiltration','cool swelling, discomfort and slowing infusion at the cannula site','stop the infusion, assess the site and manage it according to the infusate protocol','increase the infusion pressure to overcome resistance','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (32,'PICC migration','an increased external catheter length and inability to obtain expected function','stop using the line and arrange position assessment before further infusion','advance the catheter back into the vein at the bedside','Medicines Management','Nursing practice and decision making','Reduction of Risk Potential'),
 (33,'needlestick exposure','a fresh puncture from a used hollow-bore needle','wash the area, report immediately and begin the occupational-exposure pathway','squeeze and scrub the wound with bleach','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (34,'measles exposure','fever, cough, conjunctivitis and a spreading rash in a nonimmune patient','apply airborne precautions and notify infection specialists promptly','seat the patient in a crowded waiting area','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (35,'disseminated varicella','fever with widespread vesicular lesions in an immunocompromised patient','apply airborne and contact precautions and obtain urgent specialist review','use standard precautions alone','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (36,'norovirus outbreak','sudden vomiting and diarrhoea affecting several people on a ward','isolate symptomatic patients and follow outbreak cleaning and hand-hygiene measures','continue communal dining without notifying infection control','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (37,'MRSA wound infection','increasing wound erythema and purulent drainage in a colonised patient','assess for systemic illness and use prescribed wound and transmission precautions','share wound-care equipment between patients without decontamination','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (38,'surgical-site infection','worsening pain, spreading redness and fever after an operation','assess the wound and observations and escalate for timely culture and treatment','remove staples independently to drain the wound','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (39,'catheter-associated urinary infection prevention','an indwelling catheter that no longer has a valid indication','review the need and remove it promptly under the agreed protocol','disconnect the closed drainage system for routine sampling','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (40,'ventilator-associated pneumonia prevention','a ventilated patient with accumulating oral secretions and aspiration risk','provide prescribed oral care, positioning and ventilator-bundle measures','leave the patient flat without assessing contraindications','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (41,'deep-tissue pressure injury','persistent purple discolouration over the sacrum with intact skin','offload pressure, assess tissue risk and update the prevention and treatment plan','massage the discoloured tissue vigorously','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (42,'venous leg ulcer','a shallow exudative gaiter-area wound with oedema and adequate arterial supply','complete vascular assessment and use prescribed compression and wound care','apply strong compression before arterial status is assessed','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (43,'infected diabetic foot ulcer','new malodour, spreading erythema and systemic symptoms','offload the foot and arrange urgent multidisciplinary infection and vascular assessment','advise walking barefoot to improve circulation','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (44,'neurovascular compromise in a cast','increasing pain, paraesthesia and delayed capillary refill distal to a cast','perform immediate neurovascular assessment and escalate for cast review','insert an object under the cast to scratch the skin','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (45,'traction safety','weights resting on the floor with loss of prescribed line of pull','restore free-hanging alignment safely and obtain orthopaedic review','remove the weights without an order and leave them off','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (46,'postoperative hip fracture deterioration','new shortening, rotation and severe pain after mobilisation','stop movement, assess neurovascular status and obtain urgent surgical review','continue weight bearing to test the joint','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (47,'time-critical Parkinson medicine','a levodopa dose omitted during a hospital transfer with increasing rigidity','verify and administer the time-critical prescription promptly and escalate omissions','stop all Parkinson medicines until discharge','Medicines Management','Nursing practice and decision making','Pharmacological and Parenteral Therapies'),
 (48,'myasthenic crisis','weak cough, difficulty swallowing and declining respiratory effort','support airway and breathing and obtain urgent neuromuscular and critical-care review','give oral food before swallowing safety is assessed','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (49,'Guillain-Barre respiratory decline','ascending weakness with a weak cough and decreasing vital capacity','increase respiratory monitoring and escalate early for ventilatory support','rely only on oxygen saturation to exclude respiratory failure','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (50,'autonomic dysreflexia','sudden severe hypertension and headache in a patient with high spinal injury','sit the patient up, remove triggers and obtain urgent treatment','lay the patient flat and ignore bladder drainage','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (51,'retinal detachment','new flashes, floaters and a curtain-like visual shadow','protect safety and arrange same-day emergency ophthalmic assessment','advise waiting for a routine sight test','Prioritisation','Leadership, management and team working','Reduction of Risk Potential'),
 (52,'acute angle-closure glaucoma','severe eye pain, headache, halos and nausea','obtain immediate ophthalmic treatment to reduce intraocular pressure','cover both eyes and delay assessment overnight','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (53,'persistent epistaxis during anticoagulation','ongoing nasal bleeding with dizziness and swallowed blood','sit forward, apply continuous nasal pressure and escalate bleeding and anticoagulation risk','tilt the head back and swallow the blood','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (54,'communication with hearing impairment','a patient cannot follow instructions after hearing aids were removed','reduce background noise, face the patient and use their preferred communication aid','shout from behind the patient','Professional Values','Communication and interpersonal skills','Basic Care and Comfort'),
 (55,'dementia-related wandering','a patient repeatedly seeks an exit while appearing frightened','assess unmet needs and use proportionate person-centred safety measures','lock the patient alone in a room as the first response','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (56,'restraint reduction','an agitated patient repeatedly pulling at unfamiliar equipment','identify causes and use the least restrictive alternatives with close reassessment','apply restraint for staff convenience without authorisation','Professional Values','Professional values','Management of Care'),
 (57,'suspected elder abuse','unexplained injuries and fearfulness around a caregiver','speak privately, document objectively and follow safeguarding procedures','accuse the caregiver publicly before assessing immediate safety','Professional Values','Professional values','Management of Care'),
 (58,'intimate-partner violence disclosure','a patient quietly reports feeling unsafe at home','validate the disclosure, assess immediate danger and offer confidential specialist support','contact the partner for their version without consent','Professional Values','Professional values','Psychosocial Integrity'),
 (59,'refeeding syndrome risk','prolonged malnutrition followed by nutrition with falling phosphate','pause and obtain urgent electrolyte and nutrition-plan review with close monitoring','increase feeding rapidly without checking electrolytes','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (60,'panic with hyperventilation','intense fear, tingling and rapid breathing after urgent physical causes are excluded','remain present and guide slow controlled breathing in a low-stimulation area','instruct the patient to breathe into a paper bag unsupervised','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (61,'post-traumatic stress trigger','a trauma reminder causing dissociation and marked distress','use grounding, offer choice and restore a sense of present safety','demand a detailed trauma account during acute distress','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (62,'command hallucinations','voices instructing a patient to harm another person','assess content, intent and access to means and maintain immediate safety','agree that the voices should be obeyed','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (63,'early antidepressant activation','new agitation and suicidal thoughts shortly after treatment starts','complete urgent suicide-risk assessment and notify the prescriber','advise doubling the antidepressant dose independently','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (64,'opioid withdrawal','yawning, diarrhoea, piloerection and severe cravings after stopping opioids','assess severity and begin prescribed withdrawal and relapse-prevention support','punish the patient by withholding fluids','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (65,'benzodiazepine withdrawal','tremor, agitation and seizure risk after abrupt cessation','obtain urgent review for a supervised withdrawal plan','advise abrupt cessation without monitoring','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (66,'postnatal depression','persistent low mood, impaired bonding and thoughts of self-harm after birth','assess parent and infant safety and arrange urgent perinatal mental-health support','dismiss the symptoms as normal tiredness','Mental Health','Nursing practice and decision making','Psychosocial Integrity'),
 (67,'suspected ectopic pregnancy','unilateral pelvic pain, shoulder-tip pain and dizziness in early pregnancy','activate urgent pregnancy assessment and monitor for internal bleeding','advise using heat and waiting several days','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (68,'placenta praevia bleeding','painless bright-red bleeding in late pregnancy','obtain urgent obstetric assessment and avoid digital vaginal examination','perform a digital vaginal examination before locating the placenta','Adult Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (69,'placental abruption','painful bleeding, uterine tenderness and fetal concern','activate obstetric emergency assessment and support maternal circulation','encourage unassisted walking to assess pain','Adult Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (70,'umbilical cord prolapse','a visible cord with sudden fetal heart-rate abnormality after membrane rupture','summon emergency help and relieve cord compression while preparing urgent birth','push the cord back into the uterus','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (71,'shoulder dystocia','the fetal head delivers and then retracts against the perineum','call the obstetric emergency team and follow the recognised manoeuvre sequence','apply fundal pressure','Prioritisation','Leadership, management and team working','Physiological Adaptation'),
 (72,'significant neonatal jaundice','jaundice in the first day of life or rapid progression with poor feeding','measure bilirubin urgently and follow the neonatal jaundice pathway','reassure without assessing bilirubin or feeding','Child Nursing','Nursing practice and decision making','Health Promotion and Maintenance'),
 (73,'neonatal respiratory distress','grunting, nasal flaring and central cyanosis','support thermoregulation and breathing and obtain immediate neonatal review','begin oral feeding during severe respiratory distress','Child Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (74,'bronchiolitis deterioration','apnoea, exhaustion or poor feeding in a young infant','assess oxygenation and hydration and escalate respiratory support','give an unprescribed cough suppressant','Child Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (75,'Kawasaki disease','persistent fever with red eyes, oral changes and swollen extremities','arrange prompt paediatric assessment and cardiac-risk treatment','treat only with an over-the-counter cold remedy','Child Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (76,'intussusception','episodic severe abdominal pain, lethargy and red-currant-jelly stool','keep the child nil by mouth and arrange urgent paediatric surgical assessment','perform repeated rectal examinations without indication','Child Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (77,'pyloric stenosis','projectile non-bilious vomiting with dehydration in an infant','correct fluid and electrolyte loss and obtain surgical assessment','offer repeated large feeds immediately after vomiting','Child Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (78,'hypercyanotic spell','sudden deep cyanosis and distress in a child with tetralogy of Fallot','use the prescribed knee-chest positioning, oxygen and urgent support','force the child to lie flat with legs extended','Child Nursing','Nursing practice and decision making','Physiological Adaptation'),
 (79,'childhood asthma inhaler technique','poor control caused by incorrect metered-dose inhaler use','demonstrate spacer technique and ask the child or caregiver to teach it back','assume technique is correct because the prescription is current','Child Nursing','Communication and interpersonal skills','Health Promotion and Maintenance'),
 (80,'paediatric diabetes sick-day care','vomiting, ketones and reduced intake during an intercurrent illness','continue prescribed sick-day monitoring and obtain urgent diabetes advice','stop all insulin because the child is not eating','Child Nursing','Nursing practice and decision making','Health Promotion and Maintenance'),
 (81,'fever in a young infant','a temperature of 38 degrees Celsius in an infant under three months','arrange immediate paediatric assessment for serious infection','advise routine review in one week','Child Nursing','Nursing practice and decision making','Reduction of Risk Potential'),
 (82,'medicine administration error','a patient receives the wrong dose but currently has no symptoms','assess the patient, report promptly and follow duty-of-candour and incident procedures','alter the medication record to hide the error','Professional Values','Professional values','Management of Care'),
 (83,'duty of candour after harm','a patient has experienced moderate harm from care','be open, apologise, explain known facts and follow the formal notification process','avoid the patient until the investigation ends','Professional Values','Professional values','Management of Care'),
 (84,'consent with a language barrier','a patient cannot understand a complex procedure in the language being used','arrange a qualified interpreter and confirm informed voluntary consent','use a young family member to interpret sensitive details','Professional Values','Communication and interpersonal skills','Management of Care'),
 (85,'social-media confidentiality','a staff member posts a recognisable clinical story without naming the patient','remove and report the disclosure and follow confidentiality procedures','leave the post because the patient name is absent','Professional Values','Professional values','Management of Care'),
 (86,'delegated sterile dressing','an assistant reports they have never performed the assigned sterile procedure','retain or reassign the task and provide appropriate supervision and training','insist they perform it alone because the ward is busy','Prioritisation','Leadership, management and team working','Management of Care'),
 (87,'unsafe workload escalation','staffing and acuity make essential observations likely to be missed','prioritise immediate risks and escalate capacity concerns through the agreed chain','silently omit care and document it as completed','Prioritisation','Leadership, management and team working','Management of Care'),
 (88,'mass-casualty triage','multiple casualties arrive while resources are temporarily limited','apply the approved disaster-triage system and reassess categories as conditions change','treat strictly in order of arrival','Prioritisation','Leadership, management and team working','Management of Care'),
 (89,'fire near oxygen equipment','smoke appears beside a patient receiving oxygen','remove people in immediate danger, raise the alarm and follow fire and oxygen safety procedures','use an oil-based product on the oxygen equipment','Prioritisation','Leadership, management and team working','Safety and Infection Prevention and Control'),
 (90,'mislabeled blood specimen','the identity label does not match the patient from whom blood was collected','discard according to policy and recollect with correct bedside identification','change the label away from the bedside','Documentation','Professional values','Safety and Infection Prevention and Control'),
 (91,'controlled-drug discrepancy','the controlled-drug balance does not match the register','secure the stock and report and investigate the discrepancy immediately','alter the register to make the totals agree','Medicines Management','Professional values','Management of Care'),
 (92,'overfilled sharps container','needles protrude above the marked fill line','close and replace the container using the approved disposal process','push the contents down by hand','Infection Prevention','Professional values','Safety and Infection Prevention and Control'),
 (93,'oxygen-cylinder safety','a portable cylinder is unsecured beside a heat source','move and secure it safely away from heat and inspect the equipment','lay it loose across a doorway','Prioritisation','Leadership, management and team working','Safety and Infection Prevention and Control'),
 (94,'valid advance decision','a patient lacks capacity and has an applicable valid refusal of treatment','follow the advance decision and escalate any uncertainty through the legal and clinical process','ask relatives to cancel the decision informally','Professional Values','Professional values','Management of Care'),
 (95,'DNACPR misunderstanding','a family believes a resuscitation decision means all treatment will stop','explain that other appropriate care continues and arrange senior discussion','withhold routine comfort care because CPR is not planned','Professional Values','Communication and interpersonal skills','Management of Care'),
 (96,'organ-donation referral','a dying patient may meet referral criteria and the family asks about donation','contact the specialist donation service according to policy while continuing end-of-life care','promise that donation will definitely occur','Professional Values','Communication and interpersonal skills','Management of Care'),
 (97,'spiritual distress','a seriously ill patient says illness has destroyed their sense of meaning','listen without judgement and offer the patient''s preferred spiritual or pastoral support','impose the nurse''s personal beliefs','Professional Values','Communication and interpersonal skills','Psychosocial Integrity'),
 (98,'acute bereavement','a relative is shocked and unable to absorb detailed information after a death','use clear compassionate language, allow time and offer practical bereavement support','use euphemisms and rush the relative to leave','Professional Values','Communication and interpersonal skills','Psychosocial Integrity'),
 (99,'bariatric mobility safety','a patient requires repositioning beyond the safe capacity of available equipment','complete a moving-and-handling assessment and obtain suitable equipment and staff','attempt a manual lift with one person','Adult Nursing','Nursing practice and decision making','Basic Care and Comfort'),
 (100,'reasonable adjustments for learning disability','a patient is distressed by complex instructions and an unfamiliar environment','use accessible communication, involve chosen supporters and document reasonable adjustments','exclude the patient from decisions automatically','Professional Values','Communication and interpersonal skills','Management of Care');

with competencies(competency_no,label) as (values
 (1,'first action'),(2,'recognition of deterioration'),(3,'unsafe practice'),(4,'focused handover'),(5,'response evaluation'),
 (6,'safety teaching'),(7,'contemporaneous documentation'),(8,'registered-nurse accountability'),(9,'structured escalation'),(10,'ongoing reassessment')
), generated as (
 select t.*,c.competency_no,c.label,
  case c.competency_no
   when 1 then format('A patient with possible %s develops %s. What should the nurse do first?',topic,cue)
   when 2 then format('Which assessment finding is the clearest warning of %s?',topic)
   when 3 then format('Which action is unsafe when managing possible %s?',topic)
   when 4 then format('Which detail is essential in an urgent handover about %s?',topic)
   when 5 then format('Which outcome best shows that the immediate response to %s is effective?',topic)
   when 6 then format('Which instruction most safely prepares a patient or carer to respond to %s?',topic)
   when 7 then format('Which entry best records the nursing response to %s?',topic)
   when 8 then format('Which part of care for possible %s must remain the registered nurse''s responsibility?',topic)
   when 9 then format('Which structured escalation most clearly communicates concern about %s?',topic)
   else format('After the first intervention for %s, what is the nurse''s next priority?',topic) end question_text,
  case c.competency_no
   when 1 then priority_action when 2 then cue when 3 then unsafe_action
   when 4 then format('Report the onset and trend of %s, relevant background and the need to %s',cue,priority_action)
   when 5 then 'Repeat objective findings improve and the patient remains stable after the planned intervention'
   when 6 then format('Seek prompt professional help if %s occurs or worsens',cue)
   when 7 then format('Record the time, %s, assessment, escalation, intervention and measured response',cue)
   when 8 then 'Assessment, clinical judgement, escalation and evaluation of the response'
   when 9 then format('Situation: possible %s; Assessment: %s; Recommendation: urgent review and action',topic,cue)
   else 'Repeat a structured assessment, compare trends and escalate again if improvement is inadequate' end correct_text
 from btv_v117_clinical_topics t cross join competencies c
), choices as (
 select g.*,((topic_no*3+competency_no)%4)pos,
  case competency_no when 3 then 'Use a structured assessment and the approved care pathway' else 'Wait for the next routine round without reassessment' end d1,
  case competency_no when 3 then 'Document objective findings and measured response' else 'Ask a visitor to decide whether escalation is necessary' end d2,
  case competency_no when 3 then 'Communicate acute changes to the appropriate clinician' else 'Record that the patient appears well without objective evidence' end d3
 from generated g
)
insert into public.cbt_questions
 (profession,subject,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,
  access_level,is_active,question_type,review_status,standard_version,blueprint_domain,quality_status,content_kind,
  semantic_hash,source_hash,source_reference)
select case when cbt_subject='Child Nursing' then 'nurse' else 'both' end,cbt_subject,
 case (topic_no+competency_no)%3 when 0 then 'easy' when 1 then 'medium' else 'hard' end,
 format('[BTV-CBT-SAMPLE-V117-%s] %s',lpad(((topic_no-1)*10+competency_no)::text,4,'0'),question_text),
 case pos when 0 then correct_text else d1 end,
 case pos when 1 then correct_text when 0 then d1 else d2 end,
 case pos when 2 then correct_text when 3 then d3 else d2 end,
 case pos when 3 then correct_text else d3 end,chr(65+pos),
 format('This original unofficial sample assesses %s in the context of %s. The safest response is to %s. It requires qualified clinical review before publication.',label,topic,correct_text),
 'free',false,'single','sample_unreviewed','Unofficial sample aligned to the NMC Test of Competence 2021 blueprint',cbt_domain,
 'needs_clinical_review','unofficial_sample',public.btv_question_semantic_key(question_text),md5('cbt-v117|'||question_text),
 'https://www.nmc.org.uk/registration/joining-the-register/toc/toc-nursing-and-midwifery/resources/'
from choices c
where not exists(select 1 from public.cbt_questions q where q.semantic_hash=public.btv_question_semantic_key(c.question_text) and q.quality_status<>'rejected');

with competencies(competency_no,label) as (values
 (1,'priority intervention'),(2,'urgent cue recognition'),(3,'action requiring intervention'),(4,'change-of-shift report'),(5,'evaluation'),
 (6,'client teaching'),(7,'documentation'),(8,'delegation'),(9,'SBAR communication'),(10,'follow-up assessment')
), generated as (
 select t.*,c.competency_no,c.label,
  case c.competency_no
   when 1 then format('A client with possible %s develops %s. Which action should the nurse take first?',topic,cue)
   when 2 then format('Which finding is the priority for a nurse assessing a client at risk for %s?',topic)
   when 3 then format('Which action by a nurse caring for a client with possible %s requires intervention?',topic)
   when 4 then format('Which information is most important in the handoff for a client with %s?',topic)
   when 5 then format('Which finding best indicates that initial care for %s has been effective?',topic)
   when 6 then format('Which statement is the priority teaching for a client or caregiver about %s?',topic)
   when 7 then format('Which chart entry best documents nursing care for possible %s?',topic)
   when 8 then format('Which responsibility must the RN retain when care is assigned for a client with %s?',topic)
   when 9 then format('Which SBAR report best communicates a change related to %s?',topic)
   else format('After the priority intervention for %s, which action should the nurse take next?',topic) end question_text,
  case c.competency_no
   when 1 then priority_action when 2 then cue when 3 then unsafe_action
   when 4 then format('Report the onset and trend of %s, relevant history and the need to %s',cue,priority_action)
   when 5 then 'Repeat objective findings improve and the client remains stable after the planned intervention'
   when 6 then format('Obtain prompt care if %s occurs or worsens',cue)
   when 7 then format('Chart the time, %s, focused assessment, notification, intervention and response',cue)
   when 8 then 'Focused assessment, clinical judgment, escalation and evaluation'
   when 9 then format('Situation: possible %s; Assessment: %s; Recommendation: immediate evaluation and action',topic,cue)
   else 'Reassess the client, compare objective trends and escalate an inadequate response' end correct_text
 from btv_v117_clinical_topics t cross join competencies c
), choices as (
 select g.*,((topic_no+competency_no*2+1)%4)pos,
  case competency_no when 3 then 'Perform focused assessment and follow the approved pathway' else 'Wait for the next scheduled round without reassessment' end d1,
  case competency_no when 3 then 'Document objective findings and the client response' else 'Ask the family to determine whether the change is urgent' end d2,
  case competency_no when 3 then 'Notify the appropriate provider of acute changes' else 'Chart that the client is stable without supporting data' end d3
 from generated g
)
insert into public.nclex_questions
 (exam,category,client_need,difficulty,question_type,question_text,option_a,option_b,option_c,option_d,
  option_e,option_f,correct_options,rationale,test_strategy,access_level,is_active,review_status,standard_version,
  blueprint_domain,quality_status,content_kind,semantic_hash,source_hash,source_reference)
select 'NCLEX-RN',nclex_domain,nclex_domain,
 case (topic_no+competency_no)%3 when 0 then 'easy' when 1 then 'medium' else 'hard' end,'single',
 format('[BTV-NCLEX-SAMPLE-V117-%s] %s',lpad(((topic_no-1)*10+competency_no)::text,4,'0'),question_text),
 case pos when 0 then correct_text else d1 end,
 case pos when 1 then correct_text when 0 then d1 else d2 end,
 case pos when 2 then correct_text when 3 then d3 else d2 end,
 case pos when 3 then correct_text else d3 end,null,null,array[chr(65+pos)],
 format('This original unofficial sample assesses %s for %s. The best response is to %s. It remains review-gated.',label,topic,correct_text),
 'Apply priority frameworks, client stability, scope of practice and reassessment.','free',false,'sample_unreviewed',
 'Unofficial sample aligned to the NCSBN 2026 NCLEX-RN Test Plan',nclex_domain,'needs_clinical_review','unofficial_sample',
 public.btv_question_semantic_key(question_text),md5('nclex-v117|'||question_text),
 'https://www.ncsbn.org/publications/2026-nclex-rn-test-plan'
from choices c
where not exists(select 1 from public.nclex_questions q where q.semantic_hash=public.btv_question_semantic_key(c.question_text) and q.quality_status<>'rejected');

with topics as (
 select row_number() over() topic_no,topic from unnest(array[
 'urban shade mapping','peatland carbon storage','microplastic monitoring','community repair cafes','night-shift transport','school ventilation','rooftop agriculture','digital museum archives','coastal bird migration','heat-resilient housing',
 'rural broadband access','workplace language learning','river flood forecasting','antibiotic stewardship awareness','electric ferry networks','soil biodiversity','public drinking fountains','caregiver respite programmes','accessible playground design','forest fire recovery',
 'food-label comprehension','local history podcasts','university peer tutoring','solar-powered irrigation','wildflower road verges','hospital wayfinding','community theatre access','ethical clothing repair','urban beekeeping','open science training',
 'home noise insulation','sports injury prevention','rain-garden adoption','mobile library services','low-emission school travel','coastal water quality','robotics clubs','healthy ageing workshops','dark-sky conservation','inclusive workplace design',
 'heritage language classes','neighbourhood air sensors','cycling skills courses','reusable food containers','community first-aid training','wetland bird counts','digital identity literacy','shared electric vehicles','rural maternity transport','public-space cooling',
 'aquaculture sustainability','music and concentration','market food safety','earthquake preparedness','pharmacy access','energy-efficient glazing','youth volunteering','workplace ergonomics','urban soil testing','responsible tourism training',
 'household medicine disposal','pedestrian crossing design','marine noise research','museum sensory sessions','school breakfast attendance','remote patient monitoring','local journalism trust','drought-resistant crops','intergenerational housing','public data visualisation',
 'community language exchange','river litter interception','night-time economy safety','accessible voting information','sustainable laboratory practice','electric cargo bicycles','social prescribing','repairable electronics','urban fox ecology','library health information',
 'coastal dune restoration','teacher mentoring','food allergy awareness','district heating','community archaeology','office daylight exposure','refugee employment support','water-leak detection','indoor plant research','safe walking routes',
 'public bench placement','citizen weather stations','school science gardens','telehealth interpreter access','recycled construction materials','community choir wellbeing','rail-station accessibility','pollinator-friendly farming','household emergency planning','digital financial literacy'
 ]) topic
), sets as (
 select topic_no,topic,2010+(topic_no%15) start_year,120+topic_no*17 participants,6+(topic_no%11) months,
  9+(topic_no%37) improvement,
  (array['Ashford Institute','Cedar Bay University','Moorland Research Trust','Eastgate College','Lakeside Council','Northfield Laboratory','Harbour City University'])[((topic_no-1)%7)+1] place,
  (array['Dr Leila Hassan','Professor Owen Price','Dr Nia Mensah','Elena Park','Dr Tomas Silva','Priya Raman','Michael Adeyemi'])[((topic_no-1)%7)+1] lead
 from topics
), passages as (
 select *,format('In %s, a team at %s launched a project on %s. The researchers enrolled %s participants from three neighbourhoods and followed them for %s months. One group attended two practical workshops and received fortnightly reminders; a second group received written information only. Attendance records and independent measurements were collected, but self-reported diaries were used for activities that could not be directly observed. The workshop group showed a %s percent improvement in the main measure. The information-only group improved modestly during the first month and then levelled off. %s noted that participants living furthest from the project site attended less often, whereas age was not associated with completion. The study did not compare costs and did not include communities outside the region. The authors recommended a longer multi-region trial before the approach was adopted widely.',start_year,place,topic,participants,months,improvement,lead) passage
 from sets
), tasks(task_no,task_type) as(values
 (1,'multiple_choice'),(2,'true_false_not_given'),(3,'true_false_not_given'),(4,'short_answer'),(5,'sentence_completion'),
 (6,'multiple_choice'),(7,'yes_no_not_given'),(8,'short_answer'),(9,'multiple_choice'),(10,'summary_completion')
), generated as (
 select p.*,t.task_no,t.task_type,
  case task_no
   when 1 then 'What was the project mainly designed to investigate?'
   when 2 then 'Both participant groups attended practical workshops.'
   when 3 then 'Most participants were employed by the research institution.'
   when 4 then 'How many people were enrolled in the project?'
   when 5 then 'The workshop group improved by ______ percent.'
   when 6 then 'Which participants attended less often?'
   when 7 then 'The authors argued for immediate nationwide adoption.'
   when 8 then 'For how many months did the follow-up continue?'
   when 9 then 'Which factor was not linked to completion?'
   else 'The research did not compare ______.' end question_text,
  case task_no
   when 1 then format('A supported approach to %s',topic)
   when 2 then 'False' when 3 then 'Not Given' when 4 then participants::text when 5 then improvement::text
   when 6 then 'Participants living furthest from the project site' when 7 then 'No' when 8 then months::text||' months'
   when 9 then 'Age' else 'costs' end answer,
  case task_no
   when 1 then jsonb_build_array(format('A supported approach to %s',topic),'A national tax programme','The careers of university staff','A comparison of regional weather')
   when 2 then '["True","False","Not Given"]'::jsonb when 3 then '["True","False","Not Given"]'::jsonb
   when 6 then '["Participants living furthest from the project site","The oldest participants","The information-only group","All participants equally"]'::jsonb
   when 7 then '["Yes","No","Not Given"]'::jsonb
   when 9 then '["Age","Distance from the site","Workshop attendance","Reminder frequency"]'::jsonb
   else '[]'::jsonb end options
 from passages p cross join tasks t
)
insert into public.btv_exam_questions
 (exam_type,section,question_text,options,correct_answer,explanation,metadata,is_active,content_kind,semantic_hash,review_status,source_reference)
select 'ielts','reading',format('[BTV-IELTS-SAMPLE-V117-%s] %s [Project: %s at %s]',lpad(((topic_no-1)*10+task_no)::text,4,'0'),question_text,topic,place),
 options,to_jsonb(answer),'The answer is stated, contradicted or not supplied by the original passage. Use passage evidence and follow the task word limit.',
 jsonb_build_object('task_type',task_type,'set_number',100+topic_no,'topic',topic,'passage',passage,'sample_label','Original unofficial IELTS Academic sample','editorial_status','sample_unreviewed'),
 false,'unofficial_sample',md5(lower(question_text||'|'||topic||'|'||place||'|v117')),'sample_unreviewed',
 'https://ielts.org/take-a-test/test-types/ielts-academic-test'
from generated g
where not exists(select 1 from public.btv_exam_questions q where lower(q.exam_type)='ielts' and q.semantic_hash=md5(lower(g.question_text||'|'||g.topic||'|'||g.place||'|v117')));

do $$
declare cbt_count integer; nclex_count integer; ielts_count integer;
begin
 select count(*) into cbt_count from public.cbt_questions where question_text like '[BTV-CBT-SAMPLE-V117-%';
 select count(*) into nclex_count from public.nclex_questions where question_text like '[BTV-NCLEX-SAMPLE-V117-%';
 select count(*) into ielts_count from public.btv_exam_questions where question_text like '[BTV-IELTS-SAMPLE-V117-%';
 if cbt_count<>1000 or nclex_count<>1000 or ielts_count<>1000 then
  raise exception 'v117 bank verification failed: CBT %, NCLEX %, IELTS %',cbt_count,nclex_count,ielts_count;
 end if;
 if exists(select 1 from public.cbt_questions where question_text like '[BTV-CBT-SAMPLE-V117-%' and (is_active or review_status<>'sample_unreviewed' or quality_status<>'needs_clinical_review'))
    or exists(select 1 from public.nclex_questions where question_text like '[BTV-NCLEX-SAMPLE-V117-%' and (is_active or review_status<>'sample_unreviewed' or quality_status<>'needs_clinical_review'))
    or exists(select 1 from public.btv_exam_questions where question_text like '[BTV-IELTS-SAMPLE-V117-%' and (is_active or review_status<>'sample_unreviewed')) then
  raise exception 'v117 review gate verification failed';
 end if;
end $$;
