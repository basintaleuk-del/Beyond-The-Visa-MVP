/* Public browser configuration only. Never add service-role, OpenAI or Paystack secret keys here. */
window.BTV_SUPABASE_URL='https://wuvgktmzkzrdvbpqfmek.supabase.co';
window.BTV_VAPID_PUBLIC_KEY='';
const vapidMeta=document.createElement('meta');vapidMeta.name='btv-vapid-key';vapidMeta.content=window.BTV_VAPID_PUBLIC_KEY;document.head.append(vapidMeta);
fetch('/api/push-config',{credentials:'same-origin'}).then(response=>response.ok?response.json():null).then(config=>{if(config?.vapidPublicKey){window.BTV_VAPID_PUBLIC_KEY=config.vapidPublicKey;vapidMeta.content=config.vapidPublicKey}}).catch(()=>{});
if('serviceWorker'in navigator){let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading||sessionStorage.getItem('btv-sw-v254-reloaded'))return;reloading=true;sessionStorage.setItem('btv-sw-v254-reloaded','1');location.reload()});navigator.serviceWorker.register('./sw.js?v=254',{updateViaCache:'none'}).then(reg=>{reg.update();if(reg.waiting)reg.waiting.postMessage({type:'BTV_SKIP_WAITING'})}).catch(console.warn)}
let accountStatusPromise=null;
let accountStatusUserId=null;
window.BTVCheckAccountStatus=user=>{
  if(!user?.id||!window.btvSupabase)return Promise.resolve(true);
  if(accountStatusPromise&&accountStatusUserId===user.id)return accountStatusPromise;
  accountStatusUserId=user.id;
  accountStatusPromise=(async()=>{
    const {data,error}=await window.btvSupabase.from('user_status').select('status,reason').eq('user_id',user.id).maybeSingle();
    if(error){console.warn('Account status check failed:',error.message||error);return true}
    if(data?.status!=='suspended')return true;
    await window.btvSupabase.auth.signOut();
    alert('This account is suspended. Contact Beyond The Visa support for help.');
    location.reload();
    return false;
  })().finally(()=>{accountStatusPromise=null;accountStatusUserId=null});
  return accountStatusPromise;
};
