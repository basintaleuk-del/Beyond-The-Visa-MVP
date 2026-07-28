const crypto = require("node:crypto");

const PATHWAY_COUNTRIES = Object.freeze({
  uk: { code: "GB", name: "United Kingdom", flag: "🇬🇧", registration: "NMC" },
  us: { code: "US", name: "United States", flag: "🇺🇸", registration: "State board of nursing" },
  au: { code: "AU", name: "Australia", flag: "🇦🇺", registration: "AHPRA" },
  nz: { code: "NZ", name: "New Zealand", flag: "🇳🇿", registration: "Nursing Council of New Zealand" },
  ca: { code: "CA", name: "Canada", flag: "🇨🇦", registration: "Provincial regulator" },
  ie: { code: "IE", name: "Ireland", flag: "🇮🇪", registration: "NMBI" },
  ae: { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", registration: "Relevant UAE licensing authority" },
  sa: { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", registration: "SCFHS" },
});

const PATHWAY_ALIASES = Object.freeze({
  uk: "uk", gb: "uk", "united-kingdom": "uk", "united kingdom": "uk",
  us: "us", usa: "us", "united-states": "us", "united states": "us", "united states of america": "us",
  au: "au", australia: "au", nz: "nz", "new-zealand": "nz", "new zealand": "nz",
  ca: "ca", canada: "ca", ie: "ie", ireland: "ie", ae: "ae", uae: "ae", "united-arab-emirates": "ae", "united arab emirates": "ae",
  sa: "sa", saudi: "sa", "saudi-arabia": "sa", "saudi arabia": "sa",
});

function normalizePathway(value) {
  return PATHWAY_ALIASES[String(value || "").trim().toLowerCase()] || null;
}

function countryForPathway(value) {
  const pathway = normalizePathway(value);
  return pathway ? { pathway, ...PATHWAY_COUNTRIES[pathway] } : null;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || !host || host === "localhost" || host.endsWith(".local")) return null;
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

function plainText(value, max = 20000) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

function fingerprint(job) {
  const basis = [job.source_name, job.external_id, job.employer_name || job.employer, job.title, job.city, job.region_or_state, job.application_url]
    .map((x) => String(x || "").trim().toLowerCase()).join("|");
  return crypto.createHash("sha256").update(basis).digest("hex");
}

function fallbackDuplicateKey(job) {
  return [job.employer_name || job.employer, job.title, job.city || job.location, job.region_or_state, job.application_url]
    .map((x) => String(x || "").trim().toLowerCase()).join("|");
}

function validateJob(job) {
  const errors = [];
  if (!job.external_id) errors.push("external_id is required");
  if (!job.source_name) errors.push("source_name is required");
  if (!PATHWAY_COUNTRIES[job.pathway || ""] && !Object.values(PATHWAY_COUNTRIES).some((x) => x.code === job.country_code)) errors.push("supported country_code is required");
  if (!plainText(job.title, 300)) errors.push("title is required");
  if (!plainText(job.employer_name || job.employer, 300)) errors.push("employer is required");
  if (!safeExternalUrl(job.application_url)) errors.push("safe HTTPS application_url is required");
  if (!safeExternalUrl(job.source_url || job.application_url)) errors.push("safe HTTPS source_url is required");
  return errors;
}

function statusFor(job, now = new Date(), closingSoonDays = 7) {
  if (job.status === "withdrawn") return "withdrawn";
  const close = job.closing_at || job.closing_date;
  if (close && new Date(close) < now) return "expired";
  if (close && new Date(close).getTime() <= now.getTime() + closingSoonDays * 86400000) return "closing_soon";
  return ["draft", "pending_review", "review", "archived", "import_failed"].includes(job.status) ? job.status : "active";
}

function normalizeJob(input, source, now = new Date()) {
  const pathway = normalizePathway(input.pathway || source.pathway || source.country_code);
  const country = pathway ? PATHWAY_COUNTRIES[pathway] : Object.values(PATHWAY_COUNTRIES).find((x) => x.code === String(input.country_code || source.country_code || "").toUpperCase());
  const applicationUrl = safeExternalUrl(input.application_url || input.canonical_url || input.source_url);
  const sourceUrl = safeExternalUrl(input.source_url || input.canonical_url || applicationUrl);
  const sponsorship = ["confirmed", "may_be_available", "not_offered", "not_stated", "unclear", "not_applicable"].includes(input.sponsorship_status) ? input.sponsorship_status : "not_stated";
  const job = {
    external_id: String(input.external_id || input.job_reference || "").slice(0, 300), source_name: source.name,
    source_type: source.source_type || "official_api", source_url: sourceUrl, canonical_url: safeExternalUrl(input.canonical_url || applicationUrl), application_url: applicationUrl,
    country: pathway || String(country?.code || "").toLowerCase(), country_code: country?.code || null, country_name: country?.name || null,
    region: plainText(input.region_or_state || input.region, 200), region_or_state: plainText(input.region_or_state || input.region, 200), city: plainText(input.city, 200), location: plainText(input.location, 300),
    employer: plainText(input.employer_name || input.employer, 300), employer_name: plainText(input.employer_name || input.employer, 300), employer_logo_url: safeExternalUrl(input.employer_logo_url),
    title: plainText(input.title || input.job_title, 400), profession: plainText(input.profession || "nurse", 100), specialty: plainText(input.specialty, 200),
    department: plainText(input.department, 300), summary: plainText(input.summary, 1200), description: plainText(input.description), requirements: plainText(input.requirements || input.qualifications),
    registration_body: plainText(input.registration_body, 200), registration_required: plainText(input.registration_required || input.licence_requirements, 1000),
    overseas_applicants_status: ["accepted", "not_accepted", "not_stated"].includes(input.overseas_applicants_status) ? input.overseas_applicants_status : "not_stated",
    sponsorship_status: sponsorship, visa_sponsorship: sponsorship === "confirmed", relocation_support_available: input.relocation_support_available === true,
    salary_min: Number.isFinite(Number(input.salary_min)) ? Number(input.salary_min) : null, salary_max: Number.isFinite(Number(input.salary_max)) ? Number(input.salary_max) : null,
    currency: plainText(input.salary_currency || input.currency, 3).toUpperCase() || null, salary_currency: plainText(input.salary_currency || input.currency, 3).toUpperCase() || null,
    salary_period: plainText(input.salary_period, 80), employment_type: plainText(input.employment_type, 150), contract_type: plainText(input.contract_type, 150), work_pattern: plainText(input.work_pattern, 150),
    experience_level: plainText(input.experience_level, 150), job_reference: plainText(input.job_reference || input.external_id, 300), published_at: input.published_at || now.toISOString(),
    closing_at: input.closing_at || input.closing_date || null, imported_at: input.imported_at || now.toISOString(), last_checked_at: now.toISOString(), last_verified_at: now.toISOString(),
    source_last_modified_at: input.source_last_modified_at || null, opportunity_type: "job", verification_status: input.verification_status || "pending", import_status: "active",
    status: statusFor(input, now), content_hash: input.content_hash || null, raw_source_metadata: input.raw_source_metadata || {}, updated_at: now.toISOString(),
  };
  job.content_hash ||= fingerprint(job);
  return { job, errors: validateJob(job) };
}

function createProvider(definition) {
  const methods = ["fetchJobs", "mapJob", "validateJob", "upsertJob", "expireMissingJobs", "reportImportStatus"];
  for (const method of methods) if (typeof definition[method] !== "function") throw new TypeError(`Provider ${definition.name || "unknown"} must implement ${method}()`);
  return Object.freeze({ ...definition });
}

async function withRetry(operation, { retries = 2, delay = () => Promise.resolve() } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await operation(attempt); }
    catch (error) {
      lastError = error;
      const status = Number(error.status || error.statusCode || 0);
      if (attempt >= retries || status && status < 500 && status !== 408 && status !== 429) throw error;
      await delay(Math.min(30000, 500 * (2 ** attempt)), error);
    }
  }
  throw lastError;
}

module.exports = { PATHWAY_COUNTRIES, PATHWAY_ALIASES, normalizePathway, countryForPathway, safeExternalUrl, plainText, fingerprint, fallbackDuplicateKey, validateJob, statusFor, normalizeJob, createProvider, withRetry };
