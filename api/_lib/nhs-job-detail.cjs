const ENTITY_MAP = Object.freeze({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " });

function decode(value = "") {
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return ENTITY_MAP[entity.toLowerCase()] ?? "";
  });
}

function text(value = "") {
  return decode(String(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|li|h[1-6]|ul|ol|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapePattern(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function byId(html, id) {
  const safe = escapePattern(id);
  const match = String(html).match(new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid=["']${safe}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, "i"));
  return match ? text(match[2]) : "";
}

function between(html, start, end) {
  const source = String(html), from = source.search(start);
  if (from < 0) return "";
  const tail = source.slice(from), stop = tail.search(end);
  return text(stop > 0 ? tail.slice(0, stop) : tail);
}

function desktopSection(html, heading) {
  const safe = escapePattern(heading);
  const match = String(html).match(new RegExp(`<div\\b[^>]*class=["'][^"']*hide-mobile[^"']*["'][^>]*>\\s*<h2\\b[^>]*>\\s*${safe}\\s*<\\/h2>[\\s\\S]*?<\\/div>`, "i"));
  return match ? text(match[0]) : "";
}

function hrefById(html, id, baseUrl) {
  const safe = escapePattern(id);
  const tag = String(html).match(new RegExp(`<a\\b(?=[^>]*\\bid=["']${safe}["'])[^>]*>`, "i"))?.[0] || "";
  const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!href) return "";
  try { const url = new URL(decode(href), baseUrl); return url.hostname === "www.jobs.nhs.uk" || url.hostname === "beta.jobs.nhs.uk" ? url.href : ""; } catch { return ""; }
}

function parseNhsJobDetail(html, sourceUrl) {
  const jobDescription = desktopSection(html, "Job description") || between(html, /<h2\b[^>]*>\s*Job description\s*<\/h2>/i, /<h2\b[^>]*>\s*Person Specification\s*<\/h2>/i);
  const personSpecification = desktopSection(html, "Person Specification") || between(html, /<h2\b[^>]*>\s*Person Specification\s*<\/h2>/i, /<div\b[^>]*id=["']dbs-container["']/i);
  const additionalInformation = byId(html, "dbs-container");
  return {
    title: byId(html, "heading"),
    employer: byId(html, "employer_name"),
    closingDate: byId(html, "closing_date"),
    overview: byId(html, "job_overview"),
    mainDuties: byId(html, "job_description"),
    aboutEmployer: byId(html, "about_organisation"),
    jobDescription,
    personSpecification,
    additionalInformation,
    datePosted: byId(html, "date_posted"),
    payScheme: byId(html, "payscheme-type"),
    salary: byId(html, "fixed_salary"),
    contract: byId(html, "contract_type"),
    reference: byId(html, "trac-job-reference"),
    address: ["employer_address_line_1", "employer_address_line_2", "employer_town", "employer_county", "employer_postcode", "employer_country"].map((id) => byId(html, id)).filter(Boolean).join(", "),
    contactRole: byId(html, "contact_details_job_title"),
    contactName: byId(html, "contact_details_name"),
    contactEmail: byId(html, "contact_details_email"),
    contactPhone: byId(html, "contact_details_number"),
    employerWebsite: hrefById(html, "employer_website_url_link", sourceUrl),
    applyUrl: hrefById(html, "apply-ats-direct", sourceUrl) || hrefById(html, "apply-now", sourceUrl),
    sourceUrl,
  };
}

module.exports = { decode, text, byId, parseNhsJobDetail };
