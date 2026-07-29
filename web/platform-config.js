/* Public browser configuration only. Never add service-role, OpenAI or Paystack secret keys here. */
window.BTV_SUPABASE_URL='https://wuvgktmzkzrdvbpqfmek.supabase.co';
window.BTV_VAPID_PUBLIC_KEY='';
const vapidMeta=document.createElement('meta');vapidMeta.name='btv-vapid-key';vapidMeta.content=window.BTV_VAPID_PUBLIC_KEY;document.head.append(vapidMeta);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=173',{updateViaCache:'none'}).then(reg=>reg.update()).catch(console.warn);
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
