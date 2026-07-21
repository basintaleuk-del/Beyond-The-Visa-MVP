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
  function buildHub(){
   const root=learn();if(!root)return;
   root.innerHTML=`<div class="pageTitle"><button class="back" data-learn-home>←</button><div><span>LEARNING CENTRE</span><h1>Build your confidence</h1></div></div><div class="learnV90Grid" id="learnModules"></div>`;
   const grid=document.getElementById('learnModules');
   modules.forEach(mod=>{
    const card=document.createElement('button');
    card.className='learnV90Card';card.type='button';
    card.innerHTML=`<i class="learnV90Icon">${mod.icon}</i><b>${mod.label}</b><small>${mod.copy}</small>`;
    card.onclick=()=>{window.location.href=mod.url};
    grid.appendChild(card);
   });
   root.querySelector('[data-learn-home]').onclick=()=>{if(typeof window.openScreen==='function')window.openScreen('home');else{document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='home'));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.open==='home'))}};
  }
  function start(){buildHub()}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
