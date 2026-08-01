(()=>{
  'use strict';
  if(window.__btvAdminUsersV303)return;window.__btvAdminUsersV303=true;
  const $=(selector,root=document)=>root.querySelector(selector),$$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const state={query:'',plan:'',presence:'',payload:null,request:0,lastSuccessfulAt:null};
  const redundant={users:'cmsUsers',analytics:'reports',coinsAdmin:'coinsCentre112',coinsV86:'coinsCentre112','coins-loyalty':'coinsCentre112',jobsAdmin:'opportunityAdmin138',globalJobsAdmin168:'opportunityAdmin138'};
  const formatDate=value=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Never';
  const duration=seconds=>{seconds=Math.max(0,Number(seconds)||0);const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60);return d?`${d}d ${h}h`:h?`${h}h ${m}m`:`${m}m`};
  const relative=value=>{if(!value)return'Never';const seconds=Math.max(0,Math.floor((Date.now()-new Date(value))/1000));if(seconds<60)return'Just now';if(seconds<3600)return`${Math.floor(seconds/60)}m ago`;if(seconds<86400)return`${Math.floor(seconds/3600)}h ago`;return`${Math.floor(seconds/86400)}d ago`};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const friendlyError=error=>{const message=String(error?.message||error||'').toLowerCase();if(!navigator.onLine)return'You appear to be offline. Reconnect and refresh.';if(message.includes('failed to fetch')||message.includes('network')||message.includes('timeout'))return'The secure data service is temporarily unreachable.';if(message.includes('could not find')||message.includes('schema cache')||error?.code==='PGRST202')return'The engagement service is being prepared.';return'User intelligence is temporarily unavailable.'};
  async function rpcWithRetry(name,args,{attempts=3,timeoutMs=12000}={}){
    let lastError;
    for(let attempt=0;attempt<attempts;attempt++){
      try{
        let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Request timeout')),timeoutMs)});
        const result=await Promise.race([window.btvSupabase.rpc(name,args),timeout]).finally(()=>clearTimeout(timer));
        if(!result?.error)return result;
        lastError=result.error;
        const transient=[408,429,500,502,503,504].includes(Number(result.error.status))||/fetch|network|timeout|temporar/i.test(result.error.message||'');
        if(!transient)break;
      }catch(error){lastError=error}
      if(attempt<attempts-1)await wait(450*(2**attempt)+Math.floor(Math.random()*180));
    }
    return{data:null,error:lastError||new Error('Request failed')};
  }
  async function directoryFallback(){
    const result=await rpcWithRetry('admin_list_users',{p_search:state.query,p_plan:state.plan||null,p_status:null,p_limit:200,p_offset:0},{attempts:2,timeoutMs:10000});
    if(result.error)return result;
    const users=(result.data||[]).map(user=>({...user,online:false,last_seen_at:user.last_sign_in_at,total_seconds:0,session_count:0,event_count:0,screen_views:0,interactions:0,current_screen:null,last_event:null,user_agent_family:null}));
    return{data:{generated_at:new Date().toISOString(),matched_users:users.length,users,summary:{total_users:users.length,online_now:0,active_today:0,total_sessions:0,average_session_seconds:0}},error:null,fallback:true};
  }

  function cleanNavigation(){
    const nav=$('#app .sidebar nav');if(!nav)return;
    const seen=new Set();$$('button[data-tab]',nav).forEach(button=>{const id=button.dataset.tab;if(seen.has(id)){button.remove();return}seen.add(id);const canonical=redundant[id],canHide=!!(canonical&&nav.querySelector(`[data-tab="${canonical}"]`)&&document.getElementById(canonical));button.hidden=canHide;button.setAttribute('aria-hidden',canHide?'true':'false');button.classList.toggle('adminNavRedundantV303',canHide);if(canHide)document.getElementById(id)?.setAttribute('hidden','')});
    const users=nav.querySelector('[data-tab="cmsUsers"]');if(users){users.hidden=false;users.removeAttribute('aria-hidden');if(users.textContent!=='User management')users.textContent='User management';users.classList.add('adminNavPriorityV303');users.dataset.usersV303='1';users.onclick=openUserManagement}
  }
  function shell(){
    const section=$('#cmsUsers');if(!section)return false;
    section.removeAttribute('hidden');section.classList.add('adminUsersV303');
    section.innerHTML=`<div class="adminUsersHeroV303"><div><span>MEMBER INTELLIGENCE</span><h2>User management</h2><p>Live presence, engagement history and access governance in one privacy-conscious control room.</p></div><div class="adminUsersTrustV303"><i></i><div><b>Protected operational data</b><small>Admin-only · heartbeat window 2 minutes</small></div></div></div><div class="adminUserMetricsV303" data-user-metrics>${metricSkeleton()}</div><section class="adminUsersWorkspaceV303"><div class="adminUsersToolbarV303"><label><span>Find a member</span><input type="search" data-user-search placeholder="Name or email address" autocomplete="off"></label><label><span>Presence</span><select data-user-presence><option value="">Everyone</option><option value="online">Online now</option><option value="offline">Offline</option></select></label><label><span>Plan</span><select data-user-plan><option value="">All plans</option><option value="free">Free</option><option value="premium">Premium</option></select></label><button type="button" data-user-refresh><span>↻</span> Refresh</button></div><div class="adminUsersMetaV303"><p data-user-status role="status">Preparing member intelligence…</p><small data-user-updated></small></div><div data-user-table>${tableSkeleton()}</div></section><aside class="adminUserDrawerV303" data-user-drawer hidden></aside>`;
    section.querySelector('[data-user-refresh]').onclick=load;
    section.querySelector('[data-user-search]').addEventListener('input',debounce(event=>{state.query=event.target.value.trim();load()},300));
    section.querySelector('[data-user-presence]').onchange=event=>{state.presence=event.target.value;load()};
    section.querySelector('[data-user-plan]').onchange=event=>{state.plan=event.target.value;load()};
    return true;
  }
  const metricSkeleton=()=>Array.from({length:5},()=>'<article class="is-loading"><span></span><b></b><small></small></article>').join('');
  const tableSkeleton=()=>`<div class="adminUserSkeletonV303">${Array.from({length:6},()=>'<i></i>').join('')}</div>`;
  function metrics(summary={}){$('[data-user-metrics]').innerHTML=`<article><span>Total members</span><b>${Number(summary.total_users||0).toLocaleString()}</b><small>registered accounts</small></article><article class="online"><span>Online now</span><b>${Number(summary.online_now||0).toLocaleString()}</b><small>active within 2 minutes</small></article><article><span>Active today</span><b>${Number(summary.active_today||0).toLocaleString()}</b><small>unique members</small></article><article><span>Total sessions</span><b>${Number(summary.total_sessions||0).toLocaleString()}</b><small>recorded visits</small></article><article><span>Average session</span><b>${duration(summary.average_session_seconds)}</b><small>engaged time</small></article>`}
  function table(users=[]){
    $('[data-user-table]').innerHTML=`<div class="adminUserTableWrapV303"><table><thead><tr><th>Member</th><th>Presence</th><th>Current / last activity</th><th>Time on site</th><th>Journey</th><th></th></tr></thead><tbody>${users.map(user=>`<tr><td><div class="adminUserIdentityV303"><span>${esc((user.full_name||user.email||'?').slice(0,1).toUpperCase())}</span><div><b>${esc(user.full_name||'Unnamed member')}</b><small>${esc(user.email||'Email unavailable')}</small><em>${esc(user.account_type||'free')}${user.role==='admin'?' · admin':''}</em></div></div></td><td><span class="adminPresenceV303 ${user.online?'online':'offline'}"><i></i>${user.online?'Online now':'Offline'}</span><small>${user.online?'Heartbeat received':relative(user.last_seen_at)}</small></td><td><b>${esc(user.current_screen||'No tracked screen yet')}</b><small>${esc(user.last_event||'No activity recorded')} · ${esc(user.user_agent_family||'device unknown')}</small></td><td><b>${duration(user.total_seconds)}</b><small>${Number(user.session_count||0)} sessions</small></td><td><b>${Number(user.screen_views||0)} screens</b><small>${Number(user.interactions||0)} interactions</small></td><td><button type="button" class="adminUserInspectV303" data-inspect-user="${esc(user.id)}">View activity</button></td></tr>`).join('')||'<tr><td colspan="6"><div class="adminUserEmptyV303"><b>No members match this view</b><span>Change the search or filters, then refresh.</span></div></td></tr>'}</tbody></table></div>`;
    $$('[data-inspect-user]').forEach(button=>button.onclick=()=>openUser(users.find(user=>user.id===button.dataset.inspectUser)));
  }
  async function load(){
    if(!$('#cmsUsers'))return;const token=++state.request,button=$('[data-user-refresh]'),status=$('[data-user-status]');button.disabled=true;button.classList.add('is-loading');status.classList.remove('bad','warn');status.textContent=state.payload?'Refreshing without clearing the current view…':'Connecting to secure member intelligence…';
    let result=await rpcWithRetry('admin_user_engagement',{p_search:state.query,p_plan:state.plan||null,p_presence:state.presence||null,p_limit:200,p_offset:0});
    if(result.error)result=await directoryFallback();
    if(token!==state.request)return;button.disabled=false;button.classList.remove('is-loading');
    if(result.error){status.textContent=`${friendlyError(result.error)} ${state.payload?'Showing the last successful result.':'Please try Refresh again.'}`;status.classList.add('warn');if(!state.payload)$('[data-user-table]').innerHTML='<div class="adminUserEmptyV303"><b>Unable to reach the secure data service</b><span>Your admin session is safe and no account data was changed. Check the connection and try Refresh.</span></div>';return}
    const data=result.data;state.payload=data||{};state.lastSuccessfulAt=new Date();metrics(data?.summary);table(data?.users||[]);status.classList.toggle('warn',!!result.fallback);status.textContent=result.fallback?`Live engagement is temporarily unavailable. Showing ${data.users.length} account records safely.`:`Showing ${(data?.users||[]).length} of ${Number(data?.matched_users||0)} matching members.`;$('[data-user-updated]').textContent=`Updated ${formatDate(data?.generated_at||new Date())}`;
  }
  async function openUser(user){
    const drawer=$('[data-user-drawer]');drawer.hidden=false;drawer.innerHTML=`<div class="adminUserDrawerHeadV303"><div><span>MEMBER ACTIVITY</span><h3>${esc(user.full_name||user.email||'Member')}</h3><p>${esc(user.email||'')}</p></div><button type="button" data-close-user aria-label="Close">×</button></div><div class="adminUserDrawerFactsV303"><div><span>Last seen</span><b>${formatDate(user.last_seen_at)}</b></div><div><span>Joined</span><b>${formatDate(user.created_at)}</b></div><div><span>Destination</span><b>${esc(user.destination||'Not set')}</b></div><div><span>Profession</span><b>${esc(user.profession||'Not set')}</b></div></div><div class="adminUserAccessV303"><label>Plan<select data-access-plan><option value="free">Free</option><option value="premium">Premium</option></select></label><label>Status<select data-access-status><option value="active">Active</option><option value="suspended">Suspended</option></select></label><label class="wide">Audit reason<input data-access-reason placeholder="Required reason for this change"></label><button type="button" data-save-access ${user.role==='admin'?'disabled':''}>Save access change</button><p data-access-message role="status"></p></div><div class="adminUserTimelineV303"><div><span>RECENT HISTORY</span><b>What this member has done</b></div><section data-user-timeline><p>Loading activity…</p></section></div>`;
    drawer.querySelector('[data-close-user]').onclick=()=>{drawer.hidden=true};drawer.querySelector('[data-access-plan]').value=user.account_type||'free';drawer.querySelector('[data-access-status]').value=user.status||'active';drawer.querySelector('[data-save-access]').onclick=()=>saveAccess(user,drawer);
    const {data,error}=await rpcWithRetry('admin_user_activity_timeline',{p_user_id:user.id,p_limit:60},{attempts:2,timeoutMs:10000});const timeline=drawer.querySelector('[data-user-timeline]');timeline.innerHTML=error?`<p class="bad">${esc(friendlyError(error))} Try closing this panel and opening it again.</p>`:(data||[]).map(event=>`<article><i class="${esc(event.event_type)}"></i><div><b>${esc(event.action_key||event.screen||event.event_type.replaceAll('_',' '))}</b><span>${esc(event.event_type.replaceAll('_',' '))}${event.screen?' · '+esc(event.screen):''}</span></div><time>${relative(event.occurred_at)}</time></article>`).join('')||'<p>No activity has been recorded for this member yet.</p>';
  }
  async function saveAccess(user,drawer){const reason=drawer.querySelector('[data-access-reason]').value.trim(),message=drawer.querySelector('[data-access-message]');if(!reason){message.textContent='Enter an audit reason before saving.';message.className='bad';return}message.className='';message.textContent='Saving audited access change…';const {error}=await rpcWithRetry('admin_set_user_access',{p_user:user.id,p_plan:drawer.querySelector('[data-access-plan]').value,p_status:drawer.querySelector('[data-access-status]').value,p_reason:reason},{attempts:1,timeoutMs:12000});if(error){message.className='bad';message.textContent=friendlyError(error);return}message.textContent='Access updated and recorded in the audit log.';setTimeout(()=>{drawer.hidden=true;load()},700)}
  function debounce(fn,wait){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait)}}
  function openUserManagement(){const button=$('[data-tab="cmsUsers"]');$$('main>.tab').forEach(tab=>tab.classList.toggle('active',tab.id==='cmsUsers'));$$('.sidebar nav [data-tab]').forEach(tab=>tab.classList.toggle('active',tab===button));$('#pageTitle').textContent='User management';load()}
  function install(){cleanNavigation();if(!shell())return;cleanNavigation();addEventListener('online',()=>{if($('#cmsUsers')?.classList.contains('active'))load()});new MutationObserver(cleanNavigation).observe($('.sidebar nav'),{childList:true,subtree:true});}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true}):setTimeout(install,80);
})();
