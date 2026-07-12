import './admin-inbox-v26.js?v=26';
import './admin-premium-v29.js?v=29';
import './admin-platform-v30.js?v=30.2';
const sb=window.btvSupabase;
const state={profiles:[],cbt:[],nclex:[],editing:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const fmt=d=>d?new Date(d).toLocaleDateString('en-GB'):'—';

async function init(){
  try{
    const {data:{user},error}=await sb.auth.getUser();
    if(error||!user) return deny('Please sign in before opening the admin portal.');
    const {data:profile,error:pe}=await sb.from('profiles').select('*').eq('id',user.id).single();
    if(pe||profile?.role!=='admin') return deny('This account does not have administrator access.');
    $('#adminName').textContent=profile.full_name||user.email||'Administrator';
    $('#guard').hidden=true; $('#app').hidden=false;
    bind(); await loadAll(); window.BTVAdminInbox?.start(); window.BTVAdminPremium?.start();
  }catch(e){deny(e.message||'Unable to open admin portal.');}
}
function deny(msg){$('#guard').innerHTML=`<div style="text-align:center"><h2>Access unavailable</h2><p>${esc(msg)}</p><a href="index.html">Return to Beyond The Visa</a></div>`}
function bind(){
  $$('[data-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.tab,b.textContent));
  $('#logout').onclick=async()=>{await sb.auth.signOut();location.href='index.html'};
  $('#addCbt').onclick=()=>openEditor('cbt'); $('#addNclex').onclick=()=>openEditor('nclex');
  $('#cbtSearch').oninput=renderCbt; $('#nclexSearch').oninput=renderNclex; $('#userSearch').oninput=renderUsers;
  $('#editorForm').addEventListener('submit',saveEditor);
}
function openTab(id,title){$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));$$('.tab').forEach(s=>s.classList.toggle('active',s.id===id));$('#pageTitle').textContent=title.trim();}
async function loadAll(){
  const [profiles,cbt,nclex,ca,ce,na,ne]=await Promise.all([
    sb.from('profiles').select('*').order('created_at',{ascending:false}),
    sb.from('cbt_questions').select('*').order('created_at',{ascending:false}),
    sb.from('nclex_questions').select('*').order('created_at',{ascending:false}),
    sb.from('cbt_attempts').select('id,is_correct',{count:'exact'}),
    sb.from('mock_exam_results').select('percentage',{count:'exact'}),
    sb.from('nclex_attempts').select('id,is_correct',{count:'exact'}),
    sb.from('nclex_exam_results').select('percentage',{count:'exact'})
  ]);
  [profiles,cbt,nclex].forEach(r=>{if(r.error)throw r.error});
  state.profiles=profiles.data||[];state.cbt=cbt.data||[];state.nclex=nclex.data||[];
  renderOverview({ca,ce,na,ne});renderCbt();renderNclex();renderUsers();renderAnalytics({ca,ce,na,ne});
}
function renderOverview(x){
  $('#statUsers').textContent=state.profiles.length;$('#statPremium').textContent=state.profiles.filter(p=>p.account_type==='premium').length;$('#statCbt').textContent=state.cbt.length;$('#statNclex').textContent=state.nclex.length;
  $('#recentUsers').innerHTML=state.profiles.slice(0,6).map(p=>`<div class="listItem"><div><b>${esc(p.full_name||'Unnamed user')}</b><small>${esc(p.profession||'Profession not set')} · ${fmt(p.created_at)}</small></div><span class="pill">${esc(p.account_type||'free')}</span></div>`).join('')||'<p>No users yet.</p>';
  const avg=(r)=>r.data?.length?Math.round(r.data.reduce((a,v)=>a+Number(v.percentage||0),0)/r.data.length):0;
  $('#activitySummary').innerHTML=`<div class="summaryRow"><span>CBT practice attempts</span><b>${x.ca.count||0}</b></div><div class="summaryRow"><span>CBT mock average</span><b>${avg(x.ce)}%</b></div><div class="summaryRow"><span>NCLEX practice attempts</span><b>${x.na.count||0}</b></div><div class="summaryRow"><span>NCLEX exam average</span><b>${avg(x.ne)}%</b></div>`;
}
function renderCbt(){const q=$('#cbtSearch').value.toLowerCase();const rows=state.cbt.filter(x=>(x.question_text+' '+x.subject).toLowerCase().includes(q));$('#cbtRows').innerHTML=rows.map(x=>`<tr><td class="questionCell">${esc(x.question_text)}</td><td>${esc(x.subject)}</td><td><span class="pill">${esc(x.difficulty)}</span></td><td>${esc(x.access_level)}</td><td><span class="pill ${x.is_active?'':'off'}">${x.is_active?'Active':'Hidden'}</span></td><td><div class="actions"><button data-edit-cbt="${x.id}">Edit</button><button class="danger" data-delete-cbt="${x.id}">Delete</button></div></td></tr>`).join('')||'<tr><td colspan="6">No matching questions.</td></tr>';$$('[data-edit-cbt]').forEach(b=>b.onclick=()=>openEditor('cbt',state.cbt.find(x=>x.id==b.dataset.editCbt)));$$('[data-delete-cbt]').forEach(b=>b.onclick=()=>removeQuestion('cbt',b.dataset.deleteCbt));}
function renderNclex(){const q=$('#nclexSearch').value.toLowerCase();const rows=state.nclex.filter(x=>(x.question_text+' '+x.category).toLowerCase().includes(q));$('#nclexRows').innerHTML=rows.map(x=>`<tr><td class="questionCell">${esc(x.question_text)}</td><td>${esc(x.category)}</td><td>${esc(x.question_type)}</td><td><span class="pill">${esc(x.difficulty)}</span></td><td><span class="pill ${x.is_active?'':'off'}">${x.is_active?'Active':'Hidden'}</span></td><td><div class="actions"><button data-edit-nclex="${x.id}">Edit</button><button class="danger" data-delete-nclex="${x.id}">Delete</button></div></td></tr>`).join('')||'<tr><td colspan="6">No matching questions.</td></tr>';$$('[data-edit-nclex]').forEach(b=>b.onclick=()=>openEditor('nclex',state.nclex.find(x=>x.id==b.dataset.editNclex)));$$('[data-delete-nclex]').forEach(b=>b.onclick=()=>removeQuestion('nclex',b.dataset.deleteNclex));}
function renderUsers(){const q=$('#userSearch').value.toLowerCase();const rows=state.profiles.filter(x=>JSON.stringify(x).toLowerCase().includes(q));$('#userRows').innerHTML=rows.map(x=>`<tr><td><b>${esc(x.full_name||'Unnamed')}</b></td><td>${esc(x.profession||'—')}</td><td>${esc(x.destination||x.qualification_country||'—')}</td><td><select data-plan="${x.id}"><option ${x.account_type==='free'?'selected':''}>free</option><option ${x.account_type==='premium'?'selected':''}>premium</option></select></td><td><span class="pill">${esc(x.role||'user')}</span></td><td>${fmt(x.created_at)}</td></tr>`).join('')||'<tr><td colspan="6">No users.</td></tr>';$$('[data-plan]').forEach(s=>s.onchange=async()=>{const {error}=await sb.from('profiles').update({account_type:s.value}).eq('id',s.dataset.plan);if(error){alert(error.message);return}const p=state.profiles.find(x=>x.id===s.dataset.plan);if(p)p.account_type=s.value;renderOverview({ca:{count:0},ce:{data:[]},na:{count:0},ne:{data:[]}})});}
function renderAnalytics(x){const avg=r=>r.data?.length?Math.round(r.data.reduce((a,v)=>a+Number(v.percentage||0),0)/r.data.length):0;$('#anaCbtAttempts').textContent=x.ca.count||0;$('#anaCbtExams').textContent=x.ce.count||0;$('#anaNclexAttempts').textContent=x.na.count||0;$('#anaNclexExams').textContent=x.ne.count||0;$('#averageResults').innerHTML=`<div class="summaryRow"><span>CBT mock average</span><b>${avg(x.ce)}%</b></div><div class="summaryRow"><span>NCLEX exam average</span><b>${avg(x.ne)}%</b></div>`;$('#contentHealth').innerHTML=`<div class="summaryRow"><span>Active CBT questions</span><b>${state.cbt.filter(x=>x.is_active).length}</b></div><div class="summaryRow"><span>Active NCLEX questions</span><b>${state.nclex.filter(x=>x.is_active).length}</b></div><div class="summaryRow"><span>Premium questions</span><b>${[...state.cbt,...state.nclex].filter(x=>x.access_level==='premium').length}</b></div>`;}
function field(name,label,type='text',value='',wide=false,opts=[]){return `<label class="${wide?'wide':''}">${label}${type==='textarea'?`<textarea name="${name}" rows="4" required>${esc(value)}</textarea>`:type==='select'?`<select name="${name}">${opts.map(o=>`<option value="${esc(o)}" ${String(value)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${type==='checkbox'?(value?'checked':''):''} required>`}</label>`}
function openEditor(kind,item=null){state.editing={kind,item};$('#editorKind').textContent=kind==='cbt'?'CBT QUESTION':'NCLEX QUESTION';$('#editorTitle').textContent=item?'Edit question':'Add question';let html='';if(kind==='cbt'){html+=field('profession','Profession','select',item?.profession||'nurse',false,['nurse','midwife','both'])+field('subject','Subject','text',item?.subject||'')+field('difficulty','Difficulty','select',item?.difficulty||'medium',false,['easy','medium','hard'])+field('access_level','Access','select',item?.access_level||'free',false,['free','premium'])+field('question_text','Question','textarea',item?.question_text||'',true);for(const l of ['a','b','c','d'])html+=field('option_'+l,'Option '+l.toUpperCase(),'text',item?.['option_'+l]||'');html+=field('correct_option','Correct option','select',item?.correct_option||'A',false,['A','B','C','D'])+field('is_active','Active','checkbox',item?.is_active??true)+field('explanation','Explanation','textarea',item?.explanation||'',true)}else{html+=field('exam','Exam','select',item?.exam||'NCLEX-RN',false,['NCLEX-RN','NCLEX-PN'])+field('category','Category','text',item?.category||'')+field('client_need','Client need','text',item?.client_need||'')+field('difficulty','Difficulty','select',item?.difficulty||'medium',false,['easy','medium','hard'])+field('question_type','Type','select',item?.question_type||'single',false,['single','select_all'])+field('access_level','Access','select',item?.access_level||'free',false,['free','premium'])+field('question_text','Question','textarea',item?.question_text||'',true);for(const l of ['a','b','c','d','e','f'])html+=field('option_'+l,'Option '+l.toUpperCase(),'text',item?.['option_'+l]||'');html+=field('correct_options','Correct options (e.g. A or A,B,D)','text',item?.correct_options?.join(',')||'A')+field('is_active','Active','checkbox',item?.is_active??true)+field('rationale','Rationale','textarea',item?.rationale||'',true)+field('test_strategy','Test strategy','textarea',item?.test_strategy||'',true)}$('#editorFields').innerHTML=html;$('#editorMessage').textContent='';$('#editor').showModal();}
async function saveEditor(e){e.preventDefault();if(e.submitter?.value==='cancel')return $('#editor').close();const {kind,item}=state.editing;const fd=new FormData(e.currentTarget),obj=Object.fromEntries(fd.entries());obj.is_active=fd.has('is_active');if(kind==='nclex'){obj.correct_options=obj.correct_options.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);['option_e','option_f','test_strategy'].forEach(k=>{if(!obj[k])obj[k]=null})}const table=kind==='cbt'?'cbt_questions':'nclex_questions';let result=item?await sb.from(table).update(obj).eq('id',item.id).select().single():await sb.from(table).insert(obj).select().single();if(result.error){$('#editorMessage').textContent=result.error.message;return}const arr=kind==='cbt'?state.cbt:state.nclex;if(item){const i=arr.findIndex(x=>x.id===item.id);arr[i]=result.data}else arr.unshift(result.data);$('#editor').close();kind==='cbt'?renderCbt():renderNclex();renderOverview({ca:{count:0},ce:{data:[]},na:{count:0},ne:{data:[]}});}
async function removeQuestion(kind,id){if(!confirm('Delete this question permanently?'))return;const table=kind==='cbt'?'cbt_questions':'nclex_questions';const {error}=await sb.from(table).delete().eq('id',id);if(error)return alert(error.message);state[kind]=state[kind].filter(x=>x.id!=id);kind==='cbt'?renderCbt():renderNclex();}
init();
