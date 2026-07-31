const env = (name) => process.env[name] || "";
const { fetchPublicUsaNursingJobs } = require("./_lib/usa-public-jobs.cjs");
const json = (res, status, body) => res.status(status).setHeader("cache-control", "private, no-store").setHeader("content-type", "application/json; charset=utf-8").send(JSON.stringify(body));

async function rest(path, { method = "GET", body, prefer } = {}) {
  const base = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !secret) throw Object.assign(new Error("USA jobs database environment is not configured."), { status: 503 });
  const headers = { apikey: secret, Authorization: `Bearer ${secret}`, "content-type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${base}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error(text.slice(0, 300) || "Database request failed."), { status: response.status });
  return text ? JSON.parse(text) : [];
}

async function warmPublicUsaJobs() {
  try {
    const jobs = await fetchPublicUsaNursingJobs(fetch, 10000);
    await rest("btv_usa_jobs?on_conflict=source_name,external_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: jobs });
  } catch (error) {
    console.warn("Live US vacancy refresh deferred:", error.message);
  }
}

async function userFor(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const base = env("SUPABASE_URL"), publicKey = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
  if (!token || !base || !publicKey) return null;
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } });
  return response.ok ? response.json() : null;
}

function includes(value, query) { return !query || String(value || "").toLowerCase().includes(query); }
function exact(value, query) { return !query || String(value || "").toLowerCase() === query; }

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const user = await userFor(req);
    if (!user?.id) return json(res, 401, { error: "Sign in to view USA nursing jobs." });
    const profiles = await rest(`profiles?select=destination_country&id=eq.${encodeURIComponent(user.id)}&limit=1`);
    if (profiles?.[0]?.destination_country !== "us") return json(res, 403, { code: "USA_DESTINATION_REQUIRED", error: "USA nursing jobs are available only when your preferred destination is United States of America." });
    const id = String(req.query.id || "");
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: "Invalid USA job ID." });
      const rows = await rest(`btv_usa_jobs?select=*&id=eq.${encodeURIComponent(id)}&status=eq.active&limit=1`);
      if (!rows?.[0] || rows[0].closing_date && new Date(rows[0].closing_date) < new Date()) return json(res, 404, { error: "This USA vacancy is no longer available." });
      return json(res, 200, { job: rows[0] });
    }
    let rows = await rest("btv_usa_jobs?select=*&status=eq.active&order=featured.desc,date_posted.desc&limit=2000");
    if (!rows.length) {
      await warmPublicUsaJobs();
      rows = await rest("btv_usa_jobs?select=*&status=eq.active&order=featured.desc,date_posted.desc&limit=2000");
    }
    const q = String(req.query.q || "").trim().toLowerCase(), state = String(req.query.state || "").trim().toLowerCase(), city = String(req.query.city || "").trim().toLowerCase();
    const specialty = String(req.query.specialty || "").trim().toLowerCase(), employment = String(req.query.employment_type || "").trim().toLowerCase();
    const employer = String(req.query.employer || "").trim().toLowerCase(), sponsorship = String(req.query.sponsorship || "").trim().toLowerCase();
    const remote = String(req.query.remote || "").trim().toLowerCase(), relocation = String(req.query.relocation || "").toLowerCase();
    const salaryMin = Number(req.query.salary_min || 0), postedDays = Math.max(0, Number(req.query.posted_days || 0));
    const postedAfter = postedDays ? Date.now() - postedDays * 86400000 : 0;
    const matches = rows.filter((row) => (!row.closing_date || new Date(row.closing_date) >= new Date())
      && (!q || includes(`${row.job_title} ${row.description} ${row.qualifications}`, q))
      && exact(row.state, state) && includes(row.city, city) && exact(row.nursing_specialty, specialty)
      && includes(row.employment_type, employment) && includes(row.employer_name, employer)
      && exact(row.visa_sponsorship_status, sponsorship) && exact(row.remote_status, remote)
      && (!relocation || Boolean(row.relocation_assistance) === (relocation === "yes"))
      && (!salaryMin || Number(row.salary_max || row.salary_min || 0) >= salaryMin)
      && (!postedAfter || new Date(row.date_posted || 0).getTime() >= postedAfter));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24)), page = Math.max(1, Number(req.query.page) || 1), start = (page - 1) * limit;
    return json(res, 200, { jobs: matches.slice(start, start + limit), total: matches.length, page, limit, recently_added: matches.filter((row) => new Date(row.date_posted || 0).getTime() >= Date.now() - 7 * 86400000).length });
  } catch (error) {
    console.error("USA jobs request failed", error);
    return json(res, error.status || 500, { error: error.message || "USA jobs could not be loaded." });
  }
};
