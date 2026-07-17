const sb = window.btvSupabase;
const factory = window.BTVQuestionFactory;
const targetFor = kind => kind==='cbt' ? (factory?.CBT_TARGET||1000) : (factory?.NCLEX_TARGET||2000);
const statusEl = document.querySelector('#bankBuilderStatus');

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function status(message, tone = '') { if (statusEl) { statusEl.textContent = message; statusEl.className = `bankStatus ${tone}`.trim(); } }
function busy(kind, value) { const button=document.querySelector(`[data-build-bank="${kind}"]`); if(button){button.disabled=value;button.textContent=value?'Building drafts…':`Build missing ${kind.toUpperCase()} drafts`;}}

function render(kind, total, active, categories) {
  const target=targetFor(kind), prefix=kind.toLowerCase(), percentage=Math.min(100,Math.round(total/target*100));
  document.querySelector(`#${prefix}BankTotal`).textContent=total.toLocaleString();
  document.querySelector(`#${prefix}BankActive`).textContent=active.toLocaleString();
  document.querySelector(`#${prefix}BankProgress`).style.width=`${percentage}%`;
  document.querySelector(`#${prefix}BankProgressLabel`).textContent=`${total.toLocaleString()} of ${target.toLocaleString()} records (${percentage}%)`;
  document.querySelector(`#${prefix}Coverage`).innerHTML=Object.entries(categories).map(([name,count])=>`<span><b>${esc(name)}</b> ${count}</span>`).join('');
}

async function loadHealth() {
  if(!sb||!factory) return status('Question-bank tools could not load. Upload question-factory.js and refresh.','error');
  const results=await Promise.all([
    sb.from('cbt_questions').select('*',{count:'exact',head:true}),
    sb.from('cbt_questions').select('*',{count:'exact',head:true}).eq('is_active',true),
    sb.from('nclex_questions').select('*',{count:'exact',head:true}),
    sb.from('nclex_questions').select('*',{count:'exact',head:true}).eq('is_active',true),
    sb.from('cbt_questions').select('subject'), sb.from('nclex_questions').select('category')
  ]);
  const failed=results.find(result=>result.error); if(failed)return status(`Unable to read the question bank: ${failed.error.message}`,'error');
  const counts=(rows,key,names)=>{const out=Object.fromEntries(names.map(name=>[name,0]));(rows||[]).forEach(row=>{const name=row[key]||'Uncategorised';out[name]=(out[name]||0)+1});return out};
  render('cbt',results[0].count||0,results[1].count||0,counts(results[4].data,'subject',factory.CBT_CATEGORIES));
  render('nclex',results[2].count||0,results[3].count||0,counts(results[5].data,'category',factory.NCLEX_CATEGORIES));
  status('Database totals refreshed. Generated records remain hidden until reviewed and activated.','success');
}

async function buildMissing(kind) {
  const target=targetFor(kind), isCbt=kind==='cbt', table=isCbt?'cbt_questions':'nclex_questions', label=isCbt?'CBT':'NCLEX', build=isCbt?factory.buildCbt:factory.buildNclex;
  const countResult=await sb.from(table).select('*',{count:'exact',head:true}); if(countResult.error)throw countResult.error;
  const current=countResult.count||0; if(current>=target)return status(`${label} already has ${current.toLocaleString()} database records.`,'success');
  const needed=target-current;
  if(!confirm(`Create ${needed.toLocaleString()} missing ${label} records?\n\nThey will be HIDDEN DRAFTS. A qualified clinical reviewer must check every item before activation.`))return;
  busy(kind,true);
  try{
    const existingResult=await sb.from(table).select('question_text'); if(existingResult.error)throw existingResult.error;
    const existing=new Set((existingResult.data||[]).map(row=>row.question_text));
    const rows=build(target).filter(row=>!existing.has(row.question_text)).slice(0,needed);
    if(rows.length<needed)throw new Error(`Only ${rows.length} unique drafts were available; ${needed} are required.`);
    let done=0;
    for(let index=0;index<rows.length;index+=50){const batch=rows.slice(index,index+50),result=await sb.from(table).insert(batch);if(result.error)throw result.error;done+=batch.length;status(`Building ${label} drafts: ${done.toLocaleString()} of ${needed.toLocaleString()} (${Math.round(done/needed*100)}%)`);}
    status(`${label} now contains ${target.toLocaleString()} records. Drafts are hidden pending clinical review.`,'success');await loadHealth();setTimeout(()=>location.reload(),900);
  }catch(error){status(`Could not finish ${label}: ${error.message}. Completed batches were kept, so it is safe to try again.`,'error')}finally{busy(kind,false)}
}

function download(kind){const target=targetFor(kind),rows=kind==='cbt'?factory.buildCbt(target):factory.buildNclex(target);const data={bank:kind==='cbt'?'CBT':'NCLEX-RN',generated_at:new Date().toISOString(),status:'inactive drafts requiring qualified clinical and regulatory review',count:rows.length,questions:rows};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`beyond-the-visa-${kind}-draft-blueprint-${target}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}

async function start(){for(let attempt=0;attempt<80&&document.querySelector('#app')?.hidden;attempt++)await new Promise(resolve=>setTimeout(resolve,100));document.querySelectorAll('[data-build-bank]').forEach(button=>button.onclick=()=>buildMissing(button.dataset.buildBank));document.querySelectorAll('[data-export-bank]').forEach(button=>button.onclick=()=>download(button.dataset.exportBank));document.querySelector('#refreshBankHealth')?.addEventListener('click',loadHealth);await loadHealth()}
start();
