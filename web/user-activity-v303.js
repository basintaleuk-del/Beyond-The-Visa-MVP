(()=>{
  'use strict';
  if(window.__btvUserActivityV303)return;window.__btvUserActivityV303=true;
  const SESSION_KEY='btv_engagement_session_v303';
  const HEARTBEAT_MS=60000;
  let sessionId,started=false,lastScreen='',heartbeat,disabledUntil=0;
  const sb=()=>window.btvSupabase;
  const screen=()=>document.querySelector('.screen.active[id]')?.id||new URLSearchParams(location.search).get('screen')||location.pathname.split('/').pop()||'home';
  const device=()=>/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?'mobile':'desktop';
  function id(){try{sessionId=sessionStorage.getItem(SESSION_KEY)||crypto.randomUUID();sessionStorage.setItem(SESSION_KEY,sessionId)}catch{sessionId=crypto.randomUUID()}return sessionId}
  async function send(type,screenName=screen(),actionKey=null){
    if((!started&&type!=='session_start')||Date.now()<disabledUntil)return;
    const client=sb();if(!client?.rpc||!navigator.onLine)return;
    try{const {data:{user}}=await client.auth.getUser();if(!user)return;const {error}=await client.rpc('btv_record_user_activity',{p_session_id:sessionId||id(),p_event_type:type,p_screen:String(screenName||'').slice(0,160),p_action_key:actionKey?String(actionKey).slice(0,120):null,p_user_agent_family:device()});if(error){if(error.code==='PGRST202'||/could not find|schema cache/i.test(error.message||''))disabledUntil=Date.now()+300000;return false}return true}catch{disabledUntil=Date.now()+15000;return false}
  }
  function view(){const next=screen();if(next===lastScreen)return;lastScreen=next;send('screen_view',next)}
  async function start(){
    if(started)return;const client=sb();if(!client?.auth)return;
    const {data:{user}}=await client.auth.getUser();if(!user)return;
    started=true;id();lastScreen=screen();await send('session_start',lastScreen);
    heartbeat=setInterval(()=>{if(document.visibilityState==='visible')send('heartbeat')},HEARTBEAT_MS);
    new MutationObserver(view).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-screen],[data-tab],[data-open],[data-action],a[href],button[id]');if(!target||!started)return;
    const raw=target.dataset.screen||target.dataset.tab||target.dataset.open||target.dataset.action||target.id||(target.matches('a[href]')?new URL(target.href,location.href).pathname:null);
    if(raw)send('interaction',screen(),String(raw).replace(/[^a-zA-Z0-9_:/.-]/g,'').slice(0,120));
  },{passive:true});
  document.addEventListener('visibilitychange',()=>document.visibilityState==='visible'?(view(),send('heartbeat')):send('heartbeat'));
  addEventListener('pagehide',()=>{clearInterval(heartbeat);send('session_end')});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0),{once:true});else setTimeout(start,0);
  window.addEventListener('btv:auth-ready',start);
})();
