const { createHash } = require("node:crypto");

const LIMITS = Object.freeze({ pageBudget: 18, resultsPerPage: 100, retries: 3, timeoutMs: 12000 });
const USAJOBS_ENDPOINT = "https://data.usajobs.gov/api/Search";
const SEARCHES = Object.freeze([
  { keyword: "Nurse", series: "0610", pages: 4 },
  { keyword: "Registered Nurse", series: "0610", pages: 1 },
  { keyword: "Clinical Nurse", series: "0610", pages: 1 },
  { keyword: "Staff Nurse", series: "0610", pages: 1 },
  { keyword: "Nurse Practitioner", series: "0610", pages: 1 },
  { keyword: "Nursing Assistant", series: "0621", pages: 2 },
  { keyword: "Licensed Practical Nurse", series: "0620", pages: 1 },
  { keyword: "Licensed Vocational Nurse", series: "0620", pages: 1 },
  { keyword: "Nurse Educator", series: "0610", pages: 1 },
  { keyword: "Public Health Nurse", series: "0610", pages: 1 },
  { keyword: "Operating Room Nurse", series: "0610", pages: 1 },
  { keyword: "PACU Nurse", series: "0610", pages: 1 },
  { keyword: "Critical Care Nurse", series: "0610", pages: 1 },
  { keyword: "Mental Health Nurse", series: "0610", pages: 1 },
]);
const NURSING_TITLE = /\b(nurse|nursing assistant|licensed practical|licensed vocational|lpn|lvn)\b/i;
const SPONSOR_CONFIRMED = /\b(?:visa|immigration|work authorization) sponsorship (?:is )?(?:available|provided|offered)|\bwill sponsor\b/i;
const SPONSOR_NOT_OFFERED = /\b(?:no|not eligible for|does not provide|will not provide|unable to provide) (?:visa|immigration|work authorization) sponsorship\b/i;
const CITIZENSHIP_REQUIRED = /\b(?:must be|requires?) (?:a )?U\.?S\.? citizen|\bU\.?S\.? citizenship (?:is )?required\b/i;
const SCHEDULE_CODES = Object.freeze({ "1": "Full-time", "2": "Part-time", "3": "Shift work", "4": "Intermittent", "5": "Job sharing", "6": "Multiple schedules" });
const OFFERING_CODES = Object.freeze({ "15317": "Permanent", "15318": "Temporary", "15319": "Term", "15320": "Detail", "15321": "Temporary promotion", "15322": "Seasonal", "15323": "Summer", "15326": "Recent graduates", "15327": "Multiple", "15328": "Internships", "15522": "Intermittent", "15667": "ICTAP only", "15668": "Agency employees only", "15669": "Telework" });
const WHO_CODES = Object.freeze({ "15509": "Agency employees only", "15510": "Qualified current civil service employees", "15513": "Status candidates", "15514": "United States citizens", "15515": "US citizens and non-citizens", "15516": "Student or internship programme eligibles", "15523": "US citizens and status candidates", "15590": "Veterans or qualifying military family members", "15669": "Public", "26985": "United States citizens", "45575": "All groups of qualified individuals" });

function clean(value, max = 4000) {
  if (Array.isArray(value)) value = value.map((entry) => typeof entry === "object" ? entry?.Name || entry?.Value || "" : entry).join("\n");
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().slice(0, max);
}
function number(value) { const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, "")); return Number.isFinite(parsed) ? parsed : null; }
function safeHttps(value) { try { const url = new URL(String(value || "")); if (url.protocol !== "https:" || url.username || url.password) return null; url.hash = ""; return url.href; } catch { return null; } }
function first(value) { return Array.isArray(value) ? value[0] : value; }
function names(value) { return clean((Array.isArray(value) ? value : [value]).filter(Boolean).map((entry) => typeof entry === "object" ? entry.Name || entry.Value || entry.Code || "" : entry)); }
function codedNames(value, codes) { return clean((Array.isArray(value) ? value : [value]).filter(Boolean).map((entry) => typeof entry === "object" ? entry.Name || entry.Value || codes[entry.Code] || entry.Code || "" : codes[entry] || entry)); }

function specialtyFor(value) {
  const text = clean(value, 4000);
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
  const text = clean(value, 16000), confirmed = text.match(SPONSOR_CONFIRMED), declined = text.match(SPONSOR_NOT_OFFERED), citizenship = text.match(CITIZENSHIP_REQUIRED);
  if (confirmed) return { visa_sponsorship_status: "confirmed", visa_sponsorship_verified: true, sponsorship_evidence: clean(confirmed[0], 240) };
  if (declined) return { visa_sponsorship_status: "not_offered", visa_sponsorship_verified: true, sponsorship_evidence: clean(declined[0], 240) };
  if (citizenship) return { visa_sponsorship_status: "not_applicable", visa_sponsorship_verified: true, sponsorship_evidence: clean(citizenship[0], 240) };
  return { visa_sponsorship_status: "unclear", visa_sponsorship_verified: false, sponsorship_evidence: null };
}

function fingerprint(record) {
  const stable = [record.employer_name, record.job_title, record.city, record.state, record.closing_date, record.description, record.qualifications, record.who_may_apply];
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

function rawSnapshot(descriptor, details) {
  return {
    PositionID: descriptor.PositionID, PositionTitle: descriptor.PositionTitle, PositionURI: descriptor.PositionURI, ApplyURI: descriptor.ApplyURI,
    OrganizationName: descriptor.OrganizationName, DepartmentName: descriptor.DepartmentName, JobCategory: descriptor.JobCategory, JobGrade: descriptor.JobGrade,
    PositionLocation: descriptor.PositionLocation, PositionRemuneration: descriptor.PositionRemuneration, PositionSchedule: descriptor.PositionSchedule,
    PositionOfferingType: descriptor.PositionOfferingType, PublicationStartDate: descriptor.PublicationStartDate, ApplicationCloseDate: descriptor.ApplicationCloseDate,
    QualificationSummary: descriptor.QualificationSummary,
    Details: { JobSummary: details.JobSummary, MajorDuties: details.MajorDuties, Requirements: details.Requirements, WhoMayApply: details.WhoMayApply, Education: details.Education, Evaluations: details.Evaluations, HowToApply: details.HowToApply, TeleworkEligible: details.TeleworkEligible, RemoteIndicator: details.RemoteIndicator, Relocation: details.Relocation },
  };
}

function normalizeUsaJobsItem(item, now = new Date()) {
  const descriptor = item?.MatchedObjectDescriptor || item || {}, details = descriptor.UserArea?.Details || {};
  const title = clean(descriptor.PositionTitle, 240), categories = Array.isArray(descriptor.JobCategory) ? descriptor.JobCategory : [];
  const series = categories.map((entry) => clean(entry?.Code || entry, 10)).filter(Boolean);
  if (!title || !NURSING_TITLE.test(title) || series.length && !series.some((code) => ["0610", "0620", "0621"].includes(code))) return null;
  const locations = Array.isArray(descriptor.PositionLocation) ? descriptor.PositionLocation : [], location = locations[0] || {};
  const remuneration = first(descriptor.PositionRemuneration) || {}, sourceUrl = safeHttps(descriptor.PositionURI), applyUrl = safeHttps(first(descriptor.ApplyURI)) || sourceUrl;
  const externalId = clean(descriptor.PositionID, 180); if (!externalId || !sourceUrl || !applyUrl) return null;
  const duties = clean(details.MajorDuties, 10000), requirements = clean(details.Requirements, 10000), description = clean([details.JobSummary, duties, details.Evaluations].filter(Boolean).join("\n\n"), 24000);
  const qualifications = clean([descriptor.QualificationSummary, details.Education].filter(Boolean).join("\n\n"), 16000);
  const licence = clean(details.Licensure || details.License || details.Requirements, 5000) || null;
  const whoMayApply = codedNames(details.WhoMayApply || descriptor.UserArea?.Details?.HiringPath || descriptor.UserArea?.Details?.WhoMayApplyName, WHO_CODES) || "Review the official USAJOBS announcement for applicant eligibility.";
  const evidenceText = `${description} ${requirements} ${qualifications} ${licence || ""} ${whoMayApply}`;
  const closing = descriptor.ApplicationCloseDate || descriptor.PositionEndDate || null, closed = closing && new Date(closing).getTime() < now.getTime();
  const relocationValue = details.Relocation ?? details.RelocationExpensesReimbursed;
  const remote = details.RemoteIndicator === true || /remote job\s*:?\s*yes/i.test(evidenceText) ? "remote" : details.TeleworkEligible === true || /telework eligible\s*:?\s*yes/i.test(evidenceText) ? "hybrid" : "onsite";
  const agency = clean(descriptor.OrganizationName, 240) || null, department = clean(descriptor.DepartmentName, 240) || null, employer = agency || department || "United States Federal Government";
  const locationDisplay = clean(locations.map((entry) => entry.LocationName || [entry.CityName, entry.CountrySubDivisionCode].filter(Boolean).join(", ")), 500) || "United States";
  const result = {
    external_id: externalId, source_name: "USAJOBS", source_job_url: sourceUrl, canonical_application_url: applyUrl,
    employer_name: employer, agency, department, job_title: title, nursing_specialty: specialtyFor(`${title} ${description}`),
    employment_type: codedNames(descriptor.PositionOfferingType, OFFERING_CODES) || null, schedule: codedNames(descriptor.PositionSchedule, SCHEDULE_CODES) || null, grade: names(descriptor.JobGrade) || null,
    city: clean(location.CityName, 160) || null, state: clean(location.CountrySubDivisionCode, 120) || null, location_display: locationDisplay,
    country: "United States", country_code: "US", destination_country: "United States of America",
    salary_min: number(remuneration.MinimumRange), salary_max: number(remuneration.MaximumRange), salary_currency: "USD", salary_period: clean(remuneration.Description || remuneration.RateIntervalCode, 60) || null,
    description: description || null, qualifications: qualifications || null, requirements: requirements || null, who_may_apply: whoMayApply, licence_requirements: licence,
    relocation_assistance: relocationValue === true || /relocation expenses reimbursed\s*:?\s*yes/i.test(evidenceText), remote_status: remote,
    date_posted: descriptor.PublicationStartDate || descriptor.PositionStartDate || null, opening_date: descriptor.PublicationStartDate || descriptor.PositionStartDate || null, closing_date: closing,
    imported_at: now.toISOString(), last_checked_at: now.toISOString(), last_seen_at: now.toISOString(), expires_at: closing, status: closed ? "expired" : "active", updated_at: now.toISOString(),
    attribution_text: "USAJOBS.gov — official United States Government employment source", raw_source_data: rawSnapshot(descriptor, details), featured: false,
    ...sponsorshipFor(evidenceText),
  };
  result.content_fingerprint = fingerprint(result); return result;
}

function dedupe(records) {
  const seen = new Set();
  return records.filter((row) => { const fallback = `${row.employer_name}|${row.job_title}|${row.state}|${row.city}|${row.date_posted}`.toLowerCase(); const keys = [`source:${row.source_name}:${row.external_id}`, `url:${row.canonical_application_url}`, `fallback:${fallback}`, `hash:${row.content_fingerprint}`]; if (keys.some((key) => seen.has(key))) return false; keys.forEach((key) => seen.add(key)); return true; });
}

function credentialError(apiKey, userAgent) { if (!apiKey || !userAgent) return "USAJOBS_API_KEY and USAJOBS_USER_AGENT are required."; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(userAgent)) return "USAJOBS_USER_AGENT must be the email address registered with USAJOBS."; return ""; }
function requestHeaders(apiKey, userAgent) { return { Accept: "application/json", Host: "data.usajobs.gov", "User-Agent": userAgent, "Authorization-Key": apiKey }; }

async function testConnection({ apiKey, userAgent, fetchImpl = fetch }) {
  const configurationError = credentialError(apiKey, userAgent); if (configurationError) return { authentication_succeeded: false, http_status: null, jobs_found: 0, sample_titles: [], error: configurationError };
  const url = new URL(USAJOBS_ENDPOINT); url.searchParams.set("Keyword", "Nurse"); url.searchParams.set("ResultsPerPage", "10");
  try { const response = await fetchImpl(url, { headers: requestHeaders(apiKey, userAgent), signal: AbortSignal.timeout(LIMITS.timeoutMs) }); let payload = {}; try { payload = await response.json(); } catch {} const items = Array.isArray(payload?.SearchResult?.SearchResultItems) ? payload.SearchResult.SearchResultItems : []; return { authentication_succeeded: response.ok, http_status: response.status, jobs_found: Number(payload?.SearchResult?.SearchResultCountAll || items.length || 0), sample_titles: items.slice(0, 3).map((entry) => clean(entry?.MatchedObjectDescriptor?.PositionTitle, 240)).filter(Boolean), ...(response.ok ? {} : { error: response.status === 401 ? "USAJOBS rejected the configured credentials." : `USAJOBS returned HTTP ${response.status}.` }) }; }
  catch (error) { return { authentication_succeeded: false, http_status: null, jobs_found: 0, sample_titles: [], error: error?.name === "TimeoutError" ? "USAJOBS connection timed out." : "USAJOBS could not be reached safely." }; }
}

async function requestPage({ apiKey, userAgent, search = SEARCHES[0], page, resultsPerPage = LIMITS.resultsPerPage, fetchImpl = fetch }) {
  const url = new URL(USAJOBS_ENDPOINT); url.searchParams.set("Keyword", search.keyword); if (search.series) url.searchParams.set("JobCategoryCode", search.series); url.searchParams.set("Fields", "Full"); url.searchParams.set("SortField", "opendate"); url.searchParams.set("SortDirection", "Desc"); url.searchParams.set("Page", String(page)); url.searchParams.set("ResultsPerPage", String(resultsPerPage));
  let lastError;
  for (let attempt = 0; attempt < LIMITS.retries; attempt += 1) { try { const response = await fetchImpl(url, { headers: requestHeaders(apiKey, userAgent), signal: AbortSignal.timeout(LIMITS.timeoutMs) }); if (!response.ok) { const error = new Error(`USAJOBS returned HTTP ${response.status}`); error.status = response.status; if (response.status < 500 && response.status !== 429) throw error; throw error; } return await response.json(); } catch (error) { lastError = error; if (error.status && error.status < 500 && error.status !== 429) break; if (attempt + 1 < LIMITS.retries) await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** attempt))); } }
  throw lastError || new Error("USAJOBS request failed.");
}

async function fetchUsaJobs({ apiKey, userAgent, maxPages = LIMITS.pageBudget, fetchImpl = fetch, now = new Date() }) {
  const configurationError = credentialError(apiKey, userAgent); if (configurationError) throw new Error(configurationError);
  const raw = []; let pagesFetched = 0, searchesRun = 0;
  for (const search of SEARCHES) {
    if (pagesFetched >= Math.min(maxPages, LIMITS.pageBudget)) break;
    let totalPages = 1; searchesRun += 1;
    for (let page = 1; page <= Math.min(search.pages, totalPages) && pagesFetched < Math.min(maxPages, LIMITS.pageBudget); page += 1) {
      const payload = await requestPage({ apiKey, userAgent, search, page, fetchImpl }); pagesFetched += 1;
      const result = payload?.SearchResult || {}, items = Array.isArray(result.SearchResultItems) ? result.SearchResultItems : []; raw.push(...items);
      totalPages = Math.max(1, Number(result.UserArea?.NumberOfPages) || Math.ceil(Number(result.SearchResultCountAll || items.length) / LIMITS.resultsPerPage)); if (!items.length) break;
    }
  }
  const normalized = raw.map((entry) => normalizeUsaJobsItem(entry, now)).filter(Boolean), records = dedupe(normalized);
  return { rawCount: raw.length, records, duplicates: normalized.length - records.length, pagesFetched, searchesRun };
}

module.exports = { LIMITS, SEARCHES, USAJOBS_ENDPOINT, clean, safeHttps, specialtyFor, sponsorshipFor, fingerprint, normalizeUsaJobsItem, dedupe, credentialError, requestHeaders, testConnection, requestPage, fetchUsaJobs };
