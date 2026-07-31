const { createHash } = require("node:crypto");
const { clean, specialtyFor, sponsorshipFor } = require("./usajobs-core.cjs");

const SEARCH_ENDPOINT = "https://www.reed.co.uk/api/1.0/search";
const DETAILS_ENDPOINT = "https://www.reed.co.uk/api/1.0/jobs";
const TERMS = Object.freeze([
  "Registered Nurse", "Staff Nurse", "Theatre Nurse", "ICU Nurse", "Mental Health Nurse",
  "Practice Nurse", "Care Home Nurse", "Nursing Home Nurse", "Healthcare Assistant",
]);
const LIMITS = Object.freeze({ resultsToTake: 20, sampleSize: 10, timeoutMs: 12000, retries: 3 });
const SUITABLE_TITLE = /\b(?:registered nurse|staff nurse|theatre nurse|icu nurse|intensive care nurse|mental health nurse|psychiatric nurse|practice nurse|care home nurse|nursing home nurse|healthcare assistant|health care assistant|hca)\b/i;

function normalizedApiKey(apiKey) { return String(apiKey || "").trim(); }
function credentialError(apiKey) { return normalizedApiKey(apiKey) ? "" : "REED_API_KEY is required."; }
function basicAuthorization(apiKey) { return `Basic ${Buffer.from(`${normalizedApiKey(apiKey)}:`, "utf8").toString("base64")}`; }
function safeReedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || !(url.hostname === "reed.co.uk" || url.hostname.endsWith(".reed.co.uk"))) return null;
    url.protocol = "https:"; url.hash = ""; return url.href;
  } catch { return null; }
}
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function iso(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null; }
function fingerprint(row) { return createHash("sha256").update(JSON.stringify([row.source_name,row.external_id,row.title,row.employer,row.location,row.salary_min,row.salary_max,row.description,row.closing_at])).digest("hex"); }

function normalizeItem(summary, details = {}, now = new Date()) {
  const title = clean(details.jobTitle || summary.jobTitle, 240), externalId = clean(details.jobId || summary.jobId, 180);
  const applicationUrl = safeReedUrl(details.jobUrl || summary.jobUrl);
  if (!title || !externalId || !applicationUrl || !SUITABLE_TITLE.test(title)) return null;
  const description = clean(details.jobDescription || summary.jobDescription, 24000);
  const employer = clean(details.employerName || summary.employerName, 240) || "Employer not stated";
  const location = clean(details.locationName || summary.locationName, 500) || "United Kingdom";
  const contractType = clean(details.contractType || summary.contractType, 120) || null;
  const fullTime = details.fullTime ?? summary.fullTime, partTime = details.partTime ?? summary.partTime;
  const pattern = fullTime && partTime ? "Full-time or part-time" : fullTime ? "Full-time" : partTime ? "Part-time" : "Not stated";
  const posted = iso(details.date || summary.date), expires = iso(details.expirationDate || summary.expirationDate);
  const evidence = sponsorshipFor(`${title} ${description}`), closed = expires && new Date(expires) < now;
  const row = {
    external_id: externalId, source_identifier: externalId, external_reference: externalId, job_reference: externalId,
    source_name: "REED", source_type: "aggregator_api", source_url: applicationUrl, canonical_url: applicationUrl, application_url: applicationUrl,
    title, employer, employer_name: employer, provider_name: employer, location, country: "uk", country_code: "GB", country_name: "United Kingdom",
    profession: "nurse", specialty: specialtyFor(`${title} ${description}`), opportunity_type: "job", summary: description.slice(0, 600) || null, description: description || null,
    salary_min: number(details.minimumSalary ?? summary.minimumSalary), salary_max: number(details.maximumSalary ?? summary.maximumSalary),
    currency: "GBP", salary_currency: "GBP", salary_text: clean(details.salary || summary.salary, 160) || null, salary_period: null,
    employment_type: contractType, contract_type: contractType, working_pattern: pattern, work_pattern: pattern,
    published_at: posted, opening_at: posted, closing_at: expires, closing_date: expires ? expires.slice(0, 10) : null, expires_at: expires,
    visa_sponsorship: evidence.visa_sponsorship_status === "confirmed" && evidence.visa_sponsorship_verified,
    sponsorship_status: evidence.visa_sponsorship_status === "confirmed" ? "confirmed" : evidence.visa_sponsorship_status === "not_offered" ? "not_offered" : "not_stated",
    sponsorship_evidence_text: evidence.sponsorship_evidence, sponsorship_detection_method: "explicit_listing_text",
    verified: true, verification_status: "verified", featured: false, is_featured: false,
    status: closed ? "expired" : "published", import_status: closed ? "closed" : "active", expired_at: closed ? now.toISOString() : null,
    imported_at: now.toISOString(), last_checked_at: now.toISOString(), last_verified_at: now.toISOString(), updated_at: now.toISOString(),
    raw_source_metadata: { attribution: "Reed", contract_type: contractType, full_time: Boolean(fullTime), part_time: Boolean(partTime) },
  };
  row.content_hash = fingerprint(row); return row;
}

function searchUrl({ keyword, resultsToTake = LIMITS.resultsToTake, includeLocation = true }) {
  const url = new URL(SEARCH_ENDPOINT); url.searchParams.set("keywords", keyword); if (includeLocation) url.searchParams.set("locationName", "United Kingdom");
  url.searchParams.set("resultsToTake", String(resultsToTake)); return url;
}
async function requestJson(url, { apiKey, fetchImpl = fetch }) {
  let lastError;
  for (let attempt = 0; attempt < LIMITS.retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { Accept: "application/json", Authorization: basicAuthorization(apiKey) }, signal: AbortSignal.timeout(LIMITS.timeoutMs) });
      if (!response.ok) { const error = new Error(`Reed returned HTTP ${response.status}`); error.status = response.status; throw error; }
      return await response.json();
    } catch (error) {
      lastError = error; if (error.status && error.status < 500 && error.status !== 429) break;
      if (attempt + 1 < LIMITS.retries) await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** attempt)));
    }
  }
  throw lastError || new Error("Reed request failed.");
}
async function testConnection({ apiKey, fetchImpl = fetch }) {
  const configurationError = credentialError(apiKey); if (configurationError) return { authentication_succeeded:false,http_status:null,jobs_found:0,sample_titles:[],error:configurationError };
  try {
    const response = await fetchImpl(searchUrl({ keyword:"Registered Nurse",resultsToTake:5,includeLocation:false }), { headers:{ Accept:"application/json",Authorization:basicAuthorization(apiKey) },signal:AbortSignal.timeout(LIMITS.timeoutMs) });
    let payload={}; try { payload=await response.json(); } catch {}
    const results=Array.isArray(payload.results)?payload.results:[];
    return { authentication_succeeded:response.ok,http_status:response.status,jobs_found:Number(payload.totalResults||results.length||0),results_returned:results.length,sample_titles:results.slice(0,3).map((item)=>clean(item.jobTitle,240)).filter(Boolean),...(response.ok?{}:{error:response.status===401||response.status===403?"Reed rejected the configured credential.":`Reed returned HTTP ${response.status}.`}) };
  } catch(error) { return { authentication_succeeded:false,http_status:null,jobs_found:0,results_returned:0,sample_titles:[],error:error?.name==="TimeoutError"?"Reed connection timed out.":"Reed could not be reached safely." }; }
}
async function fetchReedJobs({ apiKey, sample = false, fetchImpl = fetch, now = new Date() }) {
  const configurationError=credentialError(apiKey); if(configurationError) throw new Error(configurationError);
  const terms=sample?[TERMS[0]]:TERMS, summaries=new Map(); let searchesRun=0;
  for(const keyword of terms){ const payload=await requestJson(searchUrl({keyword,resultsToTake:sample?10:LIMITS.resultsToTake}),{apiKey,fetchImpl}); searchesRun+=1; for(const item of Array.isArray(payload.results)?payload.results:[]) if(item?.jobId!=null) summaries.set(String(item.jobId),item); }
  const candidates=[...summaries.values()].filter((item)=>SUITABLE_TITLE.test(clean(item.jobTitle,240))).slice(0,sample?10:180), records=[];
  for(const item of candidates){ let details={}; try { details=await requestJson(`${DETAILS_ENDPOINT}/${encodeURIComponent(item.jobId)}`,{apiKey,fetchImpl}); } catch(error){ if(error.status===404) continue; throw error; } const row=normalizeItem(item,details,now); if(row) records.push(row); }
  return { rawCount:summaries.size,records,duplicates:candidates.length-records.length,searchesRun,detailsFetched:candidates.length };
}

module.exports={ SEARCH_ENDPOINT,DETAILS_ENDPOINT,TERMS,LIMITS,normalizedApiKey,credentialError,basicAuthorization,safeReedUrl,normalizeItem,testConnection,fetchReedJobs };
