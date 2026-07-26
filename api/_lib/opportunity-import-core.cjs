const { createHash } = require("node:crypto");

const LIMITS = Object.freeze({ maxRecords: 100, maxPages: 1, timeoutMs: 10000, retries: 2, maxRuntimeMs: 50000 });
const REJECTED_ROLES = /\b(doctor|physician|dentist|pharmacist|radiographer|physiotherapist|administrator|receptionist|care assistant|healthcare assistant)\b/i;
const NURSE_WORDS = /\b(nurse|nursing|rn|registered nurse|clinical nurse|health visitor)\b/i;
const MIDWIFE_WORDS = /\b(midwife|midwifery|maternity nurse)\b/i;
const CONFIRMED_SPONSORSHIP = /\b(visa sponsorship (?:is )?available|skilled worker sponsorship (?:is )?available|certificate of sponsorship (?:is )?available|sponsorship (?:is )?provided|employer will sponsor (?:an )?eligible applicant|international applicants? (?:are )?accepted with sponsorship)\b/i;
const POSSIBLE_SPONSORSHIP = /\b(sponsorship may be available|may offer sponsorship|eligible for sponsorship|sponsorship can be considered)\b/i;

function clean(value, max = 500) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeUrl(value, source) {
  if (!value) return null;
  let url;
  try { url = new URL(String(value)); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const base = new URL(source.base_url);
  const allowed = new Set([base.hostname, ...(source.configuration?.allowed_link_hosts || [])].map((x) => String(x).toLowerCase()));
  if (!allowed.has(url.hostname.toLowerCase())) return null;
  url.hash = "";
  return url.href;
}

function professionFor(record) {
  const text = clean([record.title, record.profession, record.category, record.summary].filter(Boolean).join(" "), 1000);
  if (REJECTED_ROLES.test(text) && !NURSE_WORDS.test(record.title || "") && !MIDWIFE_WORDS.test(record.title || "")) return null;
  const nurse = NURSE_WORDS.test(text), midwife = MIDWIFE_WORDS.test(text);
  if (nurse && midwife) return "both";
  if (midwife) return "midwife";
  if (nurse) return "nurse";
  return null;
}

function sponsorshipFor(value, evidenceUrl = null, checkedAt = new Date().toISOString()) {
  const text = clean(value, 2000);
  const confirmed = text.match(CONFIRMED_SPONSORSHIP);
  const possible = text.match(POSSIBLE_SPONSORSHIP);
  const match = confirmed || possible;
  return {
    sponsorship_status: confirmed ? "confirmed" : possible ? "may_be_available" : "not_stated",
    sponsorship_evidence_text: match ? clean(match[0], 180) : null,
    sponsorship_evidence_url: match ? evidenceUrl : null,
    sponsorship_checked_at: checkedAt,
    sponsorship_detection_method: match ? "deterministic_source_wording" : "not_stated",
  };
}

function fingerprint(record) {
  return createHash("sha256").update(JSON.stringify(record, Object.keys(record).sort())).digest("hex");
}

function recordKey(record) {
  if (record.external_id) return `id:${record.source_name}:${record.external_id}`;
  if (record.canonical_url) return `url:${record.canonical_url}`;
  if (record.application_url) return `apply:${record.application_url}`;
  return `fallback:${clean(`${record.title}|${record.employer}|${record.country}|${record.closing_at}`, 1000).toLowerCase()}`;
}

function normalizeRecord(raw, source, now = new Date()) {
  const opportunityType = source.source_type === "funding" ? "scholarship" : "job";
  const title = clean(raw.title, 220), employer = clean(raw.employer || raw.provider, 180);
  const canonicalUrl = safeUrl(raw.canonical_url || raw.source_url || raw.url, source);
  const applicationUrl = safeUrl(raw.application_url || canonicalUrl, source);
  const profession = professionFor(raw);
  if (!title || !employer || !canonicalUrl || !profession) return null;
  const checkedAt = now.toISOString();
  const closingAt = raw.closing_at || raw.deadline || null;
  const closed = closingAt && new Date(closingAt).getTime() < now.getTime();
  const sponsorship = sponsorshipFor(raw.sponsorship_wording || raw.description || raw.summary, canonicalUrl, checkedAt);
  const scholarshipReady = opportunityType === "scholarship" && Boolean(raw.eligibility_summary && (closingAt || raw.rolling_basis));
  const result = {
    external_id: clean(raw.external_id || raw.id, 180) || null,
    source_identifier: clean(raw.external_id || raw.id, 180) || null,
    title,
    employer,
    provider_name: employer,
    country: clean(raw.country, 12).toLowerCase() || "uk",
    city: clean(raw.city || raw.region, 160) || null,
    region: clean(raw.region, 160) || null,
    profession,
    specialty: clean(raw.specialty, 180) || null,
    opportunity_type: opportunityType,
    summary: clean(raw.summary, 420) || null,
    employment_type: clean(raw.employment_type, 100) || null,
    salary_min: optionalNumber(raw.salary_min),
    salary_max: optionalNumber(raw.salary_max),
    currency: clean(raw.currency, 8).toUpperCase() || null,
    source_name: source.name,
    source_type: source.source_type,
    source_url: canonicalUrl,
    canonical_url: canonicalUrl,
    application_url: applicationUrl || canonicalUrl,
    employer_url: safeUrl(raw.employer_url, source),
    published_at: raw.published_at || null,
    closing_at: closingAt,
    opening_at: raw.opening_at || null,
    imported_at: checkedAt,
    last_checked_at: checkedAt,
    source_updated_at: raw.updated_at || null,
    expires_at: raw.expires_at || closingAt,
    verification_status: opportunityType === "scholarship" ? "pending" : "verified",
    import_status: closed ? "closed" : raw.opening_at && new Date(raw.opening_at) > now ? "upcoming" : "active",
    status: closed ? "archived" : opportunityType === "job" ? "published" : "review",
    verified: opportunityType === "job",
    study_level: clean(raw.study_level, 120) || null,
    applicant_country_restrictions: Array.isArray(raw.applicant_country_restrictions) ? raw.applicant_country_restrictions.map((x) => clean(x, 80)).filter(Boolean) : [],
    international_applicant_eligibility: clean(raw.international_applicant_eligibility, 120) || null,
    funding_coverage: clean(raw.funding_coverage, 300) || null,
    eligibility_summary: clean(raw.eligibility_summary, 500) || null,
    ...sponsorship,
  };
  result.visa_sponsorship = result.sponsorship_status === "confirmed";
  result.content_hash = fingerprint(result);
  return result;
}

function dedupe(records) {
  const seen = new Set();
  return records.filter((record) => {
    const keys = [recordKey(record), record.canonical_url && `url:${record.canonical_url}`, record.application_url && `apply:${record.application_url}`].filter(Boolean);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

async function fetchJsonFeed(source, fetchImpl = fetch) {
  const feedUrl = safeUrl(source.configuration?.feed_url, source);
  if (!feedUrl) throw new Error("Approved HTTPS feed URL is required.");
  let lastError;
  for (let attempt = 0; attempt < LIMITS.retries; attempt += 1) {
    try {
      const response = await fetchImpl(feedUrl, { headers: { accept: "application/json", "user-agent": "BeyondTheVisaOpportunityImporter/1.0" }, signal: AbortSignal.timeout(LIMITS.timeoutMs) });
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
      const body = await response.json();
      const rows = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [];
      return rows.slice(0, Math.min(Number(source.configuration?.max_records) || LIMITS.maxRecords, LIMITS.maxRecords));
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("Source request failed.");
}

async function runSources({ sources, store, fetchImpl = fetch, now = new Date() }) {
  const summary = { sources: 0, succeeded: 0, failed: 0, found: 0, created: 0, updated: 0, archived: 0, duplicates: 0, errors: [] };
  const deadline = Date.now() + LIMITS.maxRuntimeMs;
  for (const source of sources) {
    if (Date.now() >= deadline) { summary.errors.push({ source: "orchestrator", message: "Maximum import runtime reached." }); break; }
    if (!source.enabled || source.permission_status !== "approved") continue;
    summary.sources += 1;
    const run = await store.beginSource(source, now);
    try {
      if (source.integration_type !== "json_feed_v1") throw new Error("Source adapter is disabled until an approved feed is configured.");
      const raw = await fetchJsonFeed(source, fetchImpl);
      const normalized = raw.map((row) => normalizeRecord(row, source, now)).filter(Boolean);
      const unique = dedupe(normalized);
      const counts = await store.saveRecords(source, unique, now);
      let archived = 0;
      if (source.configuration?.full_snapshot === true) archived = await store.archiveMissing(source, unique, now);
      Object.assign(summary, {
        succeeded: summary.succeeded + 1,
        found: summary.found + raw.length,
        created: summary.created + counts.created,
        updated: summary.updated + counts.updated,
        archived: summary.archived + archived,
        duplicates: summary.duplicates + (normalized.length - unique.length),
      });
      await store.finishSource(run, source, { status: "success", found: raw.length, ...counts, archived, duplicates: normalized.length - unique.length }, now);
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({ source: source.name, message: clean(error.message, 240) });
      await store.finishSource(run, source, { status: "failed", error: clean(error.message, 240) }, now);
    }
  }
  summary.archived += await store.archiveExpired(now);
  await store.refreshEmployerCandidates(now);
  return summary;
}

function sponsorshipSort(a, b) {
  const rank = { confirmed: 0, may_be_available: 1, not_stated: 2 };
  return (rank[a.sponsorship_status] ?? 3) - (rank[b.sponsorship_status] ?? 3)
    || new Date(b.published_at || 0) - new Date(a.published_at || 0)
    || new Date(a.closing_at || "9999-12-31") - new Date(b.closing_at || "9999-12-31");
}

module.exports = { LIMITS, clean, optionalNumber, safeUrl, professionFor, sponsorshipFor, fingerprint, recordKey, normalizeRecord, dedupe, fetchJsonFeed, runSources, sponsorshipSort };
