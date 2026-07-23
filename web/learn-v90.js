(()=>{
  'use strict';
  if(window.__btvLearnV90)return;
  window.__btvLearnV90=true;

  const baseModules=[
    {id:'explore',label:'Explore learning',icon:'EX',copy:'Open published guides, articles and videos from the learning library.',hub:'discover',meta:'Curated resources'},
    {id:'books',label:'Books and guides',icon:'BK',copy:'Browse detailed platform guides and professional reference material.',hub:'discover',meta:'Reading library'},
    {id:'cbt',label:'CBT',icon:'CBT',copy:'Question bank, explanations and timed mock exams.',url:'cbt.html',meta:'Practice and mocks'},
    {id:'nclex',label:'NCLEX-RN',icon:'RN',copy:'Clinical questions and adaptive exam preparation.',url:'nclex.html',meta:'Clinical readiness'},
    {id:'osce',label:'OSCE',icon:'OS',copy:'Station-focused practice, marking criteria and guidance.',url:'osce.html',meta:'Practical skills'},
    {id:'ielts',label:'IELTS Academic',icon:'A',copy:'Reading, writing, listening and speaking preparation.',url:'ielts.html',meta:'Language preparation'},
    {id:'calculations',label:'CBT Numeracy',icon:'%',copy:'Practise safe medication and dosage calculations with interactive questions.',route:'calculations',meta:'Interactive practice'},
    {id:'adult-nursing',label:'Clinical learning',icon:'CL',copy:'Core adult nursing topics and clinical resources.',url:'adult-nursing.html',meta:'Reference library'},
    {id:'analytics',label:'Learning progress',icon:'UP',copy:'Review recorded practice, results and study activity.',route:'analytics',meta:'Your activity'},
  ];

  function destination(){
    const c=typeof window.country==='function'?window.country():null;
    const name=c?.name||'United Kingdom';
    const key=({'United Kingdom':'uk','United States':'us','Australia':'au','Canada':'ca','New Zealand':'nz','Ireland':'ie'})[name]||'uk';
    const exam={uk:'cbt',ie:'cbt',us:'nclex',ca:'nclex',au:'nclex',nz:'registration'}[key];
    return {name,flag:c?.flag||({uk:'🇬🇧',us:'🇺🇸',au:'🇦🇺',ca:'🇨🇦',nz:'🇳🇿',ie:'🇮🇪'})[key],exam};
  }

  function modulesForDestination(){
    const exam=destination().exam;
    return baseModules.filter(item=>item.id!=='cbt'&&item.id!=='nclex'||item.id===exam);
  }

  function go(item){
    sessionStorage.setItem('btv-return-screen','learn');
    if(item.url){sessionStorage.setItem('btv-learn-module',item.id);location.href=item.url;return;}
    if(item.hub){window.BTVPlatform?.open(item.hub);return;}
    window.BTVFeatures?.open(item.route);
  }

  function buildLearning(){
    const root=document.getElementById('learn');if(!root)return;
    const selected=destination(),modules=modulesForDestination();
    root.classList.add('learnV90Page');
    root.innerHTML=`
      <header class="learnV90Header">
        <button class="back" type="button" data-learn-home aria-label="Back to dashboard">&#8592;</button>
        <div><span>LEARNING CENTRE · ${selected.flag} ${selected.name.toUpperCase()}</span><h1>Build your confidence</h1><p>${selected.exam==='registration'?'Registration, clinical practice and career learning tailored to your destination.':`Your ${selected.exam.toUpperCase()} pathway, clinical practice and international career learning in one place.`}</p></div>
      </header>
      <section class="learnV90Intro" aria-labelledby="learn-modules-title"><div><span>YOUR LEARNING</span><h2 id="learn-modules-title">Choose where to continue</h2></div><button type="button" data-learning-progress>View progress</button></section>
      <div class="learnV90Grid">${modules.map(x=>`<article class="learnV90Card"><span class="learnV90Icon" aria-hidden="true">${x.icon}</span><div><small>${x.meta}</small><h2>${x.label}</h2><p>${x.copy}</p></div><button type="button" data-module="${x.id}">Open ${x.label}<span aria-hidden="true">&#8594;</span></button></article>`).join('')}</div>
      <section class="learnV90VideoBlock" aria-labelledby="learn-video-title"><div class="learnV90SectionHead"><span>PLATFORM GUIDE</span><h2 id="learn-video-title">Discover Beyond The Visa</h2><p>See how the platform brings your journey plan, learning tools, career support and progress together.</p></div><div id="guideLesson"></div></section>
    `;
    root.querySelector('[data-learn-home]').onclick=()=>window.BTVFeatures?.open('dashboard')||window.openScreen?.('home');
    root.querySelector('[data-learning-progress]').onclick=()=>window.BTVFeatures?.open('analytics');
    root.querySelectorAll('[data-module]').forEach(btn=>btn.onclick=()=>go(modules.find(x=>x.id===btn.dataset.module)));
    window.renderGuide?.();
  }

  function showCalculator(){
    buildLearning();
    const video=document.querySelector('.learnV90VideoBlock');if(!video)return;
    const tool=document.createElement('section');tool.className='learnV90ToolBlock';tool.innerHTML='<div class="learnV90SectionHead"><span>INTERACTIVE PRACTICE</span><h2>CBT Numeracy</h2><p>Work through safe dosage and medication calculations using the existing interactive calculator.</p></div><div id="calculationsLesson"></div>';
    video.before(tool);window.renderCalculator?.();tool.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  window.buildLearning=buildLearning;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',buildLearning,{once:true}):buildLearning();
  window.addEventListener('btv:feature-action',e=>{if(e.detail?.id==='study')setTimeout(buildLearning,0);if(e.detail?.id==='calculations')setTimeout(showCalculator,0);if(e.detail?.id==='explore'||e.detail?.id==='books')setTimeout(()=>window.BTVPlatform?.open('discover'),80)});
})();
