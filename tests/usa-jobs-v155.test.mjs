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
    PositionSchedule: [{ Name: "Full-time" }],
    JobCategory: [{ Code: "0610", Name: "Nurse" }],
    JobGrade: [{ Code: "VN" }],
    PublicationStartDate: "2026-07-25T00:00:00Z",
    ApplicationCloseDate: "2026-08-25T23:59:59Z",
    QualificationSummary: "Current unrestricted registered nurse licence required.",
    UserArea: { Details: { JobSummary: "Provide critical care nursing.", MajorDuties: ["Assess patients", "Coordinate ICU care"], Requirements: "U.S. citizenship is required.", WhoMayApply: [{ Name: "The public" }], TeleworkEligible: false, Relocation: true } },
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
  assert.equal(row.schedule, "Full-time");
  assert.equal(row.grade, "VN");
  assert.equal(row.who_may_apply, "The public");
  assert.equal(row.raw_source_data.PositionID, "VA-26-123456");
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
  const result = await core.fetchUsaJobs({ apiKey: "secret-key", userAgent: "jobs@example.test", maxPages: 1, now: new Date("2026-07-26T12:00:00Z"), fetchImpl: async (url, options) => {
    captured = { url: String(url), headers: options.headers };
    return { ok: true, json: async () => ({ SearchResult: { SearchResultCountAll: 1, SearchResultItems: [fixture] } }) };
  } });
  assert.match(captured.url, /^https:\/\/data\.usajobs\.gov\/api\/Search/);
  assert.equal(captured.headers["Authorization-Key"], "secret-key");
  assert.equal(captured.headers.Host, "data.usajobs.gov");
  assert.equal(captured.headers["User-Agent"], "jobs@example.test");
  assert.equal(captured.headers.From, undefined);
  assert.equal(result.records.length, 1);
  assert.match(captured.url, /JobCategoryCode=0610/);
});

test("USAJOBS search plan covers every requested nursing role with bounded pagination", () => {
  const terms = core.SEARCHES.map((search) => search.keyword);
  for (const term of ["Registered Nurse", "Nurse", "Clinical Nurse", "Staff Nurse", "Nurse Practitioner", "Nursing Assistant", "Licensed Practical Nurse", "Licensed Vocational Nurse", "Nurse Educator", "Public Health Nurse", "Operating Room Nurse", "PACU Nurse", "Critical Care Nurse", "Mental Health Nurse"]) assert.ok(terms.includes(term));
  assert.ok(core.SEARCHES.find((search) => search.keyword === "Nurse").pages > 1);
  assert.ok(core.LIMITS.pageBudget <= 18);
});

test("USA jobs schema and RLS enforce destination separation", () => {
  const sql = read("supabase/migrations/20260726233000_usa_nursing_jobs_v155.sql");
  assert.match(sql, /create table if not exists public\.btv_usa_jobs/i);
  assert.match(sql, /p\.destination_country='us'/);
  assert.match(sql, /create policy jobs_read on public\.btv_jobs for select to authenticated[\s\S]*p\.destination_country='uk'/);
  assert.doesNotMatch(sql, /create policy jobs_read on public\.btv_jobs for select to anon/);
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
  assert.match(api, /PUBLIC_FIELDS/);
  assert.match(api, /limit/);
  assert.match(api, /offset/);
  assert.doesNotMatch(api, /raw_source_data/);
  assert.doesNotMatch(api, /warmPublicUsaJobs|fetchPublicUsaNursingJobs/);
  assert.doesNotMatch(api, /btv_jobs\?select/);
});

test("USA public employer fallback produces real on-site cards with original apply URLs", () => {
  const publicJobs = require(path.join(root, "api/_lib/usa-public-jobs.cjs"));
  const rows = publicJobs.parseNypJobs(`<li><a href="/job/queens/registered-nurse-intensive-care/19715/98137699552">Registered Nurse - Intensive Care Unit - Full Time Nights</a><span>Queens, NY</span></li>`, new Date("2026-07-31T12:00:00Z"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].country_code, "US");
  assert.equal(rows[0].source_name, "NewYork-Presbyterian Careers");
  assert.match(rows[0].canonical_application_url, /^https:\/\/careers\.nyp\.org\/job\//);
  assert.equal(rows[0].visa_sponsorship_status, "unclear");
});

test("USA importer is independent of the NHS opportunity importer", () => {
  const importer = read("api/usa-jobs-import.js"), uk = read("api/opportunity-import.js");
  assert.match(importer, /USAJOBS_API_KEY/);
  assert.match(importer, /USAJOBS_USER_AGENT/);
  assert.doesNotMatch(importer, /USAJOBS_EMAIL|NEXT_PUBLIC_USAJOBS/);
  assert.match(importer, /btv_usa_jobs/);
  assert.doesNotMatch(importer, /btv_jobs\?/);
  assert.match(uk, /opportunity-import-core\.cjs/);
  assert.match(uk, /NHS Jobs/);
});

test("USA and UK imports are orchestrated by one daily schedule", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.ok(config.crons.some(cron=>cron.path==="/api/global-jobs-import"&&cron.schedule==="15 3 * * *"));
  assert.equal(config.crons.filter(cron=>cron.path==="/api/global-jobs-import").length,1);
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
  for (const filter of ["q", "state", "city", "agency", "specialty", "schedule", "salary_min", "remote", "closing_days", "eligibility"]) assert.match(ui, new RegExp(`name=\\"${filter}\\"`));
  assert.match(ui, /\/api\/usa-jobs/);
  assert.match(ui, /View and apply on USAJOBS/);
  assert.match(ui, /Who may apply/);
  assert.match(ui, /Sponsorship status not confirmed/);
  assert.match(html, /usa-jobs-v155\.js\?v=290/);
  assert.match(ui, /btv:session-restored[\s\S]*openInitialUsRoute/);
  assert.match(ui, /AbortController/);
  assert.match(ui, /USA jobs are taking too long to load/);
  assert.match(ui, /window\.__btvSession/);
  assert.match(ui, /LIVE OFFICIAL VACANCIES/);
  assert.match(ui, /https:\/\/nurse\.usajobs\.gov\/search\/results\//);
  assert.match(routes, /"\/jobs\/usa\/:id"/);
  assert.match(html, /<base href="\/">/);
  assert.ok(html.indexOf('<base href="/">') < html.indexOf('src="mobile-jobs-nav-v157.js'));
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
  assert.match(admin, /data-test-usa-connection/);
  assert.match(admin, /Sync USAJOBS now/);
  assert.match(admin, /duration_ms/);
  assert.match(html, /admin-usa-jobs-v155\.js\?v=270/);
});

test("USA recommendations live only in compact Notification Centre job alerts", () => {
  const ui = read("web/usa-jobs-v155.js"), notifications = read("web/notification-centre-v250.js"), css = read("web/notification-centre-v250.css"), html = read("web/index.html");
  assert.doesNotMatch(ui, /usaDashboardJobs155|dashboardRecommendations|USA JOB RECOMMENDATIONS/);
  assert.match(ui, /alertRecommendations/);
  assert.match(ui, /openAlertRecommendation/);
  assert.match(notifications, /data-notify-tab="jobs"[\s\S]*Job alerts/);
  assert.match(notifications, /data-notify-usa-job/);
  assert.match(css, /\.notifyJobsPanel276\{width:min\(880px,100%\)/);
  assert.match(css, /\.notifyJobRow276\{[^}]*min-height:62px/);
  assert.match(html, /notification-centre-v250\.js\?v=277/);
  assert.match(html, /notification-centre-v250\.css\?v=276/);
});

test("USA importer removes same-batch fallback duplicates before upsert",()=>{
  const importer=read("api/usa-jobs-import.js");
  assert.match(importer,/pendingKeys\.has\(pendingKey\)/);
  assert.match(importer,/duplicate\.source_name !== record\.source_name/);
  assert.match(importer,/new Date\(row\.date_posted\)\.toISOString\(\)/);
});

test("production USAJOBS migration adds required official fields and indexes", () => {
  const sql = read("supabase/migrations/20260731123000_usajobs_production_import_v269.sql");
  for (const field of ["agency", "department", "location_display", "schedule", "grade", "requirements", "who_may_apply", "opening_date", "last_seen_at", "raw_source_data"]) assert.match(sql, new RegExp(`add column if not exists ${field}`));
  for (const index of ["source_idx", "country_idx", "state_idx", "status_idx", "closing_idx", "external_idx"]) assert.match(sql, new RegExp(`btv_usa_jobs_${index}`));
});
