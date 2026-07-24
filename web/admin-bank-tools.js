const sb = window.btvSupabase;
const factory = window.BTVQuestionFactory;
const target = factory?.TARGET || 2000;
const statusEl = document.querySelector('#bankBuilderStatus');

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function status(message, tone = '') { if (statusEl) { statusEl.textContent = message; statusEl.className = `bankStatus ${tone}`.trim(); } }
function busy(kind, value) { const button=document.querySelector(`[data-build-bank="${kind}"]`); if(button){button.disabled=value;button.textContent=value?'Checking samples…':`Add independent ${kind.toUpperCase()} samples`;}}

function render(kind, total, active, categories, goal = target) {
  const prefix=kind.toLowerCase(), percentage=Math.min(100,Math.round(total/goal*100));
  document.querySelector(`#${prefix}BankTotal`).textContent=total.toLocaleString();
  document.querySelector(`#${prefix}BankActive`).textContent=active.toLocaleString();
  document.querySelector(`#${prefix}BankProgress`).style.width=`${percentage}%`;
  document.querySelector(`#${prefix}BankProgressLabel`).textContent=`${total.toLocaleString()} of ${goal.toLocaleString()} independent samples (${percentage}%)`;
  document.querySelector(`#${prefix}Coverage`).innerHTML=Object.entries(categories).map(([name,count])=>`<span><b>${esc(name)}</b> ${count}</span>`).join('');
}

async function loadHealth() {
  if(!sb||!factory) return status('Question-bank tools could not load. Upload question-factory.js and refresh.','error');
  const results=await Promise.all([
    sb.from('cbt_questions').select('*',{count:'exact',head:true}).neq('quality_status','rejected'),
    sb.from('cbt_questions').select('*',{count:'exact',head:true}).eq('is_active',true),
    sb.from('nclex_questions').select('*',{count:'exact',head:true}).neq('quality_status','rejected'),
    sb.from('nclex_questions').select('*',{count:'exact',head:true}).eq('is_active',true),
    sb.from('btv_exam_questions').select('*',{count:'exact',head:true}).eq('exam_type','ielts').neq('review_status','rejected'),
    sb.from('btv_exam_questions').select('*',{count:'exact',head:true}).eq('exam_type','ielts').eq('is_active',true),
    readAll('cbt_questions','subject,quality_status'), readAll('nclex_questions','category,quality_status'),
    readAll('btv_exam_questions','section,review_status','exam_type','ielts')
  ]);
  const failed=results.find(result=>result.error); if(failed)return status(`Unable to read the question bank: ${failed.error.message}`,'error');
  const counts=(rows,key,names)=>{const out=Object.fromEntries(names.map(name=>[name,0]));(rows||[]).filter(row=>row.quality_status!=='rejected').forEach(row=>{const name=row[key]||'Uncategorised';out[name]=(out[name]||0)+1});return out};
  render('cbt',results[0].count||0,results[1].count||0,counts(results[6].data,'subject',factory.CBT_CATEGORIES));
  render('nclex',results[2].count||0,results[3].count||0,counts(results[7].data,'category',factory.NCLEX_CATEGORIES));
  const ieltsCounts=rows=>{const out=Object.fromEntries(factory.IELTS_CATEGORIES.map(name=>[name,0]));(rows||[]).filter(row=>row.review_status!=='rejected').forEach(row=>{const name=row.section||'Uncategorised';out[name]=(out[name]||0)+1});return out};
  const rows=results[8].data||[];
  render('ielts',results[4].count||0,results[5].count||0,ieltsCounts(rows),500);
  status('Usable totals exclude quarantined repetitions. Unofficial samples remain hidden from paid mocks until reviewed and approved.','success');
}

async function readAll(table,columns,filterColumn,filterValue){const rows=[];for(let from=0;;from+=1000){let query=sb.from(table).select(columns).order('id').range(from,from+999);if(filterColumn)query=query.eq(filterColumn,filterValue);const result=await query;if(result.error)return result;rows.push(...(result.data||[]));if(!result.data||result.data.length<1000)return{data:rows,error:null}}}

async function buildMissing(kind) {
  const isCbt=kind==='cbt', table=isCbt?'cbt_questions':'nclex_questions', label=isCbt?'CBT':'NCLEX', build=isCbt?factory.buildCbt:factory.buildNclex;
  if(!confirm(`Add any independently authored ${label} samples that are not already in the bank?\n\nNo renamed or cosmetic variants will be generated. Samples stay hidden from paid mocks until qualified review.`))return;
  busy(kind,true);
  try{
    const existingResult=await readAll(table,'question_text'); if(existingResult.error)throw existingResult.error;
    const normalise=factory.normaliseStem||((value)=>String(value||'').trim().toLowerCase());
    const existing=new Set((existingResult.data||[]).map(row=>normalise(row.question_text)));
    const rows=build().filter(row=>!existing.has(normalise(row.question_text)));
    if(!rows.length)return status(`No new independent ${label} samples are available. Cosmetic duplicates were not created.`,'success');
    let done=0;
    for(let index=0;index<rows.length;index+=50){const batch=rows.slice(index,index+50),result=await sb.from(table).insert(batch);if(result.error)throw result.error;done+=batch.length;status(`Adding independent ${label} samples: ${done.toLocaleString()} of ${rows.length.toLocaleString()}`);}
    status(`${done.toLocaleString()} independent ${label} samples added. They are unofficial and hidden pending clinical review.`,'success');await loadHealth();setTimeout(()=>location.reload(),900);
  }catch(error){status(`Could not finish ${label}: ${error.message}. Completed batches were kept, so it is safe to try again.`,'error')}finally{busy(kind,false)}
}

function download(kind){const rows=kind==='cbt'?factory.buildCbt():factory.buildNclex();const data={bank:kind==='cbt'?'CBT':'NCLEX-RN',generated_at:new Date().toISOString(),status:'unofficial independent samples; inactive until qualified clinical and regulatory review',count:rows.length,questions:rows};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`beyond-the-visa-${kind}-independent-samples.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}

async function start(){for(let attempt=0;attempt<80&&document.querySelector('#app')?.hidden;attempt++)await new Promise(resolve=>setTimeout(resolve,100));document.querySelectorAll('[data-build-bank]').forEach(button=>button.onclick=()=>buildMissing(button.dataset.buildBank));document.querySelectorAll('[data-export-bank]').forEach(button=>button.onclick=()=>download(button.dataset.exportBank));document.querySelector('#refreshBankHealth')?.addEventListener('click',loadHealth);await loadHealth()}
start();
