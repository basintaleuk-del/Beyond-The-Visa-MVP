import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const require = createRequire(import.meta.url);
const core = require(path.join(root, "api/_lib/usajobs-core.cjs"));

const fixture = {
  MatchedObjectDescriptor: {
    PositionID: "VA-26-123456",
    PositionTitle: "Registered Nurse - Intensive Care Unit",
    OrganizationName: "Veterans Health Administration",
    DepartmentName: "Department of Veterans Affairs",
    PositionURI: "https://www.usajobs.gov/job/123456",
    ApplyURI: ["https://www.usajobs.gov/job/123456/apply"],
    PositionLocation: [{ CityName: "Houston", CountrySubDivisionCode: "TX", CountryCode: "US" }],
    PositionRemuneration: [{ MinimumRange: "82000", MaximumRange: "128000", RateIntervalCode: "Per Year" }],
    PositionOfferingType: [{ Name: "Permanent" }],
    PublicationStartDate: "2026-07-25T00:00:00Z",
    ApplicationCloseDate: "2026-08-25T23:59:59Z",
    QualificationSummary: "Current unrestricted registered nurse licence required.",
    UserArea: { Details: { JobSummary: "Provide critical care nursing.", MajorDuties: ["Assess patients", "Coordinate ICU care"], Requirements: "U.S. citizenship is required.", TeleworkEligible: false, Relocation: true } },
  },
};

test("USAJOBS records are normalized into isolated US fields", () => {
  const row = core.normalizeUsaJobsItem(fixture, new Date("2026-07-26T12:00:00Z"));
  assert.equal(row.external_id, "VA-26-123456");
  assert.equal(row.country, "United States");
  assert.equal(row.country_code, "US");
  assert.equal(row.destination_country, "United States of America");
  assert.equal(row.salary_currency, "USD");
  assert.equal(row.nursing_specialty, "Critical care / ICU");
  assert.equal(row.visa_sponsorship_status, "not_applicable");
  assert.equal(row.visa_sponsorship_verified, true);
  assert.equal(row.relocation_assistance, true);
});

test("sponsorship is never inferred from relocation assistance", () => {
  const row = structuredClone(fixture);
  row.MatchedObjectDescriptor.UserArea.Details.Requirements = "Relocation expenses reimbursed: Yes.";
  const normalized = core.normalizeUsaJobsItem(row, new Date("2026-07-26T12:00:00Z"));
  assert.equal(normalized.relocation_assistance, true);
  assert.equal(normalized.visa_sponsorship_status, "unclear");
  assert.equal(normalized.visa_sponsorship_verified, false);
});

test("USAJOBS connector uses credentials only as request headers", async () => {
  let captured;
  const result = await core.fetchUsaJobs({ apiKey: "secret-key", userAgent: "BeyondTheVisa", email: "jobs@example.test", maxPages: 1, now: new Date("2026-07-26T12:00:00Z"), fetchImpl: async (url, options) => {
    captured = { url: String(url), headers: options.headers };
    return { ok: true, json: async () => ({ SearchResult: { SearchResultCountAll: 1, SearchResultItems: [fixture] } }) };
  } });
  assert.match(captured.url, /^https:\/\/data\.usajobs\.gov\/api\/search/);
  assert.equal(captured.headers["Authorization-Key"], "secret-key");
  assert.equal(captured.headers.Host, "data.usajobs.gov");
  assert.equal(captured.headers["User-Agent"], "jobs@example.test");
  assert.match(captured.headers.From, /BeyondTheVisa/);
  assert.equal(result.records.length, 1);
});

test("USA jobs schema and RLS enforce destination separation", () => {
  const sql = read("supabase/migrations/20260726233000_usa_nursing_jobs_v155.sql");
  assert.match(sql, /create table if not exists public\.btv_usa_jobs/i);
  assert.match(sql, /p\.destination_country='us'/);
  assert.match(sql, /not exists\([\s\S]*p\.destination_country='us'/);
  assert.match(sql, /unique\(source_name, external_id\)/);
  assert.match(sql, /btv_usa_jobs_canonical_url_uq/);
  assert.match(sql, /btv_usa_jobs_fingerprint_uq/);
  assert.match(sql, /btv_usa_jobs_fallback_identity_uq/);
});

test("USA list API checks the authenticated profile before querying vacancies", () => {
  const api = read("api/usa-jobs.js");
  assert.match(api, /profiles\?select=destination_country/);
  assert.match(api, /destination_country !== "us"/);
  assert.match(api, /USA_DESTINATION_REQUIRED/);
  assert.match(api, /btv_usa_jobs\?select=\*/);
  assert.doesNotMatch(api, /btv_jobs\?select/);
});

test("USA importer is independent of the NHS opportunity importer", () => {
  const importer = read("api/usa-jobs-import.js"), uk = read("api/opportunity-import.js");
  assert.match(importer, /USAJOBS_API_KEY/);
  assert.match(importer, /USAJOBS_USER_AGENT/);
  assert.match(importer, /USAJOBS_EMAIL/);
  assert.match(importer, /btv_usa_jobs/);
  assert.doesNotMatch(importer, /btv_jobs\?/);
  assert.match(uk, /opportunity-import-core\.cjs/);
  assert.match(uk, /NHS Jobs/);
});

test("USA imports run twice daily without changing the UK schedule", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.deepEqual(config.crons.find((row) => row.path === "/api/opportunity-import"), { path: "/api/opportunity-import", schedule: "15 3 * * *" });
  assert.deepEqual(config.crons.find((row) => row.path === "/api/usa-jobs-import"), { path: "/api/usa-jobs-import", schedule: "15 2,14 * * *" });
});

test("USA alerts are generated only for USA destination profiles", () => {
  const sql = read("supabase/migrations/20260726233000_usa_nursing_jobs_v155.sql");
  assert.match(sql, /btv_generate_usa_job_alerts/);
  assert.match(sql, /where p\.destination_country='us'/);
  assert.match(sql, /left join public\.btv_notification_preferences np[\s\S]*coalesce\(np\.job_matches,true\)/);
  assert.match(sql, /'\/jobs\/usa\/'\|\|j\.id/);
});

test("USA route provides filters, internal details and original-source apply", () => {
  const ui = read("web/usa-jobs-v155.js"), html = read("web/index.html"), routes = read("vercel.json");
  for (const filter of ["state", "city", "specialty", "employment_type", "salary_min", "employer", "sponsorship", "relocation", "posted_days", "remote"]) assert.match(ui, new RegExp(`name=\\"${filter}\\"`));
  assert.match(ui, /\/api\/usa-jobs/);
  assert.match(ui, /Apply on original site/);
  assert.match(ui, /Sponsorship status not confirmed/);
  assert.match(html, /usa-jobs-v155\.js\?v=155/);
  assert.match(routes, /"\/jobs\/usa\/:id"/);
});

test("USA administration supports sources, logs, editing, featuring and sponsorship review", () => {
  const admin = read("web/admin-usa-jobs-v155.js"), html = read("web/admin.html");
  assert.match(admin, /btv_usa_job_sources/);
  assert.match(admin, /btv_usa_job_import_runs/);
  assert.match(admin, /data-usa-edit/);
  assert.match(admin, /data-usa-feature/);
  assert.match(admin, /data-usa-sponsor/);
  assert.match(admin, /data-usa-status/);
  assert.match(admin, /data-usa-source-approve/);
  assert.match(html, /admin-usa-jobs-v155\.js\?v=155/);
});
