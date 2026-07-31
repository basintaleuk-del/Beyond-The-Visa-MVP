const env = (name) => process.env[name] || "";
const json = (res, status, body) => res.status(status).setHeader("cache-control", "private, max-age=60, stale-while-revalidate=120").setHeader("content-type", "application/json; charset=utf-8").send(JSON.stringify(body));
const PUBLIC_FIELDS = "id,external_id,source_name,source_job_url,canonical_application_url,employer_name,agency,department,job_title,nursing_specialty,employment_type,schedule,grade,city,state,location_display,country,country_code,salary_min,salary_max,salary_currency,salary_period,description,qualifications,requirements,who_may_apply,licence_requirements,visa_sponsorship_status,visa_sponsorship_verified,sponsorship_evidence,relocation_assistance,remote_status,date_posted,opening_date,closing_date,imported_at,last_checked_at,last_seen_at,status,attribution_text,featured";

function headers(token) {
  const secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: secret, Authorization: `Bearer ${token || secret}`, "content-type": "application/json", Prefer: "count=exact" };
}
async function rest(path, { token } = {}) {
  const base = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !secret) throw Object.assign(new Error("USA jobs database environment is not configured."), { status: 503 });
  const response = await fetch(`${base}/rest/v1/${path}`, { headers: headers(token) }), text = await response.text();
  if (!response.ok) throw Object.assign(new Error(text.slice(0, 300) || "Database request failed."), { status: response.status });
  const range = response.headers.get("content-range") || "";
  return { rows: text ? JSON.parse(text) : [], total: Number(range.split("/")[1]) || 0 };
}
async function userFor(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, ""), base = env("SUPABASE_URL"), publicKey = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
  if (!token || !base || !publicKey) return null;
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } });
  return response.ok ? response.json() : null;
}
function term(value, max = 120) { return String(value || "").trim().replace(/[,*()]/g, " ").replace(/\s+/g, " ").slice(0, max); }
function appendLike(params, field, value) { const safe = term(value); if (safe) params.set(field, `ilike.*${safe}*`); }

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const user = await userFor(req); if (!user?.id) return json(res, 401, { error: "Sign in to view USA nursing jobs." });
    const profile = await rest(`profiles?select=destination_country&id=eq.${encodeURIComponent(user.id)}&limit=1`);
    if (profile.rows?.[0]?.destination_country !== "us") return json(res, 403, { code: "USA_DESTINATION_REQUIRED", error: "USA nursing jobs are available only when your preferred destination is United States of America." });
    const id = String(req.query.id || "");
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: "Invalid USA job ID." });
      const result = await rest(`btv_usa_jobs?select=${PUBLIC_FIELDS}&id=eq.${encodeURIComponent(id)}&status=eq.active&limit=1`), job = result.rows?.[0];
      if (!job || job.closing_date && new Date(job.closing_date) < new Date()) return json(res, 404, { error: "This USA vacancy is no longer available." });
      return json(res, 200, { job });
    }
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24)), page = Math.max(1, Number(req.query.page) || 1), params = new URLSearchParams();
    params.set("select", PUBLIC_FIELDS); params.set("status", "eq.active"); params.set("order", "featured.desc,date_posted.desc"); params.set("limit", String(limit)); params.set("offset", String((page - 1) * limit));
    appendLike(params, "state", req.query.state); appendLike(params, "city", req.query.city); appendLike(params, "agency", req.query.agency || req.query.employer); appendLike(params, "nursing_specialty", req.query.specialty); appendLike(params, "schedule", req.query.schedule || req.query.employment_type); appendLike(params, "remote_status", req.query.remote); appendLike(params, "who_may_apply", req.query.eligibility);
    const q = term(req.query.q); if (q) params.append("or", `(job_title.ilike.*${q}*,description.ilike.*${q}*,qualifications.ilike.*${q}*)`);
    const salaryMin = Math.max(0, Number(req.query.salary_min) || 0); if (salaryMin) params.set("salary_max", `gte.${salaryMin}`);
    const closingDays = Math.max(0, Math.min(365, Number(req.query.closing_days) || 0)); if (closingDays) params.set("closing_date", `lte.${new Date(Date.now() + closingDays * 86400000).toISOString()}`);
    const postedDays = Math.max(0, Math.min(365, Number(req.query.posted_days) || 0)); if (postedDays) params.set("date_posted", `gte.${new Date(Date.now() - postedDays * 86400000).toISOString()}`);
    const result = await rest(`btv_usa_jobs?${params.toString()}`), now = Date.now();
    const activeRows = result.rows.filter((row) => !row.closing_date || new Date(row.closing_date).getTime() >= now);
    return json(res, 200, { jobs: activeRows, total: result.total, page, limit, recently_added: activeRows.filter((row) => new Date(row.date_posted || 0).getTime() >= now - 7 * 86400000).length });
  } catch (error) { console.error("USA jobs request failed", { status: error.status, message: error.message }); return json(res, error.status || 500, { error: error.message || "USA jobs could not be loaded." }); }
};
