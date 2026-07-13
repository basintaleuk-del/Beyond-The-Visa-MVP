(()=>{
 'use strict';
 if(window.__btvReleaseV43)return;window.__btvReleaseV43=true;
 function installBrand(){
  const brand=document.querySelector('#appShell header .brand');if(!brand)return;
  if(!brand.querySelector('.btvAdaptiveBrand'))brand.innerHTML='<img class="btvAdaptiveBrand" src="btv-brand-adaptive.png?v=44" alt="Beyond The Visa — Guidance, Preparation, Your Future">';
  brand.setAttribute('aria-label','Refresh and return to Beyond The Visa home');brand.setAttribute('role','link');brand.tabIndex=0;
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',installBrand):installBrand();
 setTimeout(installBrand,500);setTimeout(installBrand,1500);
 new MutationObserver(installBrand).observe(document.documentElement,{childList:true,subtree:true});
})();
