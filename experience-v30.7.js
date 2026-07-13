(()=>{
 'use strict';
 if(window.__btvExperienceV307)return;window.__btvExperienceV307=true;
 if(!document.querySelector('link[href^="experience-v30.7.css"]'))document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="experience-v30.7.css?v=30.7">');
 if(!document.querySelector('link[rel="manifest"]'))document.head.insertAdjacentHTML('beforeend','<link rel="manifest" href="manifest.json?v=30.7">');
 if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=45').catch(error=>console.warn('Offline support:',error.message)),{once:true});
 const $=s=>document.querySelector(s);
 let originalMemberOpen=null,queued=false;
 function closeMenu(){const x=$('#appMenuBackdrop');if(x)x.hidden=true;document.body.style.overflow=''}
 function openMember(pane='discover'){
  if(typeof window.BTVOpenMemberPane==='function'){closeMenu();window.BTVOpenMemberPane(pane);return}
  const button=$('#btvPlatformOpen');
  if(!originalMemberOpen&&button?.dataset.memberOpenReady==='true')originalMemberOpen=button.__memberOpen;
  if(!originalMemberOpen)return alert('The member centre is still loading. Please try again.');
  closeMenu();originalMemberOpen.call(button);setTimeout(()=>document.querySelector(`[data-btv-pane="${pane}"]`)?.click(),220);
 }
 function floatingZibur(){const button=$('#btvPlatformOpen');if(!button)return;if(button.dataset.ziburAction!=='true'){button.__memberOpen=button.onclick;button.dataset.memberOpenReady='true';originalMemberOpen=button.onclick;button.dataset.ziburAction='true';button.childNodes[0].textContent='Ask Zibur ✦ '}button.onclick=event=>{event?.preventDefault();event?.stopPropagation();if(typeof window.BTVFloatingZiburToggle==='function')window.BTVFloatingZiburToggle();else window.openScreen?.('assistant')}}
 function simplifyHome(){document.querySelectorAll('#home .quick button,#dashboardV3 button').forEach(button=>{const text=button.textContent.toLowerCase();if(text.includes('cost planner')){button.dataset.open='jobs';button.innerHTML='<i>⌕</i><span>Job search</span><small>Find roles and review saved jobs</small>';button.dataset.uniqueShortcut='jobs';button.onclick=()=>{window.openScreen?.('jobs');window.renderJobs?.()};return}if(text.includes('ask zibur')||text.includes('learning')||text.includes('premium membership')){button.hidden=true;button.dataset.duplicateNavigation='true'}});const jobCards=[...document.querySelectorAll('#home .quick button')].filter(x=>x.textContent.toLowerCase().includes('job search')),keeper=jobCards.find(x=>x.dataset.uniqueShortcut==='jobs')||jobCards[0];jobCards.forEach(x=>{x.hidden=x!==keeper;if(x!==keeper)x.dataset.duplicateNavigation='true'});if(keeper)keeper.hidden=false}
 function memberNavigation(){const articles=document.querySelector('[data-btv-pane="discover"]'),videos=document.querySelector('[data-btv-pane="learn"]'),prefs=document.querySelector('[data-btv-pane="prefs"]');if(articles&&articles.textContent.trim()!=='Articles')articles.textContent='Articles';if(videos&&videos.textContent.trim()!=='Videos')videos.textContent='Videos';if(prefs)prefs.hidden=true;const hero=$('#btv-discover .btvHero h3');if(hero&&hero.textContent!=='Articles for your international career')hero.textContent='Articles for your international career';const copy=$('#btv-discover .btvHero p');if(copy&&copy.textContent.startsWith('Current guides'))copy.textContent=copy.textContent.replace('Current guides','Published articles');const search=$('#btvArticleSearch');if(search)search.placeholder='Search articles';document.querySelectorAll('#btvArticleGrid [data-article]').forEach(x=>{if(x.textContent==='Read guide')x.textContent='Read article'});document.querySelectorAll('#btv-discover .btvEmpty').forEach(x=>x.textContent=x.textContent.replace('guides','articles'))}
 function bindLibrary(){document.querySelectorAll('[data-library]').forEach(button=>{if(button.dataset.v307)return;button.dataset.v307='true';button.onclick=()=>openMember(button.dataset.library)})}
 function menuItem(icon,label,action){const b=document.createElement('button');b.className='appMenuItem';b.innerHTML=`<i>${icon}</i>${label}`;b.onclick=action;return b}
 function professionalMenu(){const menu=$('.appMenu');if(!menu||menu.querySelector('[data-v307-menu]'))return;const first=menu.querySelector('.appMenuGroup');if(first){first.append(menuItem('◆','Membership',()=>{closeMenu();document.querySelector('[data-open-premium]')?.click()}));first.append(menuItem('⚙','Notification settings',()=>openMember('prefs')))}const group=document.createElement('div');group.className='appMenuGroup';group.dataset.v307Menu='true';group.innerHTML='<span>MEMBER CENTRE</span>';group.append(menuItem('▤','Articles',()=>openMember('discover')),menuItem('▶','Videos',()=>openMember('learn')),menuItem('◫','Bookings',()=>openMember('book')),menuItem('●','Notifications',()=>openMember('notify')));const help=[...menu.querySelectorAll('.appMenuGroup')].find(x=>x.textContent.includes('HELP & FEEDBACK'));menu.insertBefore(group,help||null)}
 function refine(){floatingZibur();simplifyHome();memberNavigation();bindLibrary();professionalMenu()}
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refine()})}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',refine):refine();
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('click',event=>{if(event.target.closest('[data-open="home"],[data-open="learn"]'))setTimeout(refine,80)},true);
})();
