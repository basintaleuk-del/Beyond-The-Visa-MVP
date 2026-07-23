(()=>{
  'use strict';
  if(window.__btvLearnV90)return;
  window.__btvLearnV90=true;

  const baseModules=[
    {id:'explore',label:'Explore learning',icon:'EX',copy:'Discover Beyond The Visa through published guides, articles, videos and your complete platform guide.',hub:'discover',meta:'Platform guide & curated resources'},
    {id:'books',label:'Book library',icon:'▤',copy:'Books matched to your pathway',library:'books',meta:'Published reading'},
    {id:'cbt',label:'CBT',icon:'CBT',copy:'Question bank, explanations and timed mock exams.',url:'cbt.html',meta:'Practice and mocks'},
    {id:'nclex',label:'NCLEX-RN',icon:'RN',copy:'Clinical questions and adaptive exam preparation.',url:'nclex.html',meta:'Clinical readiness'},
    {id:'osce',label:'OSCE',icon:'OS',copy:'Station-focused practice, marking criteria and guidance.',url:'osce.html',meta:'Practical skills'},
    {id:'ielts',label:'IELTS Academic',icon:'A',copy:'Reading, writing, listening and speaking preparation.',url:'ielts.html',meta:'Language preparation'},
    {id:'calculations',label:'CBT Numeracy',icon:'%',copy:'Practise safe medication and dosage calculations with interactive questions.',route:'calculations',meta:'Interactive practice'},
    {id:'adult-nursing',label:'Clinical learning',icon:'CL',copy:'Core adult nursing topics and clinical resources.',url:'adult-nursing.html',meta:'Reference library'},
    {id:'analytics',label:'Learning progress',icon:'UP',copy:'Review recorded practice, results and study activity.',route:'analytics',meta:'Your activity'},
  ];

  const destinations={
    uk:{name:'United Kingdom',flag:'🇬🇧',exam:'cbt',intro:'Your CBT pathway, UK clinical practice and international career learning in one place.'},
    ie:{name:'Ireland',flag:'🇮🇪',exam:'cbt',intro:'Your Irish registration pathway, clinical practice and international career learning in one place.'},
    us:{name:'United States',flag:'🇺🇸',exam:'nclex',intro:'Your NCLEX-RN pathway, US clinical practice and international career learning in one place.'},
    ca:{name:'Canada',flag:'🇨🇦',exam:'nclex',intro:'Your Canadian registration and NCLEX-RN preparation, clinical practice and career learning in one place.'},
    au:{name:'Australia',flag:'🇦🇺',exam:'registration',intro:'Your Australian registration pathway, clinical practice and international career learning in one place.'},
    nz:{name:'New Zealand',flag:'🇳🇿',exam:'registration',intro:'Your New Zealand registration pathway, clinical practice and international career learning in one place.'}
  };
  function destination(){
    let key='uk';
    try{key=JSON.parse(localStorage.getItem('btv-v1')||'{}').country||key}catch{}
    return {...(destinations[key]||destinations.uk),key};
  }

  function modulesForDestination(){
    const exam=destination().exam;
    return baseModules.filter(item=>item.id!=='cbt'&&item.id!=='nclex'||item.id===exam);
  }

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function openBooks(){
    let dialog=document.getElementById('learnBookLibraryV103');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='learnBookLibraryV103';dialog.className='learnLibraryDialogV103';document.body.append(dialog)}
    dialog.innerHTML='<div class="learnLibraryPanelV103"><header><div><small>BOOK LIBRARY</small><h2>Books matched to your pathway</h2></div><button type="button" data-close aria-label="Close book library">×</button></header><div data-books><p>Loading published books…</p></div></div>';
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.showModal();
    const target=dialog.querySelector('[data-books]'),sb=window.btvSupabase;
    if(!sb){target.innerHTML='<p>The book library connection is unavailable. Please refresh and try again.</p>';return}
    const {data,error}=await sb.from('books').select('*').eq('status','published').order('created_at',{ascending:false});
    if(error){target.innerHTML=`<p>${esc(error.message)}</p>`;return}
    const exam=destination().exam,visible=(data||[]).filter(book=>book.pathway==='all'||book.pathway===exam||(book.pathway==='osce'&&destination().key==='uk'));
    target.innerHTML=`<div class="learnBookGridV103">${visible.map(book=>`<article><span>▤</span><small>${esc((book.pathway||'all').toUpperCase())}</small><h3>${esc(book.title)}</h3><b>${esc(book.author||'Beyond The Visa')}</b><p>${esc(book.description||'Professional learning resource.')}</p><button type="button" data-book-path="${esc(book.file_path)}">Open book</button></article>`).join('')||'<p>No published books match this pathway yet. New titles will appear here when an administrator publishes them.</p>'}</div>`;
    target.querySelectorAll('[data-book-path]').forEach(button=>button.onclick=async()=>{button.disabled=true;button.textContent='Opening…';const result=await sb.storage.from('btv-books').createSignedUrl(button.dataset.bookPath,300);button.disabled=false;button.textContent='Open book';if(result.error){alert(result.error.message);return}window.open(result.data.signedUrl,'_blank','noopener')});
  }

  function go(item){
    sessionStorage.setItem('btv-return-screen','learn');
    if(item.library==='books'){openBooks();return;}
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
        <div><span>LEARNING CENTRE · ${selected.flag} ${selected.name.toUpperCase()}</span><h1>Build your confidence</h1><p>${selected.intro}</p></div>
      </header>
      <section class="learnV90Intro" aria-labelledby="learn-modules-title"><div><span>YOUR LEARNING</span><h2 id="learn-modules-title">Choose where to continue</h2></div><button type="button" data-learning-progress>View progress</button></section>
      <div class="learnV90Grid">${modules.map(x=>`<article class="learnV90Card"><span class="learnV90Icon" aria-hidden="true">${x.icon}</span><div><small>${x.meta}</small><h2>${x.label}</h2><p>${x.copy}</p></div><button type="button" data-module="${x.id}">Open ${x.label}<span aria-hidden="true">&#8594;</span></button></article>`).join('')}</div>
    `;
    root.querySelector('[data-learn-home]').onclick=()=>window.BTVFeatures?.open('dashboard')||window.openScreen?.('home');
    root.querySelector('[data-learning-progress]').onclick=()=>window.BTVFeatures?.open('analytics');
    root.querySelectorAll('[data-module]').forEach(btn=>btn.onclick=()=>go(modules.find(x=>x.id===btn.dataset.module)));
  }

  function showCalculator(){
    buildLearning();
    const grid=document.querySelector('.learnV90Grid');if(!grid)return;
    const tool=document.createElement('section');tool.className='learnV90ToolBlock';tool.innerHTML='<div class="learnV90SectionHead"><span>INTERACTIVE PRACTICE</span><h2>CBT Numeracy</h2><p>Work through safe dosage and medication calculations using the existing interactive calculator.</p></div><div id="calculationsLesson"></div>';
    grid.after(tool);window.renderCalculator?.();setTimeout(()=>{const card=tool.querySelector('.calcCard'),calc=card?.querySelector('.scientificCalc85'),feedback=card?.querySelector('.calcFeedback');if(calc&&feedback)feedback.after(calc)},20);tool.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  window.buildLearning=buildLearning;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',buildLearning,{once:true}):buildLearning();
  document.addEventListener('click',event=>{if(event.target.closest('[data-open="learn"],[data-go="study"],.country'))setTimeout(buildLearning,40)});
  window.addEventListener('storage',event=>{if(event.key==='btv-v1'||event.key==='btv-profile')buildLearning()});
  window.addEventListener('btv:feature-action',e=>{if(e.detail?.id==='study')setTimeout(buildLearning,0);if(e.detail?.id==='calculations')setTimeout(showCalculator,0);if(e.detail?.id==='explore'||e.detail?.id==='books')setTimeout(()=>window.BTVPlatform?.open('discover'),80)});
})();
