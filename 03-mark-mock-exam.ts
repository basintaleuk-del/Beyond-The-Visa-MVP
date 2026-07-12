// Beyond The Visa: mark-mock-exam
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

const norm=(v:any)=>[...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,1).toUpperCase()).filter(x=>/^[A-F]$/.test(x)))].sort();
Deno.serve(async req=>{const pre=options(req);if(pre)return pre;try{const user=await requireUser(req);await rateLimit(user.id,'mark-mock-exam',10);const body=await req.json(),kind=body.exam_type==='nclex'?'nclex':'cbt',answers=Array.isArray(body.answers)?body.answers.slice(0,200):[];if(!answers.length)return json({error:'Answers are required.'},400);const ids=answers.map((x:any)=>clean(x.question_id,80)).filter(Boolean),db=admin(),table=kind==='nclex'?'nclex_questions':'cbt_questions',fields=kind==='nclex'?'id,category,correct_options,rationale':'id,subject,correct_option,explanation';const {data:questions,error}=await db.from(table).select(fields).in('id',ids).eq('is_active',true);if(error)throw error;const map=new Map((questions||[]).map((q:any)=>[String(q.id),q])),details=answers.map((a:any)=>{const q:any=map.get(String(a.question_id));if(!q)return null;const selected=norm(a.selected_options),correct=norm(kind==='nclex'?q.correct_options:q.correct_option),ok=selected.join(',')===correct.join(',');return{question_id:q.id,topic:q.category||q.subject,is_correct:ok,selected_options:selected,correct_options:correct,explanation:q.rationale||q.explanation}}).filter(Boolean) as any[];if(!details.length)return json({error:'No active questions matched this examination.'},400);const score=details.filter(x=>x.is_correct).length,percentage=Math.round(score/details.length*100),topics:any={};for(const d of details){topics[d.topic]??={correct:0,total:0};topics[d.topic].total++;if(d.is_correct)topics[d.topic].correct++}const weak_topics=Object.entries(topics).map(([topic,x]:any)=>({topic,percentage:Math.round(x.correct/x.total*100),correct:x.correct,total:x.total})).sort((a,b)=>a.percentage-b.percentage);const {data:record,error:saveError}=await db.from('edge_mock_results').insert({user_id:user.id,exam_type:kind,score,total:details.length,percentage,weak_topics,answers:details}).select('id,created_at').single();if(saveError)throw saveError;return json({result_id:record.id,created_at:record.created_at,score,total:details.length,percentage,weak_topics,details})}catch(e){return fail(e)}});
