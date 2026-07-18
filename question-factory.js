(function () {
  'use strict';

  const CBT_CATEGORIES = [
    'Infection Prevention', 'Medicines Management', 'Professional Values',
    'Prioritisation', 'Documentation', 'Mental Health', 'Child Nursing', 'Adult Nursing'
  ];
  const NCLEX_CATEGORIES = [
    'Safety and Infection Control', 'Pharmacological Therapies', 'Fundamentals of Care',
    'Psychosocial Integrity', 'Maternal-Newborn Nursing', 'Paediatric Nursing',
    'Medical-Surgical Nursing', 'Management of Care', 'Prioritisation'
  ];
  const people = ['Amara', 'Daniel', 'Fatima', 'Grace', 'Isaac', 'Leila', 'Maya', 'Noah', 'Priya', 'Samuel'];
  const settings = ['an acute ward', 'a community clinic', 'an outpatient unit', 'a rehabilitation ward', 'an urgent care unit'];
  const shifts = ['early shift', 'late shift', 'night shift', 'weekend shift'];
  const pad = n => String(n).padStart(4, '0');

  const cbtSeeds = [
    ['Infection Prevention', 'A patient develops diarrhoea that may be infectious. What should the nurse do first?', ['Wait for laboratory confirmation before taking precautions', 'Apply appropriate isolation precautions and perform a risk assessment', 'Move the patient without informing the receiving area', 'Give an antidiarrhoeal medicine without assessment'], 'B', 'Use standard precautions plus transmission-based precautions when infection is suspected; do not wait for confirmation before reducing risk.'],
    ['Infection Prevention', 'After removing gloves following personal care, what action is required?', ['Hand hygiene', 'Put on a second pair of gloves', 'Document the glove brand', 'Clean hands only if visibly soiled'], 'A', 'Gloves do not replace hand hygiene. Perform hand hygiene after glove removal.'],
    ['Medicines Management', 'A prescription is unclear and the dose appears unusual. What is the safest action?', ['Administer it because it is signed', 'Ask another patient what dose they receive', 'Withhold the dose and clarify the prescription with an authorised prescriber', 'Change the dose to the usual amount'], 'C', 'Do not administer from an unclear or potentially unsafe prescription. Clarify and document the action taken.'],
    ['Medicines Management', 'Which check is essential immediately before administering a medicine?', ['The patient identity against the prescription and allergy status', 'Whether the medicine trolley is full', 'The patient room number only', 'Whether another nurse knows the medicine name'], 'A', 'Correct identification, prescription checks and allergy status are core medicines-safety controls.'],
    ['Professional Values', 'A patient asks the nurse not to share information with a relative. What should the nurse do?', ['Tell the relative everything', 'Respect confidentiality unless a lawful or safety-based exception applies', 'Avoid documenting the request', 'Ask another patient to decide'], 'B', 'Respect confidentiality and consent, escalating only where there is a lawful justification or serious safety concern.'],
    ['Professional Values', 'A nurse realises they made a mistake that caused potential harm. What is required?', ['Hide the error if no complaint was made', 'Be open, report it promptly and follow duty-of-candour procedures', 'Alter the record', 'Wait until the next appraisal'], 'B', 'Act openly and honestly, protect the patient, escalate, document accurately and follow local incident procedures.'],
    ['Prioritisation', 'Which patient should be assessed first?', ['A stable patient asking about discharge transport', 'A patient with sudden breathing difficulty', 'A patient requesting a routine dressing change', 'A patient waiting for a menu'], 'B', 'Use an ABCDE approach. An acute breathing problem takes priority over stable or routine needs.'],
    ['Prioritisation', 'During handover, which finding needs the most urgent escalation?', ['A new oxygen saturation of 84%', 'A request for a blanket', 'A routine medicine due in four hours', 'A family member asking visiting times'], 'A', 'Severe new hypoxaemia is an immediate threat and requires urgent assessment and escalation.'],
    ['Documentation', 'Which entry best meets professional record-keeping standards?', ['Patient okay', '14:10: pain 7/10 in lower abdomen; observations recorded; prescriber informed', 'Write the entry later from memory', 'Use an erasable pencil'], 'B', 'Records should be timely, factual, specific, attributable and include actions and escalation.'],
    ['Documentation', 'A nurse notices an error in a paper record. What should they do?', ['Erase it completely', 'Use correction fluid', 'Correct it according to policy while keeping the original entry legible', 'Remove the page'], 'C', 'Corrections must preserve an audit trail and follow the organisation’s documentation policy.'],
    ['Mental Health', 'A patient says they intend to harm themselves tonight. What is the first priority?', ['Promise to keep it secret', 'Complete an immediate safety assessment and escalate for urgent support', 'Tell them to discuss it next week', 'Leave them alone to calm down'], 'B', 'Take statements of self-harm seriously, maintain safety, assess immediate risk and escalate according to local policy.'],
    ['Mental Health', 'Which response is most therapeutic when a distressed patient describes hearing voices?', ['The voices are not real, so ignore them', 'That sounds frightening. Can you tell me what the voices are saying?', 'You should stop talking about this', 'I hear them too'], 'B', 'Acknowledge distress without reinforcing the experience, assess content and risk, and seek appropriate support.'],
    ['Child Nursing', 'A child’s condition is worsening and the parent says the child is “not themselves.” What should the nurse do?', ['Ignore the parent because observations are normal', 'Include parental concern in an urgent reassessment and escalation', 'Ask the parent to leave', 'Wait until the next routine round'], 'B', 'Parents often recognise subtle deterioration. Combine their concern with structured assessment and escalate when indicated.'],
    ['Child Nursing', 'Before a procedure, how should a nurse involve a school-age child?', ['Speak only to the parent', 'Give an age-appropriate explanation and seek the child’s assent alongside valid consent', 'Avoid answering questions', 'Use technical language only'], 'B', 'Children should receive developmentally appropriate information and be involved in decisions while valid consent requirements are followed.'],
    ['Adult Nursing', 'An adult patient becomes acutely confused. What is the best initial approach?', ['Assume dementia', 'Assess for delirium and reversible causes using a structured assessment', 'Apply restraint immediately', 'Wait several days'], 'B', 'Acute confusion may indicate delirium. Assess promptly for physiological causes, medicines, pain, infection and other triggers.'],
    ['Adult Nursing', 'A patient reports central chest pain with sweating. What should the nurse do first?', ['Arrange a routine appointment', 'Begin an immediate ABCDE assessment and summon urgent help', 'Offer food', 'Ask the patient to walk'], 'B', 'Possible acute coronary syndrome requires immediate assessment, monitoring and urgent escalation.']
  ];

  const nclexSeeds = [
    ['Safety and Infection Control', 'Which action should the nurse take first for a client with suspected airborne infection?', ['Place the client in an appropriate airborne-infection isolation room', 'Keep the door open', 'Use standard precautions only', 'Transport the client through public areas'], ['A'], 'Institute appropriate airborne precautions promptly and follow facility policy.', 'Identify the transmission route and choose the precaution that immediately limits exposure.'],
    ['Safety and Infection Control', 'Which action breaks sterile technique?', ['Keeping sterile items above waist level', 'Reaching across the sterile field', 'Opening the far flap first', 'Treating the outer edge as contaminated'], ['B'], 'Reaching across a sterile field risks contaminating it.', 'Picture the sterile field and eliminate any action that crosses or obscures it.'],
    ['Pharmacological Therapies', 'Before giving a newly prescribed medication, which finding requires immediate clarification?', ['A documented severe allergy to the medication class', 'The client asks for water', 'The medication is in unit-dose packaging', 'The prescription uses the generic name'], ['A'], 'A severe allergy creates a potentially life-threatening risk and must be clarified before administration.', 'Look first for information that could make administration immediately unsafe.'],
    ['Pharmacological Therapies', 'Which client statement shows correct understanding of medication safety?', ['I will double the next dose if I forget one', 'I will check with a pharmacist before using a new over-the-counter product', 'I can share medicines with a relative', 'I can stop antibiotics when I feel better'], ['B'], 'Checking for interactions and contraindications before adding nonprescription products supports safe medication use.', 'Choose the statement that prevents interactions and avoids independent dose changes.'],
    ['Fundamentals of Care', 'Which intervention best reduces pressure-injury risk for an immobile client?', ['Reposition regularly and inspect the skin', 'Massage reddened bony prominences', 'Use a ring cushion continuously', 'Limit protein without assessment'], ['A'], 'Regular repositioning, skin assessment and an individual prevention plan reduce pressure injury risk.', 'Select prevention that relieves pressure and detects early tissue damage.'],
    ['Fundamentals of Care', 'Which action is safest when assisting a weak client to transfer?', ['Pull the client by both arms', 'Assess mobility and use the prescribed transfer aid', 'Ask the client to hold the nurse’s neck', 'Transfer without footwear'], ['B'], 'Assess first and use appropriate equipment and technique to protect the client and staff.', 'Choose the action based on assessment and safe handling principles.'],
    ['Psychosocial Integrity', 'A client says, “There is no reason to live.” What is the nurse’s priority response?', ['Change the subject', 'Ask directly about suicidal thoughts, plan and means', 'Promise confidentiality', 'Leave the client alone'], ['B'], 'Direct suicide-risk assessment is necessary and does not increase suicidal intent.', 'Safety comes first; choose the response that assesses immediacy and lethality.'],
    ['Psychosocial Integrity', 'Which response demonstrates therapeutic communication?', ['Why did you do that?', 'Tell me more about what has been most difficult today.', 'Everything will be fine.', 'You should not feel that way.'], ['B'], 'An open-ended, nonjudgmental invitation supports assessment and expression.', 'Avoid reassurance, judgment and “why” questions.'],
    ['Maternal-Newborn Nursing', 'A postpartum client has heavy bleeding and a boggy uterus. What should the nurse do first?', ['Massage the uterine fundus while summoning assistance', 'Offer oral fluids only', 'Delay assessment for one hour', 'Encourage unassisted ambulation'], ['A'], 'A boggy uterus suggests uterine atony; fundal massage and rapid escalation are immediate priorities.', 'Match the finding to the most likely reversible cause and act on the immediate threat.'],
    ['Maternal-Newborn Nursing', 'Which newborn finding requires immediate evaluation?', ['Central cyanosis', 'Acrocyanosis shortly after birth', 'Sneezing twice', 'A strong cry'], ['A'], 'Central cyanosis indicates inadequate oxygenation and needs urgent assessment.', 'Distinguish normal transition findings from signs of impaired oxygenation.'],
    ['Paediatric Nursing', 'Which finding in an infant with vomiting is most concerning?', ['Sunken fontanel and reduced urine output', 'One wet diaper after feeding', 'Crying during examination', 'Sleeping after a feed'], ['A'], 'A sunken fontanel and oliguria suggest significant dehydration.', 'Choose the finding that signals impaired circulating volume.'],
    ['Paediatric Nursing', 'A child has stridor at rest and increased work of breathing. What is the priority?', ['Inspect the throat with a tongue blade', 'Maintain the airway and obtain urgent help', 'Encourage running', 'Delay intervention until laboratory results return'], ['B'], 'Stridor at rest can signal critical upper-airway obstruction; protect the airway and escalate urgently.', 'Airway findings outrank diagnostic procedures.'],
    ['Medical-Surgical Nursing', 'A client reports crushing chest pain and is diaphoretic. Which action has priority?', ['Begin rapid assessment and activate the emergency response pathway', 'Complete discharge teaching', 'Offer a large meal', 'Ask the client to walk'], ['A'], 'Possible acute coronary syndrome requires immediate assessment and emergency intervention.', 'Apply ABC priorities to sudden, potentially life-threatening symptoms.'],
    ['Medical-Surgical Nursing', 'Which finding in a client with diabetes requires the most immediate action?', ['Altered mental status with diaphoresis', 'A request for dietary teaching', 'A healed foot blister', 'A scheduled appointment next month'], ['A'], 'Altered mental status and diaphoresis may indicate severe hypoglycemia and require immediate assessment and treatment.', 'Prioritize an acute change in neurological status over stable needs.'],
    ['Management of Care', 'Which task is appropriate to delegate to trained assistive personnel?', ['Initial assessment of new chest pain', 'Routine vital signs for a stable client', 'Teaching a new insulin regimen', 'Evaluating pain after medication'], ['B'], 'Routine, predictable tasks for stable clients may be delegated; assessment, teaching and evaluation remain with the nurse.', 'Match the task to the worker’s scope and the client’s stability.'],
    ['Management of Care', 'The nurse receives an unclear prescription. What is the correct action?', ['Guess the intended dose', 'Clarify it with the prescribing provider before carrying it out', 'Ask a family member to interpret it', 'Ignore it without documentation'], ['B'], 'The nurse must clarify incomplete or ambiguous prescriptions before implementation.', 'Do not act on ambiguity when it can affect client safety.'],
    ['Prioritisation', 'Which client should the nurse assess first?', ['A client with new unilateral weakness and slurred speech', 'A stable client awaiting discharge papers', 'A client requesting a blanket', 'A client scheduled for routine teaching'], ['A'], 'New focal neurological deficits suggest stroke and require immediate time-sensitive assessment.', 'Select the client with an acute threat and time-critical treatment window.'],
    ['Prioritisation', 'After handoff, which client requires immediate follow-up?', ['A postoperative client with sudden dyspnea', 'A client asking when lunch arrives', 'A stable client due for a bath', 'A client awaiting routine transport'], ['A'], 'Sudden postoperative dyspnea may indicate pulmonary embolism or another life-threatening problem.', 'Prioritize an acute breathing change over routine care.']
  ];

  function scenario(index) {
    return `${people[index % people.length]} is being cared for in ${settings[Math.floor(index / people.length) % settings.length]} during the ${shifts[Math.floor(index / 7) % shifts.length]}`;
  }

  function buildCbt(total = 1000) {
    return Array.from({ length: total }, (_, index) => {
      const seed = cbtSeeds[index % cbtSeeds.length];
      return {
        profession: seed[0] === 'Child Nursing' ? 'nurse' : 'both',
        subject: seed[0], difficulty: ['easy', 'medium', 'hard'][index % 3],
        question_text: `[BTV-CBT-${pad(index + 1)}] ${scenario(index)}. ${seed[1]}`,
        option_a: seed[2][0], option_b: seed[2][1], option_c: seed[2][2], option_d: seed[2][3],
        correct_option: seed[3], explanation: seed[4], access_level: 'free', is_active: false
      };
    });
  }

  function buildNclex(total = 1000) {
    return Array.from({ length: total }, (_, index) => {
      const seed = nclexSeeds[index % nclexSeeds.length];
      return {
        exam: 'NCLEX-RN', category: seed[0], client_need: seed[0],
        difficulty: ['easy', 'medium', 'hard'][index % 3], question_type: 'single',
        question_text: `[BTV-NCLEX-${pad(index + 1)}] ${scenario(index)}. ${seed[1]}`,
        option_a: seed[2][0], option_b: seed[2][1], option_c: seed[2][2], option_d: seed[2][3],
        option_e: null, option_f: null, correct_options: seed[3], rationale: seed[4],
        test_strategy: seed[5], access_level: 'free', is_active: false
      };
    });
  }

  window.BTVQuestionFactory = {
    TARGET: 1000, CBT_CATEGORIES, NCLEX_CATEGORIES, buildCbt, buildNclex,
    note: 'Generated items are inactive drafts and require clinical and regulatory review before publication.'
  };
})();
