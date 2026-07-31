import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const require = createRequire(import.meta.url);
const core = require(path.join(root, "api/_lib/usajobs-core.cjs"));

test("protected USAJOBS diagnostic uses only the two approved server variables", () => {
  const endpoint = read("api/usa-jobs-connection-test.js");
  assert.match(endpoint, /USAJOBS_API_KEY/);
  assert.match(endpoint, /USAJOBS_USER_AGENT/);
  assert.match(endpoint, /btv_is_admin/);
  assert.match(endpoint, /CRON_SECRET/);
  assert.doesNotMatch(endpoint, /NEXT_PUBLIC_USAJOBS|USAJOBS_EMAIL/);
});

test("connection diagnostic returns safe success metadata without credentials", async () => {
  let captured;
  const result = await core.testConnection({ apiKey: "server-secret", userAgent: "jobs@example.org", fetchImpl: async (url, options) => {
    captured = { url: String(url), headers: options.headers };
    return { ok: true, status: 200, json: async () => ({ SearchResult: { SearchResultCountAll: 21, SearchResultItems: [
      { MatchedObjectDescriptor: { PositionTitle: "Registered Nurse" } },
      { MatchedObjectDescriptor: { PositionTitle: "Clinical Nurse" } },
      { MatchedObjectDescriptor: { PositionTitle: "Nurse Practitioner" } },
      { MatchedObjectDescriptor: { PositionTitle: "Fourth title" } },
    ] } }) };
  } });
  assert.match(captured.url, /^https:\/\/data\.usajobs\.gov\/api\/Search\?/);
  assert.equal(captured.headers.Host, "data.usajobs.gov");
  assert.equal(captured.headers["User-Agent"], "jobs@example.org");
  assert.equal(captured.headers["Authorization-Key"], "server-secret");
  assert.equal(result.authentication_succeeded, true);
  assert.equal(result.http_status, 200);
  assert.equal(result.jobs_found, 21);
  assert.deepEqual(result.sample_titles, ["Registered Nurse", "Clinical Nurse", "Nurse Practitioner"]);
  assert.equal(JSON.stringify(result).includes("server-secret"), false);
});

test("connection diagnostic handles missing, invalid, rejected, timeout and empty responses", async () => {
  assert.match((await core.testConnection({ apiKey: "", userAgent: "" })).error, /required/);
  assert.match((await core.testConnection({ apiKey: "key", userAgent: "not-an-email" })).error, /registered with USAJOBS/);
  const rejected = await core.testConnection({ apiKey: "wrong", userAgent: "jobs@example.org", fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ Message: "Invalid key" }) }) });
  assert.deepEqual({ ok: rejected.authentication_succeeded, status: rejected.http_status, count: rejected.jobs_found }, { ok: false, status: 401, count: 0 });
  const empty = await core.testConnection({ apiKey: "key", userAgent: "jobs@example.org", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ SearchResult: { SearchResultCountAll: 0, SearchResultItems: [] } }) }) });
  assert.equal(empty.authentication_succeeded, true);
  assert.equal(empty.jobs_found, 0);
  const timeout = await core.testConnection({ apiKey: "key", userAgent: "jobs@example.org", fetchImpl: async () => { const error = new Error("late"); error.name = "TimeoutError"; throw error; } });
  assert.match(timeout.error, /timed out/);
});
