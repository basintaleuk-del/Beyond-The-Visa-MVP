(()=>{
 'use strict';
 if(window.__btvReleaseV32)return;window.__btvReleaseV32=true;
 const q=s=>document.querySelector(s);
 const open=id=>{if(id==='articles'){if(typeof window.BTVOpenMemberPane==='function')window.BTVOpenMemberPane('discover');else{q('#btvPlatformOpen')?.click();setTimeout(()=>q('[data-btv-pane="discover"]')?.click(),80)}return}if(typeof window.openScreen==='function')window.openScreen(id);else location.href=`index.html#${id}`;setTimeout(()=>scrollTo({top:0,behavior:'smooth'}),30)};
 function dialog(){let d=q('#btvInfoDialog');if(d)return d;d=document.createElement('dialog');d.id='btvInfoDialog';d.className='btvInfoDialog';d.innerHTML='<div class="btvInfoBody"><span id="btvInfoEyebrow"></span><h2 id="btvInfoTitle"></h2><p id="btvInfoText"></p><div class="btvInfoActions" id="btvInfoActions"></div></div>';document.body.append(d);d.addEventListener('click',e=>{if(e.target===d)d.close()});return d}
 function show({eyebrow='YOUR PROGRESS',title,text,actions=[]}){const d=dialog();q('#btvInfoEyebrow').textContent=eyebrow;q('#btvInfoTitle').textContent=title;q('#btvInfoText').textContent=text;const box=q('#btvInfoActions');box.replaceChildren();actions.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.textContent=a.label;b.className=i?'secondary':'';b.onclick=()=>{d.close();open(a.target)};box.append(b)});const close=document.createElement('button');close.type='button';close.textContent='Close';close.className='secondary';close.onclick=()=>d.close();box.append(close);d.showModal()}
 function interactive(el,label,handler){if(!el||el.dataset.btvInteractive)return;el.dataset.btvInteractive='yes';el.classList.add('btvInteractive');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',label);el.addEventListener('click',handler);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler()}})}
 function wire(){
  const brand=q('header .brand');if(brand&&!brand.dataset.btvHome){brand.dataset.btvHome='yes';brand.classList.add('btvHomeBrand');brand.tabIndex=0;brand.setAttribute('role','link');brand.setAttribute('aria-label','Refresh and return to Beyond The Visa home');const home=()=>{sessionStorage.setItem('btv-return-home','yes');const url=new URL(location.href);url.searchParams.set('home','1');url.searchParams.set('refresh',Date.now());location.href=url.toString()};brand.onclick=home;brand.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();home()}}}
  interactive(q('.dashboardHero'),'Open career-readiness explanation',()=>show({title:'Your career readiness',text:'This score brings together completed journey steps, profile information and learning activity. It is a planning indicator, not a guarantee of registration, employment or immigration approval.',actions:[{label:'View journey plan',target:'checklist'},{label:'Update profile',target:'profile'}]}));
  const statData=[
   ['Journey progress', 'Review every registration, document, employment and relocation step, then mark tasks complete as you verify them.', 'checklist'],
   ['CBT performance', 'Open Learning to practise questions, review explanations and build an evidence-based study routine.', 'learn'],
   ['Saved opportunities', 'Review saved roles and continue searching for suitable career opportunities.', 'career'],
   ['Study consistency', 'Your streak reflects active learning days. Short, regular sessions are usually easier to sustain than occasional long sessions.', 'learn']
  ];
  document.querySelectorAll('.dashboardStat').forEach((el,i)=>{const x=statData[i];if(x)interactive(el,`Open ${x[0]}`,()=>show({title:x[0],text:x[1],actions:[{label:'Open section',target:x[2]}]}))});
  interactive(q('.journey'),'Open journey checklist',()=>open('checklist'));
  document.querySelectorAll('.topicRow').forEach(el=>interactive(el,`Open learning for ${el.querySelector('span')?.textContent||'this topic'}`,()=>open('learn')));
  const learning=q('.dashboardColumns .dashboardPanel:nth-child(2)');interactive(learning,'Open learning focus',()=>open('learn'));
  const motivation=q('#homeWelcomeArt');interactive(motivation,'Open encouragement and learning choices',()=>show({eyebrow:'YOUR FUTURE IS MOVING',title:'You can make this journey too',text:'International nurses and midwives successfully relocate by taking the process one verified step at a time. Beyond The Visa helps members organise those same essential steps—learning, evidence, registration, applications and relocation planning. Your circumstances are individual and outcomes are never guaranteed, but steady preparation can move you closer.',actions:[{label:'Continue learning',target:'learn'},{label:'Read articles',target:'articles'}]}));
 }
 function resetHomeScroll(){if(q('#home')?.classList.contains('active'))scrollTo({top:0,left:0,behavior:'auto'})}
 function restoreHome(){if('scrollRestoration'in history)history.scrollRestoration='manual';const requested=sessionStorage.getItem('btv-return-home')==='yes'||new URLSearchParams(location.search).get('home')==='1';if(requested)sessionStorage.removeItem('btv-return-home');const restore=()=>{if(requested)open('home');resetHomeScroll()};setTimeout(restore,40);setTimeout(restore,750)}
 window.addEventListener('pageshow',()=>{resetHomeScroll();setTimeout(resetHomeScroll,250)});
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{wire();restoreHome()}):(wire(),restoreHome());setTimeout(wire,500);setTimeout(wire,1600);new MutationObserver(wire).observe(document.documentElement,{childList:true,subtree:true});
})();
