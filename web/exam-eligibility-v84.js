(()=>{
 if(window.__btvExamEligibility84)return;window.__btvExamEligibility84=true;
 const normal=value=>String(value||'').trim().toLowerCase();
 function context(){
  let profile={};try{profile=window.userProfile?.()||JSON.parse(localStorage.getItem('btv-profile')||'{}')}catch{}
  let destination=normal(window.state?.country||profile.destination||profile.destinationCountry||profile.countryDestination);
  const profession=normal(profile.profession||profile.role||profile.pathway);
  destination=({usa:'us','united states':'us','united states of america':'us','united kingdom':'uk',britain:'uk',england:'uk',scotland:'uk','northern ireland':'uk',canada:'ca',australia:'au'}[destination]||destination);
  return{destination,profession};
 }
 function eligible(exam){
  const {destination,profession}=context(),nurse=profession.includes('nurse'),midwife=profession.includes('midwi');
  if(exam==='cbt')return destination==='uk'&&(nurse||midwife);
  if(exam==='nclex')return nurse&&['us','ca','au'].includes(destination);
  return false;
 }
 function mark(node,allowed){if(!node)return;node.hidden=!allowed;node.setAttribute('aria-hidden',String(!allowed));node.dataset.examIneligibleV84=String(!allowed);if(!allowed)node.classList.remove('active')}
 function enforce(){
  const cbt=eligible('cbt'),nclex=eligible('nclex');
  mark(document.querySelector('[data-learn-tab="cbt"]'),cbt);mark(document.getElementById('cbtLesson'),cbt);
  mark(document.querySelector('[data-learn-tab="nclex"]'),nclex);mark(document.getElementById('nclexLesson'),nclex);
  const active=document.querySelector('.learnPanel.active[data-exam-ineligible-v84="true"],.learnTabs button.active[data-exam-ineligible-v84="true"]');
  if(active)document.querySelector('[data-learn-tab="guide"]')?.click();
 }
 let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enforce()})}
 enforce();setTimeout(enforce,300);setTimeout(enforce,1200);
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('click',event=>{if(event.target.closest('[data-open="learn"],#countryGrid,.country,[data-profile-save],#saveProfile'))setTimeout(enforce,0)});
 window.addEventListener('storage',enforce);window.addEventListener('btv:profile-changed',enforce);
})();
