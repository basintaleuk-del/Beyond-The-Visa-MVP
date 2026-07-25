(()=>{'use strict';if(window.BTVIELTSAcademic)return;
const topics=['antibiotic stewardship','urban green spaces','sleep and cognition','renewable energy storage','bilingual education','telemedicine access','food supply resilience','public transport design','wildlife conservation','workplace wellbeing','water purification','digital privacy','ageing populations','coastal adaptation','scientific collaboration','museum participation','community exercise','agricultural innovation','air-quality monitoring','early-years learning','recycling behaviour','hospital design','remote working','ocean research','consumer decision-making','public health messaging','medical simulation training','caregiver burnout','vaccination uptake','nurse leadership','digital literacy','transport equity','nutrition labelling','inclusive classrooms','climate migration','wastewater treatment','telehealth triage','clinical communication','patient safety culture','renewable grid stability','housing affordability','civic participation','sleep hygiene education','air pollution policy','healthy ageing','workforce planning','disaster preparedness','urban biodiversity','evidence-based policy','cross-cultural teamwork','informatics ethics','language acquisition','water scarcity planning','mental wellbeing at work','antimicrobial resistance','sustainable tourism','biostatistics in practice','school meal reform','rural healthcare access','financial literacy education','wearable health data','public library impact','energy-efficient buildings','coastal restoration','occupational stress','supply chain analytics','community resilience','digital consent','inclusive transport hubs','smart farming','green hospital design','open science collaboration','urban heat adaptation','academic integrity','maternal health access','lifelong learning pathways','neonatal care innovation','clinical audit implementation','assistive technologies'];
const places=['Northbridge University','Riverside Research Centre','Westford Medical School','Harbour Institute','Greenfield College','Central Science Museum','Lakeside Hospital','Oakridge Council'];
const people=['Dr Amina Cole','Professor Daniel Wu','Maya Singh','Samuel Mensah','Dr Grace Okafor','Oliver Bennett','Priya Shah','Liam Fraser'];
const pick=(a,n)=>a[n%a.length],esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function listeningSet(s){const topic=pick(topics,s),place=pick(places,s),person=pick(people,s),date=`${12+(s%16)} September`,time=`${9+(s%7)}:${s%2?'30':'00'}`,room=`Seminar Room ${2+(s%8)}`,fee=18+(s%9)*3,code=`AC${240+s}`,participants=36+(s%25);const script=`Receptionist: Good morning, ${place}. How can I help?\nCaller: I am calling about the public workshop on ${topic}.\nReceptionist: Certainly. It will be held on ${date}, beginning at ${time}. Registration is in ${room}, not the main auditorium. The standard fee is £${fee}, although full-time students pay half. The session is led by ${person}. It combines a short lecture with a practical group activity, and places are limited to ${participants}. Please quote booking code ${code} and bring photo identification. Refreshments are provided, but lunch is not included.`;
const rows=[
['multiple choice',`On what date will the workshop take place?`,date,[date,'10 September','21 October','3 November']],
['form completion',`Complete the venue field: ______`,room,[]],
['short answer',`What time does the workshop begin?`,time,[]],
['multiple choice',`What is the standard workshop fee?`,`£${fee}`,[`£${fee}`,`£${fee+5}`,`£${Math.round(fee/2)}`,'Free']],
['sentence completion',`The workshop includes a lecture and a practical ______.`,`group activity`,[]],
['note completion',`Workshop leader: ______`,person,[]],
['short answer',`What booking code must callers quote?`,code,[]],
['multiple choice',`What must participants bring?`,`photo identification`,['photo identification','a packed lunch','a laptop','a printed textbook']],
['sentence completion',`Places are limited to ______ participants.`,String(participants),[]],
['multiple choice',`Which statement is correct?`,`Refreshments are provided but lunch is not included.`,['Lunch and refreshments are included.','Refreshments are provided but lunch is not included.','Participants must bring all drinks.','Only lunch is provided.']]
];return {id:`listening-set-${String(s+1).padStart(2,'0')}`,title:`Listening Section ${(s%4)+1}: ${topic}`,script,audioPath:null,questions:rows.map((r,i)=>({id:`listening-${s*10+i+1}`,section:'listening',setId:`listening-set-${String(s+1).padStart(2,'0')}`,number:i+1,type:r[0],prompt:`${r[1]} [${place} workshop on ${topic}]`,answer:r[2],options:r[3],explanation:`The recording states “${r[2]}”. Accuracy, spelling and the stated word limit matter.`}))}}
function readingSet(s){const topic=pick(topics,s),place=pick(places,s),person=pick(people,s),year=2014+(s%9),rise=12+(s%24),sample=220+(s*19)%520,period=6+(s%10),adoption=2+(s%3);const passage=`A. In ${year}, a research team at ${place} launched a public study on ${topic}. The central question was whether small behavioural prompts could improve outcomes in ordinary community settings. Instead of recruiting trained specialists, the team enrolled ${sample} adult volunteers from different occupations and monitored change over ${period} months.\n\nB. At the outset, each participant completed a baseline questionnaire and a weekly log. To avoid over-reliance on self-reporting, observers also used a standard checklist during scheduled visits. Agreement between the two sources was generally strong, although self-reports tended to present slightly better progress.\n\nC. During the intervention stage, one group received concise guidance and fortnightly feedback. A comparison group continued with existing routines. By the end of the trial, the intervention group recorded a ${rise} per cent improvement in the main measure, while the comparison group changed only marginally.\n\nD. ${person}, the lead analyst, argued that regular feedback had greater impact than the initial guidance because participants could adjust their behaviour in response to measurable results. However, the team noted that participants working irregular shifts showed weaker gains and reported practical barriers to consistency.\n\nE. The researchers also acknowledged important limits. The study did not track outcomes after the ${period}-month period and did not conduct a full cost analysis. For that reason, they cautioned against immediate policy transfer without further evidence.\n\nF. Since publication, ${adoption} institutions have piloted adapted versions of the protocol with longer follow-up cycles. Early findings appear promising, but final peer-reviewed results are still pending.\n\nG. The report concludes that modest interventions can be effective when monitoring is clear, feedback is regular, and local constraints are recognised.`;
const rows=[
['multiple choice','What was the primary aim of the study?',`To evaluate small behavioural prompts in real-world settings`,['To evaluate small behavioural prompts in real-world settings','To train specialist practitioners','To compare international legislation','To publish a national budget model']],
['True / False / Not Given','The researchers used only participant diaries to measure progress.','False',['True','False','Not Given']],
['True / False / Not Given','All volunteers were employed in healthcare services.','Not Given',['True','False','Not Given']],
['matching heading','Choose the best heading for paragraph D.','Why feedback influenced behaviour change',['Problems with data collection','Why feedback influenced behaviour change','Unexpected legal consequences','A national implementation plan']],
['sentence completion','The intervention group improved by ______ per cent.',String(rise),[]],
['short answer','How long did the initial trial last?',`${period} months`,[]],
['Yes / No / Not Given',`${person} believed feedback was more influential than initial guidance.`,'Yes',['Yes','No','Not Given']],
['matching information','Which paragraph highlights the limitations of the research design?','E',['A','B','C','D','E','F','G']],
['summary completion','Participants with ______ shifts tended to show weaker gains.','irregular',[]],
['multiple choice','Why did the authors recommend further research before policy adoption?','Long-term outcomes and cost impact were not fully assessed.',['The intervention produced no measurable improvement.','Long-term outcomes and cost impact were not fully assessed.','The sample size was too small to analyse.','Observers refused to complete checklists.']]
];return{id:`reading-passage-${String(s+1).padStart(2,'0')}`,title:`Academic Reading Passage: ${topic}`,passage,questions:rows.map((r,i)=>({id:`reading-${s*10+i+1}`,section:'reading',setId:`reading-passage-${String(s+1).padStart(2,'0')}`,number:i+1,type:r[0],prompt:`${r[1]} [Study: ${topic}; ${place}, ${year}]`,answer:r[2],options:r[3],explanation:`Refer to the specific paragraph evidence in the passage and avoid assumptions beyond the stated text.`}))}}
function writing(i){
  const task=i<250?1:2,n=i%250,topic=pick(topics,n),place=pick(places,n),person=pick(people,n+3),base=24+(n%25),start=1998+(n%24),values=[base,base+6+(n%8),base+2+(n%10),base+12+(n%11)],years=[start,start+5,start+10,start+15];
  const task1Frames=[
    `The chart below shows the proportion of adults at ${place} who participated in a programme connected to ${topic} between ${years[0]} and ${years[3]}.`,
    `The chart illustrates changes in participation rates for a ${topic} initiative at ${place} from ${years[0]} to ${years[3]}.`,
    `The chart presents the percentage of residents involved in a ${topic} programme organised by ${place} over the period ${years[0]} to ${years[3]}.`
  ];
  if(task===1)return{
    id:`writing-${i+1}`,
    section:'writing',
    task:1,
    type:'Academic Writing Task 1',
    title:`Academic Task 1 · ${n+1}`,
    prompt:`${pick(task1Frames,n)} Summarise the information by selecting and reporting the main features, and make comparisons where relevant.`,
    minimumWords:150,
    visual:{kind:'bar',title:`Participation at ${place}`,unit:'Percent',labels:years,values},
    rubric:['Task achievement','Coherence and cohesion','Lexical resource','Grammatical range and accuracy']
  };
  const task2Frames=[
    `Some people believe that decisions about ${topic} should be made mainly by experts, while others argue that the general public should have greater influence.`,
    `In many countries, governments are investing heavily in ${topic}. Some people think this is essential, whereas others consider it a poor use of public funds.`,
    `People hold different views about whether schools and universities should place more emphasis on ${topic} as part of their core curriculum.`
  ];
  const task2Questions=[
    'Discuss both views and give your own opinion.',
    'To what extent do you agree or disagree?',
    'What are the main reasons for this, and what solutions can you suggest?',
    'Do the advantages of this development outweigh the disadvantages?',
    'Is this a positive or negative trend?'
  ];
  return{
    id:`writing-${i+1}`,
    section:'writing',
    task:2,
    type:'Academic Writing Task 2',
    title:`Academic Task 2 · ${n+1}`,
    prompt:`${pick(task2Frames,n)} ${pick(task2Questions,n)} In your response, support your ideas with relevant reasons and examples.`,
    minimumWords:250,
    rubric:['Task response','Coherence and cohesion','Lexical resource','Grammatical range and accuracy']
  }
}
function speaking(i){const part=i%3+1,n=i+1,topic=pick(topics,i),person=pick(people,i),place=pick(places,i+Math.floor(i/8)),year=2000+(i%26);if(part===1)return{id:`speaking-${n}`,section:'speaking',part:1,type:'Speaking Part 1',title:`Speaking Part 1 · ${n}`,prompt:`Let us talk about learning and daily routines. Thinking about ${topic} and an event you encountered around ${year}, what do you usually do to learn about this subject? Do you prefer learning alone or with other people? Why?`,preparationSeconds:0,answerSeconds:45,rubric:['Fluency and coherence','Lexical resource','Grammatical range and accuracy','Pronunciation']};if(part===2)return{id:`speaking-${n}`,section:'speaking',part:2,type:'Speaking Part 2',title:`Speaking Part 2 · ${n}`,prompt:`Describe a useful piece of information about ${topic} that you learned from ${person} or another knowledgeable person connected with ${place}. You should say: what the information was; when and where you learned it; how you used it; and explain why it was useful to you.`,preparationSeconds:60,answerSeconds:120,rubric:['Fluency and coherence','Lexical resource','Grammatical range and accuracy','Pronunciation']};return{id:`speaking-${n}`,section:'speaking',part:3,type:'Speaking Part 3',title:`Speaking Part 3 · ${n}`,prompt:`Consider how ${topic} has been communicated by organisations such as ${place} since ${year}. How has access to expert knowledge changed? Should professional information always be simplified for the public? What risks arise when complex ideas are communicated too briefly?`,preparationSeconds:0,answerSeconds:90,rubric:['Fluency and coherence','Lexical resource','Grammatical range and accuracy','Pronunciation']}}
const listeningSets=Array.from({length:60},(_,i)=>listeningSet(i)),readingSets=Array.from({length:60},(_,i)=>readingSet(i)),banks={listening:listeningSets.flatMap(x=>x.questions),reading:readingSets.flatMap(x=>x.questions),writing:Array.from({length:650},(_,i)=>writing(i)),speaking:Array.from({length:650},(_,i)=>speaking(i))};
window.BTVIELTSAcademic={sections:Object.keys(banks),bank:s=>banks[s]||[],count:s=>(banks[s]||[]).length,total:()=>Object.values(banks).reduce((n,x)=>n+x.length,0),listeningSets,readingSets,esc};})();
