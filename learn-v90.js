(()=>{
 'use strict';
 if(window.__btvLearnV90)return;window.__btvLearnV90=true;
 const learn=()=>document.getElementById('learn');
 function buildLearning(){
  const root=learn();if(!root)return;
  root.innerHTML=`<div class="pageTitle"><button class="back" data-learn-home>←</button><div><span>LEARNING CENTRE</span><h1>Build your confidence</h1></div></div><div class="learnTabs"><button class="active" data-learn-tab="guide">Start guide</button><button data-learn-tab="interview">Interview</button><button data-learn-tab="calculations">Calculations</button><button data-learn-tab="cbt">CBT Q&A</button><button data-learn-tab="culture">Workplace culture</button><button data-learn-tab="cv">CV</button></div><section id="guideLesson" class="learnPanel active"></section><section id="interviewLesson" class="learnPanel"></section><section id="calculationsLesson" class="learnPanel"></section><section id="cbtLesson" class="learnPanel"></section><section id="cultureLesson" class="learnPanel"></section><section id="cvLesson" class="learnPanel"></section>`;
  root.querySelector('[data-learn-home]').onclick=()=>{if(typeof window.openScreen==='function')window.openScreen('home');else{document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='home'));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.open==='home'))}};
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
