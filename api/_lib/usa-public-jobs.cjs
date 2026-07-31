const { createHash } = require("node:crypto");

const SOURCE_URL = "https://careers.nyp.org/search-jobs?k=registered+nurse&orgIds=19715";
const BASE_URL = "https://careers.nyp.org";

function clean(value = "", limit = 4000) {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ").replace(/&#39;|&#x27;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ").trim().slice(0, limit);
}

function parseNypJobs(html, now = new Date()) {
  const jobs = [], seen = new Set();
  const pattern = /href=["']([^"']*\/job\/[^"']+\/19715\/\d+\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html || "").matchAll(pattern)) {
    const applicationUrl = new URL(match[1], BASE_URL).toString();
    if (seen.has(applicationUrl)) continue;
    const title = clean(match[2], 260);
    if (!/\b(nurs|midwi)/i.test(title)) continue;
    seen.add(applicationUrl);
    const context = clean(String(html).slice(Math.max(0, match.index - 500), match.index + match[0].length + 900), 2200);
    const place = context.match(/\b(Flushing|Brooklyn|Manhattan|New York|Cortlandt Manor|White Plains|Queens),?\s+(?:NY|New York)\b/i)?.[1] || "New York";
    const externalId = applicationUrl.match(/\/(\d+)\/?$/)?.[1] || createHash("sha256").update(applicationUrl).digest("hex").slice(0, 24);
    const record = {
      external_id: externalId, source_name: "NewYork-Presbyterian Careers", source_job_url: applicationUrl,
      canonical_application_url: applicationUrl, employer_name: "NewYork-Presbyterian", job_title: title,
      nursing_specialty: /midwi/i.test(title) ? "Midwifery" : /intensive|\bICU\b/i.test(title) ? "Critical care / ICU" : /emergency/i.test(title) ? "Emergency nursing" : "General nursing",
      employment_type: /part.?time/i.test(title) ? "Part-time" : /per diem/i.test(title) ? "Per diem" : /full.?time/i.test(title) ? "Full-time" : null,
      city: place, state: "NY", country: "United States", country_code: "US", destination_country: "United States of America",
      salary_min: null, salary_max: null, salary_currency: "USD", salary_period: null,
      description: "Current nursing vacancy published by NewYork-Presbyterian. Open the official employer page for responsibilities, requirements and application instructions.",
      qualifications: null, licence_requirements: "Confirm the required state nursing licence and role-specific credentials on the official vacancy.",
      relocation_assistance: false, remote_status: "onsite", date_posted: now.toISOString(), closing_date: null,
      imported_at: now.toISOString(), last_checked_at: now.toISOString(), expires_at: null, status: "active",
      attribution_text: "NewYork-Presbyterian Careers — official employer vacancy source", featured: false,
      visa_sponsorship_status: "unclear", visa_sponsorship_verified: false, sponsorship_evidence: null,
    };
    record.content_fingerprint = createHash("sha256").update(JSON.stringify([record.external_id, record.job_title, record.city])).digest("hex");
    jobs.push(record);
  }
  return jobs.slice(0, 40);
}

async function fetchPublicUsaNursingJobs(fetchImpl = fetch, timeoutMs = 10000) {
  const response = await fetchImpl(SOURCE_URL, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": "BeyondTheVisa-Jobs/2.1 (+https://www.beyondthevisa.org)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`NewYork-Presbyterian Careers returned ${response.status}`);
  const jobs = parseNypJobs(await response.text());
  if (!jobs.length) throw new Error("NewYork-Presbyterian Careers returned no usable nursing vacancies.");
  return jobs;
}

module.exports = { SOURCE_URL, parseNypJobs, fetchPublicUsaNursingJobs };
