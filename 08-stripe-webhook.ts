// Beyond The Visa: stripe-webhook
// Dashboard-ready single-file function. Generated from the tested v22 source.
import { createClient } from 'npm:@supabase/supabase-js@2';


const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{...cors,'Cache-Control':'no-store'}});
const options=(req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:cors}):null;
const clean=(value:unknown,max=2000)=>String(value??'').trim().slice(0,max);
const escapeHtml=(value:unknown)=>clean(value,5000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

function admin(){
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)throw Error('Supabase server credentials are unavailable.');
  return createClient(url,key,{auth:{persistSession:false}});
}
async function requireUser(req:Request){
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))throw Object.assign(Error('Sign in required.'),{status:401});
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!key)throw Error('Supabase authentication is unavailable.');
  const client=createClient(url,key,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data,error}=await client.auth.getUser();if(error||!data.user)throw Object.assign(Error('Your session is invalid or expired.'),{status:401});
  return data.user;
}
async function rateLimit(userId:string,action:string,limit:number,windowSeconds=60){
  const db=admin(),since=new Date(Date.now()-windowSeconds*1000).toISOString();
  const {count}=await db.from('edge_usage_events').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('action',action).gte('created_at',since);
  if((count||0)>=limit)throw Object.assign(Error('Too many requests. Please wait and try again.'),{status:429});
  await db.from('edge_usage_events').insert({user_id:userId,action});
}
function fail(error:unknown){const e=error as {message?:string;status?:number};console.error(e);return json({error:e.message||'Unexpected server error.'},e.status||500)}

async function openai(instructions:string,input:unknown,maxOutput=1200){
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)throw Object.assign(Error('AI service is not configured.'),{status:503});
  const model=Deno.env.get('OPENAI_MODEL')||'gpt-5.4-mini';
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input:typeof input==='string'?input:JSON.stringify(input),max_output_tokens:maxOutput})});
  if(!response.ok){const detail=await response.text();console.error('OpenAI',response.status,detail.slice(0,500));throw Object.assign(Error('AI service could not complete this request.'),{status:502})}
  const data=await response.json();const text=data.output_text||data.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('\n');
  if(!text)throw Object.assign(Error('AI service returned an empty response.'),{status:502});return {text,model,requestId:response.headers.get('x-request-id')};
}
function parseJson(text:string){const raw=text.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();return JSON.parse(raw)}

const hex=(buffer:ArrayBuffer)=>[...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function valid(payload:string,header:string,secret:string){const parts=Object.fromEntries(header.split(',').map(x=>x.split('=',2))),timestamp=Number(parts.t);if(!timestamp||Math.abs(Date.now()/1000-timestamp)>300)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${payload}`)));if(signature.length!==String(parts.v1||'').length)return false;let diff=0;for(let i=0;i<signature.length;i++)diff|=signature.charCodeAt(i)^String(parts.v1).charCodeAt(i);return diff===0}
Deno.serve(async req=>{if(req.method!=='POST')return json({error:'Method not allowed.'},405);try{const payload=await req.text(),signature=req.headers.get('stripe-signature')||'',secret=Deno.env.get('STRIPE_WEBHOOK_SECRET')||'';if(!secret||!await valid(payload,signature,secret))return json({error:'Invalid webhook signature.'},400);const event=JSON.parse(payload),db=admin();if(event.type==='checkout.session.completed'){const session=event.data.object,userId=session.metadata?.user_id,serviceCode=session.metadata?.service_code;if(userId){await db.from('payments').upsert({provider_event_id:event.id,user_id:userId,service_code:serviceCode,status:session.payment_status||'paid',amount_total:session.amount_total,currency:session.currency,checkout_session_id:session.id},{onConflict:'provider_event_id'});if(serviceCode==='premium_membership')await db.from('profiles').update({account_type:'premium'}).eq('id',userId)}}return json({received:true})}catch(error){console.error(error);return json({error:'Webhook processing failed.'},500)}});
