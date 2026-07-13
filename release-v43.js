(()=>{
 'use strict';
 if(window.__btvReleaseV43)return;window.__btvReleaseV43=true;
 function installBrand(){
  const brand=document.querySelector('#appShell header .brand');if(!brand)return;
  if(!brand.querySelector('.btvAdaptiveBrand'))brand.innerHTML='<span class="btvAdaptiveBrand" role="img" aria-label="Beyond The Visa — Guidance, Preparation, Your Future"></span>';
  brand.setAttribute('aria-label','Refresh and return to Beyond The Visa home');brand.setAttribute('role','link');brand.tabIndex=0;
 }
 let dashboardQueued=false;
 function restoreDashboard(){
  if(dashboardQueued)return;dashboardQueued=true;
  requestAnimationFrame(()=>{
   dashboardQueued=false;
   const shell=document.getElementById('appShell'),home=document.getElementById('home');
   if(!shell||shell.hidden||!home||!home.classList.contains('active'))return;
   const dashboard=document.getElementById('dashboardV3');
   if((!dashboard||!dashboard.innerHTML.trim())&&typeof window.renderDashboardInsights==='function'){
    try{window.renderDashboardInsights()}catch(error){console.warn('Dashboard recovery:',error.message)}
   }
  });
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',installBrand):installBrand();
 document.addEventListener('pageshow',restoreDashboard);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)restoreDashboard()});
 document.addEventListener('click',event=>{if(event.target.closest('[data-open="home"],.brand'))setTimeout(restoreDashboard,50)},true);
 setTimeout(()=>{installBrand();restoreDashboard()},300);setTimeout(()=>{installBrand();restoreDashboard()},900);setTimeout(restoreDashboard,1800);setTimeout(restoreDashboard,3200);
 new MutationObserver(()=>{installBrand();restoreDashboard()}).observe(document.documentElement,{childList:true,subtree:true});
})();
