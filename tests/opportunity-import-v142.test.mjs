import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { normalizeRecord, professionFor, sponsorshipFor, dedupe, runSources } = require("../api/_lib/opportunity-import-core.cjs");

const now = new Date("2026-07-26T03:15:00Z");
const source = { id: "one", name: "Approved Feed", source_type: "job", base_url: "https://feed.example", integration_type: "json_feed_v1", enabled: true, permission_status: "approved", configuration: { feed_url: "https://feed.example/jobs.json", full_snapshot: true, allowed_link_hosts: ["apply.feed.example"] } };
const raw = { id: "J1", title: "Registered Nurse", employer: "Example NHS Trust", country: "UK", source_url: "https://feed.example/jobs/J1?ref=original", application_url: "https://apply.feed.example/J1", description: "Visa sponsorship is available", published_at: "2026-07-25T10:00:00Z", closing_at: "2026-08-20T23:59:00Z" };

test("keeps the exact original source page", () => assert.equal(normalizeRecord(raw, source, now).source_url, raw.source_url));
test("keeps the employer and original application page", () => { const row = normalizeRecord(raw, source, now); assert.equal(row.employer, raw.employer); assert.equal(row.application_url, raw.application_url); });
test("filters non-nursing and non-midwifery roles", () => { assert.equal(professionFor({ title: "Hospital Receptionist" }), null); assert.equal(professionFor({ title: "Registered Midwife" }), "midwife"); });
test("only explicit wording confirms sponsorship", () => { assert.equal(sponsorshipFor("Visa sponsorship is available").sponsorship_status, "confirmed"); assert.equal(sponsorshipFor("We welcome applications").sponsorship_status, "not_stated"); });
test("deduplicates by source id and canonical URL", () => assert.equal(dedupe([normalizeRecord(raw, source, now), normalizeRecord(raw, source, now)]).length, 1));
test("expired jobs are archived", () => assert.equal(normalizeRecord({ ...raw, closing_at: "2026-07-01T00:00:00Z" }, source, now).status, "archived"));
test("closed scholarships are never opened", () => { const funding = { ...source, source_type: "funding" }; const row = normalizeRecord({ ...raw, title: "Nursing education scholarship", eligibility_summary: "For registered nurses", closing_at: "2026-07-01T00:00:00Z" }, funding, now); assert.equal(row.status, "archived"); });
test("unverified scholarships remain in review and are blocked by public RLS", async () => { const row = normalizeRecord({ ...raw, title: "Nursing education scholarship", eligibility_summary: "For registered nurses" }, { ...source, source_type: "funding" }, now); const migration = await readFile(new URL("../supabase/migrations/20260726085456_daily_opportunity_imports_v142.sql", import.meta.url), "utf8"); assert.equal(row.verification_status, "pending"); assert.equal(row.status, "review"); assert.match(migration, /opportunity_type <> 'scholarship' or verification_status = 'verified'/); });
test("reruns update rather than duplicate", async () => { const records = new Map(); const store = mockStore(records); await runSources({ sources: [source], store, now, fetchImpl: mockFetch([raw]) }); await runSources({ sources: [source], store, now, fetchImpl: mockFetch([raw]) }); assert.equal(records.size, 1); });
test("unauthenticated callers cannot trigger the endpoint", async () => { const api = await readFile(new URL("../api/opportunity-import.js", import.meta.url), "utf8"); assert.match(api, /if \(!caller\) return json\(res, 401/); });
test("a failed source does not stop later sources", async () => { const store = mockStore(new Map()); const bad = { ...source, id: "bad", name: "Bad", configuration: { feed_url: "https://feed.example/bad" } }; const good = { ...source, id: "good", name: "Good" }; const result = await runSources({ sources: [bad, good], store, now, fetchImpl: async (url) => { if (String(url).endsWith("/bad")) throw new Error("offline"); return mockFetch([raw])(url); } }); assert.equal(result.failed, 1); assert.equal(result.succeeded, 1); });
test("public counts query active published records only", async () => { const ui = await readFile(new URL("../web/opportunity-centre-v138.js", import.meta.url), "utf8"); assert.match(ui, /eq\("status", "published"\)\.is\("expired_at", null\)/); });

function mockFetch(items) { return async () => ({ ok: true, json: async () => ({ items }) }); }
function mockStore(records) {
  return {
    async beginSource(sourceRow) { return { id: sourceRow.id }; },
    async saveRecords(_source, rows) { let created = 0, updated = 0; for (const row of rows) { const key = row.canonical_url; if (records.has(key)) updated += 1; else created += 1; records.set(key, row); } return { created, updated }; },
    async archiveMissing() { return 0; }, async finishSource() {}, async archiveExpired() { return 0; }, async refreshEmployerCandidates() {},
  };
}
