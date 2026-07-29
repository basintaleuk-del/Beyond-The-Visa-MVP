const { countryForPathway, safeExternalUrl, plainText } = require("./_lib/global-jobs-core.cjs");
const { getDevelopmentSamples } = require("./_lib/global-job-samples.cjs");

const env = (name) => process.env[name] || "";
const reply = (res,status,body) => res.status(status).setHeader("cache-control","private, no-store").setHeader("content-type","application/json; charset=utf-8").send(JSON.stringify(body));

function serviceHeaders(prefer) {
  const secret=env("SUPABASE_SECRET_KEY")||env("SUPABASE_SERVICE_ROLE_KEY"),headers={apikey:secret,Authorization:`Bearer ${secret}`,"content-type":"application/json"};
  if(prefer)headers.Prefer=prefer;return headers;
}
async function rest(path,{method="GET",body,prefer}={}) {
  const base=env("SUPABASE_URL"),secret=env("SUPABASE_SECRET_KEY")||env("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!secret)throw Object.assign(new Error("Jobs database environment is not configured."),{status:503});
  const response=await fetch(`${base}/rest/v1/${path}`,{method,headers:serviceHeaders(prefer),body:body===undefined?undefined:JSON.stringify(body)}),text=await response.text();
  if(!response.ok)throw Object.assign(new Error(text.slice(0,400)||`Database request failed (${response.status}).`),{status:response.status});
  return text?JSON.parse(text):null;
}
async function userFor(req){
  const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,""),base=env("SUPABASE_URL"),key=env("SUPABASE_PUBLISHABLE_KEY")||env("SUPABASE_ANON_KEY");
  if(!token||!base||!key)return null;const response=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});return response.ok?response.json():null;
}
const allowedStatuses=new Set(["published","active","closing_soon"]);
const closeDate=(row)=>row.closing_at||row.closing_date||null;
const words=(value)=>plainText(value,500).toLowerCase();
function present(row,profile){
  const closing=closeDate(row),registration=row.registration_status||row.registration_required||"Requirement not stated",sponsor=row.sponsorship_status||"not_stated",overseas=row.overseas_applicants_status||"not_stated";
  let score=55,reasons=["Destination matches"];
  if(profile.profession&&[row.profession,"both"].includes(profile.profession)){score+=15;reasons.push("Profession matches")}
  if(sponsor==="confirmed"){score+=15;reasons.push("Sponsorship confirmed")}
  if(overseas==="accepted"){score+=10;reasons.push("Overseas applicants accepted")}
  if(row.registration_required){score+=5;reasons.push("Registration requirement stated")}
  return {...row,application_url:safeExternalUrl(row.application_url),source_url:safeExternalUrl(row.source_url),closing_date:closing,match_score:Math.min(100,score),match_reasons:reasons,registration_label:registration,
    sponsorship_label:sponsor==="confirmed"?"Sponsorship available":sponsor==="not_offered"?"Sponsorship not offered":"Sponsorship not stated",
    overseas_label:overseas==="accepted"?"Overseas applicants accepted":overseas==="not_accepted"?"Overseas applicants not accepted":"Overseas applicant status not stated"};
}
function filterRows(rows,query){
  const q=words(query.q),title=words(query.title),profession=words(query.profession),specialty=words(query.specialty),employer=words(query.employer),region=words(query.region),city=words(query.city),contract=words(query.contract_type),pattern=words(query.work_pattern),registration=words(query.registration_body);
  const postedDays=Math.max(0,Number(query.posted_days||0)),postedAfter=postedDays?Date.now()-postedDays*86400000:0,salaryMin=Math.max(0,Number(query.salary_min||0));
  return rows.filter((row)=>{
    const close=closeDate(row);if(!allowedStatuses.has(row.status)||row.expired_at||close&&new Date(close)<new Date())return false;
    if(q&&!words(`${row.title} ${row.summary} ${row.description} ${row.employer_name} ${row.location}`).includes(q))return false;
    if(title&&!words(row.title).includes(title)||profession&&!words(row.profession).includes(profession)||specialty&&!words(row.specialty).includes(specialty)||employer&&!words(row.employer_name||row.employer).includes(employer))return false;
    if(region&&!words(row.region_or_state||row.region).includes(region)||city&&!words(row.city).includes(city)||contract&&!words(row.contract_type||row.employment_type).includes(contract)||pattern&&!words(row.work_pattern||row.working_pattern).includes(pattern))return false;
    if(registration&&!words(row.registration_body||row.registration_required).includes(registration))return false;
    if(query.sponsorship==="confirmed"&&row.sponsorship_status!=="confirmed"||query.overseas==="accepted"&&row.overseas_applicants_status!=="accepted")return false;
    if(salaryMin&&Number(row.salary_max||row.salary_min||0)<salaryMin||postedAfter&&new Date(row.published_at||row.created_at||0).getTime()<postedAfter)return false;
    if(query.closing_soon==="true"&&!(close&&new Date(close).getTime()<=Date.now()+7*86400000))return false;return true;
  });
}
function sortRows(rows,sort){
  const copy=[...rows];if(sort==="closing")return copy.sort((a,b)=>new Date(closeDate(a)||"2999-01-01")-new Date(closeDate(b)||"2999-01-01"));
  if(sort==="salary_asc")return copy.sort((a,b)=>Number(a.salary_min||a.salary_max||Number.MAX_SAFE_INTEGER)-Number(b.salary_min||b.salary_max||Number.MAX_SAFE_INTEGER));
  if(sort==="salary_desc")return copy.sort((a,b)=>Number(b.salary_max||b.salary_min||0)-Number(a.salary_max||a.salary_min||0));
  if(sort==="recent")return copy.sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0));
  return copy.sort((a,b)=>Number(b.match_score||0)-Number(a.match_score||0)||new Date(b.published_at||0)-new Date(a.published_at||0));
}
async function context(userId){const rows=await rest(`profiles?select=destination_country,profession&id=eq.${encodeURIComponent(userId)}&limit=1`),profile=rows?.[0]||{};return{profile,country:countryForPathway(profile.destination_country)}}
async function bodyFor(req){if(typeof req.body==="string")return JSON.parse(req.body||"{}");return req.body||{}}

module.exports=async function handler(req,res){
  if(!["GET","POST"].includes(req.method))return reply(res,405,{error:"Method not allowed"});
  try{
    const user=await userFor(req);if(!user?.id)return reply(res,401,{error:"Sign in to view personalised healthcare jobs."});
    const {profile,country}=await context(user.id);
    if(req.method==="POST"){
      const body=await bodyFor(req),action=String(body.action||"");
      if(action==="save"){
        if(!/^[0-9a-f-]{36}$/i.test(String(body.job_id||"")))return reply(res,400,{error:"Valid job ID required."});
        const jobs=await rest(`btv_jobs?select=id,country_code&id=eq.${encodeURIComponent(body.job_id)}&limit=1`);if(!jobs?.[0])return reply(res,404,{error:"Job not found."});
        if(body.saved===false)await rest(`btv_saved_jobs?user_id=eq.${user.id}&job_id=eq.${jobs[0].id}`,{method:"DELETE"});
        else await rest("btv_saved_jobs?on_conflict=user_id,job_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{user_id:user.id,job_id:jobs[0].id}});
        return reply(res,200,{saved:body.saved!==false});
      }
      if(action==="alert"){
        if(!country)return reply(res,409,{code:"DESTINATION_REQUIRED",error:"Choose your destination before creating a job alert."});
        const payload={user_id:user.id,country_code:country.code,profession:plainText(body.profession,100)||null,specialties:Array.isArray(body.specialties)?body.specialties.map((x)=>plainText(x,100)).filter(Boolean).slice(0,20):[],locations:Array.isArray(body.locations)?body.locations.map((x)=>plainText(x,120)).filter(Boolean).slice(0,20):[],sponsorship_preference:body.sponsorship_preference==="confirmed"?"confirmed":"any",employment_types:Array.isArray(body.employment_types)?body.employment_types.map((x)=>plainText(x,100)).filter(Boolean).slice(0,20):[],frequency:body.frequency==="weekly"?"weekly":"daily",is_active:body.is_active!==false,updated_at:new Date().toISOString()};
        const rows=await rest("btv_job_alerts",{method:"POST",prefer:"return=representation",body:payload});return reply(res,200,{alert:rows?.[0]});
      }
      if(action==="submit_application"){
        const jobId=String(body.job_id||"");
        if(!/^[0-9a-f-]{36}$/i.test(jobId))return reply(res,400,{error:"Valid job ID required."});
        const jobs=await rest(`btv_jobs?select=id,country_code,employer_name,employer,title,application_url,application_kind,status,expired_at,closing_at&id=eq.${encodeURIComponent(jobId)}&limit=1`),job=jobs?.[0];
        const closing=closeDate(job||{});
        if(!job||!allowedStatuses.has(job.status)||job.expired_at||closing&&new Date(closing)<new Date())return reply(res,404,{error:"This vacancy is no longer active."});
        if(country&&job.country_code&&job.country_code!==country.code)return reply(res,409,{error:"This vacancy does not match your selected destination."});
        const applicantName=plainText(body.applicant_name,200),applicantEmail=plainText(body.applicant_email,320).toLowerCase(),supportingStatement=plainText(body.supporting_statement,8000);
        if(applicantName.length<2)return reply(res,400,{error:"Enter your full name."});
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail))return reply(res,400,{error:"Enter a valid email address."});
        if(supportingStatement.length<40)return reply(res,400,{error:"Add a supporting statement of at least 40 characters."});
        if(body.consent_confirmed!==true)return reply(res,400,{error:"Confirm that Beyond The Visa may store this application."});
        const external=job.application_kind!=="internal",now=new Date().toISOString(),sourceUrl=safeExternalUrl(job.application_url);
        const payload={user_id:user.id,job_id:job.id,country_code:job.country_code,employer:job.employer_name||job.employer,role:job.title,
          status:external?"external_submission_required":"submitted",applicant_name:applicantName,applicant_email:applicantEmail,
          applicant_phone:plainText(body.applicant_phone,80)||null,current_country:plainText(body.current_country,120)||null,
          professional_title:plainText(body.professional_title,160)||null,professional_registration:plainText(body.professional_registration,300)||null,
          work_authorisation:plainText(body.work_authorisation,300)||null,sponsorship_required:body.sponsorship_required===true,
          experience_summary:plainText(body.experience_summary,3000)||null,supporting_statement:supportingStatement,consent_confirmed:true,
          submitted_at:now,applied_at:external?null:now,employer_submission_required:external,source_application_url:sourceUrl,updated_at:now};
        await rest("btv_job_applications?on_conflict=user_id,job_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:payload});
        return reply(res,200,{status:payload.status,employer_submission_required:external,application_url:sourceUrl,message:external?"Your application workspace is saved. Complete the employer's official form to be considered for this vacancy.":"Your application has been submitted on Beyond The Visa."});
      }
      if(action==="track_application"){
        if(!/^[0-9a-f-]{36}$/i.test(String(body.job_id||"")))return reply(res,400,{error:"Valid job ID required."});
        const jobs=await rest(`btv_jobs?select=id,country_code,employer_name,employer,title,application_url&id=eq.${encodeURIComponent(body.job_id)}&limit=1`),job=jobs?.[0];
        if(!job||!safeExternalUrl(job.application_url))return reply(res,404,{error:"An active official application link was not found."});
        await rest("btv_job_applications?on_conflict=user_id,job_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{user_id:user.id,job_id:job.id,country_code:job.country_code,employer:job.employer_name||job.employer,role:job.title,status:"applied",applied_at:new Date().toISOString(),updated_at:new Date().toISOString()}});
        return reply(res,200,{application_url:job.application_url,external:true});
      }
      return reply(res,400,{error:"Unsupported Jobs action."});
    }
    if(req.query.view==="saved"){
      const saves=await rest(`btv_saved_jobs?select=job_id,saved_at&user_id=eq.${user.id}&order=saved_at.desc`),ids=(saves||[]).map((x)=>x.job_id);
      const rows=ids.length?await rest(`btv_jobs?select=*&id=in.(${ids.join(",")})`):[],savedAt=new Map((saves||[]).map((x)=>[x.job_id,x.saved_at]));
      return reply(res,200,{destination:country,jobs:(rows||[]).map((x)=>({...present(x,profile),saved_at:savedAt.get(x.id),outside_pathway:country?x.country_code!==country.code:true})),grouped:true});
    }
    if(!country)return reply(res,200,{destination:null,jobs:[],total:0,code:"DESTINATION_REQUIRED",choose_destination_route:"journey"});
    const id=String(req.query.id||"");
    if(id){if(!/^[0-9a-f-]{36}$/i.test(id))return reply(res,400,{error:"Invalid job ID."});const rows=await rest(`btv_jobs?select=*&id=eq.${encodeURIComponent(id)}&country_code=eq.${country.code}&opportunity_type=eq.job&limit=1`),job=rows?.[0]||getDevelopmentSamples().find((x)=>x.id===id&&x.country_code===country.code);if(!job||!allowedStatuses.has(job.status)||job.expired_at||closeDate(job)&&new Date(closeDate(job))<new Date())return reply(res,404,{error:"This vacancy is not active for your selected pathway."});return reply(res,200,{destination:country,job:present(job,profile)});}
    const rows=await rest(`btv_jobs?select=*&country_code=eq.${country.code}&opportunity_type=eq.job&status=in.(published,active,closing_soon)&expired_at=is.null&order=featured.desc,published_at.desc&limit=2000`),sourceRows=rows?.length?rows:getDevelopmentSamples().filter((x)=>x.country_code===country.code),presented=sourceRows.map((x)=>present(x,profile)),filtered=sortRows(filterRows(presented,req.query),String(req.query.sort||"best"));
    const limit=Math.min(100,Math.max(1,Number(req.query.limit)||24)),page=Math.max(1,Number(req.query.page)||1),start=(page-1)*limit,pageRows=filtered.slice(start,start+limit);
    const pageIds=pageRows.map((row)=>row.id),savedRows=pageIds.length?await rest(`btv_saved_jobs?select=job_id&user_id=eq.${user.id}&job_id=in.(${pageIds.join(",")})`):[],savedIds=new Set((savedRows||[]).map((row)=>row.job_id));
    return reply(res,200,{destination:country,jobs:pageRows.map((row)=>({...row,is_saved:savedIds.has(row.id)})),total:filtered.length,page,limit,recently_added:filtered.filter((x)=>new Date(x.published_at||0).getTime()>=Date.now()-7*86400000).length});
  }catch(error){console.error("Jobs API failed",error);return reply(res,error.status||500,{error:error.message||"Jobs could not be loaded."})}
};
