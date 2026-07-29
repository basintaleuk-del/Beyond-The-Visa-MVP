import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { parseNhsJobsXml, normalizeRecord, fetchNhsJobsFeed, runSources } = require("../api/_lib/opportunity-import-core.cjs");
const { parseNhsJobDetail } = require("../api/_lib/nhs-job-detail.cjs");
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const now = new Date("2026-07-26T03:15:00Z");
const source = { id: "nhs", name: "NHS Jobs", source_type: "job", base_url: "https://www.jobs.nhs.uk", integration_type: "nhs_jobs_xml_v1", enabled: true, permission_status: "approved", last_cursor: "2026-07-25T03:15:00Z", configuration: { feed_url: "https://www.jobs.nhs.uk/api/v1/search_xml", max_pages: 3, max_records: 300 } };

const vacancy = ({ id, title, description = "", employer = "Example NHS Foundation Trust", reference = `REF-${id}`, closeDate = "2026-08-20", postDate = "2026-07-25T10:00:00Z" }) => `<vacancyDetails><closeDate>${closeDate}</closeDate><description>${description}</description><employer>${employer}</employer><id>${id}</id><locations><locations>Leeds, LS1 1AA</locations></locations><postDate>${postDate}</postDate><reference>${reference}</reference><salary>£29,970 to £36,483 a year</salary><title>${title}</title><type>Permanent</type><url>https://www.jobs.nhs.uk/candidate/jobadvert/${id}</url></vacancyDetails>`;
const xml = (items, totalPages = 1) => `<?xml version="1.0"?><nhsJobs><totalPages>${totalPages}</totalPages><totalResults>${items.length}</totalResults>${items.join("")}</nhsJobs>`;

test("official XML parser maps the supplied NHS vacancy fields", () => {
  const parsed = parseNhsJobsXml(xml([vacancy({ id: "A1", title: "Band 5 Staff Nurse", description: "Visa sponsorship is available" })]));
  const row = normalizeRecord(parsed.rows[0], source, now);
  assert.equal(row.external_id, "A1"); assert.equal(row.external_reference, "REF-A1");
  assert.equal(row.salary_text, "£29,970 to £36,483 a year"); assert.equal(row.band, "Band 5");
  assert.equal(row.canonical_url, "https://www.jobs.nhs.uk/candidate/jobadvert/A1");
});

test("vacancies across NHS professions are accepted and classified", () => {
  const parsed = parseNhsJobsXml(xml([vacancy({ id: "N1", title: "Registered Nurse" }), vacancy({ id: "M1", title: "Registered Midwife" }), vacancy({ id: "D1", title: "Consultant Doctor" }), vacancy({ id: "H1", title: "Healthcare Assistant" })]));
  const imported = parsed.rows.map((row) => normalizeRecord(row, source, now)).filter(Boolean);
  assert.deepEqual(imported.map((row) => row.external_id), ["N1", "M1", "D1", "H1"]);
  assert.deepEqual(imported.map((row) => row.profession), ["nurse", "midwife", "medical_dental", "healthcare_support"]);
});

test("official NHS beta advert links are accepted without allowing arbitrary hosts", () => {
  const raw = parseNhsJobsXml(xml([vacancy({ id: "B1", title: "Staff Nurse" })])).rows[0];
  raw.source_url = raw.canonical_url = raw.application_url = "https://beta.jobs.nhs.uk/candidate/jobadvert/B1";
  assert.equal(normalizeRecord(raw, source, now)?.canonical_url, "https://beta.jobs.nhs.uk/candidate/jobadvert/B1");
  raw.source_url = raw.canonical_url = raw.application_url = "https://jobs-nhs.example/candidate/jobadvert/B1";
  assert.equal(normalizeRecord(raw, source, now), null);
});

test("NHS adapter follows official pagination with bounded requests", async () => {
  const urls = [];
  const result = await fetchNhsJobsFeed(source, async (url) => { urls.push(String(url)); const page = new URL(url).searchParams.get("page"); return { ok: true, text: async () => xml([vacancy({ id: `N${page}`, title: "Community Nurse" })], 2) }; }, now);
  assert.equal(result.rows.length, 2); assert.equal(urls.length, 2);
  for (const url of urls) { const parsed = new URL(url); assert.equal(parsed.hostname, "www.jobs.nhs.uk"); assert.equal(parsed.searchParams.has("staffGroup"), false); assert.equal(parsed.searchParams.get("publishedFrom"), "2026-07-18"); assert.equal(parsed.searchParams.get("limit"), "100"); }
});

test("rerunning the NHS importer updates without duplicating or deleting saves", async () => {
  const records = new Map(), store = mockStore(records);
  const fetchImpl = async () => ({ ok: true, text: async () => xml([vacancy({ id: "N2", title: "Critical Care Nurse" })]) });
  await runSources({ sources: [source], store, fetchImpl, now });
  await runSources({ sources: [source], store, fetchImpl, now });
  assert.equal(records.size, 1); assert.equal(store.savedHistoryPreserved, true);
});

test("failed NHS requests retain existing records", async () => {
  const records = new Map([["existing", { id: "existing" }]]), store = mockStore(records);
  const result = await runSources({ sources: [source], store, fetchImpl: async () => { throw new Error("offline"); }, now });
  assert.equal(result.failed, 1); assert.equal(records.size, 1); assert.equal(store.archivedMissing, 0);
});

test("Opportunity Centre attributes and links NHS Jobs securely", async () => {
  const ui = await read("web/opportunity-centre-v138.js");
  assert.match(ui, /Updated daily from NHS Jobs/); assert.match(ui, /Open Government Licence v3\.0/);
  assert.match(ui, /Apply on NHS Jobs/); assert.match(ui, /rel="noopener noreferrer"/);
  assert.match(ui, /\/api\/job-details\?id=/); assert.match(ui, /View the full vacancy details here/); assert.match(ui, /opportunityWired138/); assert.match(ui, /\.\.\.state\.sponsorshipRows, \.\.\.state\.fundingRows, \.\.\.state\.eventRows/);
  assert.match(ui, /from\("btv_saved_jobs"\)/); assert.doesNotMatch(ui, /overflow-x:\s*hidden/);
});

test("Jobs centre renders direct NHS vacancies for all staff families", async () => {
  const [ui, css, shell, migration] = await Promise.all([read("web/jobs-centre-v148.js"), read("web/jobs-centre-v148.css"), read("web/index.html"), read("supabase/migrations/20260726213000_all_nhs_professions_jobs_v148.sql")]);
  assert.match(ui, /Find your next role across the NHS/); assert.match(ui, /All professions/); assert.match(ui, /View details/); assert.match(ui, />Apply<\/a>/);
  assert.match(ui, /source_name","NHS Jobs/); assert.doesNotMatch(ui, /\bTrac\b|HealthJobsUK|NursingNetUK/i);
  assert.match(css, /nhsJobsLayout148/); assert.match(css, /nhsJobDetail150/); assert.match(shell, /job-application-v174\.js\?v=174[\s\S]*jobs-centre-v148\.js\?v=176[\s\S]*opportunity-centre-v138\.js\?v=166/);
  assert.match(migration, /'medical_dental'/); assert.match(migration, /'administrative_clerical'/); assert.match(migration, /'staff_group', 'ALL'/);
});

test("NHS advert details are rendered locally while apply stays on NHS Jobs", async () => {
  const html = `<h1 id="heading">Staff Nurse</h1><span id="employer_name">Example NHS Trust</span><p id="job_overview">Full summary</p><p id="job_description">Main duties</p><p id="about_organisation">About the trust</p><p id="fixed_salary">GBP 30,000</p><p id="contract_type">Permanent</p><p id="date_posted">26 July 2026</p><p id="trac-job-reference">REF-1</p><p id="employer_town">Leeds</p><p id="employer_postcode">LS1 1AA</p><a id="apply-ats-direct" href="/candidate/jobadvert/REF-1/ats-direct-apply">Apply</a><h2>Job description</h2><h3>Job responsibilities</h3><p>Care for patients.</p><h2>Person Specification</h2><h3>Qualifications</h3><ul><li>Registered professional</li></ul><div id="dbs-container"><h3>Additional information</h3><p>DBS check required.</p></div><div class="show-mobile"></div>`;
  const detail = parseNhsJobDetail(html, "https://www.jobs.nhs.uk/candidate/jobadvert/REF-1");
  assert.equal(detail.title, "Staff Nurse"); assert.match(detail.jobDescription, /Care for patients/); assert.match(detail.personSpecification, /Registered professional/);
  assert.equal(detail.applyUrl, "https://www.jobs.nhs.uk/candidate/jobadvert/REF-1/ats-direct-apply");
  const [api, config] = await Promise.all([read("api/job-details.js"), read("vercel.json")]);
  assert.match(api, /parseNhsJobDetail/); assert.ok(JSON.parse(config).rewrites.some((route) => route.source === "/jobs/:id"));
});

test("migration reuses jobs, saves, run logs and seeds only the official feed", async () => {
  const migration = await read("supabase/migrations/20260726131425_nhs_jobs_official_feed_v144.sql");
  assert.match(migration, /alter table public\.btv_jobs/); assert.doesNotMatch(migration, /create table.*nhs_jobs/i);
  assert.match(migration, /nhs_jobs_xml_v1/); assert.match(migration, /https:\/\/www\.jobs\.nhs\.uk\/api\/v1\/search_xml/);
  const savedPolicy = await read("supabase/migrations/20260726014632_opportunity_centre_v138.sql");
  assert.match(savedPolicy, /create policy saved_jobs_select[\s\S]*auth\.uid\(\)/);
});

test("cron and admin import remain server protected", async () => {
  const [api, admin, config] = await Promise.all([read("api/opportunity-import.js"), read("web/admin-opportunity-imports-v142.js"), read("vercel.json")]);
  assert.match(api, /if \(!caller\) return json\(res, 401/); assert.match(api, /already running/);
  assert.match(api, /requestBody\.action === "recheck"/); assert.match(admin, /data-recheck-vacancy/);
  assert.match(admin, /NHS JOBS FEED/); assert.match(admin, /records_nursing/); assert.match(admin, /Review employer spotlight candidates/);
  assert.ok(JSON.parse(config).crons.some((cron) => cron.path === "/api/global-jobs-import" && cron.schedule === "15 3 * * *"));
});

test("daily refresh keeps active, closing-soon and sponsorship views synchronized", async () => {
  const [jobs, opportunities, importer, config] = await Promise.all([read("web/jobs-centre-v148.js"), read("web/opportunity-centre-v138.js"), read("api/global-jobs-import.js"), read("vercel.json")]);
  assert.match(jobs, /ACTIVE_JOB_STATUSES = \["published", "closing_soon"\]/);
  assert.match(opportunities, /ACTIVE_OPPORTUNITY_STATUSES = \["published", "closing_soon"\]/);
  assert.match(opportunities, /sponsorship_status", \["confirmed", "may_be_available"\]/);
  assert.match(importer, /NHS Jobs[\s\S]*USAJOBS[\s\S]*expireJobs/);
  assert.match(importer, /headers: req\.headers \|\| \{\}/);
  assert.ok(JSON.parse(config).crons.some((cron) => cron.path === "/api/global-jobs-import" && cron.schedule === "15 3 * * *"));
});

function mockStore(records) {
  return {
    savedHistoryPreserved: true, archivedMissing: 0,
    async beginSource() { return { id: "run" }; },
    async saveRecords(_source, rows) { let created = 0, updated = 0; for (const row of rows) { if (records.has(row.canonical_url)) updated += 1; else created += 1; records.set(row.canonical_url, row); } return { created, updated }; },
    async archiveMissing() { this.archivedMissing += 1; return 0; }, async finishSource() {}, async archiveExpired() { return 0; }, async refreshEmployerCandidates() {},
  };
}
