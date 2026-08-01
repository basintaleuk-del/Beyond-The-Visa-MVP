const { normalizeJob, plainText } = require("./global-jobs-core.cjs");
const API_ENDPOINT = "https://search.api.careerjet.net/v4/query";
const DEFAULT_REFERER = "https://beyondthevisa.org/jobs";
const SERVICE_USER_AGENT = "BeyondTheVisa-JobsSync/1.0 (+https://beyondthevisa.org/)";
const COUNTRIES = Object.freeze({
  gb: Object.freeze({ key: "gb", code: "GB", name: "United Kingdom", locale: "en_GB", currency: "GBP", site: "careerjet.co.uk" }),
  us: Object.freeze({ key: "us", code: "US", name: "United States", locale: "en_US", currency: "USD", site: "careerjet.com" }),
  ca: Object.freeze({ key: "ca", code: "CA", name: "Canada", locale: "en_CA", currency: "CAD", site: "careerjet.ca" }),
  au: Object.freeze({ key: "au", code: "AU", name: "Australia", locale: "en_AU", currency: "AUD", site: "careerjet.com.au" }),
  nz: Object.freeze({ key: "nz", code: "NZ", name: "New Zealand", locale: "en_NZ", currency: "NZD", site: "careerjet.co.nz" }),
  ie: Object.freeze({ key: "ie", code: "IE", name: "Ireland", locale: "en_IE", currency: "EUR", site: "careerjet.ie" }),
  ae: Object.freeze({ key: "ae", code: "AE", name: "United Arab Emirates", locale: "en_AE", currency: "AED", site: "careerjet.ae" }),
  sa: Object.freeze({ key: "sa", code: "SA", name: "Saudi Arabia", locale: "en_SA", currency: "SAR", site: "careerjet.com.sa" })
});
const SEARCH_BATCHES = Object.freeze([
  "registered nurse OR staff nurse OR mental health nurse OR community nurse",
  "ICU nurse OR theatre nurse OR recovery nurse OR midwife",
  "healthcare assistant OR care assistant OR social worker",
  "doctor OR physiotherapist OR occupational therapist OR radiographer OR pharmacist OR biomedical scientist"
]);
const cache = /* @__PURE__ */ new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function credentialError(value) {
  return typeof value === "string" && value.trim() ? null : "CAREERJET_AFFILIATE_ID is required.";
}
function countryFor(value) {
  const country = COUNTRIES[String(value || "").trim().toLowerCase()];
  if (!country) throw Object.assign(new Error("Unsupported Careerjet country."), { status: 400, code: "CAREERJET_UNSUPPORTED_COUNTRY" });
  return country;
}
function safeLog(logger, event) {
  logger({ provider: "careerjet", ...event });
}
function validateResponse(value) {
  if (!value || typeof value !== "object") throw Object.assign(new Error("Careerjet returned a malformed response."), { status: 502, code: "CAREERJET_MALFORMED_RESPONSE" });
  const body = value;
  if (body.type !== "JOBS" || !Array.isArray(body.jobs) || !Number.isFinite(Number(body.hits)) || !Number.isFinite(Number(body.pages))) {
    throw Object.assign(new Error("Careerjet returned a malformed response."), { status: 502, code: "CAREERJET_MALFORMED_RESPONSE" });
  }
  return { ...body, type: "JOBS", jobs: body.jobs, hits: Number(body.hits), pages: Number(body.pages) };
}
function retryAfterMs(response, attempt) {
  const header = response.headers.get("retry-after");
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(6e4, seconds * 1e3);
  const date = header ? Date.parse(header) : NaN;
  if (Number.isFinite(date)) return Math.min(6e4, Math.max(0, date - Date.now()));
  return Math.min(3e4, 600 * 2 ** attempt);
}
async function requestPage(options) {
  const missing = credentialError(options.affiliateId);
  if (missing) throw Object.assign(new Error(missing), { status: 503, code: "CAREERJET_MISSING_CREDENTIAL" });
  const country = countryFor(options.country);
  const page = Math.min(10, Math.max(1, Number(options.page || 1)));
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));
  const params = new URLSearchParams({
    locale_code: country.locale,
    keywords: plainText(options.keywords, 300),
    page: String(page),
    page_size: String(pageSize),
    sort: "date",
    fragment_size: "700",
    user_ip: plainText(options.userIp || "127.0.0.1", 80),
    user_agent: plainText(options.userAgent || SERVICE_USER_AGENT, 500)
  });
  const requestUrl = `${API_ENDPOINT}?${params.toString()}`;
  const cacheKey = `${country.key}|${options.keywords}|${page}|${pageSize}`;
  const cached = cache.get(cacheKey);
  if ((options.cacheTtlMs ?? 3e5) > 0 && cached && cached.expiresAt > Date.now()) return { body: cached.value, requestsMade: 0, fromCache: true, httpStatus: 200 };
  const fetchImpl = options.fetchImpl || fetch;
  const logger = options.logger || (() => void 0);
  const wait = options.wait || delay;
  const retries = Math.min(4, Math.max(0, Number(options.retries ?? 2)));
  let requestsMade = 0;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1e3, Number(options.timeoutMs || 12e3)));
    try {
      requestsMade += 1;
      const response = await fetchImpl(requestUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${btoa(`${options.affiliateId.trim()}:`)}`,
          Accept: "application/json",
          Referer: options.referer || DEFAULT_REFERER
        }
      });
      if (!response.ok) {
        const retriable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (retriable && attempt < retries) {
          const waitMs = retryAfterMs(response, attempt);
          safeLog(logger, { event: "request_retry", country_code: country.code, page, attempt: attempt + 1, status: response.status, wait_ms: waitMs });
          await wait(waitMs);
          continue;
        }
        throw Object.assign(new Error(`Careerjet request failed (${response.status}).`), { status: response.status, code: response.status === 429 ? "CAREERJET_RATE_LIMITED" : "CAREERJET_API_ERROR" });
      }
      let parsed;
      try {
        parsed = await response.json();
      } catch {
        throw Object.assign(new Error("Careerjet returned invalid JSON."), { status: 502, code: "CAREERJET_INVALID_JSON" });
      }
      const body = validateResponse(parsed);
      if ((options.cacheTtlMs ?? 3e5) > 0) cache.set(cacheKey, { value: body, expiresAt: Date.now() + Number(options.cacheTtlMs ?? 3e5) });
      return { body, requestsMade, fromCache: false, httpStatus: response.status };
    } catch (error) {
      const typed = error;
      const isTimeout = typed.name === "AbortError";
      if ((isTimeout || !typed.status || typed.status >= 500) && attempt < retries) {
        const waitMs = Math.min(3e4, 600 * 2 ** attempt);
        safeLog(logger, { event: "request_retry", country_code: country.code, page, attempt: attempt + 1, status: typed.status || 0, code: isTimeout ? "CAREERJET_TIMEOUT" : typed.code || "CAREERJET_NETWORK_ERROR", wait_ms: waitMs });
        await wait(waitMs);
        continue;
      }
      if (isTimeout) throw Object.assign(new Error("Careerjet request timed out."), { status: 504, code: "CAREERJET_TIMEOUT" });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw Object.assign(new Error("Careerjet request failed."), { status: 502, code: "CAREERJET_API_ERROR" });
}
function salaryPeriod(value) {
  return { Y: "year", M: "month", W: "week", D: "day", H: "hour" }[String(value || "").toUpperCase()] || null;
}
function professionFor(value) {
  const text = plainText(value, 800).toLowerCase();
  if (/midwi/.test(text)) return "midwife";
  if (/physiotherap|occupational therapist|radiograph/.test(text)) return "allied_health";
  if (/pharmac/.test(text)) return "pharmacy";
  if (/biomedical|scientist/.test(text)) return "scientific_technical";
  if (/social worker|care assistant/.test(text)) return "social_care";
  if (/doctor|physician/.test(text)) return "medical_dental";
  if (/healthcare assistant/.test(text)) return "healthcare_support";
  return "nurse";
}
function stableExternalId(url) {
  try {
    const parsed = new URL(url);
    const pathId = parsed.pathname.split("/").filter(Boolean).pop();
    return plainText(pathId || `${parsed.hostname}${parsed.pathname}`, 300);
  } catch {
    return plainText(url, 300);
  }
}
function mapJob(raw, countryKey, now = /* @__PURE__ */ new Date()) {
  const country = countryFor(countryKey);
  const url = typeof raw.url === "string" ? raw.url : "";
  const location = plainText(raw.locations, 300);
  const text = `${plainText(raw.title, 400)} ${plainText(raw.description, 3e3)} ${location}`;
  const remote = raw.remote === true || /\b(remote|work from home|hybrid)\b/i.test(text);
  const date = new Date(String(raw.date || ""));
  return normalizeJob({
    external_id: stableExternalId(url),
    title: raw.title,
    employer_name: raw.company || raw.site || "Employer not stated",
    city: location.split(",")[0]?.trim() || null,
    location,
    pathway: country.key,
    country_code: country.code,
    salary_min: raw.salary_min,
    salary_max: raw.salary_max,
    salary_currency: raw.salary_currency_code || country.currency,
    salary_period: salaryPeriod(raw.salary_type),
    employment_type: raw.contract_type || raw.work_hours || null,
    contract_type: raw.contract_type || null,
    work_pattern: raw.work_hours || null,
    summary: raw.description,
    description: raw.description,
    source_url: url,
    canonical_url: url,
    application_url: url,
    published_at: Number.isFinite(date.getTime()) ? date.toISOString() : now.toISOString(),
    closing_at: null,
    profession: professionFor(text),
    specialty: plainText(raw.title, 200),
    sponsorship_status: "not_stated",
    raw_source_metadata: { provider: "careerjet", provider_site: plainText(raw.site, 200), salary_text: plainText(raw.salary, 300), remote_status: remote ? "remote" : "not_stated", locale: country.locale }
  }, { name: "careerjet", source_type: "aggregator_api", country_code: country.code }, now);
}
function canonicalUrlKey(value) {
  try {
    const url = new URL(String(value || ""));
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch {
    return "";
  }
}
function duplicateKey(row) {
  const clean = (value) => plainText(value, 400).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const parts = [clean(row.title), clean(row.employer_name || row.employer), clean(row.location), clean(row.country_code || row.country)];
  return parts.slice(0, 3).every((part) => part.length > 2) ? parts.join("|") : "";
}
async function fetchCountryJobs(options) {
  countryFor(options.country);
  const now = options.now || /* @__PURE__ */ new Date();
  const records = [], errors = [], seenUrls = /* @__PURE__ */ new Set(), seenIdentities = /* @__PURE__ */ new Set();
  let requestsMade = 0, jobsReceived = 0, duplicates = 0, invalid = 0;
  const batches = options.keywordBatches || SEARCH_BATCHES;
  const maxPages = Math.min(10, Math.max(1, Number(options.maxPages || 1)));
  const maxJobs = Math.max(1, Number(options.maxJobs || 400));
  outer: for (const keywords of batches) {
    for (let page = 1; page <= maxPages; page += 1) {
      const result = await requestPage({ ...options, keywords, page, pageSize: options.pageSize || 20 });
      requestsMade += result.requestsMade;
      jobsReceived += result.body.jobs.length;
      for (const raw of result.body.jobs) {
        const mapped = mapJob(raw, options.country, now);
        if (mapped.errors.length) {
          invalid += 1;
          errors.push(...mapped.errors.map((error) => `${plainText(raw.title, 80) || "Untitled"}: ${error}`));
          continue;
        }
        const url = canonicalUrlKey(mapped.job.canonical_url), identity = duplicateKey(mapped.job);
        if (url && seenUrls.has(url) || identity && seenIdentities.has(identity)) {
          duplicates += 1;
          continue;
        }
        if (url) seenUrls.add(url);
        if (identity) seenIdentities.add(identity);
        records.push(mapped.job);
        if (records.length >= maxJobs) break outer;
      }
      if (page >= result.body.pages || result.body.jobs.length < Number(options.pageSize || 20)) break;
    }
  }
  return { records, requestsMade, jobsReceived, duplicates, invalid, errors: errors.slice(0, 50) };
}
async function testConnection(options) {
  try {
    const result = await requestPage({ ...options, country: options.country || "gb", keywords: "registered nurse", page: 1, pageSize: 1, retries: 0, cacheTtlMs: 0 });
    return { ok: true, provider: "careerjet", authentication_succeeded: true, http_status: result.httpStatus, results_returned: result.body.jobs.length, locale: countryFor(options.country || "gb").locale };
  } catch (error) {
    const typed = error;
    return { ok: false, provider: "careerjet", authentication_succeeded: false, http_status: typed.status || 500, error: typed.message, code: typed.code || "CAREERJET_CONNECTION_FAILED" };
  }
}
module.exports = { API_ENDPOINT, COUNTRIES, SEARCH_BATCHES, credentialError, countryFor, validateResponse, requestPage, mapJob, fetchCountryJobs, testConnection, canonicalUrlKey, duplicateKey };
