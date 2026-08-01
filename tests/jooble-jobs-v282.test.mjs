import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const jooble = require("../api/_lib/jooble-core.cjs");
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const response = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[String(name).toLowerCase()] ?? null },
  json: async () => body,
});

const rawJob = (overrides = {}) => ({
  id: 12345,
  title: "Registered Nurse",
  company: "Example Health",
  location: "London, United Kingdom",
  snippet: "Permanent ward nursing role.",
  salary: "£35,000 - £42,000 per year",
  source: "jooble",
  type: "Full-time",
  link: "https://uk.jooble.org/jdp/12345",
  updated: "2026-08-01T08:00:00Z",
  ...overrides,
});

test("Jooble stays server-side and follows the official POST contract", async () => {
  let call;
  const result = await jooble.requestPage({ apiKey: "server-secret", country: "gb", keywords: "registered nurse", resultOnPage: 3, retries: 0, fetchImpl: async (url, options) => { call = { url, options }; return response(200, { totalCount: 1, jobs: [rawJob()] }); } });
  assert.equal(call.url, "https://jooble.org/api/server-secret");
  assert.equal(call.options.method, "POST");
  assert.deepEqual(JSON.parse(call.options.body), { keywords: "registered nurse", location: "United Kingdom", radius: "0", page: "1", ResultOnPage: 3, SearchMode: "0", companysearch: "false" });
  assert.equal(result.jobs.length, 1);
});

test("missing API key fails safely without making a request", async () => {
  let calls = 0;
  await assert.rejects(() => jooble.requestPage({ apiKey: "", country: "gb", keywords: "registered nurse", retries: 0, fetchImpl: async () => { calls += 1; } }), /JOOBLE_API_KEY is required/);
  assert.equal(calls, 0);
  const diagnostic = await jooble.testConnection({ apiKey: "" });
  assert.deepEqual(diagnostic, { configured: false, authentication_succeeded: false, error: "JOOBLE_API_KEY is required." });
});

test("API failures and rate limits retry with bounded exponential backoff", async () => {
  const statuses = [429, 503, 200], waits = [], events = [];
  const result = await jooble.requestPage({ apiKey: "secret", country: "ca", keywords: "staff nurse", retries: 2, delay: async (ms) => waits.push(ms), logger: (event) => events.push(event), fetchImpl: async () => response(statuses.shift(), statuses.length ? {} : { totalCount: 0, jobs: [] }, { "retry-after": "1" }) });
  assert.equal(result.status, 200);
  assert.deepEqual(waits, [1000, 1000]);
  assert.equal(events.length, 2);
  assert.ok(events.every((event) => !JSON.stringify(event).includes("secret")));
});

test("malformed responses are rejected and are not retried", async () => {
  let calls = 0;
  await assert.rejects(() => jooble.requestPage({ apiKey: "secret", country: "au", keywords: "midwife", retries: 2, fetchImpl: async () => { calls += 1; return response(200, { totalCount: "wrong", jobs: {} }); } }), /malformed response/);
  assert.equal(calls, 1);
});

test("unsupported countries are rejected before an API request", async () => {
  let calls = 0;
  await assert.rejects(() => jooble.requestPage({ apiKey: "secret", country: "fr", keywords: "nurse", fetchImpl: async () => { calls += 1; } }), /Unsupported Jooble country/);
  assert.equal(calls, 0);
});

test("Jooble jobs map to the shared country-scoped job schema", () => {
  const mapped = jooble.mapJob(rawJob(), "gb", new Date("2026-08-02T00:00:00Z"));
  assert.deepEqual(mapped.errors, []);
  assert.equal(mapped.job.source_name, "jooble");
  assert.equal(mapped.job.country_code, "GB");
  assert.equal(mapped.job.country_name, "United Kingdom");
  assert.equal(mapped.job.salary_currency, "GBP");
  assert.equal(mapped.job.salary_min, 35000);
  assert.equal(mapped.job.salary_max, 42000);
  assert.equal(mapped.job.application_url, rawJob().link);
  assert.equal(mapped.job.raw_source_metadata.remote_status, "not_stated");
});

test("healthcare titles use the existing profession taxonomy", () => {
  const cases = {
    "Registered Nurse": "nurse", Midwife: "midwife", Physiotherapist: "allied_health", Radiographer: "allied_health",
    Pharmacist: "pharmacy", "Biomedical Scientist": "scientific_technical", Doctor: "medical_dental",
    "Social Worker": "social_care", "Healthcare Assistant": "healthcare_support",
  };
  let id = 20000;
  for (const [title, profession] of Object.entries(cases)) {
    id += 1;
    const mapped = jooble.mapJob(rawJob({ id, title, link: `https://uk.jooble.org/jdp/${id}` }), "gb");
    assert.equal(mapped.job.profession, profession, title);
  }
});

test("every configured destination accepts only its matching Jooble domain", () => {
  for (const country of Object.values(jooble.COUNTRIES)) {
    const mapped = jooble.mapJob(rawJob({ id: country.code, location: country.name, link: `https://${country.domain}/jdp/${country.code}` }), country.key);
    assert.equal(mapped.errors.length, 0, country.code);
    assert.equal(mapped.job.country_code, country.code);
    assert.equal(mapped.job.salary_currency, country.currency);
  }
  const mixed = jooble.mapJob(rawJob({ link: "https://ca.jooble.org/jdp/wrong-country" }), "gb");
  assert.ok(mixed.errors.some((value) => value.includes("country domain")));
});

test("pagination validates records and removes duplicate jobs", async () => {
  let calls = 0;
  const result = await jooble.fetchCountryJobs({ apiKey: "secret", country: "gb", keywordBatches: ["registered nurse"], maxPages: 2, resultOnPage: 2, retries: 0, fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? response(200, { totalCount: 3, jobs: [rawJob(), rawJob()] }) : response(200, { totalCount: 3, jobs: [rawJob({ id: 67890, link: "https://uk.jooble.org/jdp/67890", title: "Staff Nurse" })] });
  } });
  assert.equal(calls, 2);
  assert.equal(result.jobsReceived, 3);
  assert.equal(result.records.length, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.requestsMade, 2);
});

test("Jooble joins the authenticated daily scheduler and admin-only manual controls", () => {
  const importer = read("api/global-jobs-import.js"), vercel = read("vercel.json"), admin = read("web/admin-opportunity-imports-v142.js"), adminBase = read("web/admin-opportunity-centre-v138.js"), adminHtml = read("web/admin.html"), resilientAdmin = read("web/admin-jooble-v287.js");
  assert.ok(importer.indexOf("const caller = await authenticate(req)") < importer.indexOf('toLowerCase()==="jooble"'));
  assert.match(importer, /if \(!caller\) return send\(res,401/);
  assert.match(importer, /name:"jooble", run:\(\)=>syncJoobleCountries/);
  assert.match(vercel, /"\/api\/jooble-jobs-import"/);
  assert.match(vercel, /"\/api\/global-jobs-import", "schedule": "15 3 \* \* \*"/);
  assert.match(admin, /data-sync-jooble/);
  assert.match(admin, /Authorization:`Bearer \$\{data\.session\?\.access_token\|\|""\}`/);
  assert.match(importer, /if\(\(!source\.enabled\|\|source\.permission_status!=="approved"\)\&\&!sample\)return\{status:200/);
  assert.match(adminBase, /root = \$\("#opportunityAdmin138"\)/);
  assert.doesNotMatch(adminBase, /\$\("#opportunityAdmin138"\)\) return/);
  assert.match(adminBase, /if \(sourceRows\.error \|\| runRows\.error\) return error/);
  assert.match(adminBase, /data-jooble-fallback="test"/);
  assert.match(adminBase, /\/api\/jooble-jobs-sample/);
  assert.match(adminBase, /data-jooble-direct="test"/);
  assert.match(adminBase, /"nhs_jobs_xml_v1","usajobs_v1","approved_api"/);
  assert.match(adminHtml, /admin-opportunity-centre-v138\.js\?v=286/);
  assert.match(adminHtml, /admin-jooble-v287\.js\?v=287/);
  assert.match(resilientAdmin, /data-admin-jooble287/);
  assert.match(resilientAdmin, /\/api\/jooble-jobs-sample/);
  assert.match(resilientAdmin, /Authorization: `Bearer \$\{await sessionToken\(\)\}`/);
});

test("database reuse, cross-source deduplication and cautious stale handling are explicit", () => {
  const importer = read("api/global-jobs-import.js"), migration = read("supabase/migrations/20260801170000_jooble_jobs_v282.sql");
  assert.match(importer, /btv_jobs\?on_conflict=source_name,country_code,external_id/);
  assert.match(importer, /keys\.urls\.get\(url\)\|\|keys\.identities\.get\(identity\)/);
  assert.match(importer, /sourceLinks\.push/);
  assert.match(importer, /source_missing_runs \|\| 0\) \+ 1 >= 3/);
  assert.match(importer, /14 \* 86400000/);
  assert.doesNotMatch(importer, /btv_jobs[^\n]+method:"DELETE"/);
  assert.match(migration, /insert into public\.btv_approved_sources/);
  assert.match(migration, /'jooble','job','https:\/\/jooble\.org'/);
  assert.match(migration, /provider_summary jsonb/);
});

test("all existing country interfaces display Jooble without replacing current sources", () => {
  const uk = read("web/jobs-centre-v272.js"), usa = read("web/usa-jobs-v155.js"), global = read("web/global-jobs-v168.js");
  assert.match(uk, /\["NHS Jobs","REED","ADZUNA","jooble","careerjet"\]/);
  assert.match(uk, /Jobs by Adzuna[\s\S]*Jooble/);
  assert.match(usa, /source_name\)\.toLowerCase\(\) === "jooble" \? "Jooble"/);
  assert.match(global, /isJooble[\s\S]*"Jooble"/);
  assert.match(global, /url="\/api\/jobs"/);
});

test("the API credential has no client-side or database value", () => {
  const importer = read("api/global-jobs-import.js"), core = read("api/_lib/jooble-core.cjs"), admin = read("web/admin-opportunity-imports-v142.js"), migration = read("supabase/migrations/20260801170000_jooble_jobs_v282.sql");
  assert.match(importer, /env\("JOOBLE_API_KEY"\)/);
  assert.doesNotMatch(admin, /JOOBLE_API_KEY/);
  assert.doesNotMatch(read("web/index.html"), /JOOBLE_API_KEY/);
  assert.doesNotMatch(migration, /JOOBLE_API_KEY[^']*['"]\s*:/);
  assert.doesNotMatch(core, /console\.(?:log|error)\([^\n]*apiKey/);
});

test("Jooble connection failures are surfaced instead of reported as successful zero-work runs", () => {
  const importer = read("api/global-jobs-import.js"), admin = read("web/admin-jooble-v287.js"), enhancer = read("web/admin-opportunity-imports-v142.js");
  assert.match(importer, /providerCredentialIssue\("jooble"\)/);
  assert.match(importer, /test\.authentication_succeeded\?200:502/);
  assert.match(admin, /result\.authentication_succeeded === false/);
  assert.match(enhancer, /!response\.ok\|\|result\.authentication_succeeded===false/);
});
