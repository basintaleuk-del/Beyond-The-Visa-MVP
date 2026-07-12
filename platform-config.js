/* Public browser configuration only. Never add service-role, OpenAI or Paystack secret keys here. */
window.BTV_SUPABASE_URL='https://wuvgktmzkzrdvbpqfmek.supabase.co';
window.BTV_VAPID_PUBLIC_KEY='BF9EVOqZwzPufhcP2315c2iHNT2K8MVlgoxeMZ2mhrLkEUu8uuRqcKZcQ7LF5SrLKqXwnSAkn8d22r4P-rveEHY';
const vapidMeta=document.createElement('meta');vapidMeta.name='btv-vapid-key';vapidMeta.content=window.BTV_VAPID_PUBLIC_KEY;document.head.append(vapidMeta);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
window.btvSupabase?.auth.onAuthStateChange((event,session)=>{if(!session?.user)return;setTimeout(async()=>{const {data}=await window.btvSupabase.from('user_status').select('status,reason').eq('user_id',session.user.id).maybeSingle();if(data?.status==='suspended'){await window.btvSupabase.auth.signOut();alert('This account is suspended. Contact Beyond The Visa support for help.');location.reload()}},0)});
