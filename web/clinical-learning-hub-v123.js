(()=>{
  'use strict';
  if(window.BTVClinicalHub)return;
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const catalog=()=>window.BTVClinicalCatalog||[];
  const state={user:null,progress:new Map(),bookmarks:new Set(),notes:new Map(),active:null,opener:null,startedAt:0,textScale:1,filter:{query:'',category:'',difficulty:'',time:'',status:''}};
  const localKey='btv-clinical-hub-v123';
  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(localKey)||'{}')}catch{return{}}};
  const writeLocal=()=>{
    const out={progress:Object.fromEntries(state.progress),bookmarks:[...state.bookmarks],notes:Object.fromEntries(state.notes)};
    localStorage.setItem(localKey,JSON.stringify(out));
  };
  const statusOf=slug=>{
    const p=state.progress.get(slug);
    if(p?.completed_at)return'completed';
    if((p?.viewed_sections||[]).length||(p?.attempted_checks||[]).length)return'in-progress';
    return'not-started';
  };
  const progressPercent=(slug,totalSections=1,totalChecks=0)=>{
    const p=state.progress.get(slug)||{},sections=new Set(p.viewed_sections||[]),checks=new Set(p.attempted_checks||[]);
    const sectionScore=sections.size/Math.max(totalSections,1)*75;
    const checkScore=totalChecks?checks.size/totalChecks*25:sections.size>=totalSections?25:0;
    return Math.min(100,Math.round(sectionScore+checkScore));
  };
  function hydrateLocal(){
    const saved=readLocal();
    Object.entries(saved.progress||{}).forEach(([key,value])=>state.progress.set(key,value));
    (saved.bookmarks||[]).forEach(key=>state.bookmarks.add(key));
    Object.entries(saved.notes||{}).forEach(([key,value])=>state.notes.set(key,value));
    const legacy=JSON.parse(localStorage.getItem('btv-learning-centre-progress')||'{}');
    const legacySlugs=['abcde-assessment','insulin-safety','infection-prevention','fluid-balance','wound-care','pain-management','respiratory-care','diabetes-care','neurological-assessment','cardiovascular-care','safeguarding','sbar'];
    legacySlugs.forEach((slug,index)=>{if(legacy[`clinical:${index}`]&&!state.progress.has(slug))state.progress.set(slug,{viewed_sections:['overview'],attempted_checks:[],last_studied_at:new Date().toISOString()})});
  }
  async function hydrateRemote(){
    const sb=window.btvSupabase;if(!sb?.auth)return;
    state.user=(await sb.auth.getUser()).data.user||null;
    if(!state.user)return;
    const [progress,bookmarks,notes]=await Promise.all([
      sb.from('btv_clinical_progress').select('*').eq('user_id',state.user.id),
      sb.from('btv_clinical_bookmarks').select('module_slug').eq('user_id',state.user.id),
      sb.from('btv_clinical_notes').select('module_slug,section_id,note').eq('user_id',state.user.id)
    ]);
    if(!progress.error)(progress.data||[]).forEach(row=>state.progress.set(row.module_slug,row));
    if(!bookmarks.error)(bookmarks.data||[]).forEach(row=>state.bookmarks.add(row.module_slug));
    if(!notes.error)(notes.data||[]).forEach(row=>state.notes.set(`${row.module_slug}:${row.section_id}`,row.note));
    writeLocal();
  }
  function progressSummary(){
    const modules=catalog(),completed=modules.filter(m=>statusOf(m.slug)==='completed').length,active=modules.filter(m=>statusOf(m.slug)==='in-progress').length;
    return {completed,active,remaining:modules.reduce((sum,m)=>sum+(statusOf(m.slug)==='completed'?0:m.estimatedMinutes),0)};
  }
  function card(module){
    const pct=progressPercent(module.slug,19,7),status=statusOf(module.slug);
    return `<article class="clinicalCard123" data-module-card="${esc(module.slug)}">
      <div class="clinicalCardTop123"><span class="clinicalIcon123">${esc(module.icon)}</span><button type="button" class="bookmark123 ${state.bookmarks.has(module.slug)?'active':''}" data-bookmark="${esc(module.slug)}" aria-label="${state.bookmarks.has(module.slug)?'Remove bookmark':'Bookmark'} ${esc(module.title)}" aria-pressed="${state.bookmarks.has(module.slug)}">☆</button></div>
      <small>${esc(module.category)} · ${esc(status.replace('-', ' '))}</small><h3>${esc(module.title)}</h3><p>${esc(module.summary)}</p>
      <div class="clinicalMeta123"><span>${esc(module.difficulty)}</span><span>${module.estimatedMinutes} min</span><span>${pct}%</span></div>
      <div class="clinicalProgress123" aria-label="${pct}% complete"><i style="width:${pct}%"></i></div>
      <button type="button" class="openClinical123" data-open-module="${esc(module.slug)}">Open module</button>
    </article>`;
  }
  function filtered(){
    const {query,category,difficulty,time,status}=state.filter,q=query.toLowerCase();
    return catalog().filter(module=>{
      const hay=[module.title,module.subtitle,module.summary,...module.tags,...module.searchKeywords].join(' ').toLowerCase();
      return (!q||hay.includes(q))&&(!category||module.category===category)&&(!difficulty||module.difficulty===difficulty)&&
        (!time||(time==='short'?module.estimatedMinutes<=45:time==='medium'?module.estimatedMinutes<=60:module.estimatedMinutes>60))&&
        (!status||statusOf(module.slug)===status);
    });
  }
  function drawCards(){
    const grid=$('#clinicalGrid123'),count=$('#clinicalResultCount123');if(!grid)return;
    const modules=filtered();count.textContent=`${modules.length} module${modules.length===1?'':'s'}`;
    grid.innerHTML=modules.map(card).join('')||'<div class="clinicalEmpty123"><b>No modules match these filters.</b><p>Clear a filter or search a broader clinical term.</p></div>';
    bindCards(grid);
  }
  function bindCards(root){
    $$('[data-open-module]',root).forEach(button=>button.onclick=()=>openModule(button.dataset.openModule,button));
    $$('[data-bookmark]',root).forEach(button=>button.onclick=event=>{event.stopPropagation();toggleBookmark(button.dataset.bookmark);drawCards()});
  }
  function dashboardMarkup(){
    const summary=progressSummary(),categories=[...new Set(catalog().map(m=>m.category))].sort();
    const continued=catalog().filter(m=>statusOf(m.slug)==='in-progress').slice(0,3);
    const bookmarked=catalog().filter(m=>state.bookmarks.has(m.slug)).slice(0,3);
    return `<section class="clinicalHero123"><div><small>PROFESSIONAL CLINICAL EDUCATION</small><h1>Clinical Learning Hub</h1><p>Structured, evidence-informed clinical learning for nursing practice, competency development, CBT, NCLEX, OSCE and continuing professional development.</p></div><div class="clinicalHeroStats123"><div><b>${summary.completed}</b><span>completed</span></div><div><b>${summary.active}</b><span>in progress</span></div><div><b>${summary.remaining}</b><span>minutes remaining</span></div></div></section>
      <section class="clinicalNotice123"><b>Educational use</b><span>This learning content supports education and revision. It does not replace local policy, clinical judgement, senior advice, or emergency escalation procedures.</span></section>
      ${continued.length?`<section class="clinicalShelf123"><div class="sectionHead"><small>CONTINUE LEARNING</small><h2>Pick up where you stopped</h2></div><div class="clinicalMiniGrid123">${continued.map(card).join('')}</div></section>`:''}
      ${bookmarked.length?`<section class="clinicalShelf123"><div class="sectionHead"><small>BOOKMARKED</small><h2>Saved modules</h2></div><div class="clinicalMiniGrid123">${bookmarked.map(card).join('')}</div></section>`:''}
      <section class="clinicalLibrary123"><div class="sectionHead"><small>TEXTBOOK LIBRARY</small><h2>Explore clinical modules</h2><p>Search by condition, symptom, procedure, framework or learning objective. Full content opens in a dedicated learning screen.</p></div>
      <div class="clinicalSearch123"><label><span class="sr">Search clinical learning</span><input id="clinicalSearch123" type="search" placeholder="Search sepsis, hypoxia, SBAR, insulin safety…"></label>
      <select id="clinicalCategory123" aria-label="Filter by category"><option value="">All categories</option>${categories.map(x=>`<option>${esc(x)}</option>`).join('')}</select>
      <select id="clinicalDifficulty123" aria-label="Filter by difficulty"><option value="">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
      <select id="clinicalTime123" aria-label="Filter by study time"><option value="">Any study time</option><option value="short">Up to 45 min</option><option value="medium">Up to 60 min</option><option value="long">Over 60 min</option></select>
      <select id="clinicalStatus123" aria-label="Filter by progress"><option value="">Any progress</option><option value="completed">Completed</option><option value="in-progress">In progress</option><option value="not-started">Not started</option></select>
      <button type="button" id="clinicalClear123">Clear</button></div>
      <div class="clinicalLibraryHead123"><b id="clinicalResultCount123"></b><span>Detailed modules load only when opened.</span></div><div id="clinicalGrid123" class="clinicalGrid123"></div></section>
      <section id="resources"><div class="sectionHead"><small>ADMIN-PUBLISHED LIBRARY</small><h2>Additional clinical resources</h2><p>Existing protected documents and official links remain available below.</p></div><div id="clinicalResources123" class="resourceGrid"></div></section>`;
  }
  async function loadResources(){
    const host=$('#clinicalResources123'),sb=window.btvSupabase;if(!host||!sb?.from)return;
    const result=await sb.from('learning_resources').select('*').eq('status','published').order('created_at',{ascending:false});
    if(result.error){host.innerHTML='<div class="emptyResources"><b>No additional resources available.</b></div>';return}
    const items=(result.data||[]).filter(x=>String(x.category||'').toLowerCase().includes('clinical')||String(x.category||'').toLowerCase().includes('adult nursing'));
    host.innerHTML=items.map((item,index)=>`<article class="resourceCard"><span class="resourceType">${item.resource_type==='pdf'?'PDF':'LINK'}</span><small>${esc(item.category||item.resource_type)}</small><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><button type="button" data-extra-resource="${index}">Open resource</button></article>`).join('')||'<div class="emptyResources"><b>No additional uploads yet.</b></div>';
    $$('[data-extra-resource]',host).forEach(button=>button.onclick=async()=>{const item=items[Number(button.dataset.extraResource)];if(item.external_url){window.open(item.external_url,'_blank','noopener');return}const signed=await sb.storage.from('learning-media').createSignedUrl(item.storage_path,300);if(signed.error)return toast(signed.error.message);window.open(signed.data.signedUrl,'_blank','noopener')});
  }
  function bindDashboard(root){
    const map=[['#clinicalSearch123','query','input'],['#clinicalCategory123','category','change'],['#clinicalDifficulty123','difficulty','change'],['#clinicalTime123','time','change'],['#clinicalStatus123','status','change']];
    map.forEach(([selector,key,event])=>$(selector).addEventListener(event,e=>{state.filter[key]=e.target.value;drawCards()}));
    $('#clinicalClear123').onclick=()=>{state.filter={query:'',category:'',difficulty:'',time:'',status:''};map.forEach(([selector])=>$(selector).value='');drawCards()};
    bindCards(root);drawCards();
  }
  async function loadModule(meta){
    const sb=window.btvSupabase;
    if(sb?.from){
      const result=await sb.from('btv_clinical_modules').select('content,clinical_review_status,reviewer_name,reviewer_role,reviewed_at,next_review_at,version').eq('slug',meta.slug).eq('published',true).maybeSingle();
      if(!result.error&&result.data?.content)return{...meta,...result.data.content,clinicalReviewStatus:result.data.clinical_review_status,reviewedBy:result.data.reviewer_name,reviewerRole:result.data.reviewer_role,reviewedAt:result.data.reviewed_at,nextReviewAt:result.data.next_review_at,version:result.data.version};
    }
    if(meta.detailPath){const response=await fetch(meta.detailPath,{cache:'no-cache'});if(!response.ok)throw new Error('This module could not be loaded.');return response.json()}
    return{...meta,...meta.legacyContent};
  }
  function blockMarkup(block){
    if(block.type==='paragraph')return`<p>${esc(block.text)}</p>`;
    if(block.type==='heading')return`<h${block.level===4?4:3}>${esc(block.text)}</h${block.level===4?4:3}>`;
    if(block.type==='bullets')return`<ul>${(block.items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
    if(block.type==='steps')return`<ol>${(block.items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`;
    if(['warning','red-flag','tip'].includes(block.type))return`<aside class="clinicalCallout123 ${block.type}"><b>${esc(block.title)}</b><p>${esc(block.text)}</p></aside>`;
    if(block.type==='table')return`<div class="clinicalTableWrap123"><table><caption>${esc(block.caption)}</caption><thead><tr>${(block.headers||[]).map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${(block.rows||[]).map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if(block.type==='definitions')return`<dl class="clinicalDefinitions123">${(block.items||[]).map(x=>`<div><dt>${esc(x.term)}</dt><dd>${esc(x.definition)}</dd></div>`).join('')}</dl>`;
    return'';
  }
  function caseMarkup(caseStudy){
    const list=(title,items)=>items?.length?`<h4>${esc(title)}</h4><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
    return`<details class="clinicalCase123"><summary>${esc(caseStudy.title)}</summary><div><p><b>Background:</b> ${esc(caseStudy.background)}</p><p><b>Presenting complaint:</b> ${esc(caseStudy.presentingComplaint)}</p>${list('Observations',caseStudy.observations)}${list('Relevant history',caseStudy.history)}${list('Assessment findings',caseStudy.assessmentFindings)}${list('Questions for the learner',caseStudy.questions)}${list('Clinical reasoning',caseStudy.reasoning)}${list('Nursing priorities',caseStudy.nursingPriorities)}<p><b>Escalation decision:</b> ${esc(caseStudy.escalationDecision)}</p><p><b>Expected outcome:</b> ${esc(caseStudy.expectedOutcome)}</p></div></details>`;
  }
  function checksFor(module,sectionId){return(module.knowledgeChecks||[]).filter(x=>x.sectionId===sectionId)}
  function checkMarkup(check){
    const attempted=new Set(state.progress.get(state.active.slug)?.attempted_checks||[]).has(check.id);
    return`<form class="clinicalCheck123" data-check="${esc(check.id)}"><small>${esc(check.type.replace('-',' '))}</small><h4>${esc(check.prompt)}</h4>${(check.options||[]).length?`<div>${check.options.map(option=>`<label><input type="radio" name="answer" value="${esc(option)}" required> <span>${esc(option)}</span></label>`).join('')}</div>`:`<label><span>Your clinical reasoning</span><textarea name="answer" rows="4" required></textarea></label>`}<button type="submit">${attempted?'Try again':'Check answer'}</button><div class="clinicalFeedback123" role="status" aria-live="polite"></div></form>`;
  }
  function sectionMarkup(module,section,index){
    const cases=section.id==='case-studies'?(module.caseStudies||[]).map(caseMarkup).join(''):'';
    const key=section.id==='key-takeaways'?`<ul>${(module.keyTakeaways||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
    const refs=section.id==='references'?`<ol class="clinicalReferences123">${(module.references||[]).map(x=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><span>${esc(x.publisher)}. ${esc(x.reviewNote||'')}</span></li>`).join('')}</ol>`:'';
    return`<section class="clinicalTextSection123" id="clinical-${esc(section.id)}" data-section="${esc(section.id)}" tabindex="-1"><header><small>SECTION ${index+1} OF ${module.sections.length}</small><h2>${esc(section.title)}</h2><button type="button" data-copy-section="${esc(section.id)}">Copy link</button></header>${(section.blocks||[]).map(blockMarkup).join('')}${cases}${key}${refs}${checksFor(module,section.id).map(checkMarkup).join('')}<div class="clinicalNotes123"><label><span>Private learner notes</span><textarea rows="3" data-note="${esc(section.id)}" placeholder="Save a private note for this section.">${esc(state.notes.get(`${module.slug}:${section.id}`)||'')}</textarea></label><button type="button" data-save-note="${esc(section.id)}">Save note</button></div><nav class="clinicalSectionControls123">${index?`<button type="button" data-section-nav="${esc(module.sections[index-1].id)}">← Previous</button>`:'<span></span>'}${index<module.sections.length-1?`<button type="button" data-section-nav="${esc(module.sections[index+1].id)}">Next →</button>`:'<button type="button" data-finish-module>Finish module</button>'}</nav></section>`;
  }
  function modalMarkup(module){
    const review=module.clinicalReviewStatus==='clinically_reviewed'&&module.reviewedBy?`Clinically reviewed by ${esc(module.reviewedBy)}${module.reviewerRole?`, ${esc(module.reviewerRole)}`:''}`:`${esc((module.clinicalReviewStatus||'awaiting_clinical_review').replaceAll('_',' '))}`;
    return`<div class="clinicalModalShell123"><header class="clinicalModalHead123"><div><small>${esc(module.category)} · ${esc(module.difficulty)} · ${module.estimatedMinutes} min</small><h1 id="clinicalModalTitle123">${esc(module.title)}</h1><p>${esc(module.subtitle)}</p></div><div><button type="button" data-print-module aria-label="Print module">Print</button><button type="button" data-text-size aria-label="Adjust text size">A±</button><button type="button" data-close-module aria-label="Close clinical module">×</button></div></header><div class="clinicalReadProgress123"><i></i></div><div class="clinicalModalLayout123"><aside><div class="clinicalGovernance123"><b>Version ${esc(module.version)}</b><span>${review}</span></div><nav aria-label="${esc(module.title)} table of contents">${module.sections.map((section,index)=>`<button type="button" data-toc="${esc(section.id)}"><span>${index+1}</span>${esc(section.title)}</button>`).join('')}</nav></aside><article class="clinicalTextbook123" style="--clinical-scale:${state.textScale}">${module.sections.map((section,index)=>sectionMarkup(module,section,index)).join('')}</article></div></div>`;
  }
  function focusables(dialog){return $$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',dialog).filter(x=>!x.disabled&&!x.hidden)}
  function trap(event){
    const dialog=$('#clinicalModuleDialog123');if(!dialog?.open)return;
    if(event.key==='Escape'){event.preventDefault();closeModule();return}
    if(event.key!=='Tab')return;
    const nodes=focusables(dialog),first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
  async function openModule(slug,opener){
    const meta=catalog().find(x=>x.slug===slug);if(!meta)return;
    state.opener=opener||document.activeElement;const dialog=$('#clinicalModuleDialog123');dialog.innerHTML='<div class="clinicalLoading123"><b>Opening module…</b><span>Loading structured textbook content.</span></div>';dialog.showModal();document.body.classList.add('clinicalModalOpen123');
    try{
      const module=await loadModule(meta);state.active=module;state.startedAt=Date.now();dialog.innerHTML=modalMarkup(module);bindModal(dialog,module);dialog.querySelector('[data-close-module]').focus();updateUrl(module.slug);await recordOpen(module.slug);
    }catch(error){dialog.innerHTML=`<div class="clinicalLoading123"><b>Module unavailable</b><span>${esc(error.message)}</span><button type="button" data-close-module>Close</button></div>`;dialog.querySelector('[data-close-module]').onclick=closeModule}
  }
  function closeModule(){
    const dialog=$('#clinicalModuleDialog123');if(!dialog?.open)return;
    recordTime();dialog.close();dialog.innerHTML='';document.body.classList.remove('clinicalModalOpen123');state.active=null;history.replaceState({},'',location.pathname.startsWith('/clinical-learning/')?'/adult-nursing.html':location.pathname);state.opener?.focus?.();
  }
  function goSection(id){
    const section=$(`#clinical-${CSS.escape(id)}`);if(!section)return;
    section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});section.focus({preventScroll:true});markSection(id);
  }
  function bindModal(dialog,module){
    dialog.querySelector('[data-close-module]').onclick=closeModule;
    dialog.querySelector('[data-print-module]').onclick=()=>window.print();
    dialog.querySelector('[data-text-size]').onclick=()=>{state.textScale=state.textScale>=1.2?.9:state.textScale+.1;$('.clinicalTextbook123').style.setProperty('--clinical-scale',state.textScale)};
    $$('[data-toc],[data-section-nav]',dialog).forEach(button=>button.onclick=()=>goSection(button.dataset.toc||button.dataset.sectionNav));
    $$('[data-copy-section]',dialog).forEach(button=>button.onclick=async()=>{const link=`${location.origin}/clinical-learning/${module.slug}#${button.dataset.copySection}`;await navigator.clipboard.writeText(link);toast('Section link copied')});
    $$('[data-save-note]',dialog).forEach(button=>button.onclick=()=>saveNote(module.slug,button.dataset.saveNote,$(`[data-note="${CSS.escape(button.dataset.saveNote)}"]`).value));
    $$('[data-finish-module]',dialog).forEach(button=>button.onclick=()=>finishModule(module));
    $$('.clinicalCheck123',dialog).forEach(form=>form.onsubmit=event=>gradeCheck(event,module));
    const content=$('.clinicalTextbook123',dialog);content.addEventListener('scroll',()=>updateReadProgress(content));
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)markSection(entry.target.dataset.section)}),{root:content,threshold:.45});
    $$('.clinicalTextSection123',dialog).forEach(section=>observer.observe(section));
    markSection(module.sections[0]?.id);
    const hash=location.hash.slice(1);if(hash&&module.sections.some(x=>x.id===hash))setTimeout(()=>goSection(hash),0);
  }
  function updateReadProgress(content){const max=content.scrollHeight-content.clientHeight,pct=max?content.scrollTop/max*100:100;$('.clinicalReadProgress123 i').style.width=`${pct}%`}
  async function recordOpen(slug){const current=state.progress.get(slug)||{viewed_sections:[],attempted_checks:[]};current.opened_at=current.opened_at||new Date().toISOString();current.last_studied_at=new Date().toISOString();state.progress.set(slug,current);writeLocal();await saveProgress(slug,current)}
  async function recordTime(){if(!state.active||!state.startedAt)return;const p=state.progress.get(state.active.slug)||{},seconds=Math.max(0,Math.round((Date.now()-state.startedAt)/1000));p.time_spent_seconds=(p.time_spent_seconds||0)+seconds;p.last_studied_at=new Date().toISOString();state.progress.set(state.active.slug,p);writeLocal();await saveProgress(state.active.slug,p)}
  async function markSection(id){if(!state.active)return;const p=state.progress.get(state.active.slug)||{viewed_sections:[],attempted_checks:[]},viewed=new Set(p.viewed_sections||[]);viewed.add(id);p.viewed_sections=[...viewed];p.last_section_id=id;p.last_studied_at=new Date().toISOString();state.progress.set(state.active.slug,p);writeLocal();$$('[data-toc]').forEach(x=>x.classList.toggle('active',x.dataset.toc===id));saveProgress(state.active.slug,p)}
  async function saveProgress(slug,p){
    const sb=window.btvSupabase;if(!state.user||!sb?.from)return;
    const payload={user_id:state.user.id,module_slug:slug,viewed_sections:p.viewed_sections||[],attempted_checks:p.attempted_checks||[],time_spent_seconds:p.time_spent_seconds||0,last_section_id:p.last_section_id||null,last_studied_at:p.last_studied_at||new Date().toISOString(),completed_at:p.completed_at||null,confidence_rating:p.confidence_rating||null};
    const result=await sb.from('btv_clinical_progress').upsert(payload,{onConflict:'user_id,module_slug'});if(result.error)console.warn('Clinical progress remains saved on this device:',result.error.message)
  }
  async function gradeCheck(event,module){
    event.preventDefault();const form=event.currentTarget,check=module.knowledgeChecks.find(x=>x.id===form.dataset.check),answer=new FormData(form).get('answer')||'',correct=String(answer).trim().toLowerCase()===String(check.answer).trim().toLowerCase(),feedback=$('.clinicalFeedback123',form);
    feedback.className=`clinicalFeedback123 ${correct?'correct':'incorrect'}`;
    const alternative=check.incorrectExplanations?.[answer];
    feedback.innerHTML=`<b>${correct?'Correct':'Review this answer'}</b><p>${esc(correct?check.explanation:(alternative||check.explanation))}</p>${correct?'':`<p><b>Best answer:</b> ${esc(check.answer)}</p>`}`;
    const p=state.progress.get(module.slug)||{viewed_sections:[],attempted_checks:[]},attempted=new Set(p.attempted_checks||[]);attempted.add(check.id);p.attempted_checks=[...attempted];p.correct_checks=(p.correct_checks||0)+(correct?1:0);state.progress.set(module.slug,p);writeLocal();saveProgress(module.slug,p);
    if(state.user&&window.btvSupabase?.from)window.btvSupabase.from('btv_clinical_check_attempts').insert({user_id:state.user.id,module_slug:module.slug,check_id:check.id,answer:String(answer),is_correct:correct});
  }
  async function finishModule(module){
    const p=state.progress.get(module.slug)||{viewed_sections:[],attempted_checks:[]},requiredSections=module.sections.map(x=>x.id),requiredChecks=(module.knowledgeChecks||[]).map(x=>x.id),viewed=new Set(p.viewed_sections||[]),attempted=new Set(p.attempted_checks||[]);
    const missingSections=requiredSections.filter(x=>!viewed.has(x)),missingChecks=requiredChecks.filter(x=>!attempted.has(x));
    if(missingSections.length||missingChecks.length){toast(`Complete ${missingSections.length} section${missingSections.length===1?'':'s'} and ${missingChecks.length} knowledge check${missingChecks.length===1?'':'s'} first`);return}
    p.completed_at=new Date().toISOString();p.last_studied_at=p.completed_at;state.progress.set(module.slug,p);writeLocal();await saveProgress(module.slug,p);toast('Module completed');closeModule();render();
  }
  async function toggleBookmark(slug){
    const active=state.bookmarks.has(slug);active?state.bookmarks.delete(slug):state.bookmarks.add(slug);writeLocal();
    if(state.user&&window.btvSupabase?.from){const query=window.btvSupabase.from('btv_clinical_bookmarks');active?await query.delete().eq('user_id',state.user.id).eq('module_slug',slug):await query.insert({user_id:state.user.id,module_slug:slug})}
  }
  async function saveNote(slug,sectionId,note){
    const key=`${slug}:${sectionId}`;state.notes.set(key,note);writeLocal();
    if(state.user&&window.btvSupabase?.from)await window.btvSupabase.from('btv_clinical_notes').upsert({user_id:state.user.id,module_slug:slug,section_id:sectionId,note},{onConflict:'user_id,module_slug,section_id'});
    toast('Note saved');
  }
  function updateUrl(slug){history.replaceState({clinicalModule:slug},'',`/clinical-learning/${slug}${location.hash||''}`)}
  function toast(message){const node=$('#toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2500)}
  async function render(){
    const root=$('#learningCentre');if(!root)return;root.innerHTML=dashboardMarkup();bindDashboard(root);loadResources();
  }
  async function init(){
    hydrateLocal();await hydrateRemote();await render();
    let dialog=$('#clinicalModuleDialog123');if(!dialog){dialog=document.createElement('dialog');dialog.id='clinicalModuleDialog123';dialog.className='clinicalModuleDialog123';dialog.setAttribute('aria-labelledby','clinicalModalTitle123');document.body.append(dialog)}
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeModule()});document.addEventListener('keydown',trap);
    const match=location.pathname.match(/^\/clinical-learning\/([a-z0-9-]+)\/?$/);if(match)setTimeout(()=>openModule(match[1]),0);
  }
  window.BTVClinicalHub={init,open:openModule,render};
})();
