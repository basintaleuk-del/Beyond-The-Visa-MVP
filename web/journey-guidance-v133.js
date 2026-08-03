(()=>{
  'use strict';
  if(window.__btvJourneyGuidance133)return;
  window.__btvJourneyGuidance133=true;

  const db=()=>window.btvSupabase;
  const countries={uk:'United Kingdom',us:'United States',au:'Australia',ca:'Canada',nz:'New Zealand',ie:'Ireland',ae:'United Arab Emirates',sa:'Saudi Arabia'};
  const statuses={
    not_started:'Not started',in_progress:'In progress',waiting_for_documents:'Waiting for documents',submitted:'Submitted',
    awaiting_decision:'Awaiting decision',action_required:'Action required',completed:'Completed',not_applicable:'Not applicable'
  };
  const state={user:null,profile:null,steps:[],resources:[],progress:[],checklist:[],loaded:false,loading:null,activeCode:null,returnFocus:null};
  let celebrationLoading=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const arr=value=>Array.isArray(value)?value:[];
  const profession=value=>String(value||'').toLowerCase().includes('midwi')?'midwife':'nurse';
  const date=value=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'';
  const safeUrl=value=>{try{const parsed=new URL(value);return parsed.protocol==='https:'?parsed.href:null}catch{return null}};
  const message=(text)=>window.toast?.(text)||console.info(text);
  const friendly=error=>{
    console.warn('Journey Guidance',error);
    if(!navigator.onLine)return 'You appear to be offline. Reconnect and try again.';
    if(String(error?.message||'').includes('relation'))return 'Detailed guidance is being prepared. Your existing journey progress is safe.';
    return 'We could not load this journey information. Please try again.';
  };

  function applicable(step){
    const roles=arr(step.applicable_professions);
    return !roles.length||roles.includes(profession(state.profile?.profession));
  }
  function progressFor(code){return state.progress.find(item=>item.step_code===code)||{step_code:code,status:'not_started',completed:false}}
  function checklistFor(code){return state.checklist.filter(item=>item.step_code===code)}
  function visibleSteps(){return state.steps.filter(applicable).sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title))}
  function summary(){
    const required=visibleSteps().filter(step=>step.is_required!==false);
    const completed=required.filter(step=>progressFor(step.code).status==='completed'||progressFor(step.code).completed===true);
    return {required,completed,total:required.length,done:completed.length,pct:required.length?Math.round(completed.length*100/required.length):0};
  }
  const isCompleted=item=>item?.status==='completed'||item?.completed===true;
  function celebrationKey(step){
    const destination=state.profile?.destination_country||state.profile?.destination||'unknown';
    return `btv:journey-step-celebrated:${state.user?.id||'anonymous'}:${destination}:${step.code}`;
  }
  async function celebrateStepCompletion(step,before,after){
    if(isCompleted(before)||!isCompleted(after))return false;
    const key=celebrationKey(step);
    try{if(localStorage.getItem(key)==='1')return false}catch{}
    if(celebrationLoading)return celebrationLoading;
    celebrationLoading=import('./journey-celebration-v137.js?v=137').then(module=>{
      try{localStorage.setItem(key,'1')}catch{}
      module.showJourneyCelebration();return true;
    }).catch(error=>{console.warn('Journey celebration unavailable',error);return false}).finally(()=>{celebrationLoading=null});
    return celebrationLoading;
  }
  function upcoming(){
    const now=Date.now(),limit=now+45*86400000;
    return state.progress.flatMap(item=>[
      item.reminder_at&&{code:item.step_code,label:item.reminder_kind||'Reminder',value:item.reminder_at},
      item.expected_decision_date&&{code:item.step_code,label:'Expected decision',value:item.expected_decision_date},
      item.exam_date&&{code:item.step_code,label:'Exam',value:item.exam_date},
      item.expiry_date&&{code:item.step_code,label:'Expiry',value:item.expiry_date}
    ].filter(Boolean)).filter(item=>{const time=new Date(item.value).getTime();return time>=now&&time<=limit}).sort((a,b)=>new Date(a.value)-new Date(b.value));
  }
  function dashboardStats(){
    const codes=new Set(visibleSteps().map(step=>step.code));
    const rows=state.progress.filter(item=>codes.has(item.step_code));
    return {
      tracked:rows.filter(item=>(item.status||'not_started')!=='not_started'||item.completed===true).length,
      submitted:rows.filter(item=>['submitted','awaiting_decision','completed'].includes(item.status)||item.completed===true).length,
      deadlines:upcoming().length
    };
  }
  const dashboardIcon=name=>({
    tracked:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c-2.3 0-4-1.8-4-4.2 0-2.6 2.2-6.5 4-9.8 1.8 3.3 4 7.2 4 9.8C10 17.2 8.3 19 6 19Zm12 0c-2.3 0-4-1.8-4-4.2 0-2.6 2.2-6.5 4-9.8 1.8 3.3 4 7.2 4 9.8 0 2.4-1.7 4.2-4 4.2Z"/></svg>',
    submitted:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 15h8M8 11h2M11 18l-2-2-2 2"/></svg>',
    deadlines:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M14 14h2M8 17h2"/></svg>',
    tip:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M8.7 15.5A7 7 0 1 1 15.3 15.5c-.8.7-1.3 1.5-1.3 2.5h-4c0-1-.5-1.8-1.3-2.5Z"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>'
  }[name]||'');
  function journeyArt(destination){
    if(destination==='uk')return '<svg class="jgLandmark" viewBox="0 0 250 240" aria-hidden="true"><path d="M0 218h250v22H0zM28 218v-38h20v38m18 0v-62h20v62m92 0v-36h24v36m18 0v-54h18v54"/><path d="M117 218V83h43v135M125 83l13-43 14 43M130 111h17v28h-17zM135 10h7v30h-7z"/><circle cx="139" cy="156" r="13"/><path d="M139 148v8l6 4M109 218h59"/><circle cx="67" cy="205" r="43" fill="none"/><path d="M67 162v86M24 205h86M37 175l60 60M97 175l-60 60" fill="none"/></svg>';
    return '<svg class="jgLandmark" viewBox="0 0 250 240" aria-hidden="true"><circle cx="146" cy="112" r="74" fill="none"/><path d="M72 112h148M146 38c27 25 40 50 40 74s-13 49-40 74c-27-25-40-50-40-74s13-49 40-74ZM94 65c30 16 74 16 104 0M94 159c30-16 74-16 104 0" fill="none"/><path d="M31 213c38-51 73-72 106-62 28 8 46 33 79 16" fill="none"/><path d="m212 157 11 16-19 4"/></svg>';
  }

  async function load(force=false){
    if(state.loading)return state.loading;
    if(state.loaded&&!force)return state;
    state.loading=(async()=>{
      if(!db()?.auth)throw new Error('Account service unavailable');
      const {data:{user}}=await db().auth.getUser();
      if(!user)throw new Error('Sign in to view your journey');
      const profileResult=await db().from('profiles').select('destination_country,destination,profession').eq('id',user.id).maybeSingle();
      if(profileResult.error)throw profileResult.error;
      const profile=profileResult.data||{};
      const destination=profile.destination_country||profile.destination;
      if(!destination){state.user=user;state.profile=profile;state.steps=[];state.loaded=true;return state}
      const [stepsResult,progressResult,checklistResult]=await Promise.all([
        db().from('btv_journey_steps').select('*').eq('destination',destination).eq('is_active',true).eq('is_archived',false).order('sort_order'),
        db().from('btv_user_journey_progress').select('*').eq('user_id',user.id),
        db().from('btv_user_journey_checklist_items').select('*').eq('user_id',user.id)
      ]);
      if(stepsResult.error)throw stepsResult.error;if(progressResult.error)throw progressResult.error;
      const steps=stepsResult.data||[],codes=steps.map(step=>step.code);
      let resources=[];
      if(codes.length){const result=await db().from('btv_journey_step_resources').select('*').in('step_code',codes).eq('is_active',true).order('sort_order');if(!result.error)resources=result.data||[]}
      state.user=user;state.profile={...profile,destination_country:destination};state.steps=steps;state.progress=progressResult.data||[];
      state.checklist=checklistResult.error?[]:checklistResult.data||[];state.resources=resources;state.loaded=true;
      return state;
    })().finally(()=>{state.loading=null});
    return state.loading;
  }

  function statusBadge(progress){const key=progress.status||(progress.completed?'completed':'not_started');return `<span class="jgStatus jgStatus-${esc(key)}">${esc(statuses[key]||'Not started')}</span>`}
  function deadline(step,progress){
    const pairs=[['Expiry',progress.expiry_date],['Exam',progress.exam_date],['Decision',progress.expected_decision_date],['Reminder',progress.reminder_at]].filter(([,value])=>value);
    if(pairs.length){const [label,value]=pairs.sort((a,b)=>new Date(a[1])-new Date(b[1]))[0];return `<span class="jgDeadline">${esc(label)}: ${esc(date(value))}</span>`}
    return step.deadline_warning?`<span class="jgDeadline">${esc(step.deadline_warning)}</span>`:'';
  }
  function tile(step,index){
    const progress=progressFor(step.code),complete=progress.status==='completed'||progress.completed===true;
    return `<article class="jgTile ${complete?'is-complete':''}" data-guidance-step="${esc(step.code)}" tabindex="0" role="button" aria-label="View full guidance for ${esc(step.title)}">
      <div class="jgStepNumber" aria-hidden="true">${complete?'✓':index+1}</div><div class="jgTileBody">
        <div class="jgTileTop"><div><small>STEP ${index+1}</small><h3>${esc(step.title)}</h3></div>${statusBadge(progress)}</div>
        <p>${esc(step.short_summary||step.description||'Open this step for complete guidance.')}</p>
        <div class="jgMeta"><span>${step.is_required===false?'Optional':'Mandatory'}</span><span>${esc(step.preparation_time||'Time varies')}</span>${deadline(step,progress)}</div>
        <button type="button" data-open-guidance="${esc(step.code)}">View Full Guidance <span aria-hidden="true">→</span></button>
      </div>
    </article>`;
  }
  function deadlinePanel(){const items=upcoming();return `<section class="jgDeadlines" aria-labelledby="jg-deadlines-title"><header><span class="jgDeadlineIcon">${dashboardIcon('calendar')}</span><h3 id="jg-deadlines-title">Approaching dates</h3><a href="#jg-journey-steps">View all <span aria-hidden="true">→</span></a></header><div class="jgDeadlineRows">${items.length?items.map(item=>{const step=state.steps.find(row=>row.code===item.code);return `<button type="button" data-open-guidance="${esc(item.code)}"><span>${esc(item.label)}</span><b>${esc(step?.title||item.code)}</b><time>${esc(date(item.value))}</time></button>`}).join(''):'<p>No approaching dates are saved yet. Add a date inside a journey step when you are ready.</p>'}</div></section>`}
  function pageMarkup(){
    if(!state.profile?.destination_country)return `<div class="jgState"><h3>Choose your destination</h3><p>Select a destination to receive the correct professional and immigration journey.</p><button type="button" data-change-destination>Choose destination</button></div>`;
    const steps=visibleSteps(),totals=summary();
    if(!steps.length)return `<div class="jgState"><h3>Guidance is under review</h3><p>No published ${esc(profession(state.profile?.profession))} guidance is available for ${esc(countries[state.profile.destination_country]||state.profile.destination_country)} yet.</p><button type="button" data-change-destination>Change My Destination</button></div>`;
    const stats=dashboardStats(),destination=state.profile.destination_country,destinationName=countries[destination]||destination;
    return `<section class="jgJourney" aria-labelledby="jg-title">
      <section class="jgProgressHero" aria-labelledby="jg-progress-title"><div><h2 id="jg-progress-title">${totals.done} of ${totals.total} complete</h2><p>${totals.pct===100?'Your pathway is complete.':totals.done?'You’re on your way!':'Start with your first journey step.'}</p><div class="jgProgress" role="progressbar" aria-label="Required journey progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${totals.pct}"><i style="width:${totals.pct}%"></i></div><strong><b>${totals.pct}%</b> completed</strong></div><svg class="jgTravelArt" viewBox="0 0 320 220" aria-hidden="true"><circle cx="214" cy="96" r="88"/><path d="M126 96h176M214 8c32 31 48 60 48 88s-16 57-48 88c-32-31-48-60-48-88s16-57 48-88ZM151 38c40 24 86 24 126 0M151 154c40-24 86-24 126 0"/><path d="M24 187c56-65 109-91 158-77 37 10 58 45 103 20" class="jgRoute"/><path d="m276 118 18 10-15 15" class="jgRoute"/><path d="M285 50c0 18-23 40-23 40s-23-22-23-40a23 23 0 1 1 46 0Z"/><circle cx="262" cy="50" r="7"/></svg></section>
      <div class="jgDashboardStats"><article><span>${dashboardIcon('tracked')}</span><small>Tracked</small><b>${stats.tracked}</b></article><article><span>${dashboardIcon('submitted')}</span><small>Submitted+</small><b>${stats.submitted}</b></article><article><span>${dashboardIcon('deadlines')}</span><small>Deadlines</small><b>${stats.deadlines}</b></article></div>
      <div class="jgPlannerTip"><span>${dashboardIcon('tip')}</span><p><b>Add a deadline inside any journey step</b> to build your planner and never miss a date.</p></div>
      <div class="jgOverviewGrid"><div class="jgHero"><div><small>MY JOURNEY</small><h2 id="jg-title">Your ${esc(destinationName)} pathway</h2><p>${totals.done} of ${totals.total} required steps completed — ${totals.pct}%</p></div><button type="button" data-change-destination>Change My Destination <span aria-hidden="true">→</span></button>${journeyArt(destination)}
        <div class="jgProgress" role="progressbar" aria-label="Required journey progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${totals.pct}"><i style="width:${totals.pct}%"></i></div>
      </div>${deadlinePanel()}</div><div class="jgNotice">Requirements, fees and processing times may change. Always confirm the latest information using the linked official authority before submitting an application or making payment.</div>
      <div class="jgTiles" id="jg-journey-steps">${steps.map(tile).join('')}</div>
    </section>`;
  }
  function bindPage(root){
    root.querySelectorAll('[data-open-guidance]').forEach(button=>button.onclick=event=>{event.stopPropagation();openModal(button.dataset.openGuidance,button)});
    root.querySelectorAll('[data-guidance-step]').forEach(card=>{card.onclick=()=>openModal(card.dataset.guidanceStep,card);card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openModal(card.dataset.guidanceStep,card)}}});
    root.querySelectorAll('[data-change-destination]').forEach(button=>button.onclick=()=>{document.getElementById('platformHubV72')?.setAttribute('hidden','');const picker=document.querySelector('[data-open="countries"]');if(picker)picker.click();else message('Open Destination from the home page to change your country.')});
  }
  async function renderHub(){
    const root=document.querySelector('#platformHubV72 .hubContent');if(!root)return;
    root.innerHTML='<div class="jgState" aria-live="polite">Loading your journey…</div>';
    try{await load(true);root.innerHTML=pageMarkup();bindPage(root)}catch(error){root.innerHTML=`<div class="jgState"><h3>Journey unavailable</h3><p>${esc(friendly(error))}</p><button type="button" data-retry-journey>Try again</button></div>`;root.querySelector('button').onclick=renderHub}
  }
  async function renderChecklistSurface(){
    const root=document.getElementById('checklistItems');if(!root)return;
    root.innerHTML='<div class="jgState">Loading your saved journey…</div>';
    try{await load(true);root.classList.add('jgChecklistSurface');document.getElementById('checklist')?.classList.add('journeyDashboard136');root.innerHTML=pageMarkup();bindPage(root)}catch(error){root.innerHTML=`<div class="jgState"><h3>Journey unavailable</h3><p>${esc(friendly(error))}</p></div>`}
  }

  function listSection(title,items,empty='No additional items are listed for this step.'){
    const itemMarkup=item=>{
      if(typeof item==='string')return `<li>${esc(item)}</li>`;
      const heading=item.title||item.label||'',description=item.description||item.detail||'';
      return `<li>${heading?`<b>${esc(heading)}</b>`:''}${description?`<p>${esc(description)}</p>`:''}</li>`;
    };
    return `<details class="jgSection" open><summary>${esc(title)}</summary><div>${arr(items).length?`<ol class="jgDetailedList">${arr(items).map(itemMarkup).join('')}</ol>`:`<p>${esc(empty)}</p>`}</div></details>`;
  }
  function resourceCards(step){
    const rows=state.resources.filter(item=>item.step_code===step.code&&safeUrl(item.url));
    return rows.length?rows.map(item=>`<a class="jgResource" href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer"><span><small>${item.is_official?'OFFICIAL SOURCE':esc(item.resource_type||'RESOURCE')}</small><b>${esc(item.title)}</b><p>${esc(item.description||'Open this resource in a new tab.')}</p><em>${esc(countries[item.destination]||item.destination)} · Last reviewed ${esc(date(item.last_reviewed_at)||'date pending')}</em></span><i aria-hidden="true">↗</i></a>`).join(''):'<p>No reviewed resources are currently available for this step.</p>';
  }
  function costMarkup(step){
    const hasCost=step.estimated_cost_min!=null||step.estimated_cost_max!=null;
    const amount=hasCost?`${esc(step.currency||'')} ${Number(step.estimated_cost_min||0).toLocaleString()}${step.estimated_cost_max!=null?`–${Number(step.estimated_cost_max).toLocaleString()}`:''}`:'Fee not verified in Beyond the Visa';
    const url=safeUrl(step.official_fee_url||step.official_url);
    return `<div class="jgCost"><b>${amount}</b><p>Estimate only. Fees can change and may exclude tests, translations, travel or third-party verification.</p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Check current official fee <span aria-hidden="true">↗</span></a>`:''}</div>`;
  }
  function checklistMarkup(step){
    const saved=new Map(checklistFor(step.code).map(item=>[item.item_code,item]));
    return arr(step.personal_checklist).map((item,index)=>{const code=item.code||`item_${index}`,row=saved.get(code);return `<label class="jgCheck"><input type="checkbox" data-check-code="${esc(code)}" ${row?.checked?'checked':''}><span>${esc(item.label||item)}</span></label>`}).join('')||'<p>No personal checklist is configured.</p>';
  }
  function detailsForm(step,progress){
    return `<section class="jgPersonal" aria-labelledby="jg-personal-title"><h3 id="jg-personal-title">Your private progress</h3><p>These details are visible only in your account.</p>
      <div class="jgFormGrid"><label>Status<select data-progress="status">${Object.entries(statuses).map(([value,label])=>`<option value="${value}" ${value===(progress.status||'not_started')?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>Application reference<input data-progress="application_reference" maxlength="300" value="${esc(progress.application_reference||'')}"></label>
      <label>Submission date<input data-progress="submission_date" type="date" value="${esc(progress.submission_date||'')}"></label>
      <label>Expected decision<input data-progress="expected_decision_date" type="date" value="${esc(progress.expected_decision_date||'')}"></label>
      <label>Exam date<input data-progress="exam_date" type="datetime-local" value="${progress.exam_date?esc(new Date(progress.exam_date).toISOString().slice(0,16)):''}"></label>
      <label>Expiry date<input data-progress="expiry_date" type="date" value="${esc(progress.expiry_date||'')}"></label>
      <label>Reminder<input data-progress="reminder_at" type="datetime-local" value="${progress.reminder_at?esc(new Date(progress.reminder_at).toISOString().slice(0,16)):''}"></label>
      <label>Reminder type<input data-progress="reminder_kind" maxlength="100" value="${esc(progress.reminder_kind||'')}"></label></div>
      <label>Supporting document reference<input data-progress="supporting_document_reference" maxlength="500" value="${esc(progress.supporting_document_reference||'')}"></label>
      <label>Personal notes<textarea data-progress="notes" maxlength="10000" rows="4">${esc(progress.notes||'')}</textarea></label><button type="button" data-save-progress>Save private progress</button>
    </section>`;
  }
  function modalMarkup(step){
    const steps=visibleSteps(),index=steps.findIndex(item=>item.code===step.code),progress=progressFor(step.code),role=profession(state.profile?.profession);
    const next=steps.find(item=>item.code===step.next_step_code)||steps[index+1];
    const reviewed=step.last_reviewed_at?new Date(step.last_reviewed_at):null,stale=reviewed&&Date.now()-reviewed.getTime()>365*86400000;
    return `<article class="jgModalPanel"><header><div><small>${esc(countries[step.destination]||step.destination)} · ${esc(role)}</small><h2 id="jg-modal-title">${esc(step.title)}</h2><div class="jgModalMeta">${statusBadge(progress)}<span>${step.is_required===false?'Optional':'Mandatory'}</span><span>Version ${esc(step.content_version||1)}</span></div></div><button type="button" class="jgModalClose" data-close-guidance aria-label="Close journey guidance">×</button></header>
      <div class="jgModalScroll"><div class="jgReview ${stale?'is-stale':''}"><b>${stale?'Review recommended':'Guidance reviewed'}</b><span>Last reviewed ${esc(date(step.last_reviewed_at)||'date pending')} by ${esc(step.reviewed_by||'reviewer pending')}.</span></div>
      <section class="jgOverview"><h3>Overview</h3><p>${esc(step.overview||step.description||'Detailed guidance is being prepared.')}</p><dl><div><dt>Why required</dt><dd>${esc(step.why_required||'Confirm with the linked authority.')}</dd></div><div><dt>When to complete</dt><dd>${esc(step.stage_timing||'Confirm the correct order with the authority.')}</dd></div><div><dt>Before arrival?</dt><dd>${step.can_complete_before_arrival===false?'Usually completed after arrival':'Usually can begin before arrival'}</dd></div><div><dt>${role==='midwife'?'Midwifery':'Nursing'} guidance</dt><dd>${esc(step.profession_guidance?.[role]||'Confirm your professional field with the regulator.')}</dd></div></dl></section>
      ${listSection('What you need to do',step.action_items)}${listSection('Required documents',step.required_documents)}
      <details class="jgSection" open><summary>Estimated cost and processing time</summary><div>${costMarkup(step)}<h4>Preparation</h4><p>${esc(step.preparation_time||'Time varies.')}</p><h4>Processing</h4><p>${esc(step.processing_time||'Processing times may change.')}</p><h4>Possible delays</h4>${arr(step.delay_causes).length?`<ul>${arr(step.delay_causes).map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p>Ask the authority what may delay this application.</p>'}<p>${step.can_progress_in_parallel===false?'Complete this stage before moving on.':'You may be able to continue another step while waiting; confirm dependencies first.'}</p></div></details>
      ${listSection('Common mistakes',step.common_mistakes)}<details class="jgSection" open><summary>Completion criteria</summary><div><blockquote>${esc(step.completion_criteria||'Keep official confirmation before marking this step complete.')}</blockquote></div></details>
      <section class="jgNext"><small>SUGGESTED NEXT STEP</small><h3>${next?esc(next.title):'Journey review'}</h3><p>${step.can_progress_in_parallel===false?'Finish this stage before starting the next dependent step.':'You can prepare the next step while this one is being processed, provided the official authority does not require you to wait.'}</p>${next?`<button type="button" data-open-next-guidance>View ${esc(next.title)}</button>`:''}</section>
      <details class="jgSection" open><summary>Personal checklist</summary><div class="jgChecks">${checklistMarkup(step)}</div></details>
      <details class="jgSection" open><summary>Suggested Materials and Official References</summary><div class="jgResources">${resourceCards(step)}</div></details>
      ${detailsForm(step,progress)}<div class="jgDisclaimer">Beyond the Visa guidance does not replace advice from a regulator, immigration authority or qualified adviser.</div></div>
      <footer><button type="button" data-modal-prev ${index<=0?'disabled':''}>← Previous</button><div><button type="button" class="secondary" data-toggle-complete>${progress.status==='completed'?'Mark incomplete':'Mark step complete'}</button><button type="button" data-modal-next ${index<0||index>=steps.length-1?'disabled':''}>Next step →</button></div></footer></article>`;
  }
  function ensureDialog(){
    let dialog=document.getElementById('journeyGuidanceDialog133');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='journeyGuidanceDialog133';dialog.className='jgDialog';dialog.setAttribute('aria-labelledby','jg-modal-title');document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeModal()});
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeModal()});
    dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')].filter(node=>node.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}});
    return dialog;
  }
  async function openModal(code,origin){
    try{await load();const step=visibleSteps().find(item=>item.code===code);if(!step){message('This step is no longer applicable to your current journey.');return}state.activeCode=code;if(origin)state.returnFocus=origin;const dialog=ensureDialog();dialog.innerHTML=modalMarkup(step);bindModal(dialog,step);if(!dialog.open)dialog.showModal();dialog.querySelector('[data-close-guidance]')?.focus()}catch(error){message(friendly(error))}
  }
  function closeModal(){const dialog=ensureDialog();if(dialog.open)dialog.close();const focus=state.returnFocus;state.returnFocus=null;setTimeout(()=>focus?.isConnected&&focus.focus(),0)}
  function value(dialog,name){const input=dialog.querySelector(`[data-progress="${name}"]`);if(!input?.value)return null;return input.type==='datetime-local'?new Date(input.value).toISOString():input.value.trim()}
  async function saveProgress(dialog,step,statusOverride){
    const before=progressFor(step.code);
    const status=statusOverride||value(dialog,'status')||'not_started';
    const row={user_id:state.user.id,step_code:step.code,status,application_reference:value(dialog,'application_reference'),submission_date:value(dialog,'submission_date'),expected_decision_date:value(dialog,'expected_decision_date'),exam_date:value(dialog,'exam_date'),expiry_date:value(dialog,'expiry_date'),reminder_at:value(dialog,'reminder_at'),reminder_kind:value(dialog,'reminder_kind'),supporting_document_reference:value(dialog,'supporting_document_reference'),notes:value(dialog,'notes'),updated_at:new Date().toISOString()};
    const {data,error}=await db().from('btv_user_journey_progress').upsert(row,{onConflict:'user_id,step_code'}).select().single();
    if(error)throw error;const index=state.progress.findIndex(item=>item.step_code===step.code);if(index>=0)state.progress[index]=data;else state.progress.push(data);
    const totals=summary();
    window.dispatchEvent(new CustomEvent('btv:journey-changed',{detail:{source:'guidance-v133',summary:totals}}));message('Journey progress saved');
    const celebrated=await celebrateStepCompletion(step,before,data);return {data,celebrated};
  }
  async function saveChecklist(step,input){
    const item=arr(step.personal_checklist).find(row=>(row.code||'')===input.dataset.checkCode);if(!item)return;
    const row={user_id:state.user.id,step_code:step.code,item_code:input.dataset.checkCode,label_snapshot:item.label||String(item),checked:input.checked,checked_at:input.checked?new Date().toISOString():null,updated_at:new Date().toISOString()};
    const {data,error}=await db().from('btv_user_journey_checklist_items').upsert(row,{onConflict:'user_id,step_code,item_code'}).select().single();if(error)throw error;
    const index=state.checklist.findIndex(value=>value.step_code===step.code&&value.item_code===row.item_code);if(index>=0)state.checklist[index]=data;else state.checklist.push(data);
  }
  function bindModal(dialog,step){
    dialog.querySelector('[data-close-guidance]').onclick=closeModal;
    dialog.querySelectorAll('[data-check-code]').forEach(input=>input.onchange=async()=>{input.disabled=true;try{await saveChecklist(step,input)}catch(error){input.checked=!input.checked;message('Checklist update failed. Please try again.');console.warn(error)}finally{input.disabled=false}});
    dialog.querySelector('[data-save-progress]').onclick=async event=>{event.currentTarget.disabled=true;try{const {celebrated}=await saveProgress(dialog,step);if(celebrated)closeModal();await refreshSurfaces();if(!celebrated)openModal(step.code)}catch(error){message('Progress update failed. Please try again.');console.warn(error)}finally{event.currentTarget.disabled=false}};
    dialog.querySelector('[data-toggle-complete]').onclick=async event=>{event.currentTarget.disabled=true;try{const current=progressFor(step.code),next=current.status==='completed'?'in_progress':'completed';const {celebrated}=await saveProgress(dialog,step,next);if(celebrated)closeModal();await refreshSurfaces();if(!celebrated)openModal(step.code)}catch(error){message('Progress update failed. Please try again.');console.warn(error)}finally{event.currentTarget.disabled=false}};
    const steps=visibleSteps(),index=steps.findIndex(item=>item.code===step.code);
    dialog.querySelector('[data-modal-prev]').onclick=()=>openModal(steps[index-1]?.code);
    dialog.querySelector('[data-modal-next]').onclick=()=>openModal(steps[index+1]?.code);
    const recommended=steps.find(item=>item.code===step.next_step_code)||steps[index+1];
    const openRecommended=dialog.querySelector('[data-open-next-guidance]');if(openRecommended)openRecommended.onclick=()=>openModal(recommended?.code);
  }
  async function refreshSurfaces(){state.loaded=false;await load(true);if(!document.getElementById('platformHubV72')?.hidden)await renderHub();if(document.getElementById('checklist')?.classList.contains('active'))await renderChecklistSurface()}

  function installPlatformHook(){
    if(!window.BTVPlatform||window.BTVPlatform.__journeyGuidance133)return false;
    const original=window.BTVPlatform.open.bind(window.BTVPlatform);
    window.BTVPlatform.open=async function(name){await original(name);if(name==='journey')await renderHub()};
    window.BTVPlatform.__journeyGuidance133=true;return true;
  }
  const hook=setInterval(()=>{if(installPlatformHook())clearInterval(hook)},100);setTimeout(()=>clearInterval(hook),12000);
  window.renderChecklist=renderChecklistSurface;
  window.addEventListener('btv:destination-changed',()=>{state.loaded=false;if(document.getElementById('checklist')?.classList.contains('active'))renderChecklistSurface()});
  window.addEventListener('online',()=>{state.loaded=false});
  window.BTVJourneyGuidance={load,open:openModal,render:renderHub,summary:()=>summary()};
})();
