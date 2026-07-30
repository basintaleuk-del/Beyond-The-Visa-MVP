const CACHE_NAME='beyond-the-visa-assets-v250';
const CACHE_PREFIX='beyond-the-visa-';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
function offlinePage(){return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#133e43"><title>Beyond The Visa — Reconnecting</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f3ed;color:#183034;font-family:system-ui,sans-serif}.card{width:min(86%,420px);padding:30px;border-radius:24px;background:#fff;text-align:center;box-shadow:0 18px 50px #163e4318}.mark{width:62px;height:62px;margin:auto;display:grid;place-items:center;border-radius:20px;background:#133e43;color:#fff;font:700 23px Georgia,serif}h1{font:28px Georgia,serif}p{line-height:1.55;color:#6e7d7e}button{border:0;border-radius:13px;padding:12px 18px;background:#133e43;color:#fff;font-weight:800}</style></head><body><main class="card"><div class="mark">BV</div><h1>Reconnecting…</h1><p>The secure sign-in page did not load on the first attempt. We will retry automatically when the connection is available.</p><button onclick="location.reload()">Try again now</button></main><script>let attempts=0;const retry=()=>{if(navigator.onLine&&attempts++<4)location.reload()};addEventListener('online',retry);setTimeout(retry,3000)</script></body></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
async function networkDocument(request){try{return await fetch(request,{cache:'no-store'})}catch(firstError){await new Promise(resolve=>setTimeout(resolve,600));try{return await fetch(request,{cache:'reload'})}catch{return offlinePage()}}}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(request.mode==='navigate'||request.destination==='document'){event.respondWith(networkDocument(request));return}const cacheable=url.origin===self.location.origin&&['style','script','image','font','media'].includes(request.destination);if(!cacheable)return;event.respondWith(caches.open(CACHE_NAME).then(async cache=>{try{const response=await fetch(request);if(response.ok)cache.put(request,response.clone());return response}catch(error){const cached=await cache.match(request);if(cached)return cached;throw error}}))});
function safePushUrl(value){
  try{const url=new URL(value||'/',self.location.origin);return url.origin===self.location.origin?url:new URL('/',self.location.origin)}
  catch{return new URL('/',self.location.origin)}
}
self.addEventListener('push',event=>{
  let data={title:'Beyond The Visa',body:'You have a new update.',url:'/',category:'account',tag:'btv-update'};
  try{if(event.data)data={...data,...event.data.json()}}catch{}
  if(data.expiresAt&&new Date(data.expiresAt)<=new Date())return;
  const title=String(data.title||'Beyond The Visa').slice(0,120),body=String(data.body||'You have a new update.').slice(0,240);
  const tag=String(data.tag||data.notificationId||`btv-${data.category||'update'}`).slice(0,120);
  event.waitUntil((async()=>{
    const existing=await self.registration.getNotifications({tag});if(existing.length)return;
    await self.registration.showNotification(title,{
      body,tag,renotify:data.priority==='urgent',requireInteraction:data.priority==='urgent',
      icon:data.icon||'/site-logo-mark.png',badge:'/site-logo-mark.png',image:data.image||undefined,
      actions:Array.isArray(data.actions)?data.actions.slice(0,2):[{action:'open',title:'Open'},{action:'dismiss',title:'Dismiss'}],
      data:{url:safePushUrl(data.url).pathname+safePushUrl(data.url).search,notificationId:data.notificationId||null,category:data.category||'account'},
      timestamp:Date.now(),vibrate:data.priority==='urgent'?[120,60,120]:undefined
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();if(event.action==='dismiss')return;
  const destination=safePushUrl(event.notification.data?.url||'/');
  if(event.notification.data?.notificationId)destination.searchParams.set('btv_notification',event.notification.data.notificationId);
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    for(const client of windows){if('focus'in client){await client.navigate(destination.href);return client.focus()}}
    return clients.openWindow(destination.href)
  }));
});
self.addEventListener('pushsubscriptionchange',event=>event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>windows.forEach(client=>client.postMessage({type:'BTV_PUSH_SUBSCRIPTION_CHANGED'})))));
self.addEventListener('message',event=>{if(event.data?.type==='BTV_SKIP_WAITING')self.skipWaiting()});
