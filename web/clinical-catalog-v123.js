(()=>{
  'use strict';
  if(window.BTVClinicalCatalog)return;
  const detailed=[
    ['abcde-assessment','ABCDE Assessment','A systematic approach to immediate patient assessment','Patient assessment','ABCDE','beginner',55,'Airway, breathing, circulation, disability and exposure assessment for rapid recognition and treatment of immediate threats.',['assessment','airway','breathing','circulation','emergency'],true],
    ['recognising-deterioration','Recognising Deterioration','Identify subtle and urgent signs of clinical decline','Deteriorating patient','TREND','intermediate',60,'Recognise changing physiology, interpret trends, respond to concern and escalate before avoidable harm occurs.',['deterioration','observations','trends','escalation','safety'],true],
    ['news2','NEWS2','Use observations and clinical judgement to support escalation','Patient assessment','NEWS2','intermediate',50,'Understand NEWS2 observations, scoring principles, response thresholds and the limits of aggregate scores.',['news2','observations','scoring','escalation'],true],
    ['sbar','SBAR Communication','Communicate clinical risk clearly and close the loop','Leadership and communication','SBAR','beginner',45,'Structure urgent and routine clinical communication using Situation, Background, Assessment and Recommendation.',['sbar','handover','communication','documentation'],true],
    ['sepsis','Sepsis','Recognise infection-related organ dysfunction and act early','Deteriorating patient','SEPSIS','advanced',70,'Connect infection, organ dysfunction, rapid assessment, escalation, monitoring and person-centred care.',['sepsis','infection','shock','organ dysfunction','emergency'],true],
    ['anaphylaxis','Anaphylaxis','Recognise and respond to a life-threatening systemic reaction','Deteriorating patient','ALLERGY','advanced',60,'Identify airway, breathing and circulation compromise from anaphylaxis and support immediate emergency treatment.',['anaphylaxis','allergy','airway','emergency','adrenaline'],true],
    ['hypoglycaemia','Hypoglycaemia','Recognise low glucose and prevent neurological harm','Deteriorating patient','GLUCOSE','intermediate',55,'Assess, treat, recheck and investigate hypoglycaemia while adapting care to consciousness and swallowing safety.',['hypoglycaemia','diabetes','glucose','insulin','emergency'],true],
    ['insulin-safety','Insulin Safety','Prevent high-risk medicine errors','Medicines management','INSULIN','advanced',65,'Apply prescription, product, timing, administration, monitoring and communication safeguards to insulin care.',['insulin','diabetes','medicines','high-risk','glucose'],true],
    ['iv-medication-safety','IV Medication Safety','Prepare and administer intravenous medicines safely','Medicines management','IV','advanced',70,'Use compatibility, access-device, asepsis, rate, monitoring and escalation checks for intravenous medicines.',['intravenous','medicines','compatibility','cannula','asepsis'],true],
    ['drug-calculations','Drug Calculations','Calculate medicine quantities with dimensional safety checks','Medicines management','CALC','intermediate',65,'Use units, formulae, estimation and independent checks to reduce calculation-related medicine errors.',['calculations','dose','units','medicines','numeracy'],true]
  ].map(([slug,title,subtitle,category,icon,difficulty,estimatedMinutes,summary,tags,featured],index)=>({
    id:`clinical-${slug}`,slug,title,subtitle,category,icon,difficulty,estimatedMinutes,summary,tags,
    searchKeywords:[...tags,title.toLowerCase(),subtitle.toLowerCase()],featured,published:true,
    clinicalReviewStatus:'awaiting_clinical_review',version:'1.0.0',sortOrder:index,
    detailPath:`clinical-modules-v123/${slug}.json`
  }));
  const legacy=[
    ['infection-prevention','Infection Prevention','Standard precautions, hand hygiene, PPE and aseptic practice','Patient safety','IPC','beginner',35,'Assess transmission risk and prevent avoidable healthcare-associated infection.',['infection','hand hygiene','ppe','aseptic']],
    ['fluid-balance','Fluid Balance','Interpret intake, output, weight and perfusion trends','Patient assessment','FLUID','intermediate',40,'Assess hydration and recognise fluid depletion, overload and acute changes in urine output.',['fluid','hydration','urine output','weight']],
    ['wound-care','Wound Care','Assess wounds and deliver safe person-centred care','Nursing skills','WOUND','intermediate',40,'Use holistic wound assessment, prescribed dressing plans and infection surveillance.',['wound','dressing','skin','aseptic']],
    ['pain-management','Pain Assessment and Management','Assess pain, intervene safely and evaluate response','Patient assessment','PAIN','beginner',35,'Use validated assessment, multimodal care and reassessment to support comfort and function.',['pain','analgesia','assessment','reassessment']],
    ['respiratory-care','Respiratory Care','Recognise respiratory compromise and support safe care','Body systems','RESP','intermediate',45,'Assess work of breathing and oxygenation, position safely and escalate respiratory deterioration.',['respiratory','oxygen','hypoxia','breathing']],
    ['diabetes-care','Diabetes Care','Support glucose monitoring and safe person-centred care','Body systems','DM','intermediate',45,'Connect monitoring, medicines, nutrition, education and urgent hypo or hyperglycaemia recognition.',['diabetes','glucose','insulin','education']],
    ['neurological-assessment','Neurological Assessment','Assess consciousness, pupils and limb function','Patient assessment','NEURO','intermediate',45,'Establish a neurological baseline and recognise time-critical changes in consciousness or focal function.',['neurological','gcs','pupils','stroke']],
    ['cardiovascular-care','Cardiovascular Care','Recognise perfusion, chest pain and rhythm concerns','Body systems','CARD','intermediate',45,'Assess cardiovascular symptoms and perfusion, initiate monitoring and escalate red flags.',['cardiovascular','chest pain','perfusion','ecg']],
    ['safeguarding','Safeguarding','Recognise risk and respond lawfully to concerns','Patient safety','SAFE','intermediate',40,'Listen, assess immediate safety, document facts and share safeguarding concerns through approved pathways.',['safeguarding','abuse','neglect','documentation']]
  ].map(([slug,title,subtitle,category,icon,difficulty,estimatedMinutes,summary,tags],index)=>({
    id:`clinical-${slug}`,slug,title,subtitle,category,icon,difficulty,estimatedMinutes,summary,tags,
    searchKeywords:[...tags,title.toLowerCase(),subtitle.toLowerCase()],featured:false,published:true,
    clinicalReviewStatus:'awaiting_clinical_review',version:'0.9.0',sortOrder:100+index,legacy:true,
    legacyContent:{
      learningObjectives:[`Explain the core nursing principles of ${title.toLowerCase()}.`,'Recognise safety concerns and red flags.','Assess systematically, escalate appropriately and document accountable care.'],
      sections:[
        {id:'overview',title:'Overview',blocks:[{type:'paragraph',text:summary},{type:'warning',title:'Learning notice',text:'This learning supports education and revision. It does not replace local policy, clinical judgement, senior advice, or emergency escalation procedures.'}]},
        {id:'assessment',title:'Clinical assessment',blocks:[{type:'steps',items:['Confirm identity, introduce yourself and gain consent where possible.','Assess immediate risk using an appropriate structured framework.','Compare findings with baseline and trends rather than relying on one value.','Escalate concerns using local pathways and a structured handover.','Reassess, document findings, actions, response and the ongoing plan.']}]},
        {id:'nursing-management',title:'Nursing management',blocks:[{type:'bullets',items:['Prioritise immediate threats and work within competence.','Use current prescriptions, local policy and approved equipment.','Communicate with the patient and multidisciplinary team.','Evaluate whether interventions are effective and escalate unresolved concerns.']}]},
        {id:'common-mistakes',title:'Common mistakes',blocks:[{type:'red-flag',title:'Avoid unsafe assumptions',text:'Do not dismiss patient or family concern, delay escalation while waiting for complete information, or document vague labels without objective findings.'}]},
        {id:'references',title:'References',blocks:[{type:'paragraph',text:'This preserved guide is awaiting expansion and clinical editorial review. Confirm current NHS, NICE, NMC and local organisational guidance before publication.'}]}
      ],
      caseStudies:[],knowledgeChecks:[],keyTakeaways:['Assess systematically.','Escalate risk early.','Reassess and document the response.'],references:[],
      clinicalReviewStatus:'awaiting_clinical_review',reviewedBy:null,reviewedAt:null,version:'0.9.0'
    }
  }));
  window.BTVClinicalCatalog=[...detailed,...legacy];
})();
