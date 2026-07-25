(()=>{
  'use strict';
  if(window.__btvAdminClinicalModulesV123)return;window.__btvAdminClinicalModulesV123=true;
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const sb=()=>window.btvSupabase;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let modules=[],active=null;
  function build(){
    const tab=$('#clinicalLibraryAdminBody');if(!tab||$('#clinicalModuleAdmin123'))return;
    tab.insertAdjacentHTML('afterbegin',`<section id="clinicalModuleAdmin123" class="clinicalAdmin123">
      <header><div><small>STRUCTURED CLINICAL TEXTBOOK</small><h3>Clinical module governance</h3><p>Create structured modules, preview changes and manage clinical review and publication independently from uploaded documents.</p></div><button type="button" data-new-clinical>New module</button></header>
      <div class="clinicalAdminGrid123"><aside><div class="clinicalAdminTools123"><input type="search" data-module-search placeholder="Search modules"><button type="button" data-refresh-clinical>Refresh</button></div><div data-clinical-rows><p>Open this tab to load structured modules.</p></div></aside><section data-clinical-editor><p class="clinicalAdminEmpty123">Select a module or create a draft.</p></section></div>
    </section>`);
    $('[data-new-clinical]').onclick=()=>edit(blank());
    $('[data-refresh-clinical]').onclick=load;
    $('[data-module-search]').oninput=draw;
    load();
  }
  const blank=()=>({slug:'',title:'',subtitle:'',summary:'',category:'Patient assessment',difficulty:'beginner',estimated_minutes:45,icon:'CLINICAL',tags:[],version:'1.0.0',status:'draft',clinical_review_status:'awaiting_clinical_review',reviewer_name:'',reviewer_role:'',reviewed_at:'',next_review_at:'',review_notes:'',content:{sections:[],caseStudies:[],knowledgeChecks:[],keyTakeaways:[],references:[]}});
  async function load(){
    const rows=$('[data-clinical-rows]');if(!rows)return;rows.innerHTML='<p>Loading structured modules…</p>';
    const result=await sb().from('btv_clinical_modules').select('*').order('sort_order');
    if(result.error){rows.innerHTML=`<p class="status103 bad">Structured module storage is not available yet. Apply migration 202607240017 before publishing. ${esc(result.error.message)}</p>`;return}
    modules=result.data||[];draw();
  }
  function draw(){
    const host=$('[data-clinical-rows]');if(!host)return;
    const query=String($('[data-module-search]')?.value||'').toLowerCase();
    const visible=modules.filter(module=>`${module.title} ${module.slug} ${module.category}`.toLowerCase().includes(query));
    host.innerHTML=visible.map(module=>`<button type="button" class="clinicalAdminRow123 ${active?.id===module.id?'active':''}" data-edit-clinical="${module.id}"><b>${esc(module.title)}</b><span>${esc(module.category)} · ${esc(module.status)}</span><small>${esc(module.clinical_review_status.replaceAll('_',' '))} · v${esc(module.version)}</small></button>`).join('')||'<p>No modules match this search.</p>';
    $$('[data-edit-clinical]',host).forEach(button=>button.onclick=()=>edit(modules.find(module=>module.id===button.dataset.editClinical)));
  }
  function edit(module){
    active=structuredClone(module);draw();const host=$('[data-clinical-editor]');
    host.innerHTML=`<form class="clinicalModuleForm123" data-clinical-form>
      <div class="clinicalFormHead123"><div><small>${active.id?'EDIT MODULE':'NEW DRAFT'}</small><h3>${esc(active.title||'Untitled clinical module')}</h3></div><div><button type="button" data-preview-clinical>Preview JSON</button><button type="submit">Save draft</button></div></div>
      <div class="clinicalFields123">
        <label>Title<input name="title" required maxlength="160" value="${esc(active.title)}"></label><label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="${esc(active.slug)}"></label>
        <label class="wide">Subtitle<input name="subtitle" required value="${esc(active.subtitle)}"></label><label class="wide">Summary<textarea name="summary" rows="3" required>${esc(active.summary)}</textarea></label>
        <label>Category<input name="category" required value="${esc(active.category)}"></label><label>Difficulty<select name="difficulty">${['beginner','intermediate','advanced'].map(x=>`<option ${active.difficulty===x?'selected':''}>${x}</option>`).join('')}</select></label>
        <label>Study time (minutes)<input name="estimated_minutes" type="number" min="5" max="600" required value="${active.estimated_minutes}"></label><label>Icon label<input name="icon" maxlength="20" required value="${esc(active.icon)}"></label>
        <label>Version<input name="version" required value="${esc(active.version)}"></label><label>Tags (comma separated)<input name="tags" value="${esc((active.tags||[]).join(', '))}"></label>
        <label>Workflow status<select name="status">${['draft','published','unpublished','archived'].map(x=>`<option ${active.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
        <label>Clinical review status<select name="clinical_review_status">${['awaiting_clinical_review','in_clinical_review','changes_requested','clinically_reviewed','review_expired'].map(x=>`<option ${active.clinical_review_status===x?'selected':''}>${x.replaceAll('_',' ')}</option>`).join('')}</select></label>
        <label>Reviewer name<input name="reviewer_name" value="${esc(active.reviewer_name||'')}"></label><label>Reviewer role<input name="reviewer_role" value="${esc(active.reviewer_role||'')}"></label>
        <label>Reviewed at<input name="reviewed_at" type="datetime-local" value="${dateValue(active.reviewed_at)}"></label><label>Next review at<input name="next_review_at" type="datetime-local" value="${dateValue(active.next_review_at)}"></label>
        <label class="wide">Review notes<textarea name="review_notes" rows="3">${esc(active.review_notes||'')}</textarea></label>
        <label class="wide">Structured module content (JSON)<textarea class="clinicalJson123" name="content" rows="24" spellcheck="false" required>${esc(JSON.stringify(active.content||{},null,2))}</textarea></label>
      </div>
      <div class="clinicalPublish123"><p>Publishing controls learner visibility. A module can only display as clinically reviewed when reviewer name, role and review date are recorded.</p><div><button type="button" data-workflow="in_clinical_review">Submit for review</button><button type="button" data-workflow="published">Publish</button><button type="button" data-workflow="unpublished">Unpublish</button><button type="button" data-workflow="archived">Archive</button></div></div>
      <p data-clinical-status role="status"></p><details><summary>Version and change history</summary><div data-clinical-history>Save this module to view its history.</div></details>
    </form>`;
    $('[data-clinical-form]').onsubmit=save;
    $('[data-preview-clinical]').onclick=preview;
    $$('[data-workflow]').forEach(button=>button.onclick=()=>workflow(button.dataset.workflow));
    if(active.id)history(active.id);
  }
  const dateValue=value=>value?new Date(value).toISOString().slice(0,16):'';
  function payload(){
    const form=$('[data-clinical-form]'),data=new FormData(form);let content;
    try{content=JSON.parse(String(data.get('content')))}catch{throw Error('Structured content must be valid JSON.')}
    if(!Array.isArray(content.sections)||!content.sections.length)throw Error('Structured content must contain at least one section.');
    const review=String(data.get('clinical_review_status')),reviewer=String(data.get('reviewer_name')).trim(),role=String(data.get('reviewer_role')).trim(),reviewed=data.get('reviewed_at');
    if(review==='clinically_reviewed'&&(!reviewer||!role||!reviewed))throw Error('Clinically reviewed modules require reviewer name, role and review date.');
    return{slug:String(data.get('slug')).trim(),title:String(data.get('title')).trim(),subtitle:String(data.get('subtitle')).trim(),summary:String(data.get('summary')).trim(),category:String(data.get('category')).trim(),difficulty:String(data.get('difficulty')),estimated_minutes:Number(data.get('estimated_minutes')),icon:String(data.get('icon')).trim(),tags:String(data.get('tags')).split(',').map(x=>x.trim()).filter(Boolean),version:String(data.get('version')).trim(),status:String(data.get('status')),clinical_review_status:review,reviewer_name:reviewer||null,reviewer_role:role||null,reviewed_at:reviewed?new Date(String(reviewed)).toISOString():null,next_review_at:data.get('next_review_at')?new Date(String(data.get('next_review_at'))).toISOString():null,review_notes:String(data.get('review_notes')).trim()||null,content};
  }
  async function save(event){
    event.preventDefault();const status=$('[data-clinical-status]');
    try{const value=payload(),user=(await sb().auth.getUser()).data.user;value.updated_by=user?.id||null;if(!active.id)value.created_by=user?.id||null;status.textContent='Saving…';const query=active.id?sb().from('btv_clinical_modules').update(value).eq('id',active.id).select().single():sb().from('btv_clinical_modules').insert(value).select().single();const result=await query;if(result.error)throw result.error;active=result.data;status.className='status103 good';status.textContent='Structured module saved.';await load();edit(active)}
    catch(error){status.className='status103 bad';status.textContent=error.message}
  }
  async function workflow(next){
    const form=$('[data-clinical-form]');
    if(next==='in_clinical_review')form.elements.clinical_review_status.value='in_clinical_review';else form.elements.status.value=next;
    form.requestSubmit();
  }
  function preview(){
    try{const value=payload(),windowRef=window.open('','clinical-module-preview');if(!windowRef)throw Error('Allow pop-ups to preview this module.');windowRef.opener=null;windowRef.document.write(`<title>${esc(value.title)} preview</title><pre style="white-space:pre-wrap;font:14px/1.55 system-ui;padding:30px">${esc(JSON.stringify(value,null,2))}</pre>`);windowRef.document.close()}
    catch(error){$('[data-clinical-status]').textContent=error.message}
  }
  async function history(id){
    const host=$('[data-clinical-history]'),result=await sb().from('btv_clinical_module_versions').select('version,action,change_summary,created_at').eq('module_id',id).order('created_at',{ascending:false}).limit(30);
    host.innerHTML=result.error?`<p>${esc(result.error.message)}</p>`:(result.data||[]).map(item=>`<p><b>${esc(item.action)}</b> · v${esc(item.version)} · ${new Date(item.created_at).toLocaleString()}<br><span>${esc(item.change_summary||'Snapshot recorded automatically.')}</span></p>`).join('')||'<p>No changes recorded yet.</p>';
  }
  new MutationObserver(build).observe(document.documentElement,{childList:true,subtree:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',build,{once:true}):build();
})();
