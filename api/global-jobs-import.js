const nhsHandler = require("./opportunity-import.js");
const usaHandler = require("./usa-jobs-import.js");
const { withRetry, safeExternalUrl } = require("./_lib/global-jobs-core.cjs");
const { SOURCES: liveInternationalSources, fetchLiveSource } = require("./_lib/international-jobs-live.cjs");
const { fetchReedJobs, testConnection: testReedConnection } = require("./_lib/reed-core.cjs");
const { fetchAdzunaJobs, testConnection: testAdzunaConnection } = require("./_lib/adzuna-core.cjs");
const { COUNTRIES: JOOBLE_COUNTRIES, SEARCH_BATCHES: JOOBLE_SEARCH_BATCHES, credentialError: joobleCredentialError, fetchCountryJobs: fetchJoobleCountryJobs, testConnection: testJoobleConnection, duplicateKey: joobleDuplicateKey, canonicalUrlKey: joobleUrlKey } = require("./_lib/jooble-core.cjs");
const { COUNTRIES: CAREERJET_COUNTRIES, SEARCH_BATCHES: CAREERJET_SEARCH_BATCHES, credentialError: careerjetCredentialError, fetchCountryJobs: fetchCareerjetCountryJobs, testConnection: testCareerjetConnection, duplicateKey: careerjetDuplicateKey, canonicalUrlKey: careerjetUrlKey } = require("./_lib/careerjet-core.cjs");

const env = (name) => process.env[name] || "";
const send = (res, status, body) => res.status(status).setHeader("cache-control", "private, no-store").setHeader("content-type", "application/json; charset=utf-8").send(JSON.stringify(body));

function providerCredentialIssue(provider) {
  const jooble = env("JOOBLE_API_KEY").trim(), careerjet = env("CAREERJET_AFFILIATE_ID").trim();
  if (provider === "jooble" && !jooble) return "JOOBLE_API_KEY is required.";
  if (provider === "careerjet" && !careerjet) return "CAREERJET_AFFILIATE_ID is required.";
  return null;
}

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
  for(let index=0;index<payload.length;index+=50) await rest("btv_jobs?on_conflict=source_name,country_code,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:payload.slice(index,index+50)});
  await rest(`btv_approved_sources?id=eq.${source.id}`,{method:"PATCH",body:{last_successful_run_at:now.toISOString(),last_error:null,last_status:"success",import_status:"active",updated_at:now.toISOString()}});
  return { status:200,body:{ok:true,provider:"REED",found:result.rawCount,imported:result.records.length,created,updated,unchanged,duplicates:result.duplicates,searches_run:result.searchesRun,details_fetched:result.detailsFetched} };
}

async function joobleSource(now) {
  const existing = await rest("btv_approved_sources?select=*&name=eq.jooble&limit=1");
  if (existing?.[0]?.id) return existing[0];
  const rows = await rest("btv_approved_sources?on_conflict=name", {
    method: "POST", prefer: "resolution=merge-duplicates,return=representation",
    body: {
      name: "jooble", source_type: "job", base_url: "https://jooble.org", source_url: "https://jooble.org",
      integration_type: "approved_api", enabled: false, permission_status: "approved", country_code: null,
      attribution_requirements: "Display Jooble as the source and retain the Jooble vacancy URL.",
      terms_notes: "Official Jooble REST API. JOOBLE_API_KEY remains server-side; no HTML pages are fetched.",
      republication_permitted: true, import_status: "pending_configuration", stale_after_hours: 72,
      configuration: { endpoint: "https://jooble.org/api/{api_key}", credential: "JOOBLE_API_KEY", schedule: "daily", max_pages_per_search: 1, results_per_page: 20, countries: Object.values(JOOBLE_COUNTRIES).map((country) => ({ code: country.code, domain: country.domain })) },
      updated_at: now.toISOString(),
    },
  });
  if (!rows?.[0]?.id) throw Object.assign(new Error("Jooble could not be registered."), { status: 503 });
  return rows[0];
}

function joobleExistingKeys(rows) {
  const urls = new Map(), identities = new Map();
  for (const row of rows || []) {
    const url = joobleUrlKey(row.canonical_url || row.source_url || row.application_url), identity = joobleDuplicateKey(row);
    if (url && !urls.has(url)) urls.set(url,row);
    if (identity && !identities.has(identity)) identities.set(identity,row);
  }
  return { urls, identities };
}

async function markMissingJoobleJobs(existing, seenExternalIds, now) {
  const active = (existing || []).filter((row) => row.source_name === "jooble" && !seenExternalIds.has(row.external_id) && ["published","active","closing_soon"].includes(row.status));
  const cutoff = now.getTime() - 14 * 86400000; let markedInactive = 0;
  const groups = new Map();
  for (const row of active) {
    const next = Math.min(99, Number(row.source_missing_runs || 0) + 1);
    const key = `${next}|${row.source_missing_since ? "existing" : "new"}`;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(row);
  }
  for (const [key,rows] of groups) {
    const [count,kind] = key.split("|");
    for (let index=0;index<rows.length;index+=100) {
      const body = { source_missing_runs:Number(count), updated_at:now.toISOString() };
      if (kind === "new") body.source_missing_since = now.toISOString();
      await rest(`btv_jobs?id=in.(${rows.slice(index,index+100).map((row)=>row.id).join(",")})`,{method:"PATCH",body});
    }
  }
  const inactive = active.filter((row) => Number(row.source_missing_runs || 0) + 1 >= 3 && new Date(row.source_missing_since || row.last_verified_at || now).getTime() <= cutoff);
  for (let index=0;index<inactive.length;index+=100) await rest(`btv_jobs?id=in.(${inactive.slice(index,index+100).map((row)=>row.id).join(",")})`,{method:"PATCH",body:{status:"archived",import_status:"stale",expired_at:now.toISOString(),updated_at:now.toISOString()}});
  markedInactive += inactive.length;
  return { count:markedInactive, externalIds:inactive.map((row)=>row.external_id) };
}

async function importJoobleCountry(source, country, now, { sample = false } = {}) {
  const result = await fetchJoobleCountryJobs({ apiKey:env("JOOBLE_API_KEY").trim(),country:country.key,keywordBatches:sample?["registered nurse"]:JOOBLE_SEARCH_BATCHES,maxPages:1,resultOnPage:sample?3:20,retries:2,now,logger:(event)=>console.warn("Jooble import event",JSON.stringify(event)) });
  const existing = await rest(`btv_jobs?select=id,source_id,source_name,external_id,canonical_url,source_url,application_url,title,employer,employer_name,location,country_code,content_hash,status,imported_at,last_verified_at,source_missing_runs,source_missing_since&country_code=eq.${country.code}&opportunity_type=eq.job&limit=10000`);
  const joobleByExternal = new Map((existing||[]).filter((row)=>row.source_name==="jooble").map((row)=>[row.external_id,row]));
  const keys = joobleExistingKeys(existing), seenExternalIds = new Set(), payload = [], sourceLinks = [];
  let created=0,updated=0,unchanged=0,crossSourceDuplicates=0;
  for(const job of result.records) {
    seenExternalIds.add(job.external_id);
    const old=joobleByExternal.get(job.external_id),url=joobleUrlKey(job.canonical_url),identity=joobleDuplicateKey(job);
    const owner=!old&&(keys.urls.get(url)||keys.identities.get(identity));
    if(owner) {
      crossSourceDuplicates+=1;
      sourceLinks.push({canonical_job_id:owner.id,duplicate_job_id:null,source_id:source.id,external_id:job.external_id,source_url:job.source_url});
      continue;
    }
    if(!old)created+=1;else if(old.content_hash!==job.content_hash||old.status==="archived"||old.status==="expired")updated+=1;else unchanged+=1;
    payload.push({...job,source_id:source.id,imported_at:old?.imported_at||job.imported_at,source_missing_runs:0,source_missing_since:null,expired_at:null});
    if(url)keys.urls.set(url,job);if(identity)keys.identities.set(identity,job);
  }
  for(let index=0;index<payload.length;index+=50)await rest("btv_jobs?on_conflict=source_name,country_code,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:payload.slice(index,index+50)});
  for(let index=0;index<sourceLinks.length;index+=50)await rest("btv_job_source_links?on_conflict=canonical_job_id,source_id,external_id",{method:"POST",prefer:"resolution=ignore-duplicates,return=minimal",body:sourceLinks.slice(index,index+50)});
  const stale=sample?{count:0,externalIds:[]}:await markMissingJoobleJobs(existing,seenExternalIds,now);
  if(country.code==="US") {
    const usaPayload=payload.map((job)=>({external_id:job.external_id,source_name:"jooble",source_job_url:job.source_url,canonical_application_url:job.application_url,employer_name:job.employer_name,job_title:job.title,nursing_specialty:job.specialty,employment_type:job.employment_type,city:job.city,state:job.region_or_state,country:"United States",country_code:"US",destination_country:"United States of America",salary_min:job.salary_min,salary_max:job.salary_max,salary_currency:"USD",salary_period:job.salary_period,description:job.description,qualifications:job.requirements||null,licence_requirements:job.registration_required||null,visa_sponsorship_status:"unclear",visa_sponsorship_verified:false,sponsorship_evidence:null,relocation_assistance:null,remote_status:job.raw_source_metadata?.remote_status||"not_stated",date_posted:job.published_at,closing_date:job.closing_at,imported_at:job.imported_at,last_checked_at:now.toISOString(),expires_at:job.closing_at,status:"active",attribution_text:"Jooble",content_fingerprint:job.content_hash,featured:false,updated_at:now.toISOString()}));
    for(let index=0;index<usaPayload.length;index+=50)await rest("btv_usa_jobs?on_conflict=source_name,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:usaPayload.slice(index,index+50)});
    for(let index=0;index<stale.externalIds.length;index+=100)await rest(`btv_usa_jobs?source_name=eq.jooble&external_id=in.(${stale.externalIds.slice(index,index+100).map(encodeURIComponent).join(",")})`,{method:"PATCH",body:{status:"expired",updated_at:now.toISOString()}});
  }
  return {country:country.name,country_code:country.code,requests_made:result.requestsMade,jobs_received:result.jobsReceived,jobs_valid:result.records.length,jobs_created:created,jobs_updated:updated,jobs_unchanged:unchanged,duplicates_skipped:result.duplicates+crossSourceDuplicates,jobs_invalid:result.invalid,jobs_marked_inactive:stale.count,errors:result.errors.slice(0,20)};
}

async function syncJoobleCountries(now, { sample = false, countryKey = null, parentId = null, triggeredBy = "admin" } = {}) {
  const source=await joobleSource(now), selected=countryKey?[JOOBLE_COUNTRIES[String(countryKey).toLowerCase()]].filter(Boolean):Object.values(JOOBLE_COUNTRIES);
  if(!selected.length)return{status:400,body:{ok:false,provider:"jooble",error:"Unsupported Jooble country."}};
  // A disabled provider must still permit the tightly bounded UK sample. That
  // sample is the validation gate an administrator uses before enabling the
  // scheduled multi-country sync.
  if((!source.enabled||source.permission_status!=="approved")&&!sample)return{status:200,body:{ok:true,provider:"jooble",status:"skipped",skipped:true,reason:"Jooble is disabled until its UK sample is validated and an administrator enables the source.",requests_made:0,jobs_received:0,jobs_created:0,jobs_updated:0,duplicates_skipped:0,jobs_marked_inactive:0,errors_by_country:{}}};
  const credentialIssue=providerCredentialIssue("jooble")||joobleCredentialError(env("JOOBLE_API_KEY").trim());
  if(credentialIssue)return{status:503,body:{ok:false,provider:"jooble",error:credentialIssue,requests_made:0,jobs_received:0,jobs_created:0,jobs_updated:0,duplicates_skipped:0,jobs_marked_inactive:0,errors_by_country:{}}};
  let run;
  try {
    const rows=await rest("btv_opportunity_import_runs",{method:"POST",prefer:"return=representation",body:{parent_run_id:parentId||null,source_id:source.id,run_scope:sample?"jooble_sample":"jooble_multi_country",triggered_by:triggeredBy,status:"running",started_at:now.toISOString(),final_status:"Running"}});run=rows?.[0];
  } catch(error) { if(error.status===409)return{status:409,body:{ok:false,provider:"jooble",error:"A Jooble sync is already running."}};throw error; }
  const outcomes=[],errorsByCountry={};
  for(const country of selected) {
    try { outcomes.push(await importJoobleCountry(source,country,now,{sample})); }
    catch(error) { const safe={country:country.name,country_code:country.code,error:String(error.message||"Jooble import failed.").slice(0,300),status:Number(error.status||500)};errorsByCountry[country.code]=safe.error;outcomes.push({...safe,requests_made:0,jobs_received:0,jobs_created:0,jobs_updated:0,jobs_unchanged:0,duplicates_skipped:0,jobs_marked_inactive:0});console.warn("Jooble country import failed",JSON.stringify({provider:"jooble",country_code:country.code,status:safe.status,code:error.code||"JOOBLE_IMPORT_FAILED"})); }
  }
  const sum=(key)=>outcomes.reduce((total,item)=>total+Number(item[key]||0),0),failures=outcomes.filter((item)=>item.error),status=failures.length===outcomes.length?"failed":failures.length?"partial":"success";
  const summary={ok:status!=="failed",provider:"jooble",status,countries:outcomes,requests_made:sum("requests_made"),jobs_received:sum("jobs_received"),jobs_created:sum("jobs_created"),jobs_updated:sum("jobs_updated"),jobs_unchanged:sum("jobs_unchanged"),duplicates_skipped:sum("duplicates_skipped"),jobs_marked_inactive:sum("jobs_marked_inactive"),errors_by_country:errorsByCountry};
  if(run?.id)await rest(`btv_opportunity_import_runs?id=eq.${run.id}`,{method:"PATCH",body:{status,final_status:status==="success"?"Successful":status==="partial"?"Successful with warnings":"Failed",completed_at:new Date().toISOString(),duration_ms:Date.now()-now.getTime(),records_fetched:summary.jobs_received,records_found:summary.jobs_received,records_created:summary.jobs_created,records_updated:summary.jobs_updated,records_unchanged:summary.jobs_unchanged,records_expired:summary.jobs_marked_inactive,records_failed:failures.length,requests_made:summary.requests_made,duplicates_skipped:summary.duplicates_skipped,provider_summary:summary,error_summary:failures.map((item)=>`${item.country_code}: ${item.error}`).join(" | ")||null}});
  await rest(`btv_approved_sources?id=eq.${source.id}`,{method:"PATCH",body:{last_attempted_at:now.toISOString(),last_successful_run_at:status!=="failed"?now.toISOString():source.last_successful_run_at||null,last_error:failures.length?failures.map((item)=>`${item.country_code}: ${item.error}`).join(" | ").slice(0,1000):null,last_status:status,import_status:failures.some((item)=>item.status===429)?"rate_limited":status==="failed"?"failed":"active",consecutive_failures:status==="failed"?Number(source.consecutive_failures||0)+1:0,updated_at:now.toISOString()}});
  return{status:status==="failed"?502:200,body:summary};
}

async function careerjetSource(now) {
  const existing = await rest("btv_approved_sources?select=*&name=eq.careerjet&limit=1");
  if (existing?.[0]?.id) return existing[0];
  const rows = await rest("btv_approved_sources?on_conflict=name", {
    method:"POST", prefer:"resolution=merge-duplicates,return=representation",
    body:{name:"careerjet",source_type:"job",base_url:"https://www.careerjet.com",source_url:"https://www.careerjet.com",integration_type:"approved_api",enabled:false,permission_status:"approved",country_code:null,attribution_requirements:"Display Careerjet as the source and retain the Careerjet vacancy URL.",terms_notes:"Official Careerjet v4 publisher API. CAREERJET_AFFILIATE_ID remains server-side; only the structured API is called.",republication_permitted:true,import_status:"pending_configuration",stale_after_hours:72,configuration:{endpoint:"https://search.api.careerjet.net/v4/query",credential:"CAREERJET_AFFILIATE_ID",schedule:"daily",rollout_phase:"sample_validation",sample:{country:"GB",keyword:"registered nurse",maximum_jobs:10},max_pages_per_search:1,results_per_page:20,countries:Object.values(CAREERJET_COUNTRIES).map((country)=>({code:country.code,locale:country.locale,site:country.site}))},updated_at:now.toISOString()}
  });
  if(!rows?.[0]?.id)throw Object.assign(new Error("Careerjet could not be registered."),{status:503});
  return rows[0];
}

function requestContext(req) {
  const forwarded=String(req.headers?.["x-forwarded-for"]||"").split(",")[0].trim();
  return {userIp:forwarded||String(req.headers?.["x-real-ip"]||"127.0.0.1"),userAgent:String(req.headers?.["user-agent"]||"BeyondTheVisa-JobsSync/1.0 (+https://beyondthevisa.uk/)")};
}

async function markMissingCareerjetJobs(existing,seenExternalIds,now) {
  const active=(existing||[]).filter((row)=>row.source_name==="careerjet"&&!seenExternalIds.has(row.external_id)&&["published","active","closing_soon"].includes(row.status));
  const cutoff=now.getTime()-14*86400000,groups=new Map();
  for(const row of active){const next=Math.min(99,Number(row.source_missing_runs||0)+1),key=`${next}|${row.source_missing_since?"existing":"new"}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  for(const [key,rows] of groups){const [count,kind]=key.split("|");for(let index=0;index<rows.length;index+=100){const body={source_missing_runs:Number(count),updated_at:now.toISOString()};if(kind==="new")body.source_missing_since=now.toISOString();await rest(`btv_jobs?id=in.(${rows.slice(index,index+100).map((row)=>row.id).join(",")})`,{method:"PATCH",body});}}
  const inactive=active.filter((row)=>Number(row.source_missing_runs||0)+1>=3&&new Date(row.source_missing_since||row.last_verified_at||now).getTime()<=cutoff);
  for(let index=0;index<inactive.length;index+=100)await rest(`btv_jobs?id=in.(${inactive.slice(index,index+100).map((row)=>row.id).join(",")})`,{method:"PATCH",body:{status:"archived",import_status:"stale",expired_at:now.toISOString(),updated_at:now.toISOString()}});
  return{count:inactive.length,externalIds:inactive.map((row)=>row.external_id)};
}

async function importCareerjetCountry(source,country,req,now,{sample=false}={}) {
  const context=requestContext(req),result=await fetchCareerjetCountryJobs({affiliateId:env("CAREERJET_AFFILIATE_ID").trim(),country:country.key,keywordBatches:sample?["registered nurse"]:CAREERJET_SEARCH_BATCHES,maxPages:1,pageSize:sample?10:20,maxJobs:sample?10:400,retries:2,now,...context,logger:(event)=>console.warn("Careerjet import event",JSON.stringify(event))});
  const existing=await rest(`btv_jobs?select=id,source_id,source_name,external_id,canonical_url,source_url,application_url,title,employer,employer_name,location,country_code,content_hash,status,imported_at,last_verified_at,source_missing_runs,source_missing_since&country_code=eq.${country.code}&opportunity_type=eq.job&limit=10000`);
  const byExternal=new Map((existing||[]).filter((row)=>row.source_name==="careerjet").map((row)=>[row.external_id,row])),urls=new Map(),identities=new Map();
  for(const row of existing||[]){const url=careerjetUrlKey(row.canonical_url||row.source_url||row.application_url),identity=careerjetDuplicateKey(row);if(url&&!urls.has(url))urls.set(url,row);if(identity&&!identities.has(identity))identities.set(identity,row);}
  const seenExternalIds=new Set(),payload=[],sourceLinks=[];let created=0,updated=0,unchanged=0,crossSourceDuplicates=0;
  for(const job of result.records){seenExternalIds.add(job.external_id);const old=byExternal.get(job.external_id),url=careerjetUrlKey(job.canonical_url),identity=careerjetDuplicateKey(job),owner=!old&&(urls.get(url)||identities.get(identity));if(owner){crossSourceDuplicates+=1;sourceLinks.push({canonical_job_id:owner.id,duplicate_job_id:null,source_id:source.id,external_id:job.external_id,source_url:job.source_url});continue;}if(!old)created+=1;else if(old.content_hash!==job.content_hash||["archived","expired"].includes(old.status))updated+=1;else unchanged+=1;payload.push({...job,source_id:source.id,imported_at:old?.imported_at||job.imported_at,source_missing_runs:0,source_missing_since:null,expired_at:null});if(url)urls.set(url,job);if(identity)identities.set(identity,job);}
  for(let index=0;index<payload.length;index+=50)await rest("btv_jobs?on_conflict=source_name,country_code,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:payload.slice(index,index+50)});
  for(let index=0;index<sourceLinks.length;index+=50)await rest("btv_job_source_links?on_conflict=canonical_job_id,source_id,external_id",{method:"POST",prefer:"resolution=ignore-duplicates,return=minimal",body:sourceLinks.slice(index,index+50)});
  const stale=sample?{count:0,externalIds:[]}:await markMissingCareerjetJobs(existing,seenExternalIds,now);
  if(country.code==="US"){
    const usaPayload=payload.map((job)=>({external_id:job.external_id,source_name:"careerjet",source_job_url:job.source_url,canonical_application_url:job.application_url,employer_name:job.employer_name,job_title:job.title,nursing_specialty:job.specialty,employment_type:job.employment_type,city:job.city,state:job.region_or_state,country:"United States",country_code:"US",destination_country:"United States of America",salary_min:job.salary_min,salary_max:job.salary_max,salary_currency:"USD",salary_period:job.salary_period,description:job.description,qualifications:job.requirements||null,licence_requirements:job.registration_required||null,visa_sponsorship_status:"unclear",visa_sponsorship_verified:false,sponsorship_evidence:null,relocation_assistance:null,remote_status:job.raw_source_metadata?.remote_status||"not_stated",date_posted:job.published_at,closing_date:job.closing_at,imported_at:job.imported_at,last_checked_at:now.toISOString(),expires_at:job.closing_at,status:"active",attribution_text:"Careerjet",content_fingerprint:job.content_hash,featured:false,updated_at:now.toISOString()}));
    for(let index=0;index<usaPayload.length;index+=50)await rest("btv_usa_jobs?on_conflict=source_name,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:usaPayload.slice(index,index+50)});
    for(let index=0;index<stale.externalIds.length;index+=100)await rest(`btv_usa_jobs?source_name=eq.careerjet&external_id=in.(${stale.externalIds.slice(index,index+100).map(encodeURIComponent).join(",")})`,{method:"PATCH",body:{status:"expired",updated_at:now.toISOString()}});
  }
  return{country:country.name,country_code:country.code,requests_made:result.requestsMade,jobs_received:result.jobsReceived,jobs_valid:result.records.length,jobs_created:created,jobs_updated:updated,jobs_unchanged:unchanged,duplicates_skipped:result.duplicates+crossSourceDuplicates,jobs_invalid:result.invalid,jobs_marked_inactive:stale.count,errors:result.errors.slice(0,20)};
}

async function syncCareerjetCountries(req,now,{sample=false,countryKey=null,parentId=null,triggeredBy="admin"}={}) {
  const source=await careerjetSource(now),selected=countryKey?[CAREERJET_COUNTRIES[String(countryKey).toLowerCase()]].filter(Boolean):Object.values(CAREERJET_COUNTRIES);
  if(!selected.length)return{status:400,body:{ok:false,provider:"careerjet",error:"Unsupported Careerjet country."}};
  if((!source.enabled||source.permission_status!=="approved")&&!sample)return{status:200,body:{ok:true,provider:"careerjet",status:"skipped",skipped:true,reason:"Careerjet is disabled until its UK sample is validated and an administrator enables the source.",requests_made:0,jobs_received:0,jobs_created:0,jobs_updated:0,duplicates_skipped:0,jobs_marked_inactive:0,errors_by_country:{}}};
  const credentialIssue=providerCredentialIssue("careerjet")||careerjetCredentialError(env("CAREERJET_AFFILIATE_ID").trim());
  if(credentialIssue)return{status:503,body:{ok:false,provider:"careerjet",error:credentialIssue,requests_made:0,jobs_received:0,jobs_created:0,jobs_updated:0,duplicates_skipped:0,jobs_marked_inactive:0,errors_by_country:{}}};
  let run;try{const rows=await rest("btv_opportunity_import_runs",{method:"POST",prefer:"return=representation",body:{parent_run_id:parentId||null,source_id:source.id,run_scope:sample?"careerjet_sample":"careerjet_multi_country",triggered_by:triggeredBy,status:"running",started_at:now.toISOString(),final_status:"Running"}});run=rows?.[0];}catch(error){if(error.status===409)return{status:409,body:{ok:false,provider:"careerjet",error:"A Careerjet sync is already running."}};throw error;}
  const outcomes=[],errorsByCountry={};for(const country of selected){try{outcomes.push(await importCareerjetCountry(source,country,req,now,{sample}));}catch(error){const safe={country:country.name,country_code:country.code,error:String(error.message||"Careerjet import failed.").slice(0,300),status:Number(error.status||500)};errorsByCountry[country.code]=safe.error;outcomes.push({...safe,requests_made:0,jobs_received:0,jobs_created:0,jobs_updated:0,jobs_unchanged:0,duplicates_skipped:0,jobs_marked_inactive:0});console.warn("Careerjet country import failed",JSON.stringify({provider:"careerjet",country_code:country.code,status:safe.status,code:error.code||"CAREERJET_IMPORT_FAILED"}));}}
  const sum=(key)=>outcomes.reduce((total,item)=>total+Number(item[key]||0),0),failures=outcomes.filter((item)=>item.error),status=failures.length===outcomes.length?"failed":failures.length?"partial":"success",summary={ok:status!=="failed",provider:"careerjet",status,countries:outcomes,requests_made:sum("requests_made"),jobs_received:sum("jobs_received"),jobs_created:sum("jobs_created"),jobs_imported:sum("jobs_created"),jobs_updated:sum("jobs_updated"),jobs_unchanged:sum("jobs_unchanged"),duplicates_skipped:sum("duplicates_skipped"),jobs_marked_inactive:sum("jobs_marked_inactive"),sync_failures:failures.length,errors_by_country:errorsByCountry};
  if(run?.id)await rest(`btv_opportunity_import_runs?id=eq.${run.id}`,{method:"PATCH",body:{status,final_status:status==="success"?"Successful":status==="partial"?"Successful with warnings":"Failed",completed_at:new Date().toISOString(),duration_ms:Date.now()-now.getTime(),records_fetched:summary.jobs_received,records_found:summary.jobs_received,records_created:summary.jobs_created,records_updated:summary.jobs_updated,records_unchanged:summary.jobs_unchanged,records_expired:summary.jobs_marked_inactive,records_failed:failures.length,requests_made:summary.requests_made,duplicates_skipped:summary.duplicates_skipped,provider_summary:summary,error_summary:failures.map((item)=>`${item.country_code}: ${item.error}`).join(" | ")||null}});
  await rest(`btv_approved_sources?id=eq.${source.id}`,{method:"PATCH",body:{last_attempted_at:now.toISOString(),last_successful_run_at:status!=="failed"?now.toISOString():source.last_successful_run_at||null,last_error:failures.length?failures.map((item)=>`${item.country_code}: ${item.error}`).join(" | ").slice(0,1000):null,last_status:status,import_status:failures.some((item)=>item.status===429)?"rate_limited":status==="failed"?"failed":"active",consecutive_failures:status==="failed"?Number(source.consecutive_failures||0)+1:0,updated_at:now.toISOString()}});
  return{status:status==="failed"?502:200,body:summary};
}

const ADZUNA_COUNTRIES = Object.freeze([
  { key:"gb",code:"GB",name:"United Kingdom",currency:"GBP" },
  { key:"us",code:"US",name:"United States",currency:"USD" },
  { key:"ca",code:"CA",name:"Canada",currency:"CAD",firstImportLimit:100 },
  { key:"au",code:"AU",name:"Australia",currency:"AUD",firstImportLimit:100 },
  { key:"nz",code:"NZ",name:"New Zealand",currency:"NZD",firstImportLimit:100 },
]);

async function importAdzunaCountry(now, country, { sample = false } = {}) {
  const sources = await rest("btv_approved_sources?select=id,name&name=eq.ADZUNA&limit=1");
  const source = sources?.[0];
  if (!source?.id) return { status:503,body:{ error:"The existing ADZUNA source could not be loaded." } };
  const result = await fetchAdzunaJobs({ appId:env("ADZUNA_APP_ID"),appKey:env("ADZUNA_APP_KEY"),countryCode:country.key,recordLimit:country.firstImportLimit||100,sample,now });
  const existing = await rest(`btv_jobs?select=id,external_id,content_hash,status,imported_at&source_name=eq.ADZUNA&country_code=eq.${country.code}&limit=3000`);
  const byExternal = new Map((existing||[]).map((row)=>[row.external_id,row])); let created=0,updated=0,unchanged=0;
  const payload=result.records.map((job)=>{ const old=byExternal.get(job.external_id); if(!old)created+=1; else if(old.content_hash!==job.content_fingerprint||old.status==="expired")updated+=1; else unchanged+=1; return {
    external_id:job.external_id,source_id:source.id,source_name:"ADZUNA",source_type:"aggregator_api",source_url:job.source_job_url,canonical_url:job.canonical_application_url,application_url:job.canonical_application_url,
    country:country.name,country_code:country.code,country_name:country.name,region:job.state,region_or_state:job.state,city:job.city,location:job.location_display,employer:job.employer_name,employer_name:job.employer_name,title:job.job_title,
    profession:"nurse",specialty:job.nursing_specialty,description:job.description,requirements:job.qualifications,registration_required:job.licence_requirements,salary_min:job.salary_min,salary_max:job.salary_max,currency:country.currency,salary_currency:country.currency,salary_period:job.salary_period,
    employment_type:job.employment_type,work_pattern:job.schedule,relocation_support_available:job.relocation_assistance,sponsorship_status:job.visa_sponsorship_status==="confirmed"?"confirmed":job.visa_sponsorship_status,visa_sponsorship:job.visa_sponsorship_status==="confirmed"&&job.visa_sponsorship_verified,sponsorship_evidence_text:job.sponsorship_evidence,
    published_at:job.date_posted,closing_at:job.closing_date,imported_at:old?.imported_at||job.imported_at,last_checked_at:job.last_checked_at,last_verified_at:job.last_checked_at,expires_at:job.expires_at,status:"published",verification_status:job.visa_sponsorship_verified?"verified":"pending",import_status:"active",opportunity_type:"job",job_reference:job.external_id,
    featured:false,is_featured:false,content_hash:job.content_fingerprint,raw_source_metadata:{attribution:"Jobs by Adzuna",source:"ADZUNA",country_code:country.key},updated_at:now.toISOString(),
  };});
  for(let index=0;index<payload.length;index+=50) await rest("btv_jobs?on_conflict=source_name,country_code,external_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:payload.slice(index,index+50)});
  return {status:200,body:{ok:true,provider:"ADZUNA",country:country.name,country_code:country.key,found:result.rawCount,imported:result.records.length,created,updated,unchanged,duplicates:result.duplicates,searches_run:result.searchesRun,pages_fetched:result.pagesFetched}};
}

async function syncAdzunaCountries(req, now, { sample = false } = {}) {
  const countries={};
  for(const country of ADZUNA_COUNTRIES) {
    try { countries[country.key]=await importAdzunaCountry(now,country,{sample}); }
    catch(error) { countries[country.key]={status:error.status||500,body:{ok:false,provider:"ADZUNA",country:country.name,country_code:country.key,error:`Adzuna ${country.name} import failed.`}}; }
  }
  const outcomes=Object.values(countries),successful=outcomes.filter((item)=>item.status<300),status=successful.length?200:Math.max(...outcomes.map((item)=>item.status));
  const sum=(key)=>outcomes.reduce((total,item)=>total+Number(item.body?.[key]||0),0);
  const source=(await rest("btv_approved_sources?select=id&name=eq.ADZUNA&limit=1"))?.[0];
  if(source?.id&&successful.length) await rest(`btv_approved_sources?id=eq.${source.id}`,{method:"PATCH",body:{last_successful_run_at:now.toISOString(),last_error:null,last_status:successful.length===outcomes.length?"success":"partial",import_status:"active",configuration:{credentials:["ADZUNA_APP_ID","ADZUNA_APP_KEY"],countries:ADZUNA_COUNTRIES.map((country)=>country.key),schedule:"daily",attribution:"Jobs by Adzuna"},updated_at:now.toISOString()}});
  return {status,body:{ok:status<300,provider:"ADZUNA",countries:Object.fromEntries(Object.entries(countries).map(([key,value])=>[key,value.body])),found:sum("found"),imported:sum("imported"),created:sum("created"),updated:sum("updated"),unchanged:sum("unchanged"),duplicates:sum("duplicates")}};
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
    if(String(req.query?.provider||"").toLowerCase()==="adzuna" && String(req.query?.country||"")) {
      const country=ADZUNA_COUNTRIES.find((item)=>item.key===String(req.query.country).toLowerCase());
      if(!country)return send(res,400,{error:"Unsupported Adzuna country."});
      if(String(req.query?.mode||"")==="connection-test") return send(res,200,await testAdzunaConnection({appId:env("ADZUNA_APP_ID"),appKey:env("ADZUNA_APP_KEY"),countryCode:country.key}));
      const result=await importAdzunaCountry(now,country,{sample:String(req.query?.mode||"")==="sample-import"}); return send(res,result.status,result.body);
    }
    if(String(req.query?.provider||"").toLowerCase()==="adzuna") {
      const result=await syncAdzunaCountries(req,now,{sample:String(req.query?.mode||"")==="sample-import"});
      const duplicates=result.status<300?await deduplicateUkJobs(now):0;
      return send(res,result.status,{...result.body,cross_source_duplicates:duplicates});
    }
    if(String(req.query?.provider||"").toLowerCase()==="jooble") {
      const country=String(req.query?.country||"").toLowerCase()||null;
      if(country&&!JOOBLE_COUNTRIES[country])return send(res,400,{error:"Unsupported Jooble country."});
      const credentialIssue=providerCredentialIssue("jooble");
      if(credentialIssue)return send(res,503,{ok:false,provider:"jooble",authentication_succeeded:false,error:credentialIssue,code:"JOOBLE_INVALID_CONFIGURATION"});
      if(String(req.query?.mode||"")==="connection-test"){
        const test=await testJoobleConnection({apiKey:env("JOOBLE_API_KEY").trim(),country:country||"gb"});
        return send(res,test.authentication_succeeded?200:502,test);
      }
      const result=await syncJoobleCountries(now,{sample:String(req.query?.mode||"")==="sample-import",countryKey:country,parentId:null,triggeredBy:caller.kind});
      return send(res,result.status,result.body);
    }
    if(String(req.query?.provider||"").toLowerCase()==="careerjet") {
      const country=String(req.query?.country||"").toLowerCase()||null;
      if(country&&!CAREERJET_COUNTRIES[country])return send(res,400,{error:"Unsupported Careerjet country."});
      const credentialIssue=providerCredentialIssue("careerjet");
      if(credentialIssue)return send(res,503,{ok:false,provider:"careerjet",authentication_succeeded:false,error:credentialIssue,code:"CAREERJET_INVALID_CONFIGURATION"});
      if(String(req.query?.mode||"")==="connection-test"){
        const test=await testCareerjetConnection({affiliateId:env("CAREERJET_AFFILIATE_ID").trim(),country:country||"gb",...requestContext(req)});
        return send(res,test.authentication_succeeded?200:502,test);
      }
      const result=await syncCareerjetCountries(req,now,{sample:String(req.query?.mode||"")==="sample-import",countryKey:country,parentId:null,triggeredBy:caller.kind});
      return send(res,result.status,result.body);
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
      { name:"jooble", run:()=>syncJoobleCountries(now,{parentId:parent.id,triggeredBy:caller.kind}) },
      { name:"careerjet", run:()=>syncCareerjetCountries(req,now,{parentId:parent.id,triggeredBy:caller.kind}) },
      ...liveInternationalSources.map((source) => ({ name: source.name, run: () => importInternationalSource(source, now) })),
    ];
    const results=[];
    for (const provider of providers) {
      const result = await withRetry(async()=>{ const response=await provider.run(); if (response.status===429||response.status>=500) throw Object.assign(new Error(response.body?.error||`${provider.name} import failed`),{status:response.status}); return response; },{retries:2,delay:(ms)=>new Promise((resolve)=>setTimeout(resolve,Math.min(ms,2000)))}).catch((error)=>({status:error.status||500,body:{error:error.message}}));
      results.push({provider:provider.name,...result});
    }
    const usaMirror = results.some((x)=>(x.provider==="USAJOBS"||x.provider==="ADZUNA")&&x.status<300) ? await mirrorUsaJobs(now) : {created:0,updated:0,unchanged:0,duplicates:0};
    const duplicates = await deduplicateUkJobs(now); const closedExpired = await expireJobs(now); await updateFreshness(now);
    const failed=results.filter((x)=>x.status>=300);
    for(const item of failed) {
      const source=await rest(`btv_approved_sources?select=id&name=eq.${encodeURIComponent(item.provider)}&limit=1`);
      await rest("btv_job_admin_alerts",{method:"POST",body:{source_id:source?.[0]?.id||null,severity:"critical",code:"DAILY_IMPORT_FAILED",title:`${item.provider} daily import failed`,details:String(item.body?.error||"Provider failure").slice(0,1000)}});
    }
    const created=results.reduce((n,x)=>n+Number(x.body?.created||x.body?.records_created||x.body?.jobs_created||0),0)+usaMirror.created;
    const updated=results.reduce((n,x)=>n+Number(x.body?.updated||x.body?.records_updated||x.body?.jobs_updated||0),0)+usaMirror.updated;
    const unchanged=results.reduce((n,x)=>n+Number(x.body?.unchanged||x.body?.records_unchanged||x.body?.jobs_unchanged||0),0)+usaMirror.unchanged;
    const found=results.reduce((n,x)=>n+Number(x.body?.found||x.body?.records_found||x.body?.jobs_received||0),0);
    const expired=closedExpired+results.reduce((n,x)=>n+Number(x.body?.jobs_marked_inactive||0),0);
    const status=failed.length===providers.length?"failed":failed.length?"partial":"success",finalStatus=status==="success"?"Successful":status==="partial"?"Successful with warnings":"Failed";
    await rest(`btv_opportunity_import_runs?id=eq.${parent.id}`,{method:"PATCH",body:{status,final_status:finalStatus,completed_at:new Date().toISOString(),duration_ms:Date.now()-start,records_fetched:found,records_found:found,records_created:created,records_updated:updated,records_unchanged:unchanged,records_expired:expired,records_failed:failed.length,error_summary:failed.map((x)=>`${x.provider}: ${x.body?.error}`).join(" | ")||null}});
    return send(res,status==="failed"?502:200,{ok:status!=="failed",status:finalStatus,providers:results.map((x)=>({name:x.provider,status:x.status<300?"Successful":"Failed",metrics:x.body})),created,updated,unchanged,duplicates,expired,duration_ms:Date.now()-start});
  } catch(error) {
    if(parent?.id) await rest(`btv_opportunity_import_runs?id=eq.${parent.id}`,{method:"PATCH",body:{status:"failed",final_status:"Failed",completed_at:new Date().toISOString(),duration_ms:Date.now()-start,records_failed:1,error_summary:String(error.message||error).slice(0,1000)}}).catch(()=>{});
    console.error("Global Jobs import failed",error); return send(res,error.status||500,{error:error.message||"Global Jobs import failed."});
  }
};
