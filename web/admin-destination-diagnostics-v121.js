(()=>{
  'use strict';
  async function install(){
    const sb=window.btvSupabase;if(!sb?.auth)return;
    const {data:{user}}=await sb.auth.getUser();if(!user)return;
    const {data:profile}=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();
    if(profile?.role!=='admin')return;
    const host=document.querySelector('#app main')||document.querySelector('main')||document.body;
    const nav=document.querySelector('#app .sidebar nav');
    let panel=document.getElementById('destinationJourneyDiagnostics121');
    if(!panel){panel=document.createElement('section');panel.id='destinationJourneyDiagnostics121';panel.className='tab adminCard';host.append(panel)}
    let button=nav?.querySelector('[data-tab="destinationJourneyDiagnostics121"]');
    if(nav&&!button){button=document.createElement('button');button.dataset.tab='destinationJourneyDiagnostics121';button.textContent='Destination diagnostics';nav.append(button)}
    panel.innerHTML='<h2>Destination & journey diagnostics</h2><p>Inspect the authenticated account source of truth and the exact required-step totals used by production.</p><label>User UUID <input data-user-id type="text" inputmode="text" placeholder="Leave blank for your account"></label><button type="button" data-run>Run diagnostics</button><pre data-result aria-live="polite">Ready.</pre>';
    if(button)button.onclick=()=>{host.querySelectorAll(':scope>.tab').forEach(x=>x.classList.toggle('active',x===panel));nav.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===button));const title=document.getElementById('pageTitle');if(title)title.textContent='Destination diagnostics'};
    panel.querySelector('[data-run]').onclick=async()=>{const output=panel.querySelector('[data-result]'),value=panel.querySelector('[data-user-id]').value.trim();output.textContent='Checking…';const {data,error}=await sb.rpc('btv_get_journey_diagnostics',value?{p_user_id:value}:{});output.textContent=error?`Error: ${error.message}`:JSON.stringify(data,null,2)};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,800),{once:true});else setTimeout(install,800);
})();
