const { runSources, recordKey, fetchNhsJobsFeed, normalizeRecord } = require("./_lib/opportunity-import-core.cjs");

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
      const existing = await rest(`btv_jobs?select=id,canonical_url,content_hash,status,verified,verification_status,imported_at&source_name=eq.${encodeURIComponent(source.name)}&limit=500`);
      const byUrl = new Map((existing || []).map((row) => [row.canonical_url, row]));
      const payload = records.map((record) => {
        const old = byUrl.get(record.canonical_url);
        if (old?.imported_at) record.imported_at = old.imported_at;
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
      await rest(`btv_opportunity_import_runs?id=eq.${run.id}`, { method: "PATCH", body: { completed_at: now.toISOString(), records_found: result.found || 0, records_created: result.created || 0, records_updated: result.updated || 0, records_archived: result.archived || 0, duplicates_skipped: result.duplicates || 0, records_nursing: result.nursing || 0, records_midwifery: result.midwifery || 0, confirmed_sponsorship_count: result.confirmedSponsorship || 0, status: result.status, error_summary: result.error || null } });
      await rest(`btv_approved_sources?id=eq.${source.id}`, { method: "PATCH", body: result.status === "success" ? { last_successful_run_at: now.toISOString(), last_cursor: result.cursor || source.last_cursor, last_error: null, updated_at: now.toISOString() } : { last_error: result.error, updated_at: now.toISOString() } });
    },
    async archiveExpired(now) {
      const timestamp = encodeURIComponent(now.toISOString());
      const rows = await rest(`btv_jobs?select=id&status=eq.published&or=(closing_at.lt.${timestamp},expires_at.lt.${timestamp})`);
      if (!rows?.length) return 0;
      await rest(`btv_jobs?id=in.(${rows.map((x) => x.id).join(",")})`, { method: "PATCH", body: { status: "archived", import_status: "closed", expired_at: now.toISOString(), updated_at: now.toISOString() } });
      return rows.length;
    },
    async refreshEmployerCandidates(now) {
      const jobs = await rest("btv_jobs?select=employer,country,employer_url,source_name,sponsorship_status,specialty,profession,published_at&status=eq.published&opportunity_type=eq.job&employer=not.is.null&limit=500");
      const grouped = new Map();
      for (const job of jobs || []) {
        const key = `${job.employer.toLowerCase()}|${job.country}`;
        const current = grouped.get(key) || { name: job.employer, country_code: job.country, website_url: job.employer_url, source_url: job.source_name === "NHS Jobs" ? `https://www.jobs.nhs.uk/candidate/search/results?employer=${encodeURIComponent(job.employer)}` : null, source_name: job.source_name, active_job_count: 0, active_nursing_count: 0, active_midwifery_count: 0, sponsorship_job_count: 0, latest_vacancy_at: null, specialties: new Set() };
        current.active_job_count += 1;
        if (job.profession === "nurse" || job.profession === "both") current.active_nursing_count += 1;
        if (job.profession === "midwife" || job.profession === "both") current.active_midwifery_count += 1;
        if (job.sponsorship_status === "confirmed") current.sponsorship_job_count += 1;
        if (job.specialty) current.specialties.add(job.specialty);
        if (job.published_at && (!current.latest_vacancy_at || job.published_at > current.latest_vacancy_at)) current.latest_vacancy_at = job.published_at;
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

const CURATED_OPPORTUNITIES = [
  {
    external_id: "nhsbsa-lsf", source_identifier: "nhsbsa-lsf", title: "NHS Learning Support Fund", employer: "NHS Business Services Authority", provider_name: "NHS Business Services Authority", country: "uk", profession: "both", opportunity_type: "scholarship",
    summary: "Eligible nursing and midwifery students can apply for a £5,000 Training Grant each academic year, with additional support available in some circumstances.", description: "Official NHSBSA funding for eligible pre-registration nursing and midwifery students studying at a university in England. Applications must be made within six months of the academic year starting.",
    salary_min: 5000, salary_max: 5000, currency: "GBP", salary_text: "£5,000 per academic year", source_name: "NHSBSA", source_type: "funding", source_url: "https://www.nhsbsa.nhs.uk/nhs-learning-support-fund-lsf", canonical_url: "https://www.nhsbsa.nhs.uk/nhs-learning-support-fund-lsf", application_url: "https://www.nhsbsa.nhs.uk/nhs-learning-support-fund-lsf/nhs-learning-support-fund-account",
    funding_coverage: "£5,000 Training Grant per academic year; some students may qualify for further support.", eligibility_summary: "Pre-registration nursing or midwifery students at a university in England who meet NHS LSF eligibility rules.", international_applicant_eligibility: "Eligibility depends on student-finance support status; check the official criteria.",
  },
  {
    external_id: "rcnf-hardship", source_identifier: "rcnf-hardship", title: "RCN Foundation hardship grant", employer: "RCN Foundation", provider_name: "RCN Foundation", country: "uk", profession: "both", opportunity_type: "scholarship",
    summary: "One-off hardship grants of up to £800 for eligible nurses, midwives and healthcare support workers resident in the UK or Channel Islands.", description: "A rolling, non-repayable hardship grant. RCN membership is not required; applicants should complete the official eligibility checker.",
    salary_min: 0, salary_max: 800, currency: "GBP", salary_text: "Up to £800", source_name: "RCN Foundation", source_type: "funding", source_url: "https://rcnfoundation.rcn.org.uk/Grants-and-funding/Hardship-grants", canonical_url: "https://rcnfoundation.rcn.org.uk/Grants-and-funding/Hardship-grants", application_url: "https://rcnfoundation.rcn.org.uk/Grants-and-funding/Hardship-grants",
    funding_coverage: "One-off non-repayable payment of up to £800.", eligibility_summary: "Eligible nurses, midwives and healthcare support workers resident in the UK or Channel Islands; limits apply to repeat awards.", international_applicant_eligibility: "UK or Channel Islands residence is required; the official page includes guidance for applicants with No Recourse to Public Funds.",
  },
  {
    external_id: "rcnf-domestic-abuse", source_identifier: "rcnf-domestic-abuse", title: "RCN Foundation Domestic Abuse Fund", employer: "RCN Foundation", provider_name: "RCN Foundation", country: "uk", profession: "both", opportunity_type: "scholarship",
    summary: "Confidential hardship grants of up to £800 for nurses and midwives experiencing or fleeing domestic abuse.", description: "A dedicated, non-repayable hardship fund for eligible nurses, nursing associates, midwives and healthcare support workers. RCN membership is not required.",
    salary_min: 0, salary_max: 800, currency: "GBP", salary_text: "Up to £800", source_name: "RCN Foundation", source_type: "funding", source_url: "https://rcnfoundation.rcn.org.uk/Grants-and-funding/Hardship-grants/The-RCN-Foundation-Domestic-Abuse-Fund", canonical_url: "https://rcnfoundation.rcn.org.uk/Grants-and-funding/Hardship-grants/The-RCN-Foundation-Domestic-Abuse-Fund", application_url: "https://rcnfoundation.rcn.org.uk/Grants-and-funding/Hardship-grants/The-RCN-Foundation-Domestic-Abuse-Fund",
    funding_coverage: "One-off non-repayable payment of up to £800.", eligibility_summary: "Eligible nurses, nursing associates, midwives and healthcare support workers experiencing or fleeing domestic abuse.", international_applicant_eligibility: "Check the official hardship criteria before applying.",
  },
  {
    external_id: "nhse-etoc-review-2026-07-30", source_identifier: "nhse-etoc-review-2026-07-30", title: "ETOC webinar: review, step down and discontinuation", employer: "NHS England", provider_name: "NHS England", country: "uk", profession: "nurse", opportunity_type: "event",
    summary: "A free NHS England Nursing Directorate webinar on safe, patient-centred review and adjustment of enhanced therapeutic observation and care.", description: "For nursing teams, ETOC teams, nursing workforce leads and staffing leads. Registration closes at 5pm on 29 July 2026.",
    source_name: "NHS England Events", source_type: "event", source_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-etoc-review-step-down-and-discontinuation", canonical_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-etoc-review-step-down-and-discontinuation", application_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-etoc-review-step-down-and-discontinuation", registration_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-etoc-review-step-down-and-discontinuation", event_start_at: "2026-07-30T12:00:00Z", event_end_at: "2026-07-30T13:00:00Z", event_timezone: "Europe/London", closing_at: "2026-07-29T16:00:00Z", location: "Virtual (Microsoft Teams)",
  },
  {
    external_id: "nhse-palliative-workforce-2026-07-30", source_identifier: "nhse-palliative-workforce-2026-07-30", title: "Palliative and end-of-life care workforce development webinar", employer: "NHS England", provider_name: "NHS England", country: "uk", profession: "nurse", opportunity_type: "event",
    summary: "A free NHS England webinar on the ASPIRE palliative and end-of-life care career, capabilities and education framework.", description: "Relevant to clinical professionals, educators, heads of nursing, matrons, directors of nursing and workforce leads.",
    source_name: "NHS England Events", source_type: "event", source_url: "https://www.events.england.nhs.uk/events/developing-aspirant-palliative-care-and-end-of-life-care-workforce-development-programme", canonical_url: "https://www.events.england.nhs.uk/events/developing-aspirant-palliative-care-and-end-of-life-care-workforce-development-programme", application_url: "https://www.events.england.nhs.uk/events/developing-aspirant-palliative-care-and-end-of-life-care-workforce-development-programme", registration_url: "https://www.events.england.nhs.uk/events/developing-aspirant-palliative-care-and-end-of-life-care-workforce-development-programme", event_start_at: "2026-07-30T15:00:00Z", event_end_at: "2026-07-30T16:00:00Z", event_timezone: "Europe/London", location: "Virtual (Microsoft Teams)",
  },
  {
    external_id: "nhse-etoc-education-2026-08-18", source_identifier: "nhse-etoc-education-2026-08-18", title: "ETOC webinar: education and training", employer: "NHS England", provider_name: "NHS England", country: "uk", profession: "nurse", opportunity_type: "event",
    summary: "A free NHS England Nursing Directorate webinar on sustainable ETOC training programmes that build staff confidence and capability.", description: "For ETOC teams, nursing workforce and staffing leads, and clinical education teams.",
    source_name: "NHS England Events", source_type: "event", source_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-education-and-training", canonical_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-education-and-training", application_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-education-and-training", registration_url: "https://www.events.england.nhs.uk/events/enhanced-therapeutic-observation-and-care-etoc-webinar-education-and-training", event_start_at: "2026-08-18T12:00:00Z", event_end_at: "2026-08-18T13:00:00Z", event_timezone: "Europe/London", location: "Virtual (Microsoft Teams)",
  },
];

const CQC_SPOTLIGHTS = [
  { name: "South Warwickshire University NHS Foundation Trust", rating: "Outstanding", providerId: "RJC", url: "https://www.cqc.org.uk/provider/RJC", detail: "CQC overall rating: Outstanding. CQC confirmed in June 2026 that the trust's overall rating remains Outstanding." },
  { name: "Northumbria Healthcare NHS Foundation Trust", rating: "Outstanding", providerId: "RTF", url: "https://www.cqc.org.uk/provider/RTF/inspection-summary", detail: "CQC overall rating: Outstanding. The provider page records Outstanding overall and was checked against CQC's latest published profile." },
  { name: "The Royal Marsden NHS Foundation Trust", rating: "Outstanding", providerId: "RPY", url: "https://www.cqc.org.uk/provider/RPY/reports", detail: "CQC overall rating: Outstanding. The spotlight links to the official provider inspection record." },
];

async function publishCuratedOpportunities(now = new Date()) {
  const checkedAt = now.toISOString();
  const prepared = CURATED_OPPORTUNITIES.map((item) => {
    const expired = item.event_end_at && new Date(item.event_end_at) < now;
    return { salary_min: null, salary_max: null, currency: null, sponsorship_status: "not_stated", visa_sponsorship: false, verification_status: "verified", verified: true, featured: false, status: expired ? "archived" : "published", import_status: expired ? "closed" : "active", published_at: checkedAt, imported_at: checkedAt, last_checked_at: checkedAt, updated_at: checkedAt, ...item };
  });
  const keys = [...new Set(prepared.flatMap((item) => Object.keys(item)))];
  const rows = prepared.map((item) => Object.fromEntries(keys.map((key) => [key, item[key] ?? null])));
  await rest("btv_jobs?on_conflict=canonical_url", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: rows });
  for (const spotlight of CQC_SPOTLIGHTS) {
    const existing = await rest(`btv_opportunity_employers?select=id&name=eq.${encodeURIComponent(spotlight.name)}&country_code=eq.uk&limit=1`);
    if (!existing?.[0]) continue;
    const employerId = existing[0].id;
    await rest(`btv_opportunity_employers?id=eq.${employerId}`, { method: "PATCH", body: { verified: true, featured: true, spotlight_status: "approved", source_url: spotlight.url, source_employer_id: spotlight.providerId, description: spotlight.detail, last_checked_at: checkedAt, updated_at: checkedAt } });
    await rest(`btv_jobs?source_name=eq.NHS%20Jobs&status=eq.published&employer=eq.${encodeURIComponent(spotlight.name)}`, { method: "PATCH", body: { employer_id: employerId, updated_at: checkedAt } });
  }
  return { opportunities: rows.filter((row) => row.status === "published").length, spotlights: CQC_SPOTLIGHTS.length };
}

async function recheckNhsVacancy(req, caller) {
  if (caller.kind !== "admin") return { status: 403, body: { error: "Admin access is required." } };
  const requestBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const jobId = String(requestBody.job_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return { status: 400, body: { error: "A valid vacancy ID is required." } };
  const [jobs, sources] = await Promise.all([
    rest(`btv_jobs?select=*&id=eq.${encodeURIComponent(jobId)}&source_name=eq.NHS%20Jobs&limit=1`),
    rest("btv_approved_sources?select=*&name=eq.NHS%20Jobs&limit=1"),
  ]);
  const job = jobs?.[0], source = sources?.[0];
  if (!job || !source || !job.external_reference) return { status: 404, body: { error: "An imported NHS Jobs vacancy with a job reference was not found." } };
  const now = new Date();
  const runs = await rest("btv_opportunity_import_runs", { method: "POST", prefer: "return=representation", body: { source_id: source.id, run_scope: `recheck:${job.id}`, triggered_by: "admin", status: "running" } });
  const run = runs[0];
  try {
    const payload = await fetchNhsJobsFeed({ ...source, configuration: { ...source.configuration, job_reference: job.external_reference, max_pages: 1, max_records: 1 } }, fetch, now);
    const record = payload.rows.map((row) => normalizeRecord(row, source, now)).find(Boolean);
    if (!record) {
      await rest(`btv_jobs?id=eq.${job.id}`, { method: "PATCH", body: { status: "archived", import_status: "removed", expired_at: now.toISOString(), last_checked_at: now.toISOString(), updated_at: now.toISOString() } });
      await rest(`btv_opportunity_import_runs?id=eq.${run.id}`, { method: "PATCH", body: { status: "success", completed_at: now.toISOString(), records_found: 0, records_archived: 1 } });
      return { status: 200, body: { ok: true, archived: true } };
    }
    const counts = await createStore(run.id).saveRecords(source, [record], now);
    await rest(`btv_opportunity_import_runs?id=eq.${run.id}`, { method: "PATCH", body: { status: "success", completed_at: now.toISOString(), records_found: 1, records_created: counts.created, records_updated: counts.updated, records_nursing: record.profession === "nurse" ? 1 : 0, records_midwifery: record.profession === "midwife" ? 1 : 0, confirmed_sponsorship_count: record.sponsorship_status === "confirmed" ? 1 : 0 } });
    return { status: 200, body: { ok: true, archived: false, ...counts } };
  } catch (error) {
    await rest(`btv_opportunity_import_runs?id=eq.${run.id}`, { method: "PATCH", body: { status: "failed", completed_at: new Date().toISOString(), error_summary: String(error.message || error).slice(0, 500) } });
    throw error;
  }
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { error: "Method not allowed" });
  try {
    const caller = await authenticate(req);
    if (!caller) return json(res, 401, { error: "Unauthorized" });
    const requestBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (requestBody.action === "recheck") {
      const result = await recheckNhsVacancy(req, caller);
      return json(res, result.status, result.body);
    }
    if (requestBody.action === "curate") return json(res, 200, { ok: true, ...(await publishCuratedOpportunities()) });
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
    const curated = await publishCuratedOpportunities(new Date());
    await rest(`btv_opportunity_import_runs?id=eq.${orchestration.id}`, { method: "PATCH", body: { completed_at: new Date().toISOString(), status: result.failed ? "partial" : "success", records_found: result.found, records_created: result.created, records_updated: result.updated, records_archived: result.archived, duplicates_skipped: result.duplicates, records_nursing: result.nursing, records_midwifery: result.midwifery, confirmed_sponsorship_count: result.confirmedSponsorship, error_summary: result.errors.length ? JSON.stringify(result.errors).slice(0, 500) : null } });
    return json(res, 200, { ok: true, ...result, curated });
  } catch (error) {
    console.error("Opportunity import failed", error);
    return json(res, error.status || 500, { error: error.message || "Opportunity import failed." });
  }
};
