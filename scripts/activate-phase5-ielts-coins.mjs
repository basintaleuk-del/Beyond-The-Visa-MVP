import fs from 'node:fs';
const file='web/release-v67.js';
let s=fs.readFileSync(file,'utf8');
const must=(a,b)=>{if(!s.includes(a))throw Error('Expected IELTS source marker missing: '+a.slice(0,80));s=s.replace(a,b)};
must("premium:false};","premium:false,unlocks:new Set(),costs:{ielts_reading:100,ielts_writing:100}};");
must("function install(){",`async function loadUnlocks(){
  if(!window.btvSupabase)return;
  try{const user=(await window.btvSupabase.auth.getUser()).data.user;if(!user)return;
    const [catalog,owned]=await Promise.all([
      window.btvSupabase.from('btv_learning_unlock_catalog').select('code,coin_cost').eq('module','ielts').eq('is_active',true),
      window.btvSupabase.from('btv_user_learning_unlocks').select('unlock_code').eq('user_id',user.id)
    ]);
    (catalog.data||[]).forEach(x=>state.costs[x.code]=Number(x.coin_cost));
    state.unlocks=new Set((owned.data||[]).map(x=>x.unlock_code));
  }catch{}
}
const unlockCode=id=>'ielts_'+id;
const hasAccess=id=>state.premium||state.unlocks.has(unlockCode(id));
async function unlockSection(id){const button=document.querySelector('[data-unlock-ielts]');if(button){button.disabled=true;button.textContent='Unlocking securely...'}
  try{const {data,error}=await window.btvSupabase.rpc('btv_unlock_learning',{p_code:unlockCode(id)});if(error)throw error;await loadUnlocks();window.dispatchEvent(new CustomEvent('btv:wallet-changed',{detail:data}));renderShell();renderPractice();window.toast?.('IELTS section unlocked.');}
  catch(e){window.alert(e.message||'This section could not be unlocked.');if(button){button.disabled=false;button.textContent='Unlock with Beyond Coins'}}
}
function install(){`);
must("state.premium=await premium();renderShell();if(state.premium)renderPractice()","state.premium=await premium();await loadUnlocks();renderShell();if(hasAccess(state.section))renderPractice()")
const start=s.indexOf('function renderShell(){');
const end=s.indexOf('function renderComingSoon',start);
if(start<0||end<0)throw Error('Could not isolate IELTS shell');
const shell=`function renderShell(){const root=$('#ieltsAcademicRoot');if(!root)return;const sections=[['reading','Reading','500 Academic passages and questions','available'],['writing','Writing','500 Task 1 and Task 2 prompts','available'],['listening','Listening','Further human-audio design in progress','soon'],['speaking','Speaking','Further voice-assessment design in progress','soon']];root.innerHTML=\`<div class="ieltsHero"><span>IELTS ACADEMIC PREPARATION</span><h2>IELTS Academic Studio</h2><p>Original Academic IELTS-style preparation for internationally educated nurses and midwives. Premium members have full access; other members can unlock Reading or Writing with Beyond Coins.</p><div class="ieltsHeroMeta"><b>1,000 available practice items</b><b>Academic module only</b><b>Listening coming soon</b><b>Speaking coming soon</b><b>Zibur feedback</b></div></div><div class="ieltsSectionGrid">\${sections.map(([id,label,copy,status])=>{const open=status==='soon'||hasAccess(id),cost=state.costs[unlockCode(id)]||100;return \`<button data-ielts-section="\${id}" data-status="\${status}" class="\${state.section===id?'active':''} \${status==='soon'?'comingSoon':''}"><b>\${label}\${status==='soon'?' <em>Coming soon</em>':open?' <em>Available</em>':\` <em>\${cost} BC</em>\`}</b><small>\${copy}</small></button>\`}).join('')}</div><div id="ieltsPractice"></div>\`;root.querySelectorAll('[data-ielts-section]').forEach(b=>b.onclick=()=>{state.section=b.dataset.ieltsSection;state.index=0;renderShell();if(b.dataset.status==='soon')renderComingSoon(state.section);else if(hasAccess(state.section))renderPractice();else renderLocked(state.section)})}
function renderLocked(id){const box=$('#ieltsPractice'),label=id[0].toUpperCase()+id.slice(1),cost=state.costs[unlockCode(id)]||100;if(!box)return;box.innerHTML=\`<article class="ieltsCard ieltsCoinLock"><span class="ieltsEyebrow">BEYOND COINS ACCESS</span><h3>Unlock IELTS Academic \${label}</h3><p>Get permanent access to all 500 \${label} practice items, saved progress and formative Zibur feedback.</p><strong>\${cost} BC</strong><button type="button" data-unlock-ielts class="ieltsPrimary">Unlock with Beyond Coins</button><small>Premium members already receive full access.</small></article>\`;box.querySelector('[data-unlock-ielts]').onclick=()=>unlockSection(id)}
`;
s=s.slice(0,start)+shell+s.slice(end);
must("function renderPractice(){if(['listening','speaking'].includes(state.section))","function renderPractice(){if(!hasAccess(state.section)){renderLocked(state.section);return}if(['listening','speaking'].includes(state.section))");
fs.writeFileSync(file,s);

