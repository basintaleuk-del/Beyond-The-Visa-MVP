const crypto = require("crypto");
const { plainText, safeExternalUrl } = require("./global-jobs-core.cjs");

const SOURCES = [
  {
    name: "Queensland Health SmartJobs",
    countryCode: "AU",
    country: "au",
    countryName: "Australia",
    url: "https://smartjobs.qld.gov.au/jobtools/jncustomsearch.searchResults?in_organid=14904&in_jobDate=All&in_skills=nurse&in_orderby=dateinput%20desc",
    base: "https://smartjobs.qld.gov.au/jobtools/",
    parser: parseQueensland,
  },
  {
    name: "New Zealand Government Jobs",
    countryCode: "NZ",
    country: "nz",
    countryName: "New Zealand",
    url: "https://jobs.govt.nz/jobtools/jncustomsearch.searchResults?in_multi01=%22Health%22&in_multi01_id=1802&in_organid=16563&in_others=%22Health%22",
    base: "https://jobs.govt.nz/jobtools/",
    parser: parseNewZealand,
  },
  {
    name: "Canada Job Bank",
    countryCode: "CA",
    country: "ca",
    countryName: "Canada",
    url: "https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=registered+nurse&sort=M",
    base: "https://www.jobbank.gc.ca",
    parser: parseCanada,
  },
  {
    name: "HSE Job Search",
    countryCode: "IE",
    country: "ie",
    countryName: "Ireland",
    url: "https://about.hse.ie/jobs/job-search/?category=nursing%20and%20midwifery&page=1",
    base: "https://about.hse.ie",
    parser: parseIreland,
  },
  {
    name: "Emirates Health Services Careers",
    countryCode: "AE",
    country: "ae",
    countryName: "United Arab Emirates",
    url: "https://www.ehs.gov.ae/en/about-us/careers",
    base: "https://www.ehs.gov.ae",
    parser: parseEmirates,
  },
  {
    name: "King Faisal Specialist Hospital Careers",
    countryCode: "SA",
    country: "sa",
    countryName: "Saudi Arabia",
    url: "https://services.kfshrc.edu.sa/external/en/home/careers/vacancieslist",
    base: "https://services.kfshrc.edu.sa",
    parser: parseSaudi,
  },
];

function decode(value = "") {
  return String(value)
    .replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\\(["\\/])/g, "$1")
    .replace(/&amp;/gi, "&").replace(/&#x27;|&#39;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function text(value = "", limit = 4000) {
  return plainText(decode(value), limit);
}

function absolute(base, href) {
  try {
    const url = new URL(decode(href), base);
    url.searchParams.delete("source");
    return safeExternalUrl(url.toString());
  } catch {
    return null;
  }
}

function dateValue(value) {
  if (!value) return null;
  const parsed = Date.parse(String(value).trim());
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function externalId(url, fallback = "") {
  const match = String(url || "").match(/(?:jnCounter=|jobposting\/|\/vacancies\/)([A-Za-z0-9-]+)/i);
  return match?.[1] || crypto.createHash("sha256").update(String(url || fallback)).digest("hex").slice(0, 28);
}

function make(source, row) {
  const application = absolute(source.base, row.href);
  if (!application || !row.title) return null;
  const now = new Date().toISOString();
  return {
    external_id: externalId(application, row.title),
    source_name: source.name,
    source_type: "official_public_feed",
    source_url: source.url,
    canonical_url: application,
    application_url: application,
    application_kind: "external",
    country: source.country,
    country_code: source.countryCode,
    country_name: source.countryName,
    region: row.region || null,
    region_or_state: row.region || null,
    city: row.city || row.region || null,
    location: row.location || row.city || row.region || source.countryName,
    employer: row.employer || source.name,
    employer_name: row.employer || source.name,
    title: text(row.title, 300),
    profession: /midwi/i.test(row.title) ? "midwife" : "nurse",
    specialty: row.specialty || (/midwi/i.test(row.title) ? "Midwifery" : "Nursing"),
    summary: text(row.summary || "Open the verified employer vacancy for the complete role description and application requirements.", 1200),
    description: text(row.summary || "", 4000) || null,
    registration_required: row.registration || null,
    salary_min: row.salaryMin || null,
    salary_max: row.salaryMax || null,
    currency: row.currency || null,
    salary_currency: row.currency || null,
    employment_type: row.employmentType || null,
    contract_type: row.employmentType || null,
    published_at: dateValue(row.publishedAt) || now,
    closing_at: dateValue(row.closingAt),
    status: "active",
    verification_status: "verified",
    import_status: "active",
    opportunity_type: "job",
    job_reference: row.reference || externalId(application, row.title),
    sponsorship_status: "not_stated",
    overseas_applicants_status: "not_stated",
    last_checked_at: now,
    last_verified_at: now,
    content_hash: crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex"),
    raw_source_metadata: { attribution: source.name, official_source: true },
    updated_at: now,
  };
}

function parseQueensland(html, source = SOURCES[0]) {
  const rows = [];
  const list = html.match(/<ol class="search-results jobs">([\s\S]*?)<\/ol>/i)?.[1] || html;
  for (const match of list.matchAll(/<!--Summary Body org[^>]*-->\s*<li>([\s\S]*?)(?=<!--Summary Body org|<\/ol>|$)/gi)) {
    const block = match[1], href = block.match(/HREF="([^"]*viewFullSingle[^"]+)"/i)?.[1];
    const title = block.match(/class="result-title"><strong>([\s\S]*?)<\/strong>/i)?.[1];
    if (!href || !title || !/(nurs|midwi)/i.test(text(title))) continue;
    rows.push(make(source, {
      href, title, employer: block.match(/<\/strong>,\s*([^<]+)<\/span>/i)?.[1],
      employmentType: block.match(/class="type">([^<]+)/i)?.[1],
      location: block.match(/class="locality">([^<]+)/i)?.[1],
      summary: block.match(/class="search-description">([\s\S]*?)<\/div>/i)?.[1],
      specialty: block.match(/class="grade">([^<]+)/i)?.[1],
      closingAt: block.match(/class="date-closes" datetime="([^"]+)"/i)?.[1],
    }));
  }
  return rows.filter(Boolean).slice(0, 40);
}

function parseNewZealand(html, source = SOURCES[1]) {
  const rows = [];
  for (const match of html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
    const block = match[1], href = block.match(/HREF="([^"]+)"/i)?.[1];
    const title = block.match(/class="position">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    if (!href || !title || !/(nurs|midwi|health care assistant)/i.test(text(title))) continue;
    const salary = block.match(/minimum-sal">([^<]*)<\/span>[\s\S]*?maximum-sal">([^<]*)/i);
    rows.push(make(source, {
      href, title, employer: block.match(/<\/a><\/div><div>at\s*([\s\S]*?)<\/div>/i)?.[1],
      employmentType: block.match(/class="highlight[^"]*">([^<]*)/i)?.[1],
      location: block.match(/class="job_location">([^<]*)/i)?.[1],
      publishedAt: block.match(/class="job_listed">([^<]*)/i)?.[1],
      closingAt: block.match(/class="job_closing">([^<]*)/i)?.[1],
      salaryMin: Number(String(salary?.[1] || "").replace(/,/g, "")) || null,
      salaryMax: Number(String(salary?.[2] || "").replace(/,/g, "")) || null,
      currency: "NZD",
    }));
  }
  return rows.filter(Boolean).slice(0, 40);
}

function parseCanada(html, source = SOURCES[2]) {
  const rows = [];
  for (const match of html.matchAll(/<article id="article-[^"]+"[\s\S]*?<\/article>/gi)) {
    const block = match[0], href = block.match(/href="([^"]*jobposting\/[^"]+)"/i)?.[1];
    const title = block.match(/class="noctitle">([\s\S]*?)<\/span>/i)?.[1];
    if (!href || !title) continue;
    const salary = text(block.match(/class="salary">([\s\S]*?)<\/li>/i)?.[1] || "");
    const amounts = [...salary.matchAll(/\$([\d,.]+)/g)].map((item) => Number(item[1].replace(/,/g, "")));
    rows.push(make(source, {
      href: href.replace(/;jsessionid=[^?"]+/i, ""),
      title,
      employer: block.match(/class="business">([^<]+)/i)?.[1],
      location: block.match(/class="location">[\s\S]*?<\/span>\s*([^<]+)/i)?.[1],
      publishedAt: block.match(/class="date">([^<]+)/i)?.[1],
      salaryMin: amounts[0] || null, salaryMax: amounts[1] || amounts[0] || null, currency: "CAD",
      summary: salary,
    }));
  }
  return rows.filter(Boolean).slice(0, 40);
}

function parseIreland(html, source = SOURCES[3]) {
  const rows = [];
  const pattern = /href\\":\\"(\/jobs\/job-search\/[^\\"]+)\\?[^\\"]*\\"|href\\":\\"(\/jobs\/job-search\/[^\\"]+)\/?\\"/g;
  const seen = new Set();
  for (const match of html.matchAll(pattern)) {
    const href = match[1] || match[2];
    if (seen.has(href)) continue;
    const start = match.index, block = html.slice(start, start + 1800);
    const title = block.match(/children\\":\\"([\s\S]*?)\\"\}/)?.[1];
    if (!title || !/(nurs|midwi)/i.test(decode(title))) continue;
    seen.add(href);
    rows.push(make(source, {
      href, title,
      employer: "Health Service Executive",
      location: block.match(/children\\":\\"County:\s*([\s\S]*?)\\"\}/)?.[1],
      publishedAt: block.match(/dateTime\\":\\"([^\\"]+)/)?.[1],
      specialty: "Nursing and Midwifery",
    }));
  }
  return rows.filter(Boolean).slice(0, 40);
}

function parseEmirates(html, source = SOURCES[4]) {
  if (!/(current vacancies|current openings|view all job vacancies)/i.test(text(html, 100000)) || !/(nurses|nursing)/i.test(text(html, 100000))) return [];
  return [make(source, {
    href: source.url,
    title: "Clinical nursing opportunities",
    employer: "Emirates Health Services",
    location: "United Arab Emirates",
    specialty: "Nursing",
    summary: "Emirates Health Services welcomes nursing and other clinical professionals through its current official careers route. Review the employer page for current openings and application instructions.",
    reference: "EHS-CLINICAL-CAREERS",
  })].filter(Boolean);
}

function parseSaudi(html, source = SOURCES[5]) {
  const rows = [];
  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const block = match[1], title = text(block.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] || block.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
    if (!/nurs/i.test(title)) continue;
    const href = block.match(/href="([^"]*(?:vacancies|career)[^"]*)"/i)?.[1];
    if (!href) continue;
    const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((item) => text(item[1]));
    rows.push(make(source, {
      href, title, employer: "King Faisal Specialist Hospital & Research Centre",
      location: cells.find((value) => /Riyadh|Jeddah|Madinah/i.test(value)) || "Saudi Arabia",
      closingAt: cells.find((value) => /\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(value)),
      specialty: "Nursing",
    }));
  }
  if (rows.length) return rows.filter(Boolean).slice(0, 40);
  if (!/STAFF NURSE/i.test(text(html, 200000))) return [];
  return [make(source, {
    href: source.url, title: "Staff Nurse opportunities",
    employer: "King Faisal Specialist Hospital & Research Centre",
    location: "Saudi Arabia", specialty: "Nursing",
    summary: "Current Staff Nurse vacancies are published by King Faisal Specialist Hospital & Research Centre. Open the official vacancy list to select a role and apply.",
    reference: "KFSHRC-STAFF-NURSE",
  })].filter(Boolean);
}

async function fetchLiveSource(source, fetcher = fetch, timeoutMs = 18000) {
  const response = await fetcher(source.url, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": "BeyondTheVisa-Jobs/2.0 (+https://www.beyondthevisa.org)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw Object.assign(new Error(`${source.name} returned ${response.status}`), { status: response.status });
  const html = await response.text();
  const jobs = source.parser(html, source);
  if (!jobs.length) throw new Error(`${source.name} returned no usable current nursing vacancies.`);
  return jobs;
}

module.exports = {
  SOURCES,
  decode,
  parseQueensland,
  parseNewZealand,
  parseCanada,
  parseIreland,
  parseEmirates,
  parseSaudi,
  fetchLiveSource,
};
