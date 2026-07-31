const { createHash } = require("node:crypto");
const { clean, safeHttps, specialtyFor, sponsorshipFor } = require("./usajobs-core.cjs");

const ENDPOINT = "https://api.adzuna.com/v1/api/jobs";
const COUNTRIES = Object.freeze({
  us: Object.freeze({ code: "US", name: "United States", destination: "United States of America", currency: "USD" }),
  gb: Object.freeze({ code: "GB", name: "United Kingdom", destination: "United Kingdom", currency: "GBP" }),
});
const TERMS = Object.freeze([
  { keyword: "Registered Nurse", pages: 2 },
  { keyword: "Nurse Practitioner", pages: 1 },
  { keyword: "Licensed Practical Nurse", pages: 1 },
  { keyword: "Nursing Assistant", pages: 1 },
  { keyword: "ICU Nurse", pages: 1 },
  { keyword: "PACU Nurse", pages: 1 },
  { keyword: "Mental Health Nurse", pages: 1 },
]);
const LIMITS = Object.freeze({ pageBudget: 8, resultsPerPage: 50, retries: 3, timeoutMs: 12000 });
const NURSING_TITLE = /\b(?:registered(?:\s+\w+){0,3}\s+nurse|nurse practitioner|licensed practical nurse|nursing assistant|icu nurse|intensive care nurse|pacu nurse|post.?anesthesia nurse|mental health nurse|psychiatric nurse|staff nurse|clinical nurse|rn|lpn)\b/i;

function credentialError(appId, appKey) { return !appId || !appKey ? "ADZUNA_APP_ID and ADZUNA_APP_KEY are required." : ""; }
function safeAdzunaUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const trustedHost = ["adzuna.com","adzuna.co.uk"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || !trustedHost) return null;
    url.protocol = "https:"; url.hash = ""; return url.href;
  } catch { return null; }
}
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function titleCase(value) { return clean(value, 80).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || null; }
function fingerprint(row) { return createHash("sha256").update(JSON.stringify([row.source_name, row.external_id, row.job_title, row.employer_name, row.location_display, row.salary_min, row.salary_max, row.description])).digest("hex"); }

function countryConfig(countryCode = "us") {
  const key = String(countryCode || "us").toLowerCase();
  if (!COUNTRIES[key]) throw new Error("Adzuna country code must be us or gb.");
  return { key, ...COUNTRIES[key] };
}

function normalizeItem(item, now = new Date(), countryCode = "us") {
  const country = countryConfig(countryCode);
  const title = clean(item?.title, 240), externalId = clean(item?.id, 180), applicationUrl = safeAdzunaUrl(item?.redirect_url);
  if (!title || !externalId || !applicationUrl || !NURSING_TITLE.test(title)) return null;
  const area = Array.isArray(item?.location?.area) ? item.location.area.map((entry) => clean(entry, 120)).filter(Boolean) : [];
  const locationDisplay = clean(item?.location?.display_name || area.slice(1).reverse().join(", "), 500) || country.name;
  const city = area.length > 2 ? area.at(-1) : null, state = area.length > 1 ? area[1] : null;
  const description = clean(item?.description, 24000), schedule = titleCase(item?.contract_time), employmentType = titleCase(item?.contract_type);
  const evidenceText = `${title} ${description}`;
  const result = {
    external_id: externalId, source_name: "ADZUNA", source_job_url: applicationUrl, canonical_application_url: applicationUrl,
    employer_name: clean(item?.company?.display_name, 240) || "Employer not stated", agency: null, department: null, job_title: title,
    nursing_specialty: specialtyFor(`${title} ${description}`), employment_type: employmentType, schedule, grade: null,
    city, state, location_display: locationDisplay, country: country.name, country_code: country.code, destination_country: country.destination,
    salary_min: number(item?.salary_min), salary_max: number(item?.salary_max), salary_currency: country.currency, salary_period: null,
    description: description || null, qualifications: null, requirements: null, who_may_apply: "Review the original listing for applicant eligibility.", licence_requirements: null,
    relocation_assistance: false, remote_status: /\bremote\b/i.test(`${title} ${locationDisplay} ${description}`) ? "remote" : "not_stated",
    date_posted: item?.created || null, opening_date: item?.created || null, closing_date: null,
    imported_at: now.toISOString(), last_checked_at: now.toISOString(), last_seen_at: now.toISOString(), expires_at: null, status: "active", updated_at: now.toISOString(),
    attribution_text: "Jobs by Adzuna", raw_source_data: { id: item.id, title: item.title, company: item.company, location: item.location, salary_min: item.salary_min, salary_max: item.salary_max, salary_is_predicted: item.salary_is_predicted, created: item.created, contract_time: item.contract_time, contract_type: item.contract_type, category: item.category, redirect_url: applicationUrl }, featured: false,
    ...sponsorshipFor(evidenceText),
  };
  result.content_fingerprint = fingerprint(result); return result;
}

function requestUrl({ appId, appKey, keyword, page, resultsPerPage, countryCode = "us" }) {
  const country = countryConfig(countryCode);
  const url = new URL(`${ENDPOINT}/${country.key}/search/${page}`);
  url.searchParams.set("app_id", appId); url.searchParams.set("app_key", appKey); url.searchParams.set("results_per_page", String(resultsPerPage));
  url.searchParams.set("what", keyword); url.searchParams.set("sort_by", "date"); url.searchParams.set("content-type", "application/json");
  return url;
}
async function requestPage({ appId, appKey, keyword, page = 1, resultsPerPage = LIMITS.resultsPerPage, countryCode = "us", fetchImpl = fetch }) {
  let lastError;
  for (let attempt = 0; attempt < LIMITS.retries; attempt += 1) {
    try {
      const response = await fetchImpl(requestUrl({ appId, appKey, keyword, page, resultsPerPage, countryCode }), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(LIMITS.timeoutMs) });
      if (!response.ok) { const error = new Error(`Adzuna returned HTTP ${response.status}`); error.status = response.status; throw error; }
      return await response.json();
    } catch (error) {
      lastError = error; if (error.status && error.status < 500 && error.status !== 429) break;
      if (attempt + 1 < LIMITS.retries) await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** attempt)));
    }
  }
  throw lastError || new Error("Adzuna request failed.");
}
async function testConnection({ appId, appKey, countryCode = "us", fetchImpl = fetch }) {
  const configurationError = credentialError(appId, appKey); if (configurationError) return { authentication_succeeded: false, http_status: null, jobs_found: 0, sample_titles: [], error: configurationError };
  try {
    const response = await fetchImpl(requestUrl({ appId, appKey, keyword: "Registered Nurse", page: 1, resultsPerPage: 5, countryCode }), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(LIMITS.timeoutMs) });
    let payload = {}; try { payload = await response.json(); } catch {}
    const results = Array.isArray(payload?.results) ? payload.results : [];
    return { authentication_succeeded: response.ok, http_status: response.status, jobs_found: Number(payload?.count || results.length || 0), sample_titles: results.slice(0, 3).map((item) => clean(item?.title, 240)).filter(Boolean), ...(response.ok ? {} : { error: response.status === 401 || response.status === 403 ? "Adzuna rejected the configured credentials." : `Adzuna returned HTTP ${response.status}.` }) };
  } catch (error) { return { authentication_succeeded: false, http_status: null, jobs_found: 0, sample_titles: [], error: error?.name === "TimeoutError" ? "Adzuna connection timed out." : "Adzuna could not be reached safely." }; }
}
async function fetchAdzunaJobs({ appId, appKey, countryCode = "us", pageBudget = LIMITS.pageBudget, sample = false, fetchImpl = fetch, now = new Date() }) {
  const configurationError = credentialError(appId, appKey); if (configurationError) throw new Error(configurationError);
  const raw = []; let pagesFetched = 0, searchesRun = 0;
  const searchPlan = sample ? [TERMS[0]] : TERMS;
  for (const term of searchPlan) {
    if (pagesFetched >= Math.min(pageBudget, LIMITS.pageBudget)) break; searchesRun += 1;
    for (let page = 1; page <= term.pages && pagesFetched < Math.min(pageBudget, LIMITS.pageBudget); page += 1) {
      const payload = await requestPage({ appId, appKey, keyword: term.keyword, page, resultsPerPage: sample ? 5 : LIMITS.resultsPerPage, countryCode, fetchImpl }); pagesFetched += 1;
      const results = Array.isArray(payload?.results) ? payload.results : []; raw.push(...results); if (!results.length) break;
    }
  }
  const byId = new Map(); for (const item of raw) { const row = normalizeItem(item, now, countryCode); if (row) byId.set(row.external_id, row); }
  return { rawCount: raw.length, records: [...byId.values()], duplicates: raw.length - byId.size, pagesFetched, searchesRun };
}

module.exports = { ENDPOINT, COUNTRIES, TERMS, LIMITS, credentialError, safeAdzunaUrl, normalizeItem, requestUrl, requestPage, testConnection, fetchAdzunaJobs };
