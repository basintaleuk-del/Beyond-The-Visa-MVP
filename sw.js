const CACHE_NAME='beyond-the-visa-v85';

self.addEventListener('install',()=>self.skipWaiting());

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    fetch(event.request)
      .then(response=>response)
      .catch(()=>caches.match(event.request))
  );
});

self.addEventListener('push',event=>{
  let data={title:'Beyond The Visa',body:'You have a new update.',url:'./index.html'};
  try{data={...data,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,data:{url:data.url||'./index.html',notificationId:data.notificationId},tag:data.notificationId||'btv-update'}));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'./index.html',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{for(const client of windows){if('focus'in client){client.navigate(url);return client.focus()}}return clients.openWindow(url)}));
});
