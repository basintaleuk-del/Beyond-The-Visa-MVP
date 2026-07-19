(()=>{
 'use strict';
 if(window.__btvReleaseHardeningV65)return;window.__btvReleaseHardeningV65=true;
 let queued=false;
 function refine(){
  const home=document.getElementById('home');if(!home)return;
  const documentCards=[...home.querySelectorAll('[data-storage-open]')].filter(card=>!card.closest('[hidden]'));
  const preferred=home.querySelector('#dashboardV3 [data-storage-open]')||documentCards[0];
  documentCards.forEach(card=>{if(card!==preferred){card.hidden=true;card.dataset.duplicateNavigation='true'}});
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refine()})}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',refine,{once:true}):refine();
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();

