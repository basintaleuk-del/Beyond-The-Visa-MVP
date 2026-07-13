(()=>{
 'use strict';
 if(window.__btvRecoveryV53)return;window.__btvRecoveryV53=true;
 async function refreshBrowserCache(){
  const key='btv-browser-reset-v53';
  let reset=false;try{reset=localStorage.getItem(key)==='yes'}catch{}
  if(!reset){
   try{localStorage.setItem(key,'yes')}catch{}
   try{if('serviceWorker'in navigator){const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.map(item=>item.unregister()))}}catch{}
   try{if('caches'in window){const names=await caches.keys();await Promise.all(names.map(name=>caches.delete(name)))}}catch{}
   const url=new URL(location.href);url.searchParams.set('v','53');url.searchParams.delete('refresh');url.searchParams.delete('home');url.searchParams.delete('screen');location.replace(url.href);return;
  }
  try{if('serviceWorker'in navigator)await navigator.serviceWorker.register('./sw-v53.js?v=53')}catch(error){console.warn('Offline support:',error.message)}
 }
 refreshBrowserCache();
 function installBrand(){
  const brand=document.querySelector('#appShell header .brand');if(!brand)return;
  if(!brand.querySelector('.btvAdaptiveBrand'))brand.innerHTML='<span class="btvAdaptiveBrand" role="img" aria-label="Beyond The Visa — Guidance, Preparation, Your Future"></span>';
  brand.setAttribute('aria-label','Refresh and return to Beyond The Visa home');brand.setAttribute('role','link');brand.tabIndex=0;
 }
 let dashboardQueued=false;
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
 function safe(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
 function open(target){if(typeof window.openScreen==='function')window.openScreen(target);else{document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===target));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.open===target))}}
 function renderStableDashboard(){
  const home=document.getElementById('home');if(!home)return;
  document.getElementById('careerDashboard')?.remove();
  let box=document.getElementById('dashboardV3');if(!box){box=document.createElement('section');box.id='dashboardV3';box.className='dashboardV3';home.prepend(box)}
  const account=read('btv-account',{}),profile=read('btv-profile',{}),extra=read('btv-profile-extra',{}),state=read('btv-state',{}),cbt=read('btv-cbt-progress',{right:0,total:0,topics:{}}),nclex=read('btv-nclex-progress',{streak:0}),saved=read('btv-saved-jobs',[]);
  const name=(extra.preferred||account.name||profile.name||'Member').trim().split(/\s+/)[0],profession=profile.profession||extra.profession||'Nurse';
  const journeyText=document.querySelector('.journeyTop>b')?.textContent?.trim()||'0%',journeyPct=Math.max(0,Math.min(100,parseInt(journeyText)||0));
  const completed=document.querySelectorAll('.checkItem input:checked').length,total=document.querySelectorAll('.checkItem input').length;
  const accuracy=cbt.total?Math.round((Number(cbt.right)||0)/cbt.total*100):null,nextTitle=document.querySelector('.next h2')?.textContent?.trim()||'Continue your journey',nextCopy=document.querySelector('.next p')?.textContent?.trim()||'Complete your next personalised step.';
  const topics=Object.entries(cbt.topics||{}).slice(0,3),focus=topics.length?topics.map(([topic,x])=>({topic,pct:x.total?Math.round((x.right||0)/x.total*100):0,label:x.total?Math.round((x.right||0)/x.total*100)+'%':'New'})):[{topic:'Start CBT practice',pct:0,label:'New'},{topic:'Patient safety',pct:0,label:'New'},{topic:'Professional practice',pct:0,label:'New'}];
  box.innerHTML=`<div class="dashboardHero"><div class="dashboardHeroTop"><div class="dashboardHello"><span>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}</span><h2>Welcome back, ${safe(name)}</h2><p>${safe(profession)} pathway · ${safe(state.countryName||'United Kingdom')}</p></div><div class="planBadge">${safe((account.accountType||'Premium').toUpperCase())} PLAN</div></div><div class="readinessRing"><div class="ringVisual" style="--score:${journeyPct}"><b>${journeyPct}%</b></div><div class="readinessCopy"><b>Your career readiness</b><small>Your personalised plan is ready. Start with one manageable step today.</small></div></div></div>
  <div class="dashboardStats"><article class="dashboardStat"><small>Journey</small><b>${journeyPct}%</b><span>${completed} of ${total||10} steps</span></article><article class="dashboardStat"><small>CBT accuracy</small><b>${accuracy===null?'—':accuracy+'%'}</b><span>${cbt.total||0} questions answered</span></article><article class="dashboardStat"><small>Saved jobs</small><b>${Array.isArray(saved)?saved.length:0}</b><span>Career opportunities</span></article><article class="dashboardStat"><small>Study streak</small><b>${Number(nclex.streak)||0}</b><span>days active</span></article></div>
  <div class="dashboardColumns"><article class="dashboardPanel"><div class="dashboardPanelHead"><h3>Recommended next step</h3><button data-stable-open="checklist">View plan</button></div><div class="nextActionV3"><div class="nextActionIcon">→</div><div><b>${safe(nextTitle)}</b><small>${safe(nextCopy)}</small><button data-stable-open="checklist">Continue now</button></div></div><div class="profileStrip"><span>${safe(profile.qualificationCountry||extra.qualificationCountry||'Profile in progress')} · ${safe(profession)}</span><button data-stable-profile>Edit profile</button></div></article>
  <article class="dashboardPanel"><div class="dashboardPanelHead"><h3>Learning focus</h3><button data-stable-open="learn">Open learning</button></div><div class="topicRows">${focus.map(x=>`<div class="topicRow"><span>${safe(x.topic)}</span><b>${x.label}</b><div class="topicBar"><i style="width:${x.pct}%"></i></div></div>`).join('')}</div></article></div>
  <article class="dashboardPanel"><div class="dashboardPanelHead"><h3>Quick actions</h3></div><div class="dashboardShortcuts"><button data-stable-open="learn"><i>▤</i><b>CBT learning</b><small>Questions, explanations and mock tests</small></button><button data-stable-open="checklist"><i>✓</i><b>Journey checklist</b><small>Complete your registration and visa steps</small></button><button data-stable-open="jobs"><i>⌕</i><b>Job search</b><small>Find roles and review saved jobs</small></button><button data-stable-open="assistant"><i>✦</i><b>Ask Zibur</b><small>Get guidance based on your saved journey</small></button></div></article>`;
  box.querySelectorAll('[data-stable-open]').forEach(button=>button.onclick=()=>open(button.dataset.stableOpen));
  box.querySelector('[data-stable-profile]').onclick=()=>typeof window.showOnboarding==='function'?window.showOnboarding():open('profile');
 }
 function restoreDashboard(){
  if(dashboardQueued)return;dashboardQueued=true;
  requestAnimationFrame(()=>{
   dashboardQueued=false;
   const shell=document.getElementById('appShell'),home=document.getElementById('home');
   if(!shell||shell.hidden||!home||!home.classList.contains('active'))return;
   renderStableDashboard();
  });
 }
 function restoreSignedInContent(){
  const shell=document.getElementById('appShell');if(!shell||shell.hidden)return;
  if(typeof window.render==='function'){try{window.render()}catch(error){console.warn('Screen recovery:',error.message)}}
  restoreDashboard();
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',installBrand):installBrand();
 function restoreHomeAfterRefresh(){
  const navigation=performance.getEntriesByType?.('navigation')?.[0];if(navigation?.type!=='reload')return;
  const url=new URL(location.href);url.searchParams.delete('screen');history.replaceState(history.state,'',url);
  const home=()=>{if(typeof window.openScreen==='function')window.openScreen('home');restoreDashboard()};
  setTimeout(home,50);setTimeout(home,650);setTimeout(home,1500);
 }
 document.addEventListener('pageshow',()=>{restoreHomeAfterRefresh();restoreSignedInContent()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)restoreSignedInContent()});
 document.addEventListener('click',event=>{if(event.target.closest('[data-open="home"],.brand,[data-open="checklist"],[data-open="costs"]'))setTimeout(restoreSignedInContent,50)},true);
 setTimeout(()=>{installBrand();restoreSignedInContent()},300);setTimeout(()=>{installBrand();restoreSignedInContent()},900);setTimeout(restoreSignedInContent,1800);setTimeout(restoreSignedInContent,3200);
 new MutationObserver(installBrand).observe(document.documentElement,{childList:true,subtree:true});
 const bindVisibilityRecovery=()=>{
  const shell=document.getElementById('appShell'),home=document.getElementById('home');
  if(shell)new MutationObserver(restoreSignedInContent).observe(shell,{attributes:true,attributeFilter:['hidden']});
  if(home)new MutationObserver(restoreDashboard).observe(home,{attributes:true,attributeFilter:['class']});
 };
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bindVisibilityRecovery):bindVisibilityRecovery();
})();
