// Beyond The Visa: generate-study-plan
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

Deno.serve(async req=>{const pre=options(req);if(pre)return pre;try{const user=await requireUser(req);await rateLimit(user.id,'generate-study-plan',8);const body=await req.json(),weeks=Math.max(1,Math.min(12,Number(body.weeks)||4)),input={profession:clean(body.profession,40),exam_type:clean(body.exam_type,30),destination:clean(body.destination,80),goal:clean(body.goal,500),minutes_per_day:Math.max(15,Math.min(240,Number(body.minutes_per_day)||45)),weak_topics:Array.isArray(body.weak_topics)?body.weak_topics.slice(0,10).map((x:any)=>clean(x,80)):[],weeks};const result=await openai(`Create a realistic study plan for a nurse or midwife. Return JSON only with this exact shape: {"title":string,"summary":string,"weeks":[{"week":number,"focus":string,"objectives":[string],"activities":[string],"checkpoint":string}],"safety_note":string}. Produce exactly the requested number of weeks. Use the learner's weak topics. Do not claim that completing the plan guarantees exam success or professional registration. Encourage official exam blueprints, local policy and qualified clinical review.`,input,2200);let plan;try{plan=parseJson(result.text)}catch{throw Object.assign(Error('The study plan could not be structured. Please try again.'),{status:502})}if(!plan||!Array.isArray(plan.weeks))throw Object.assign(Error('The study plan format was invalid.'),{status:502});const db=admin(),{data,error}=await db.from('study_plans').insert({user_id:user.id,title:clean(plan.title,160),goal:input.goal,exam_type:input.exam_type,destination:input.destination,weeks:plan.weeks,summary:clean(plan.summary,1000),model:result.model}).select('id,created_at').single();if(error)throw error;return json({id:data.id,created_at:data.created_at,...plan,model:result.model})}catch(e){return fail(e)}});
