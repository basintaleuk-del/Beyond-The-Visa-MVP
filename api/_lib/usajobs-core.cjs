const { createHash } = require("node:crypto");

const LIMITS = Object.freeze({ pages: 5, resultsPerPage: 100, retries: 3, timeoutMs: 12000 });
const NURSING_ROLE = /\b(registered nurse|clinical nurse|staff nurse|nurse practitioner|licensed practical nurse|licensed vocational nurse|nursing assistant|nurse educator|nurse manager|operating room nurse|perioperative nurse|pacu nurse|icu nurse|intensive care nurse|emergency (?:department )?nurse|mental health nurse|psychiatric nurse|public health nurse|nurse|nursing)\b/i;
const SPONSOR_CONFIRMED = /\b(?:visa|immigration|work authorization) sponsorship (?:is )?(?:available|provided|offered)|\bwill sponsor\b/i;
const SPONSOR_NOT_OFFERED = /\b(?:no|not eligible for|does not provide|will not provide|unable to provide) (?:visa|immigration|work authorization) sponsorship\b/i;
const CITIZENSHIP_REQUIRED = /\b(?:must be|requires?) (?:a )?U\.?S\.? citizen|\bU\.?S\.? citizenship (?:is )?required\b/i;

function clean(value, max = 4000) {
  if (Array.isArray(value)) value = value.join("\n");
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().slice(0, max);
}

function number(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function safeHttps(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

function first(value) { return Array.isArray(value) ? value[0] : value; }

function specialtyFor(value) {
  const text = clean(value, 3000);
  const specialties = [
    ["Nurse practitioner", /nurse practitioner/i], ["Critical care / ICU", /\b(?:critical care|icu|intensive care)\b/i],
    ["Emergency nursing", /\b(?:emergency department|emergency room|er nurse)\b/i], ["Mental health nursing", /\b(?:mental health|psychiatric)\b/i],
    ["Perioperative / operating room", /\b(?:perioperative|operating room|surgical|pacu|post.?anesthesia)\b/i],
    ["Public health", /\bpublic health\b/i], ["Nursing education", /\b(?:nurse educator|nursing education|clinical educator)\b/i],
    ["Nursing management", /\b(?:nurse manager|chief nurse|director of nursing|supervisory nurse)\b/i],
    ["Practical nursing", /\b(?:licensed practical|licensed vocational|lpn|lvn)\b/i], ["Nursing assistant", /\b(?:nursing assistant|nurse aide)\b/i],
  ];
  return specialties.find(([, pattern]) => pattern.test(text))?.[0] || "General nursing";
}

function sponsorshipFor(value) {
  const text = clean(value, 12000);
  const confirmed = text.match(SPONSOR_CONFIRMED);
  if (confirmed) return { visa_sponsorship_status: "confirmed", visa_sponsorship_verified: true, sponsorship_evidence: clean(confirmed[0], 240) };
  const declined = text.match(SPONSOR_NOT_OFFERED);
  if (declined) return { visa_sponsorship_status: "not_offered", visa_sponsorship_verified: true, sponsorship_evidence: clean(declined[0], 240) };
  const citizenship = text.match(CITIZENSHIP_REQUIRED);
  if (citizenship) return { visa_sponsorship_status: "not_applicable", visa_sponsorship_verified: true, sponsorship_evidence: clean(citizenship[0], 240) };
  return { visa_sponsorship_status: "unclear", visa_sponsorship_verified: false, sponsorship_evidence: null };
}

function fingerprint(record) {
  const stable = [record.employer_name, record.job_title, record.city, record.state, record.date_posted, record.closing_date, record.description, record.qualifications];
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

function normalizeUsaJobsItem(item, now = new Date()) {
  const descriptor = item?.MatchedObjectDescriptor || item || {};
  const details = descriptor.UserArea?.Details || {};
  const title = clean(descriptor.PositionTitle, 240);
  if (!title || !NURSING_ROLE.test(`${title} ${clean(details.JobSummary, 1000)}`)) return null;
  const location = first(descriptor.PositionLocation) || {};
  const remuneration = first(descriptor.PositionRemuneration) || {};
  const sourceUrl = safeHttps(descriptor.PositionURI);
  const applyUrl = safeHttps(first(descriptor.ApplyURI)) || sourceUrl;
  const externalId = clean(descriptor.PositionID, 180);
  if (!externalId || !sourceUrl || !applyUrl) return null;
  const duties = clean(details.MajorDuties, 10000);
  const description = clean([details.JobSummary, duties, details.Requirements, details.Evaluations].filter(Boolean).join("\n\n"), 24000);
  const qualifications = clean([descriptor.QualificationSummary, details.Education, details.HowToApply].filter(Boolean).join("\n\n"), 16000);
  const licence = clean(details.Licensure || details.License || details.Requirements, 5000) || null;
  const evidenceText = `${description} ${qualifications} ${licence || ""}`;
  const closing = descriptor.ApplicationCloseDate || descriptor.PositionEndDate || null;
  const closed = closing && new Date(closing).getTime() < now.getTime();
  const relocationValue = details.Relocation ?? details.RelocationExpensesReimbursed;
  const remote = details.RemoteIndicator === true || /remote job\s*:?\s*yes/i.test(evidenceText) ? "remote" : details.TeleworkEligible === true || /telework eligible\s*:?\s*yes/i.test(evidenceText) ? "hybrid" : "onsite";
  const employer = clean(descriptor.OrganizationName || descriptor.DepartmentName, 240) || "United States Federal Government";
  const result = {
    external_id: externalId, source_name: "USAJOBS", source_job_url: sourceUrl, canonical_application_url: applyUrl,
    employer_name: employer, job_title: title, nursing_specialty: specialtyFor(`${title} ${description}`),
    employment_type: clean(first(descriptor.PositionOfferingType)?.Name || first(descriptor.PositionSchedule)?.Name || details.ServiceType, 120) || null,
    city: clean(location.CityName, 160) || null, state: clean(location.CountrySubDivisionCode || location.LocationName, 120) || null,
    country: "United States", country_code: "US", destination_country: "United States of America",
    salary_min: number(remuneration.MinimumRange), salary_max: number(remuneration.MaximumRange), salary_currency: "USD",
    salary_period: clean(remuneration.Description || remuneration.RateIntervalCode, 60) || null, description: description || null, qualifications: qualifications || null,
    licence_requirements: licence, relocation_assistance: relocationValue === true || /relocation expenses reimbursed\s*:?\s*yes/i.test(evidenceText),
    remote_status: remote, date_posted: descriptor.PublicationStartDate || descriptor.PositionStartDate || null, closing_date: closing,
    imported_at: now.toISOString(), last_checked_at: now.toISOString(), expires_at: closing, status: closed ? "expired" : "active",
    attribution_text: "USAJOBS.gov — official United States Government employment source", featured: false,
    ...sponsorshipFor(evidenceText),
  };
  result.content_fingerprint = fingerprint(result);
  return result;
}

function dedupe(records) {
  const seen = new Set();
  return records.filter((row) => {
    const fallback = `${row.employer_name}|${row.job_title}|${row.state}|${row.city}|${row.date_posted}`.toLowerCase();
    const keys = [`source:${row.source_name}:${row.external_id}`, `url:${row.canonical_application_url}`, `fallback:${fallback}`, `hash:${row.content_fingerprint}`];
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

async function requestPage({ apiKey, userAgent, email, page, resultsPerPage = LIMITS.resultsPerPage, fetchImpl = fetch }) {
  const url = new URL("https://data.usajobs.gov/api/search");
  url.searchParams.set("Keyword", "Nurse");
  url.searchParams.set("WhoMayApply", "Public");
  url.searchParams.set("Fields", "Full");
  url.searchParams.set("SortField", "opendate");
  url.searchParams.set("SortDirection", "Desc");
  url.searchParams.set("Page", String(page));
  url.searchParams.set("ResultsPerPage", String(resultsPerPage));
  let lastError;
  for (let attempt = 0; attempt < LIMITS.retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { Accept: "application/json", Host: "data.usajobs.gov", "User-Agent": email, From: `${userAgent} <${email}>`, "Authorization-Key": apiKey }, signal: AbortSignal.timeout(LIMITS.timeoutMs) });
      if (!response.ok) throw new Error(`USAJOBS returned HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < LIMITS.retries) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    }
  }
  throw lastError || new Error("USAJOBS request failed.");
}

async function fetchUsaJobs({ apiKey, userAgent, email, maxPages = LIMITS.pages, fetchImpl = fetch, now = new Date() }) {
  if (!apiKey || !userAgent || !email) throw new Error("USAJOBS_API_KEY, USAJOBS_USER_AGENT and USAJOBS_EMAIL are required.");
  const raw = [];
  let totalPages = 1;
  for (let page = 1; page <= Math.min(maxPages, totalPages, LIMITS.pages); page += 1) {
    const payload = await requestPage({ apiKey, userAgent, email, page, fetchImpl });
    const result = payload?.SearchResult || {};
    const items = Array.isArray(result.SearchResultItems) ? result.SearchResultItems : [];
    raw.push(...items);
    totalPages = Math.max(1, Number(result.UserArea?.NumberOfPages) || Math.ceil(Number(result.SearchResultCountAll || items.length) / LIMITS.resultsPerPage));
    if (!items.length) break;
  }
  const normalized = raw.map((item) => normalizeUsaJobsItem(item, now)).filter(Boolean);
  return { rawCount: raw.length, records: dedupe(normalized), duplicates: normalized.length - dedupe(normalized).length };
}

module.exports = { LIMITS, clean, safeHttps, specialtyFor, sponsorshipFor, fingerprint, normalizeUsaJobsItem, dedupe, requestPage, fetchUsaJobs };
