(()=>{
 'use strict';
 if(window.__btvLearnV90)return;window.__btvLearnV90=true;
 const modules=[
  {id:'cbt',label:'CBT',icon:'✓',copy:'Question bank and timed mocks',url:'cbt.html'},
  {id:'nclex',label:'NCLEX',icon:'✚',copy:'Practice and adaptive prep',url:'nclex.html'},
  {id:'ielts',label:'IELTS',icon:'A',copy:'Academic learning centre',url:'ielts.html'},
  {id:'adult',label:'Adult Nursing',icon:'♥',copy:'Core nursing learning',url:'adult-nursing.html'},
  {id:'osce',label:'OSCE',icon:'⊕',copy:'Station-focused practice',url:'osce.html'}
 ];
 const learn=()=>document.getElementById('learn');
 function buildLearning(){
  const root=learn();if(!root)return;
  root.innerHTML=`<div class="pageTitle"><button class="back" data-learn-home>←</button><div><span>LEARNING CENTRE</span><h1>Build your confidence</h1></div></div><div class="learnV90Hub"><div class="learnV90Grid">${modules.map(x=>`<button class="learnV90Card" type="button" data-learn-open="${x.id}"><i class="learnV90Icon">${x.icon}</i><b>${x.label}</b><small>${x.copy}</small></button>`).join('')}</div></div><div class="learnTabs"><button class="active" data-learn-tab="guide">Start guide</button><button data-learn-tab="interview">Interview</button><button data-learn-tab="calculations">Calculations</button><button data-learn-tab="cbt">CBT Q&A</button><button data-learn-tab="culture">Workplace culture</button><button data-learn-tab="cv">CV</button></div><section id="guideLesson" class="learnPanel active"></section><section id="interviewLesson" class="learnPanel"></section><section id="calculationsLesson" class="learnPanel"></section><section id="cbtLesson" class="learnPanel"></section><section id="cultureLesson" class="learnPanel"></section><section id="cvLesson" class="learnPanel"></section>`;
  root.querySelector('[data-learn-home]').onclick=()=>{if(typeof window.openScreen==='function')window.openScreen('home');else{document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='home'));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.open==='home'))}};
  root.querySelectorAll('[data-learn-open]').forEach(btn=>{btn.onclick=()=>{const mod=modules.find(m=>m.id===btn.dataset.learnOpen);if(mod)window.location.href=mod.url}});
  root.querySelectorAll('[data-learn-tab]').forEach(btn=>{btn.onclick=()=>{const tab=btn.dataset.learnTab;root.querySelectorAll('[data-learn-tab]').forEach(b=>b.classList.toggle('active',b===btn));root.querySelectorAll('.learnPanel').forEach(p=>p.classList.toggle('active',p.id===tab+'Lesson'));if(typeof window.showLearningTab==='function')window.showLearningTab(tab)}});
  if(typeof window.renderGuide==='function')window.renderGuide();
  if(typeof window.renderInterviewLesson==='function')window.renderInterviewLesson();
  if(typeof window.renderCalculator==='function')window.renderCalculator();
  if(typeof window.renderCbt==='function')window.renderCbt();
  if(typeof window.renderCulture==='function')window.renderCulture();
  if(typeof window.renderCvLesson==='function')window.renderCvLesson();
 }
 function start(){buildLearning()}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
