(()=>{
 'use strict';
 if(window.__btvLearnV90)return;window.__btvLearnV90=true;
 const modules=[
  {id:'cbt',label:'CBT',icon:'✓',copy:'Question bank and timed mocks',url:'cbt.html'},
  {id:'nclex',label:'NCLEX',icon:'✚',copy:'Practice and adaptive prep',url:'nclex.html'},
  {id:'ielts',label:'IELTS',icon:'A',copy:'Academic learning centre',tab:'ielts'},
  {id:'adult',label:'Adult Nursing',icon:'♥',copy:'Core nursing learning',tab:'adult'},
  {id:'osce',label:'OSCE',icon:'⊕',copy:'Station-focused practice',tab:'osce'}
 ];
 const learn=()=>document.getElementById('learn');
 let raf=0,navToken=0;
 const tabCache=new Map();
 function cleanLegacyCards(){
  const root=learn();if(!root)return;
  root.querySelectorAll('.cbtLaunchCard,.nclexLaunchCard,[data-cbt-centre],[data-nclex-centre]').forEach(node=>node.remove());
 }
 function activateTab(tab){
  const root=learn();if(!root)return false;
  const btn=root.querySelector(`[data-learn-tab="${tab}"]`);
  const current=root.querySelector('.learnTabs button.active')?.dataset.learnTab;
  if(current===tab)return true;
  if(btn){btn.click();tabCache.set(tab,root.querySelector(`#${tab}Lesson`)||null);tabCache.forEach((panel,key)=>{if(panel)panel.hidden=key!==tab});return true}
  if(typeof window.showLearningTab==='function'){window.showLearningTab(tab);tabCache.set(tab,root.querySelector(`#${tab}Lesson`)||null);return true}
  return false;
 }
 function openModule(module){
  const token=++navToken;
  requestAnimationFrame(()=>{
   if(token!==navToken)return;
   if(module.url){location.href=module.url;return}
   if(activateTab(module.tab))return;
   window.dispatchEvent(new CustomEvent('btv:feature-action',{detail:{action:module.id,id:module.id}}));
  });
 }
 function ensureHub(){
  const root=learn();if(!root)return;
  cleanLegacyCards();
  if(root.querySelector('[data-learn-v90-hub]'))return;
  const title=root.querySelector('.pageTitle');
  if(!title)return;
  const hub=document.createElement('section');
  hub.className='learnV90Hub';
  hub.dataset.learnV90Hub='1';
  hub.innerHTML=`<div class="learnV90Grid">${modules.map(x=>`<button class="learnV90Card" data-learn-v90-open="${x.id}" type="button"><i class="learnV90Icon">${x.icon}</i><b>${x.label}</b><small>${x.copy}</small></button>`).join('')}</div>`;
  title.insertAdjacentElement('afterend',hub);
 }
 function clickHandler(event){
  const button=event.target.closest('[data-learn-v90-open]');
  if(!button)return;
  event.preventDefault();
  const module=modules.find(x=>x.id===button.dataset.learnV90Open);
  if(module)openModule(module);
 }
 function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;ensureHub()})}
 function start(){
  const root=learn();if(!root)return;
  root.addEventListener('click',clickHandler,true);
  const observer=new MutationObserver(schedule);
  observer.observe(root,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{observer.disconnect();root.removeEventListener('click',clickHandler,true)},{once:true});
  ensureHub();
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
