const { runSources, recordKey } = require("./_lib/opportunity-import-core.cjs");

const json = (res, status, body) => res.status(status).setHeader("content-type", "application/json; charset=utf-8").send(JSON.stringify(body));
const env = (name) => process.env[name] || "";

function supabaseHeaders(token, prefer) {
  const secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  const headers = { apikey: secret, Authorization: `Bearer ${token || secret}`, "content-type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function rest(path, { method = "GET", body, token, prefer } = {}) {
  const base = env("SUPABASE_URL");
  const secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !secret) throw Object.assign(new Error("Opportunity import environment is not configured."), { status: 503 });
  const response = await fetch(`${base}/rest/v1/${path}`, { method, headers: supabaseHeaders(token, prefer), body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error(text.slice(0, 300) || `Database request failed (${response.status}).`), { status: response.status });
  return text ? JSON.parse(text) : null;
}

async function authenticate(req) {
  const authorization = req.headers.authorization || "";
  const cronSecret = env("CRON_SECRET");
  if (cronSecret && authorization === `Bearer ${cronSecret}`) return { kind: "cron", token: null };
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const publicKey = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
  const base = env("SUPABASE_URL");
  if (!token || !publicKey || !base) return null;
  const userResponse = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } });
  if (!userResponse.ok) return null;
  const admin = await rest("rpc/btv_is_admin", { method: "POST", body: {}, token });
  return admin === true ? { kind: "admin", token } : null;
}

function createStore(orchestrationRunId) {
  return {
    async beginSource(source, now) {
      const rows = await rest("btv_opportunity_import_runs", { method: "POST", prefer: "return=representation", body: { source_id: source.id, parent_run_id: orchestrationRunId, run_scope: `source:${source.id}`, triggered_by: "orchestrator", status: "running", started_at: now.toISOString() } });
      return rows[0];
    },
    async saveRecords(source, records, now) {
      if (!records.length) return { created: 0, updated: 0 };
      const existing = await rest(`btv_jobs?select=id,canonical_url,content_hash,status,verified,verification_status&source_name=eq.${encodeURIComponent(source.name)}&limit=500`);
      const byUrl = new Map((existing || []).map((row) => [row.canonical_url, row]));
      const payload = records.map((record) => {
        const old = byUrl.get(record.canonical_url);
        if (old?.verification_status === "verified") Object.assign(record, { verification_status: old.verification_status, verified: old.verified, status: old.status });
        return record;
      });
      await rest("btv_jobs?on_conflict=canonical_url", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: payload });
      return { created: payload.filter((x) => !byUrl.has(x.canonical_url)).length, updated: payload.filter((x) => byUrl.has(x.canonical_url) && byUrl.get(x.canonical_url).content_hash !== x.content_hash).length };
    },
    async archiveMissing(source, records, now) {
      const keys = new Set(records.map(recordKey));
      const rows = await rest(`btv_jobs?select=id,source_name,external_id,canonical_url,application_url,title,employer,country,closing_at&source_name=eq.${encodeURIComponent(source.name)}&status=eq.published`);
      const missing = (rows || []).filter((row) => !keys.has(recordKey(row)));
      for (const row of missing) await rest(`btv_jobs?id=eq.${row.id}`, { method: "PATCH", body: { status: "archived", import_status: "removed", expired_at: now.toISOString(), updated_at: now.toISOString() } });
      return missing.length;
    },
    async finishSource(run, source, result, now) {
      await rest(`btv_opportunity_import_runs?id=eq.${run.id}`, { method: "PATCH", body: { completed_at: now.toISOString(), records_found: result.found || 0, records_created: result.created || 0, records_updated: result.updated || 0, records_archived: result.archived || 0, duplicates_skipped: result.duplicates || 0, status: result.status, error_summary: result.error || null } });
      await rest(`btv_approved_sources?id=eq.${source.id}`, { method: "PATCH", body: result.status === "success" ? { last_successful_run_at: now.toISOString(), last_error: null, updated_at: now.toISOString() } : { last_error: result.error, updated_at: now.toISOString() } });
    },
    async archiveExpired(now) {
      const timestamp = encodeURIComponent(now.toISOString());
      const rows = await rest(`btv_jobs?select=id&status=eq.published&or=(closing_at.lt.${timestamp},expires_at.lt.${timestamp})`);
      if (!rows?.length) return 0;
      await rest(`btv_jobs?id=in.(${rows.map((x) => x.id).join(",")})`, { method: "PATCH", body: { status: "archived", import_status: "closed", expired_at: now.toISOString(), updated_at: now.toISOString() } });
      return rows.length;
    },
    async refreshEmployerCandidates(now) {
      const jobs = await rest("btv_jobs?select=employer,country,employer_url,source_name,sponsorship_status,specialty&status=eq.published&opportunity_type=eq.job&employer=not.is.null&limit=500");
      const grouped = new Map();
      for (const job of jobs || []) {
        const key = `${job.employer.toLowerCase()}|${job.country}`;
        const current = grouped.get(key) || { name: job.employer, country_code: job.country, website_url: job.employer_url, source_name: job.source_name, active_job_count: 0, sponsorship_job_count: 0, specialties: new Set() };
        current.active_job_count += 1;
        if (job.sponsorship_status === "confirmed") current.sponsorship_job_count += 1;
        if (job.specialty) current.specialties.add(job.specialty);
        grouped.set(key, current);
      }
      for (const item of grouped.values()) {
        const existing = await rest(`btv_opportunity_employers?select=id,spotlight_status&name=eq.${encodeURIComponent(item.name)}&country_code=eq.${encodeURIComponent(item.country_code)}&limit=1`);
        const body = { ...item, specialties: [...item.specialties], last_checked_at: now.toISOString(), updated_at: now.toISOString() };
        if (existing?.[0]) await rest(`btv_opportunity_employers?id=eq.${existing[0].id}`, { method: "PATCH", body });
        else await rest("btv_opportunity_employers", { method: "POST", body: { ...body, verified: false, featured: false, spotlight_status: "pending" } });
      }
    },
  };
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { error: "Method not allowed" });
  try {
    const caller = await authenticate(req);
    if (!caller) return json(res, 401, { error: "Unauthorized" });
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await rest(`btv_opportunity_import_runs?run_scope=eq.daily&status=eq.running&started_at=lt.${encodeURIComponent(staleBefore)}`, { method: "PATCH", body: { status: "failed", completed_at: new Date().toISOString(), error_summary: "Stale run released automatically." } });
    let orchestration;
    try {
      const rows = await rest("btv_opportunity_import_runs", { method: "POST", prefer: "return=representation", body: { run_scope: "daily", triggered_by: caller.kind, status: "running" } });
      orchestration = rows[0];
    } catch (error) {
      if (error.status === 409) return json(res, 409, { error: "An opportunity import is already running." });
      throw error;
    }
    const sources = await rest("btv_approved_sources?select=*&order=name.asc");
    const result = await runSources({ sources: sources || [], store: createStore(orchestration.id), now: new Date() });
    await rest(`btv_opportunity_import_runs?id=eq.${orchestration.id}`, { method: "PATCH", body: { completed_at: new Date().toISOString(), status: result.failed ? "partial" : "success", records_found: result.found, records_created: result.created, records_updated: result.updated, records_archived: result.archived, duplicates_skipped: result.duplicates, error_summary: result.errors.length ? JSON.stringify(result.errors).slice(0, 500) : null } });
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error("Opportunity import failed", error);
    return json(res, error.status || 500, { error: error.message || "Opportunity import failed." });
  }
};
