// Beyond The Visa: send-email
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

const templates:any={
  study_plan_ready:(d:any)=>({subject:'Your Beyond The Visa study plan is ready',html:`<h1>Your study plan is ready</h1><p>Hello ${escapeHtml(d.name||'there')},</p><p>Your personalised study plan is available in Beyond The Visa.</p><p><a href="${escapeHtml(Deno.env.get('APP_URL')||'')}">Open the app</a></p>`}),
  booking_received:(d:any)=>({subject:'We received your coaching request',html:`<h1>Request received</h1><p>Hello ${escapeHtml(d.name||'there')},</p><p>We received your request for ${escapeHtml(d.service||'a Beyond The Visa service')}. We will contact you with the next available options.</p>`}),
  document_reminder:(d:any)=>({subject:'Your saved document reminder',html:`<h1>Document reminder</h1><p>Hello ${escapeHtml(d.name||'there')},</p><p>This is your requested reminder to review: <b>${escapeHtml(d.document||'your saved document')}</b>.</p><p>Please verify validity and requirements with the relevant official authority.</p>`})
};
Deno.serve(async req=>{const pre=options(req);if(pre)return pre;try{const user=await requireUser(req);await rateLimit(user.id,'send-email',5,3600);const body=await req.json(),make=templates[clean(body.template,40)];if(!make)return json({error:'Unsupported email template.'},400);const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('EMAIL_FROM');if(!key||!from)throw Object.assign(Error('Email service is not configured.'),{status:503});const message=make(body.data||{}),response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[user.email],subject:message.subject,html:message.html})});const result=await response.json();if(!response.ok)throw Object.assign(Error('Email could not be sent.'),{status:502});await admin().from('edge_email_events').insert({user_id:user.id,template:body.template,provider_id:result.id});return json({sent:true,id:result.id})}catch(e){return fail(e)}});
