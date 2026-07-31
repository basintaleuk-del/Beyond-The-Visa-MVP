const nhsHandler = require("./opportunity-import.js");
const usaHandler = require("./usa-jobs-import.js");
const { withRetry, safeExternalUrl } = require("./_lib/global-jobs-core.cjs");
const { SOURCES: liveInternationalSources, fetchLiveSource } = require("./_lib/international-jobs-live.cjs");

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

function invoke(handler, req, method = "GET") {
  return new Promise((resolve, reject) => {
    let code = 200, settled = false;
    const finish = (payload) => { if (settled) return; settled = true; let body = payload; try { if (typeof payload === "string") body = JSON.parse(payload); } catch {} resolve({ status: code, body }); };
    const response = { status(value) { code = value; return this; }, setHeader() { return this; }, send: finish, json: finish };
    const delegatedRequest = { ...req, method, headers: req.headers || {}, query: {}, body: {} };
    Promise.resolve(handler(delegatedRequest, response)).then(() => { if (!settled) finish({}); }).catch(reject);
  });
}

async function mirrorUsaJobs(now) {
  const [sources, jobs] = await Promise.all([
    rest("btv_approved_sources?select=id&name=eq.USAJOBS&limit=1"),
    rest("btv_usa_jobs?select=*&limit=2000"),
  ]);
  const sourceId = sources?.[0]?.id;
  if (!sourceId || !jobs?.length) return { created: 0, updated: 0, unchanged: 0, duplicates: 0 };
  const existing = await rest("btv_jobs?select=id,canonical_url,content_hash,status,imported_at&source_name=eq.USAJOBS&limit=2000");
  const byUrl = new Map((existing || []).map((row) => [row.canonical_url, row]));
  let created = 0, updated = 0, unchanged = 0;
  const payload = jobs.filter((row) => safeExternalUrl(row.canonical_application_url)).map((row) => {
    const old = byUrl.get(row.canonical_application_url);
    if (!old) created += 1;
    else if (old.content_hash !== row.content_fingerprint) updated += 1;
    else unchanged += 1;
    return {
      external_id: row.external_id, source_id: sourceId, source_name: "USAJOBS", source_type: "official_api", source_url: row.source_job_url,
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
      featured: row.featured, is_featured: row.featured, content_hash: row.content_fingerprint, raw_source_metadata: { legacy_usa_job_id: row.id, attribution: row.attribution_text, remote_status: row.remote_status }, updated_at: now.toISOString(),
    };
  });
  for (let index = 0; index < payload.length; index += 100) await rest("btv_jobs?on_conflict=canonical_url", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: payload.slice(index,index+100) });
  return { created, updated, unchanged, duplicates: 0 };
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
    await rest(`btv_opportunity_import_runs?run_scope=eq.global_daily&status=eq.running&started_at=lt.${encodeURIComponent(new Date(now.getTime()-3600000).toISOString())}`, { method:"PATCH", body:{ status:"failed",final_status:"Failed",completed_at:now.toISOString(),error_summary:"Stale global run released automatically." } });
    try {
      const rows = await rest("btv_opportunity_import_runs", { method:"POST",prefer:"return=representation",body:{ run_scope:"global_daily",triggered_by:caller.kind,status:"running",started_at:now.toISOString(),final_status:"Running" } }); parent=rows[0];
    } catch(error) { if (error.status===409) return send(res,409,{ error:"A global Jobs import is already running." }); throw error; }
    const providers = [
      { name:"NHS Jobs", run:()=>invoke(nhsHandler,req) },
      { name:"USAJOBS", run:()=>invoke(usaHandler,req) },
      ...liveInternationalSources.map((source) => ({ name: source.name, run: () => importInternationalSource(source, now) })),
    ];
    const results=[];
    for (const provider of providers) {
      const result = await withRetry(async()=>{ const response=await provider.run(); if (response.status===429||response.status>=500) throw Object.assign(new Error(response.body?.error||`${provider.name} import failed`),{status:response.status}); return response; },{retries:2,delay:(ms)=>new Promise((resolve)=>setTimeout(resolve,Math.min(ms,2000)))}).catch((error)=>({status:error.status||500,body:{error:error.message}}));
      results.push({provider:provider.name,...result});
    }
    const usaMirror = results.find((x)=>x.provider==="USAJOBS"&&x.status<300) ? await mirrorUsaJobs(now) : {created:0,updated:0,unchanged:0,duplicates:0};
    const expired = await expireJobs(now); await updateFreshness(now);
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
    return send(res,status==="failed"?502:200,{ok:status!=="failed",status:finalStatus,providers:results.map((x)=>({name:x.provider,status:x.status<300?"Successful":"Failed",metrics:x.body})),created,updated,unchanged,expired,duration_ms:Date.now()-start});
  } catch(error) {
    if(parent?.id) await rest(`btv_opportunity_import_runs?id=eq.${parent.id}`,{method:"PATCH",body:{status:"failed",final_status:"Failed",completed_at:new Date().toISOString(),duration_ms:Date.now()-start,records_failed:1,error_summary:String(error.message||error).slice(0,1000)}}).catch(()=>{});
    console.error("Global Jobs import failed",error); return send(res,error.status||500,{error:error.message||"Global Jobs import failed."});
  }
};
