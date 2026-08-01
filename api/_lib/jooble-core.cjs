const crypto = require("node:crypto");
const { normalizeJob, plainText, safeExternalUrl } = require("./global-jobs-core.cjs");

const API_ORIGIN = "https://jooble.org";
const COUNTRIES = Object.freeze({
  gb: { key: "gb", code: "GB", name: "United Kingdom", domain: "uk.jooble.org", currency: "GBP" },
  us: { key: "us", code: "US", name: "United States", domain: "jooble.org", currency: "USD" },
  ca: { key: "ca", code: "CA", name: "Canada", domain: "ca.jooble.org", currency: "CAD" },
  au: { key: "au", code: "AU", name: "Australia", domain: "au.jooble.org", currency: "AUD" },
  nz: { key: "nz", code: "NZ", name: "New Zealand", domain: "nz.jooble.org", currency: "NZD" },
  ie: { key: "ie", code: "IE", name: "Ireland", domain: "ie.jooble.org", currency: "EUR" },
  ae: { key: "ae", code: "AE", name: "United Arab Emirates", domain: "ae.jooble.org", currency: "AED" },
  sa: { key: "sa", code: "SA", name: "Saudi Arabia", domain: "sa.jooble.org", currency: "SAR" },
});

// Comma-separated terms follow Jooble's documented request example and keep
// the daily sync to three controlled searches per destination.
const SEARCH_BATCHES = Object.freeze([
  "registered nurse, staff nurse, mental health nurse, theatre nurse, recovery nurse, ICU nurse, midwife",
  "healthcare assistant, care assistant, physiotherapist, radiographer",
  "pharmacist, biomedical scientist, doctor, social worker",
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanKey = (value) => String(value || "").trim();
const credentialError = (apiKey) => cleanKey(apiKey) ? "" : "JOOBLE_API_KEY is required.";

function countryFor(value) {
  const key = String(value || "").trim().toLowerCase();
  const country = COUNTRIES[key] || Object.values(COUNTRIES).find((item) => item.code.toLowerCase() === key);
  if (!country) throw Object.assign(new Error("Unsupported Jooble country."), { status: 400, code: "JOOBLE_UNSUPPORTED_COUNTRY" });
  return country;
}

function requestUrl(apiKey) {
  if (credentialError(apiKey)) throw Object.assign(new Error("JOOBLE_API_KEY is required."), { status: 503, code: "JOOBLE_NOT_CONFIGURED" });
  return `${API_ORIGIN}/api/${encodeURIComponent(cleanKey(apiKey))}`;
}

function retryAfter(response, attempt) {
  const seconds = Number(response?.headers?.get?.("retry-after"));
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, 10000) : Math.min(10000, 400 * (2 ** attempt));
}

function safeLog(logger, event) {
  if (typeof logger !== "function") return;
  logger({ provider: "jooble", ...event });
}

function validateResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.jobs)) {
    throw Object.assign(new Error("Jooble returned a malformed response."), { status: 502, code: "JOOBLE_MALFORMED_RESPONSE" });
  }
  const totalCount = Number(value.totalCount ?? value.totalcount ?? value.jobs.length);
  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw Object.assign(new Error("Jooble returned an invalid result count."), { status: 502, code: "JOOBLE_MALFORMED_RESPONSE" });
  }
  return { totalCount, jobs: value.jobs };
}

async function requestPage({ apiKey, country: countryValue, keywords, page = 1, resultOnPage = 20, fetchImpl = fetch, timeoutMs = 10000, retries = 2, delay = sleep, logger }) {
  const country = countryFor(countryValue);
  const body = { keywords: plainText(keywords, 500), location: country.name, radius: "0", page: String(Math.max(1, Number(page) || 1)), ResultOnPage: Math.min(50, Math.max(1, Number(resultOnPage) || 20)), SearchMode: "0", companysearch: "false" };
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(requestUrl(apiKey), { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok) {
        const error = Object.assign(new Error(`Jooble request failed for ${country.code} (HTTP ${response.status}).`), { status: response.status, code: response.status === 429 ? "JOOBLE_RATE_LIMITED" : "JOOBLE_HTTP_ERROR" });
        if (attempt < retries && (response.status === 408 || response.status === 429 || response.status >= 500)) {
          safeLog(logger, { event: "request_retry", country_code: country.code, keyword: body.keywords, page: Number(body.page), status: response.status, attempt: attempt + 1 });
          await delay(retryAfter(response, attempt));
          lastError = error;
          continue;
        }
        throw error;
      }
      let payload;
      try { payload = await response.json(); }
      catch { throw Object.assign(new Error("Jooble returned invalid JSON."), { status: 502, code: "JOOBLE_MALFORMED_RESPONSE" }); }
      return { ...validateResponse(payload), status: response.status, request: body };
    } catch (error) {
      const failure = error?.name === "AbortError" ? Object.assign(new Error(`Jooble request timed out for ${country.code}.`), { status: 504, code: "JOOBLE_TIMEOUT" }) : error;
      const terminal = ["JOOBLE_MALFORMED_RESPONSE","JOOBLE_NOT_CONFIGURED","JOOBLE_UNSUPPORTED_COUNTRY"].includes(failure.code);
      const retryable = !terminal && (failure.status === 408 || failure.status === 429 || failure.status >= 500 || failure.code === "JOOBLE_TIMEOUT" || !failure.status);
      safeLog(logger, { event: "request_failed", country_code: country.code, keyword: body.keywords, page: Number(body.page), status: Number(failure.status || 0), code: failure.code || "JOOBLE_REQUEST_FAILED", attempt: attempt + 1, retryable });
      if (attempt >= retries || !retryable) throw failure;
      lastError = failure;
      await delay(Math.min(10000, 400 * (2 ** attempt)));
    } finally { clearTimeout(timer); }
  }
  throw lastError || Object.assign(new Error("Jooble request failed."), { status: 502 });
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function salaryValues(value, currency) {
  const text = plainText(value, 180);
  const numbers = [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((match) => Number(match[0].replace(/,/g, ""))).filter(Number.isFinite);
  const period = /per\s+hour|hourly|\/\s*h(?:our|r)?\b/i.test(text) ? "hour" : /per\s+month|monthly/i.test(text) ? "month" : /per\s+week|weekly/i.test(text) ? "week" : /per\s+year|annual|yearly|p\.a\.?/i.test(text) ? "year" : null;
  return { salary_text: text || null, salary_min: numbers[0] ?? null, salary_max: numbers.length > 1 ? numbers[1] : numbers[0] ?? null, salary_currency: currency, salary_period: period };
}

function professionFor(title) {
  const value = String(title || "").toLowerCase();
  if (/midwi/.test(value)) return "midwife";
  if (/physiotherap|radiograph/.test(value)) return "allied_health";
  if (/pharmac/.test(value)) return "pharmacy";
  if (/biomedical scientist/.test(value)) return "scientific_technical";
  if (/social worker/.test(value)) return "social_care";
  if (/doctor|physician/.test(value)) return "medical_dental";
  if (/healthcare assistant|care assistant/.test(value)) return "healthcare_support";
  return "nurse";
}

function locationParts(value, country) {
  const location = plainText(value, 300);
  const parts = location.split(",").map((item) => item.trim()).filter(Boolean);
  if (parts.length && [country.name.toLowerCase(), country.code.toLowerCase()].includes(parts.at(-1).toLowerCase())) parts.pop();
  return { location, city: parts[0] || location, region: parts.slice(1).join(", ") };
}

function allowedJoobleLink(value, country) {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const hostname = new URL(safe).hostname.toLowerCase();
  return hostname === country.domain || hostname === `www.${country.domain}` ? safe : null;
}

function mapJob(raw, countryValue, now = new Date()) {
  const country = countryFor(countryValue);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { job: null, errors: ["job must be an object"] };
  const link = allowedJoobleLink(raw.link, country);
  const title = plainText(raw.title, 400), employer = plainText(raw.company, 300), externalId = plainText(raw.id, 300);
  const location = locationParts(raw.location, country), salary = salaryValues(raw.salary, country.currency);
  const expiry = dateValue(raw.expires || raw.expiry || raw.expirationDate);
  const updated = dateValue(raw.updated) || now.toISOString();
  const remote = raw.remote === true || /\bremote\b/i.test(`${raw.type || ""} ${raw.location || ""}`);
  const normalized = normalizeJob({
    external_id: externalId, title, employer_name: employer, location: location.location, city: location.city, region_or_state: location.region,
    application_url: link, canonical_url: link, source_url: link, country_code: country.code, profession: professionFor(title), specialty: title,
    summary: raw.snippet, description: raw.snippet, salary_min: salary.salary_min, salary_max: salary.salary_max, salary_currency: country.currency,
    salary_period: salary.salary_period, employment_type: raw.type, work_pattern: remote ? "Remote" : null, published_at: updated, source_last_modified_at: updated,
    closing_at: expiry, sponsorship_status: "not_stated", overseas_applicants_status: "not_stated", verification_status: "pending",
    raw_source_metadata: { provider: "jooble", provider_source: plainText(raw.source, 200) || "jooble", salary_text: salary.salary_text, remote_status: remote ? "remote" : "not_stated", country_domain: country.domain },
  }, { name: "jooble", source_type: "aggregator_api", country_code: country.code }, now);
  const errors = [...normalized.errors];
  if (!externalId) errors.push("Jooble id is required");
  if (!employer) errors.push("Jooble company is required");
  if (!link) errors.push("Jooble link must match the configured country domain");
  if (!title) errors.push("Jooble title is required");
  return { job: errors.length ? null : { ...normalized.job, content_hash: crypto.createHash("sha256").update([externalId,title,employer,location.location,updated,raw.snippet,raw.salary,raw.type].join("|")).digest("hex") }, errors: [...new Set(errors)] };
}

function duplicateKey(job) {
  const clean = (value) => plainText(value, 400).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return [clean(job.title), clean(job.employer_name || job.employer), clean(job.location || [job.city,job.region_or_state].filter(Boolean).join(", ")), clean(job.country_code)].join("|");
}

function canonicalUrlKey(value) {
  try { const url = new URL(value); return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "").toLowerCase()}`; }
  catch { return ""; }
}

async function fetchCountryJobs({ apiKey, country: countryValue, keywordBatches = SEARCH_BATCHES, maxPages = 1, resultOnPage = 20, fetchImpl = fetch, timeoutMs = 10000, retries = 2, delay = sleep, logger, now = new Date() }) {
  const country = countryFor(countryValue), records = [], errors = [], seenUrls = new Set(), seenIdentities = new Set();
  let requestsMade = 0, jobsReceived = 0, duplicates = 0, invalid = 0;
  for (const keywords of keywordBatches) {
    for (let page = 1; page <= Math.max(1, maxPages); page += 1) {
      const response = await requestPage({ apiKey, country: country.key, keywords, page, resultOnPage, fetchImpl, timeoutMs, retries, delay, logger });
      requestsMade += 1; jobsReceived += response.jobs.length;
      for (const raw of response.jobs) {
        const mapped = mapJob(raw, country.key, now);
        if (!mapped.job) { invalid += 1; errors.push({ country: country.code, keyword: keywords, page, errors: mapped.errors }); continue; }
        const url = canonicalUrlKey(mapped.job.canonical_url), identity = duplicateKey(mapped.job);
        if (seenUrls.has(url) || seenIdentities.has(identity)) { duplicates += 1; continue; }
        seenUrls.add(url); seenIdentities.add(identity); records.push(mapped.job);
      }
      if (response.jobs.length < resultOnPage || page * resultOnPage >= response.totalCount) break;
    }
  }
  return { country, records, requestsMade, jobsReceived, duplicates, invalid, errors };
}

async function testConnection({ apiKey, country = "gb", fetchImpl = fetch, timeoutMs = 8000 }) {
  if (credentialError(apiKey)) return { configured: false, authentication_succeeded: false, error: "JOOBLE_API_KEY is required." };
  try {
    const result = await requestPage({ apiKey, country, keywords: "registered nurse", page: 1, resultOnPage: 1, fetchImpl, timeoutMs, retries: 0 });
    return { configured: true, authentication_succeeded: true, http_status: result.status, country_code: countryFor(country).code, results_returned: result.jobs.length, total_results: result.totalCount };
  } catch (error) {
    return { configured: true, authentication_succeeded: false, http_status: Number(error.status || 0), country_code: (() => { try { return countryFor(country).code; } catch { return null; } })(), error: error.code === "JOOBLE_RATE_LIMITED" ? "Jooble rate limit reached." : error.message };
  }
}

module.exports = { API_ORIGIN, COUNTRIES, SEARCH_BATCHES, credentialError, countryFor, validateResponse, requestPage, mapJob, duplicateKey, canonicalUrlKey, fetchCountryJobs, testConnection };
