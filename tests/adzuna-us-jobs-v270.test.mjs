import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const require = createRequire(import.meta.url);
const core = require(path.join(root, "api/_lib/adzuna-core.cjs"));

const fixture = {
  id: "adz-123", title: "Registered Nurse - ICU", description: "<b>Provide critical care.</b><script>alert(1)</script> Visa sponsorship is not stated.",
  redirect_url: "https://www.adzuna.com/details/123", created: "2026-07-31T09:00:00Z",
  salary_min: 80000, salary_max: 110000, contract_time: "full_time", contract_type: "permanent",
  company: { display_name: "Example Medical Center" }, location: { display_name: "Houston, Texas", area: ["US", "Texas", "Houston"] },
};

test("Adzuna records use the isolated US jobs contract and conservative sponsorship", () => {
  const row = core.normalizeItem(fixture, new Date("2026-07-31T12:00:00Z"));
  assert.equal(row.external_id, "adz-123"); assert.equal(row.source_name, "ADZUNA"); assert.equal(row.country, "United States");
  assert.equal(row.salary_currency, "USD"); assert.equal(row.employer_name, "Example Medical Center"); assert.equal(row.location_display, "Houston, Texas");
  assert.equal(row.visa_sponsorship_status, "unclear"); assert.equal(row.attribution_text, "Jobs by Adzuna");
  assert.equal(row.description.includes("<"), false); assert.equal(row.description.includes("alert(1)"), true); assert.equal(row.canonical_application_url, "https://www.adzuna.com/details/123");
});

test("Adzuna connection test is server-side, small and returns no credential values", async () => {
  let captured;
  const result = await core.testConnection({ appId: "private-id", appKey: "private-key", fetchImpl: async (url, options) => {
    captured = { url: new URL(String(url)), headers: options.headers };
    return { ok: true, status: 200, json: async () => ({ count: 25, results: [fixture] }) };
  } });
  assert.equal(captured.url.origin + captured.url.pathname, "https://api.adzuna.com/v1/api/jobs/us/search/1");
  assert.equal(captured.url.searchParams.get("results_per_page"), "5"); assert.equal(captured.url.searchParams.get("what"), "Registered Nurse");
  assert.equal(result.authentication_succeeded, true); assert.equal(result.jobs_found, 25); assert.equal(JSON.stringify(result).includes("private-key"), false);
});

test("Adzuna connection handles missing credentials, rejection, timeout and empty results", async () => {
  assert.match((await core.testConnection({ appId: "", appKey: "" })).error, /required/);
  const rejected = await core.testConnection({ appId: "bad", appKey: "bad", fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }) });
  assert.match(rejected.error, /rejected/); assert.equal(rejected.http_status, 403);
  const timeout = await core.testConnection({ appId: "id", appKey: "key", fetchImpl: async () => { const error = new Error("late"); error.name = "TimeoutError"; throw error; } });
  assert.match(timeout.error, /timed out/);
  const empty = await core.testConnection({ appId: "id", appKey: "key", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ count: 0, results: [] }) }) });
  assert.equal(empty.authentication_succeeded, true); assert.equal(empty.jobs_found, 0);
});

test("Adzuna importer searches every requested role and deduplicates by Adzuna job id", async () => {
  const calls = [];
  const result = await core.fetchAdzunaJobs({ appId: "id", appKey: "key", pageBudget: core.TERMS.length, fetchImpl: async (url) => {
    const parsed = new URL(String(url)); calls.push(parsed.searchParams.get("what"));
    return { ok: true, status: 200, json: async () => ({ results: [fixture] }) };
  } });
  for (const term of ["Registered Nurse", "Nurse Practitioner", "Licensed Practical Nurse", "Nursing Assistant", "ICU Nurse", "PACU Nurse", "Mental Health Nurse"]) assert.ok(calls.includes(term));
  assert.equal(result.records.length, 1); assert.ok(result.duplicates > 0); assert.equal(result.pagesFetched, core.TERMS.length);
});

test("Adzuna sample import is limited to five Registered Nurse results", async () => {
  let captured;
  const result = await core.fetchAdzunaJobs({ appId: "id", appKey: "key", sample: true, pageBudget: 1, fetchImpl: async (url) => {
    captured = new URL(String(url));
    return { ok: true, status: 200, json: async () => ({ results: [fixture] }) };
  } });
  assert.equal(captured.searchParams.get("what"), "Registered Nurse"); assert.equal(captured.searchParams.get("results_per_page"), "5");
  assert.equal(result.pagesFetched, 1); assert.equal(result.searchesRun, 1); assert.equal(result.records.length, 1);
});

test("Adzuna routes and migration preserve the existing USA jobs table", () => {
  const importer = read("api/usa-jobs-import.js"), orchestrator = read("api/global-jobs-import.js"), admin = read("web/admin-usa-jobs-v155.js"), ui = read("web/usa-jobs-v155.js"), routes = read("vercel.json"), sql = read("supabase/migrations/20260731133000_adzuna_us_nursing_v270.sql");
  assert.match(importer, /ADZUNA_APP_ID/); assert.match(importer, /ADZUNA_APP_KEY/); assert.doesNotMatch(importer, /NEXT_PUBLIC_ADZUNA/);
  assert.match(routes, /adzuna-jobs-connection-test/); assert.match(routes, /provider=adzuna/);
  assert.match(routes, /adzuna-jobs-sample/);
  assert.match(orchestrator, /name:"ADZUNA"/); assert.match(orchestrator, /ADZUNA_COUNTRIES/);
  assert.match(admin, /Sync Adzuna now/); assert.match(admin, /data-run-adzuna-import/);
  assert.match(ui, /Jobs by Adzuna/); assert.match(ui, /row\.source_name === "ADZUNA" \|\| \["jooble","careerjet"\]\.includes\(String\(row\.source_name\)\.toLowerCase\(\)\) \? "View and apply"/);
  assert.match(sql, /where name='Adzuna USA'/); assert.match(sql, /source_name='ADZUNA'/); assert.doesNotMatch(sql, /update public\.btv_jobs|delete from public\.btv_jobs/);
});
