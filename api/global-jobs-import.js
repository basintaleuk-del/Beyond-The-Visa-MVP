const nhsHandler = require("./opportunity-import.js");
const usaHandler = require("./usa-jobs-import.js");
const { withRetry, safeExternalUrl } = require("./_lib/global-jobs-core.cjs");
const { SOURCES: liveInternationalSources, fetchLiveSource } = require("./_lib/international-jobs-live.cjs");
const { fetchReedJobs, testConnection: testReedConnection } = require("./_lib/reed-core.cjs");
const { fetchAdzunaJobs, testConnection: testAdzunaConnection } = require("./_lib/adzuna-core.cjs");

const env = (name) => process.env[name] || "";
const send = (res, status, body) => res.status(status).setHeader("cache-control", "private, no-store").setHeader("content-type", "application/json; charset=utf-8").send(JSON.stringify(body));

function headers(prefer) {
  const secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  const value = { apikey: secret, Authorization: `Bearer ${secret}`, "content-type": "application/json" };
  if (prefer) value.Prefer = prefer;
  return value;
}

async function rest(path, { method = "GET", body, prefer } = {}) {
  const base = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !secret) throw Object.assign(new Error("Global Jobs database environment is not configured."), { status: 503 });
  const response = await fetch(`${base}/rest/v1/${path}`, { method, headers: headers(prefer), body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error(text.slice(0, 500) || `Database request failed (${response.status}).`), { status: response.status });
  return text ? JSON.parse(text) : null;
}

async function authenticate(req) {
  const authorization = String(req.headers.authorization || ""), cronSecret = env("CRON_SECRET");
  if (cronSecret && authorization === `Bearer ${cronSecret}`) return { kind: "cron", authorization };
  const token = authorization.replace(/^Bearer\s+/i, ""), base = env("SUPABASE_URL"), publicKey = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
  if (!token || !base || !publicKey) return null;
  const user = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } });
  if (!user.ok) return null;
  const adminResponse = await fetch(`${base}/rest/v1/rpc/btv_is_admin`, { method: "POST", headers: { apikey: publicKey, Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: "{}" });
  return adminResponse.ok && await adminResponse.json() === true ? { kind: "admin", authorization } : null;
}

function invoke(handler, req, method = "GET", query = {}) {
  return new Promise((resolve, reject) => {
    let code = 200, settled = false;
    const finish = (payload) => { if (settled) return; settled = true; let body = payload; try { if (typeof payload === "string") body = JSON.parse(payload); } catch {} resolve({ status: code, body }); };
    const response = { status(value) { code = value; return this; }, setHeader() { return this; }, send: finish, json: finish };
    const delegatedRequest = { ...req, method, headers: req.headers || {}, query, body: {} };
    Promise.resolve(handler(delegatedRequest, response)).then(() => { if (!settled) finish({}); }).catch(reject);
  });
}

async function mirrorUsaJobs(now) {
  const [sources, jobs] = await Promise.all([
    rest("btv_approved_sources?select=id,name&name=in.(USAJOBS,ADZUNA)"),
    rest("btv_usa_jobs?select=*&limit=2000"),
  ]);
  const sourceIds = new Map((sources || []).map((row) => [row.name, row.id]));
  if (!sourceIds.size || !jobs?.length) return { created: 0, updated: 0, unchanged: 0, duplicates: 0 };
  const existing = await rest("btv_jobs?select=id,canonical_url,content_hash,status,imported_at&source_name=in.(USAJOBS,ADZUNA)&limit=3000");
  const byUrl = new Map((existing || []).map((row) => [row.canonical_url, row]));
  let created = 0, updated = 0, unchanged = 0;
  const payload = jobs.filter((row) => sourceIds.has(row.source_name) && safeExternalUrl(row.canonical_application_url)).map((row) => {
    const old = byUrl.get(row.canonical_application_url);
    if (!old) created += 1;
    else if (old.content_hash !== row.content_fingerprint) updated += 1;
    else unchanged += 1;
    return {
      external_id: row.external_id, source_id: sourceIds.get(row.source_name), source_name: row.source_name, source_type: row.source_name === "ADZUNA" ? "aggregator_api" : "official_api", source_url: row.source_job_url,
      canonical_url: row.canonical_application_url, application_url: row.canonical_application_url, country: "us", country_code: "US", country_name: "United States",
      region: row.state, region_or_state: row.state, city: row.city, location: [row.city,row.state].filter(Boolean).join(", "), employer: row.employer_name,
      employer_name: row.employer_name, title: row.job_title, profession: "nurse", specialty: row.nursing_specialty, description: row.description,
      requirements: row.qualifications, registration_required: row.licence_requirements, salary_min: row.salary_min, salary_max: row.salary_max,
      currency: row.salary_currency, salary_currency: row.salary_currency, salary_period: row.salary_period, employment_type: row.employment_type,
      relocation_support_available: row.relocation_assistance, sponsorship_status: row.visa_sponsorship_status === "confirmed" ? "confirmed" : row.visa_sponsorship_status,
      visa_sponsorship: row.visa_sponsorship_status === "confirmed" && row.visa_sponsorship_verified, sponsorship_evidence_text: row.sponsorship_evidence,
      published_at: row.date_posted, closing_at: row.closing_date, imported_at: old?.imported_at || row.imported_at, last_checked_at: row.last_checked_at,
      last_verified_at: row.last_checked_at, expires_at: row.expires_at, status: row.status === "active" ? "active" : row.status === "expired" ? "expired" : "archived",
      verification_status: row.visa_sponsorship_verified ? "verified" : "pending", import_status: "active", opportunity_type: "job", job_reference: row.external_id,
      featured: row.featured, is_featured: row.featured, content_hash: row.content_fingerprint, raw_source_metadata: { legacy_usa_job_id: row.id, attribution: row.attribution_text, remote_status: row.remote_status, source: row.source_name }, updated_at: now.toISOString(),
    };
  });
  for (let index = 0; index < payload.length; index += 100) await rest("btv_jobs?on_conflict=canonical_url", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: payload.slice(index,index+100) });
  return { created, updated, unchanged, duplicates: 0 };
}

async function importReedJobs(now, { sample = false } = {}) {
  const sourceRows = await rest("btv_approved_sources?on_conflict=name", {
    method: "POST", prefer: "resolution=merge-duplicates,return=representation",
    body: {
      name: "REED", source_type: "job", base_url: "https://www.reed.co.uk", source_url: "https://www.reed.co.uk/jobs",
      integration_type: "approved_api", enabled: true, permission_status: "approved", country_code: "GB",
      attribution_requirements: "Display a Reed source badge and retain the Reed application URL.",
      terms_notes: "Reed Jobseeker API version 1.0. Credentials remain server-side and applications continue on Reed.",
      republication_permitted: true, import_status: "active", stale_after_hours: 48,
      configuration: { api_version: "1.0", credential: "REED_API_KEY", schedule: "daily", sample_size: 10 }, updated_at: now.toISOString(),
    },
  });
  const source = sourceRows?.[0]; if (!source?.id) return { status:503,body:{ error:"REED could not be registered." } };
  const result = await fetchReedJobs({ apiKey:env("REED_API_KEY"),sample,now });
  const existing = await rest("btv_jobs?select=id,external_id,content_hash,status,imported_at&source_name=eq.REED&limit=2000");
  const byExternal = new Map((existing||[]).map((row)=>[row.external_id,row])); let created=0,updated=0,unchanged=0;
  const payload=result.records.map((job)=>{ const old=byExternal.get(job.external_id); if(!old)created+=1; else if(old.content_hash!==job.content_hash||old.status==="expired")updated+=1; else unchanged+=1; return {...job,source_id:source.id,imported_at:old?.imported_at||job.imported_at}; });
  for(let index=0;index<payload.length;index+=50) await rest("btv_jobs?on_conflict=source_name,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:payload.slice(index,index+50)});
  await rest(`btv_approved_sources?id=eq.${source.id}`,{method:"PATCH",body:{last_successful_run_at:now.toISOString(),last_error:null,last_status:"success",import_status:"active",updated_at:now.toISOString()}});
  return { status:200,body:{ok:true,provider:"REED",found:result.rawCount,imported:result.records.length,created,updated,unchanged,duplicates:result.duplicates,searches_run:result.searchesRun,details_fetched:result.detailsFetched} };
}

async function importAdzunaUkJobs(now, { sample = false } = {}) {
  const sources = await rest("btv_approved_sources?select=id,name&name=eq.ADZUNA&limit=1");
  const source = sources?.[0];
  if (!source?.id) return { status:503,body:{ error:"The existing ADZUNA source could not be loaded." } };
  const result = await fetchAdzunaJobs({ appId:env("ADZUNA_APP_ID"),appKey:env("ADZUNA_APP_KEY"),countryCode:"gb",sample,now });
  const existing = await rest("btv_jobs?select=id,external_id,content_hash,status,imported_at&source_name=eq.ADZUNA&country_code=eq.GB&limit=3000");
  const byExternal = new Map((existing||[]).map((row)=>[row.external_id,row])); let created=0,updated=0,unchanged=0;
  const payload=result.records.map((job)=>{ const old=byExternal.get(job.external_id); if(!old)created+=1; else if(old.content_hash!==job.content_fingerprint||old.status==="expired")updated+=1; else unchanged+=1; return {
    external_id:job.external_id,source_id:source.id,source_name:"ADZUNA",source_type:"aggregator_api",source_url:job.source_job_url,canonical_url:job.canonical_application_url,application_url:job.canonical_application_url,
    country:"uk",country_code:"GB",country_name:"United Kingdom",region:job.state,region_or_state:job.state,city:job.city,location:job.location_display,employer:job.employer_name,employer_name:job.employer_name,title:job.job_title,
    profession:"nurse",specialty:job.nursing_specialty,description:job.description,requirements:job.qualifications,registration_required:job.licence_requirements,salary_min:job.salary_min,salary_max:job.salary_max,currency:"GBP",salary_currency:"GBP",salary_period:job.salary_period,
    employment_type:job.employment_type,work_pattern:job.schedule,relocation_support_available:job.relocation_assistance,sponsorship_status:job.visa_sponsorship_status==="confirmed"?"confirmed":job.visa_sponsorship_status,visa_sponsorship:job.visa_sponsorship_status==="confirmed"&&job.visa_sponsorship_verified,sponsorship_evidence_text:job.sponsorship_evidence,
    published_at:job.date_posted,closing_at:job.closing_date,imported_at:old?.imported_at||job.imported_at,last_checked_at:job.last_checked_at,last_verified_at:job.last_checked_at,expires_at:job.expires_at,status:"published",verification_status:job.visa_sponsorship_verified?"verified":"pending",import_status:"active",opportunity_type:"job",job_reference:job.external_id,
    featured:false,is_featured:false,content_hash:job.content_fingerprint,raw_source_metadata:{attribution:"Jobs by Adzuna",source:"ADZUNA",country_code:"gb"},updated_at:now.toISOString(),
  };});
  for(let index=0;index<payload.length;index+=50) await rest("btv_jobs?on_conflict=source_name,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:payload.slice(index,index+50)});
  await rest(`btv_approved_sources?id=eq.${source.id}`,{method:"PATCH",body:{last_successful_run_at:now.toISOString(),last_error:null,last_status:"success",import_status:"active",configuration:{credentials:["ADZUNA_APP_ID","ADZUNA_APP_KEY"],countries:["us","gb"],schedule:"daily",attribution:"Jobs by Adzuna"},updated_at:now.toISOString()}});
  return {status:200,body:{ok:true,provider:"ADZUNA",country:"United Kingdom",found:result.rawCount,imported:result.records.length,created,updated,unchanged,duplicates:result.duplicates,searches_run:result.searchesRun}};
}

async function syncAdzunaCountries(req, now, { sample = false } = {}) {
  const us = await invoke(usaHandler,req,"GET",{provider:"adzuna",...(sample?{mode:"sample-import"}:{})});
  const gb = await importAdzunaUkJobs(now,{sample});
  const status = us.status < 300 || gb.status < 300 ? 200 : Math.max(us.status,gb.status);
  const sum=(key)=>Number(us.body?.[key]||0)+Number(gb.body?.[key]||0);
  return {status,body:{ok:status<300,provider:"ADZUNA",countries:{us:us.body,gb:gb.body},found:sum("found"),imported:sum("imported"),created:sum("created"),updated:sum("updated"),unchanged:sum("unchanged"),duplicates:sum("duplicates")}};
}

function normalizedUrl(value) { try { const url=new URL(String(value||"")); return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/g,"").toLowerCase()}`; } catch { return ""; } }
function normalizedIdentity(row) { const cleanPart=(value)=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); const parts=[cleanPart(row.title),cleanPart(row.employer||row.employer_name),cleanPart(row.location)]; return parts.every((part)=>part.length>2)?parts.join("|"):""; }
async function deduplicateUkJobs(now) {
  const rows=await rest("btv_jobs?select=id,source_name,source_url,canonical_url,application_url,title,employer,employer_name,location,published_at&country_code=eq.GB&source_name=in.(%22NHS%20Jobs%22,REED,ADZUNA)&status=in.(published,active,closing_soon)&expired_at=is.null&limit=10000");
  const priority={"NHS Jobs":0,REED:1,ADZUNA:2},ordered=[...(rows||[])].sort((a,b)=>(priority[a.source_name]??9)-(priority[b.source_name]??9)||new Date(b.published_at||0)-new Date(a.published_at||0));
  const urls=new Map(),identities=new Map(),duplicates=[];
  for(const row of ordered){ const url=normalizedUrl(row.canonical_url||row.source_url||row.application_url),identity=normalizedIdentity(row),urlOwner=url&&urls.get(url),identityOwner=identity&&identities.get(identity),owner=urlOwner||identityOwner; if(owner&&owner.source_name!==row.source_name){duplicates.push(row.id);continue;} if(url&&!urls.has(url))urls.set(url,row);if(identity&&!identities.has(identity))identities.set(identity,row); }
  for(let index=0;index<duplicates.length;index+=100) await rest(`btv_jobs?id=in.(${duplicates.slice(index,index+100).join(",")})`,{method:"PATCH",body:{status:"archived",import_status:"duplicate",expired_at:now.toISOString(),verification_notes:"Duplicate of another current UK source listing.",updated_at:now.toISOString()}});
  return duplicates.length;
}

async function importInternationalSource(source, now) {
  const sourceRows = await rest("btv_approved_sources?on_conflict=name", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      name: source.name, source_type: "job", base_url: new URL(source.url).origin, source_url: source.url,
      integration_type: "approved_api", enabled: true, permission_status: "approved",
      country_code: source.countryCode, attribution_requirements: `Attribute ${source.name} and retain the original vacancy URL.`,
      terms_notes: "Public official vacancy listings are indexed factually; applications remain on the recruiting organisation's website.",
      republication_permitted: true, import_status: "active", stale_after_hours: 48,
      configuration: { profession_filter: "nursing", apply_mode: "external", maximum_records: 40 },
      updated_at: now.toISOString(),
    },
  });
  const approved = sourceRows?.[0];
  if (!approved?.id) return { status: 503, body: { error: `${source.name} could not be registered.`, records_found: 0 } };
  const jobs = await fetchLiveSource(source);
  const existing = await rest(`btv_jobs?select=id,external_id,content_hash,status,imported_at&source_name=eq.${encodeURIComponent(source.name)}&limit=2000`);
  const byExternal = new Map((existing || []).map((row) => [row.external_id, row]));
  let created = 0, updated = 0, unchanged = 0;
  const payload = jobs.map((job) => {
    const old = byExternal.get(job.external_id);
    if (!old) created += 1;
    else if (old.content_hash !== job.content_hash || old.status === "expired") updated += 1;
    else unchanged += 1;
    return { ...job, source_id: approved.id, imported_at: old?.imported_at || now.toISOString() };
  });
  for (let index = 0; index < payload.length; index += 100) {
    await rest("btv_jobs?on_conflict=canonical_url", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: payload.slice(index, index + 100) });
  }
  // These public endpoints can be paginated or temporarily return a partial
  // first page. Never retire a valid listing merely because it was absent from
  // one response; expireJobs handles authoritative closing dates separately.
  await rest(`btv_approved_sources?id=eq.${approved.id}`, { method: "PATCH", body: { import_status: "active", last_status: "success", last_successful_run_at: now.toISOString(), updated_at: now.toISOString() } });
  return { status: 200, body: { records_found: jobs.length, records_created: created, records_updated: updated, records_unchanged: unchanged, records_expired: 0 } };
}

async function updateFreshness(now) {
  const sources = await rest("btv_approved_sources?select=id,name,enabled,permission_status,last_successful_run_at,stale_after_hours&source_type=eq.job");
  for (const source of sources || []) {
    if (!source.enabled || source.permission_status !== "approved") continue;
    const stale = !source.last_successful_run_at || now.getTime() - new Date(source.last_successful_run_at).getTime() > Number(source.stale_after_hours || 72) * 3600000;
    if (stale) {
      await rest(`btv_approved_sources?id=eq.${source.id}`, { method: "PATCH", body: { import_status: "stale", last_status: "stale", updated_at: now.toISOString() } });
      await rest("btv_job_admin_alerts", { method: "POST", body: { source_id: source.id, severity: "warning", code: "SOURCE_STALE", title: `${source.name} is stale`, details: "The source has not completed successfully inside its configured freshness window." } });
    }
  }
}

async function expireJobs(now) {
  const stamp = encodeURIComponent(now.toISOString()), soon = encodeURIComponent(new Date(now.getTime()+7*86400000).toISOString());
  const expired = await rest(`btv_jobs?select=id&opportunity_type=eq.job&status=in.(published,active,closing_soon)&closing_at=lt.${stamp}`);
  if (expired?.length) await rest(`btv_jobs?id=in.(${expired.map((x)=>x.id).join(",")})`, { method: "PATCH", body: { status: "expired", expired_at: now.toISOString(), import_status: "closed", updated_at: now.toISOString() } });
  await rest(`btv_jobs?opportunity_type=eq.job&status=in.(published,active)&closing_at=gte.${stamp}&closing_at=lte.${soon}`, { method: "PATCH", body: { status: "closing_soon", updated_at: now.toISOString() } });
  return expired?.length || 0;
}

module.exports = async function handler(req, res) {
  if (!["GET","POST"].includes(req.method)) return send(res,405,{ error:"Method not allowed" });
  const caller = await authenticate(req);
  if (!caller) return send(res,401,{ error:"Administrator or scheduled-import authentication is required." });
  const now = new Date(), start = Date.now(); let parent;
  try {
    if(String(req.query?.provider||"").toLowerCase()==="reed") {
      if(String(req.query?.mode||"")==="connection-test") return send(res,200,await testReedConnection({apiKey:env("REED_API_KEY")}));
      const result=await importReedJobs(now,{sample:String(req.query?.mode||"")==="sample-import"}); return send(res,result.status,result.body);
    }
    if(String(req.query?.provider||"").toLowerCase()==="adzuna" && String(req.query?.country||"").toLowerCase()==="gb") {
      if(String(req.query?.mode||"")==="connection-test") return send(res,200,await testAdzunaConnection({appId:env("ADZUNA_APP_ID"),appKey:env("ADZUNA_APP_KEY"),countryCode:"gb"}));
      const result=await importAdzunaUkJobs(now,{sample:String(req.query?.mode||"")==="sample-import"}); return send(res,result.status,result.body);
    }
    if(String(req.query?.provider||"").toLowerCase()==="adzuna") {
      const result=await syncAdzunaCountries(req,now,{sample:String(req.query?.mode||"")==="sample-import"});
      const duplicates=result.status<300?await deduplicateUkJobs(now):0;
      return send(res,result.status,{...result.body,cross_source_duplicates:duplicates});
    }
    await rest(`btv_opportunity_import_runs?run_scope=eq.global_daily&status=eq.running&started_at=lt.${encodeURIComponent(new Date(now.getTime()-3600000).toISOString())}`, { method:"PATCH", body:{ status:"failed",final_status:"Failed",completed_at:now.toISOString(),error_summary:"Stale global run released automatically." } });
    try {
      const rows = await rest("btv_opportunity_import_runs", { method:"POST",prefer:"return=representation",body:{ run_scope:"global_daily",triggered_by:caller.kind,status:"running",started_at:now.toISOString(),final_status:"Running" } }); parent=rows[0];
    } catch(error) { if (error.status===409) return send(res,409,{ error:"A global Jobs import is already running." }); throw error; }
    const providers = [
      { name:"NHS Jobs", run:()=>invoke(nhsHandler,req) },
      { name:"USAJOBS", run:()=>invoke(usaHandler,req) },
      { name:"ADZUNA", run:()=>syncAdzunaCountries(req,now) },
      { name:"REED", run:()=>importReedJobs(now) },
      ...liveInternationalSources.map((source) => ({ name: source.name, run: () => importInternationalSource(source, now) })),
    ];
    const results=[];
    for (const provider of providers) {
      const result = await withRetry(async()=>{ const response=await provider.run(); if (response.status===429||response.status>=500) throw Object.assign(new Error(response.body?.error||`${provider.name} import failed`),{status:response.status}); return response; },{retries:2,delay:(ms)=>new Promise((resolve)=>setTimeout(resolve,Math.min(ms,2000)))}).catch((error)=>({status:error.status||500,body:{error:error.message}}));
      results.push({provider:provider.name,...result});
    }
    const usaMirror = results.some((x)=>(x.provider==="USAJOBS"||x.provider==="ADZUNA")&&x.status<300) ? await mirrorUsaJobs(now) : {created:0,updated:0,unchanged:0,duplicates:0};
    const duplicates = await deduplicateUkJobs(now); const expired = await expireJobs(now); await updateFreshness(now);
    const failed=results.filter((x)=>x.status>=300);
    for(const item of failed) {
      const source=await rest(`btv_approved_sources?select=id&name=eq.${encodeURIComponent(item.provider)}&limit=1`);
      await rest("btv_job_admin_alerts",{method:"POST",body:{source_id:source?.[0]?.id||null,severity:"critical",code:"DAILY_IMPORT_FAILED",title:`${item.provider} daily import failed`,details:String(item.body?.error||"Provider failure").slice(0,1000)}});
    }
    const created=results.reduce((n,x)=>n+Number(x.body?.created||x.body?.records_created||0),0)+usaMirror.created;
    const updated=results.reduce((n,x)=>n+Number(x.body?.updated||x.body?.records_updated||0),0)+usaMirror.updated;
    const unchanged=results.reduce((n,x)=>n+Number(x.body?.unchanged||x.body?.records_unchanged||0),0)+usaMirror.unchanged;
    const found=results.reduce((n,x)=>n+Number(x.body?.found||x.body?.records_found||0),0);
    const status=failed.length===providers.length?"failed":failed.length?"partial":"success",finalStatus=status==="success"?"Successful":status==="partial"?"Successful with warnings":"Failed";
    await rest(`btv_opportunity_import_runs?id=eq.${parent.id}`,{method:"PATCH",body:{status,final_status:finalStatus,completed_at:new Date().toISOString(),duration_ms:Date.now()-start,records_fetched:found,records_found:found,records_created:created,records_updated:updated,records_unchanged:unchanged,records_expired:expired,records_failed:failed.length,error_summary:failed.map((x)=>`${x.provider}: ${x.body?.error}`).join(" | ")||null}});
    return send(res,status==="failed"?502:200,{ok:status!=="failed",status:finalStatus,providers:results.map((x)=>({name:x.provider,status:x.status<300?"Successful":"Failed",metrics:x.body})),created,updated,unchanged,duplicates,expired,duration_ms:Date.now()-start});
  } catch(error) {
    if(parent?.id) await rest(`btv_opportunity_import_runs?id=eq.${parent.id}`,{method:"PATCH",body:{status:"failed",final_status:"Failed",completed_at:new Date().toISOString(),duration_ms:Date.now()-start,records_failed:1,error_summary:String(error.message||error).slice(0,1000)}}).catch(()=>{});
    console.error("Global Jobs import failed",error); return send(res,error.status||500,{error:error.message||"Global Jobs import failed."});
  }
};
