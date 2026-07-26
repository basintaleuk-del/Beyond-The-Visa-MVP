const { fetchUsaJobs } = require("./_lib/usajobs-core.cjs");

const env = (name) => process.env[name] || "";
const json = (res, status, body) => res.status(status).setHeader("content-type", "application/json; charset=utf-8").send(JSON.stringify(body));

function headers(token, prefer) {
  const secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  const value = { apikey: secret, Authorization: `Bearer ${token || secret}`, "content-type": "application/json" };
  if (prefer) value.Prefer = prefer;
  return value;
}

async function rest(path, { method = "GET", body, token, prefer } = {}) {
  const base = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !secret) throw Object.assign(new Error("USA jobs database environment is not configured."), { status: 503 });
  const response = await fetch(`${base}/rest/v1/${path}`, { method, headers: headers(token, prefer), body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error(text.slice(0, 500) || `Database request failed (${response.status}).`), { status: response.status });
  return text ? JSON.parse(text) : null;
}

async function authenticate(req) {
  const authorization = req.headers.authorization || "", cronSecret = env("CRON_SECRET");
  if (cronSecret && authorization === `Bearer ${cronSecret}`) return "cron";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const base = env("SUPABASE_URL"), publicKey = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
  if (!token || !base || !publicKey) return null;
  const user = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } });
  if (!user.ok) return null;
  return await rest("rpc/btv_is_admin", { method: "POST", body: {}, token }) === true ? "admin" : null;
}

function fallbackKey(row) {
  return `${row.employer_name}|${row.job_title}|${row.state || ""}|${row.city || ""}|${row.date_posted || ""}`.toLowerCase();
}

async function saveRecords(records) {
  const existing = await rest("btv_usa_jobs?select=id,external_id,source_name,canonical_application_url,content_fingerprint,employer_name,job_title,state,city,date_posted,imported_at,featured,status&limit=2000");
  const bySource = new Map(existing.map((row) => [`${row.source_name}:${row.external_id}`, row]));
  const byUrl = new Map(existing.map((row) => [row.canonical_application_url, row]));
  const byFallback = new Map(existing.map((row) => [fallbackKey(row), row]));
  const byHash = new Map(existing.map((row) => [row.content_fingerprint, row]));
  let created = 0, updated = 0, duplicates = 0;
  const payload = [];
  for (const record of records) {
    const exact = bySource.get(`${record.source_name}:${record.external_id}`);
    const duplicate = exact || byUrl.get(record.canonical_application_url) || byFallback.get(fallbackKey(record)) || byHash.get(record.content_fingerprint);
    if (duplicate) {
      if (!exact) duplicates += 1;
      record.external_id = duplicate.external_id;
      record.imported_at = duplicate.imported_at;
      record.featured = duplicate.featured;
      if (duplicate.status === "hidden") record.status = "hidden";
      if (duplicate.content_fingerprint !== record.content_fingerprint || duplicate.status === "expired" && record.status === "active") updated += 1;
    } else created += 1;
    payload.push(record);
  }
  for (let start = 0; start < payload.length; start += 100) {
    await rest("btv_usa_jobs?on_conflict=source_name,external_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: payload.slice(start, start + 100) });
  }
  return { created, updated, duplicates };
}

async function expireClosed(now) {
  const stamp = encodeURIComponent(now.toISOString());
  const rows = await rest(`btv_usa_jobs?select=id&status=eq.active&or=(closing_date.lt.${stamp},expires_at.lt.${stamp})`);
  if (!rows.length) return 0;
  await rest(`btv_usa_jobs?id=in.(${rows.map((row) => row.id).join(",")})`, { method: "PATCH", body: { status: "expired", updated_at: now.toISOString(), last_checked_at: now.toISOString() } });
  return rows.length;
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "Method not allowed" });
  let run;
  try {
    const caller = await authenticate(req);
    if (!caller) return json(res, 401, { error: "Administrator or scheduled-import authentication is required." });
    const now = new Date(), stale = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    await rest(`btv_usa_job_import_runs?run_scope=eq.twice_daily&status=eq.running&started_at=lt.${encodeURIComponent(stale)}`, { method: "PATCH", body: { status: "failed", completed_at: now.toISOString(), error_summary: "Stale run released automatically." } });
    const sources = await rest("btv_usa_job_sources?select=*&name=eq.USAJOBS&limit=1");
    const source = sources?.[0];
    if (!source?.enabled || source.permission_status !== "approved" || source.integration_type !== "usajobs_v1") return json(res, 503, { error: "The approved USAJOBS source is not enabled." });
    try {
      const rows = await rest("btv_usa_job_import_runs", { method: "POST", prefer: "return=representation", body: { source_id: source.id, run_scope: "twice_daily", triggered_by: caller, status: "running", started_at: now.toISOString() } });
      run = rows[0];
    } catch (error) {
      if (error.status === 409) return json(res, 409, { error: "A USA jobs import is already running." });
      throw error;
    }
    const result = await fetchUsaJobs({ apiKey: env("USAJOBS_API_KEY"), userAgent: env("USAJOBS_USER_AGENT"), email: env("USAJOBS_EMAIL"), maxPages: Number(source.configuration?.max_pages) || 5, now });
    const counts = await saveRecords(result.records);
    const expired = await expireClosed(now);
    const alerts = await rest("rpc/btv_generate_usa_job_alerts", { method: "POST", body: { p_since: new Date(now.getTime() - 13 * 60 * 60 * 1000).toISOString() } });
    await rest(`btv_usa_job_sources?id=eq.${source.id}`, { method: "PATCH", body: { last_successful_run_at: now.toISOString(), last_error: null, updated_at: now.toISOString() } });
    await rest(`btv_usa_job_import_runs?id=eq.${run.id}`, { method: "PATCH", body: { status: "success", completed_at: new Date().toISOString(), records_found: result.rawCount, records_created: counts.created, records_updated: counts.updated, records_expired: expired, duplicates_skipped: result.duplicates + counts.duplicates } });
    return json(res, 200, { ok: true, found: result.rawCount, imported: result.records.length, ...counts, expired, alerts_created: Number(alerts || 0) });
  } catch (error) {
    if (run?.id) await rest(`btv_usa_job_import_runs?id=eq.${run.id}`, { method: "PATCH", body: { status: "failed", completed_at: new Date().toISOString(), error_summary: String(error.message || error).slice(0, 500) } }).catch(() => {});
    const sourceRows = await rest("btv_usa_job_sources?select=id&name=eq.USAJOBS&limit=1").catch(() => []);
    if (sourceRows?.[0]) await rest(`btv_usa_job_sources?id=eq.${sourceRows[0].id}`, { method: "PATCH", body: { last_error: String(error.message || error).slice(0, 500), updated_at: new Date().toISOString() } }).catch(() => {});
    console.error("USA jobs import failed", error);
    return json(res, error.status || 500, { error: error.message || "USA jobs import failed." });
  }
};
