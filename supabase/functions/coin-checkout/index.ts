import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 let admin:ReturnType<typeof createClient>|null=null,reference='';
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,secret=Deno.env.get('PAYSTACK_SECRET_KEY'),app=(Deno.env.get('APP_URL')||'').replace(/\/$/,'');
  const auth=req.headers.get('Authorization');if(!auth||!secret||!app)throw Object.assign(Error('Secure checkout is not configured.'),{status:503});
  const userDb=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});admin=createClient(url,service,{auth:{persistSession:false}});
  const {data:{user}}=await userDb.auth.getUser();if(!user?.email)throw Object.assign(Error('Sign in with a verified email before checkout.'),{status:401});
  const body=await req.json().catch(()=>({})),packageId=String(body.package_id||'');
  const {data:pack,error}=await admin.from('btv_coin_packages').select('*').eq('id',packageId).eq('is_active',true).single();if(error||!pack)throw Object.assign(Error('Coin package is unavailable.'),{status:404});
  reference=`btv-coins-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;const coins=Number(pack.coin_amount)+Number(pack.bonus_coins||0);
  const {error:insertError}=await admin.from('btv_coin_purchases').insert({user_id:user.id,package_id:pack.id,provider_reference:reference,amount_minor:Number(pack.price_minor),currency:String(pack.currency).toUpperCase(),coin_amount:coins,status:'pending'});if(insertError)throw insertError;
  const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,amount:String(pack.price_minor),currency:String(pack.currency).toUpperCase(),reference,callback_url:`${app}/index.html?coins=verify&reference=${encodeURIComponent(reference)}`,metadata:{purchase_reference:reference,user_id:user.id,package_id:pack.id,coins_expected:coins}})}),result=await response.json().catch(()=>({}));
  if(!response.ok||result.status!==true||!result.data?.authorization_url)throw Error(result.message||'Paystack could not initialise checkout.');
  return reply({url:result.data.authorization_url,reference});
 }catch(e:any){if(admin&&reference)await admin.from('btv_coin_purchases').update({status:'failed',failure_reason:String(e?.message||'Checkout initialization failed.').slice(0,500),updated_at:new Date().toISOString()}).eq('provider_reference',reference).eq('status','pending');return reply({error:e?.message||'Checkout failed.'},e?.status||400)}
});
