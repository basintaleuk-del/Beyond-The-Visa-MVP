(function(){
  'use strict';
  if(window.BTVIELTSBank)return;
  const themes=['healthcare communication','public health','workplace wellbeing','community services','professional education','digital health','patient safety','environmental health','teamwork','research literacy','transport','housing','nutrition','technology','leadership','child development','mental wellbeing','older adult care','sustainability','cultural adaptation'];
  const places=['Riverside Clinic','Northgate College','Westfield Library','Harbour Community Centre','Meadow Park','Central Training Institute','Oakridge Hospital','Lakeside Campus'];
  const names=['Ama','Daniel','Priya','Liam','Fatima','Noah','Grace','Samuel','Maya','Oliver'];
  const pick=(a,n)=>a[n%a.length];
  function listening(i){
    const n=i+1,t=pick(themes,i),p=pick(places,i),name=pick(names,i),time=`${8+(i%9)}:${i%2?'30':'00'}`,room=`Room ${101+(i%18)}`;
    const kinds=['multiple choice','note completion','sentence completion','short answer','matching'];
    const kind=pick(kinds,i),answer=i%3===0?time:i%3===1?room:p;
    return {id:`listening-${n}`,section:'listening',part:(i%4)+1,type:kind,title:`Listening practice ${n}`,prompt:`Listen once. What key detail completes the booking note about ${t}?`,source:`${name}: Thank you for calling. The ${t} session will take place at ${p}, in ${room}. Please arrive by ${time} and bring photo identification.`,options:[answer,i%3===0?'10:30':'Room 204','City Hall','No document required'].filter((x,j,a)=>a.indexOf(x)===j),answer,explanation:`The speaker states “${answer}”. IELTS listening answers depend on accurate detail, spelling and following the word limit.`};
  }
  function reading(i){
    const n=i+1,t=pick(themes,i),p=pick(places,i),growth=12+(i%24),year=2018+(i%7),kind=pick(['multiple choice','True / False / Not Given','matching heading','sentence completion','short answer'],i);
    const passage=`A programme at ${p} examined ${t}. It began in ${year} with a small pilot and expanded after participants reported clearer information and easier access to support. Attendance increased by ${growth} percent in the second year. The report attributes the improvement to shorter sessions and multilingual materials, but it does not claim that the programme reduced operating costs.`;
    const prompt=kind==='True / False / Not Given'?'The report proves that the programme reduced operating costs.':kind==='matching heading'?'Choose the best heading for this passage.':kind==='sentence completion'?'Attendance increased after the programme introduced shorter sessions and ______ materials.':kind==='short answer'?'By what percentage did attendance increase in the second year?':'What does the report identify as the main reason for improved participation?';
    const answer=kind==='True / False / Not Given'?'False':kind==='matching heading'?'Improving access through practical changes':kind==='sentence completion'?'multilingual':kind==='short answer'?`${growth} percent`:'Shorter sessions and multilingual materials';
    const options=kind==='True / False / Not Given'?['True','False','Not Given']:kind==='matching heading'?['A costly failure','Improving access through practical changes','The history of a building','Why attendance declined']:kind==='multiple choice'?['Shorter sessions and multilingual materials','Higher fees','Reduced staffing','Longer lectures']:[];
    return {id:`reading-${n}`,section:'reading',part:(i%3)+1,type:kind,title:`Reading practice ${n}`,passage,prompt,options,answer,explanation:`The answer is supported directly by the passage. Distinguish stated evidence from assumptions and match the required answer format.`};
  }
  function writing(i){
    const n=i+1,t=pick(themes,i),academic=i%2===0,task=(i%3===0?1:2);
    let prompt;
    if(task===1&&academic)prompt=`The table shows participation in three ${t} programmes in 2021, 2023 and 2025. Summarise the main features, compare the most significant changes and write at least 150 words.`;
    else if(task===1)prompt=`You recently attended a local event about ${t}, but an important facility was unavailable. Write a letter to the organiser explaining the problem, its effect and a practical solution. Write at least 150 words.`;
    else prompt=`Some people believe that improving ${t} is mainly the responsibility of governments, while others believe individuals and employers should take equal responsibility. Discuss both views and give your own opinion. Write at least 250 words.`;
    return {id:`writing-${n}`,section:'writing',part:task,type:academic?'Academic':'General Training',title:`Writing ${academic?'Academic':'General'} Task ${task} · ${n}`,prompt,minimumWords:task===1?150:250,rubric:['Task achievement or response','Coherence and cohesion','Lexical resource','Grammatical range and accuracy']};
  }
  function speaking(i){
    const n=i+1,t=pick(themes,i),part=(i%3)+1,name=pick(names,i);let prompt;
    if(part===1)prompt=`Let us talk about ${t}. How does it affect your daily life? What changes have you noticed, and what would you improve?`;
    else if(part===2)prompt=`Describe a time when you or ${name} learned something useful about ${t}. You should say what happened, who was involved, what you learned, and explain why the experience was memorable.`;
    else prompt=`Why do attitudes to ${t} differ between generations? What role should education and employers play, and how might this change in the future?`;
    return {id:`speaking-${n}`,section:'speaking',part,type:`Part ${part}`,title:`Speaking Part ${part} · ${n}`,prompt,preparationSeconds:part===2?60:0,speakingSeconds:part===2?120:part===1?45:90,rubric:['Fluency and coherence','Lexical resource','Grammatical range and accuracy','Pronunciation']};
  }
  const makers={listening,reading,writing,speaking};
  const cache={};
  function bank(section){if(!makers[section])return[];return cache[section]||(cache[section]=Array.from({length:500},(_,i)=>makers[section](i)));}
  function all(){return Object.keys(makers).flatMap(bank);}
  window.BTVIELTSBank={sections:Object.keys(makers),bank,all,count:section=>bank(section).length,total:()=>all().length};
})();
