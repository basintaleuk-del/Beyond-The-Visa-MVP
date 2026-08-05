import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("international opportunities use the same authenticated destination feed as Jobs", async () => {
  const feature = await read("web/opportunity-centre-v138.js");
  assert.match(feature, /fetch\("\/api\/jobs\?sort=recent&limit=100"/);
  assert.match(feature, /Authorization: `Bearer \$\{token\}`/);
  assert.match(feature, /profileResult\.data\?\.destination_country/);
  assert.match(feature, /selectedDestination !== "uk"/);
  assert.match(feature, /selectedDestination === "us"/);
  assert.match(feature, /BTVUSAJobs\?\.renderOpportunity/);
  for (const [code, name] of [["ie", "Ireland"], ["ae", "United Arab Emirates"], ["sa", "Saudi Arabia"]]) {
    assert.match(feature, new RegExp(`${code}: "${name}"`));
  }
});

test("international opportunity actions stay linked to Jobs and original employers", async () => {
  const feature = await read("web/opportunity-centre-v138.js");
  assert.match(feature, /data-open-linked-jobs/);
  assert.match(feature, /window\.openScreen\?\.\("jobs"\)/);
  assert.match(feature, /row\.application_url \|\| row\.registration_url \|\| row\.source_url/);
  assert.match(feature, /Applying continues on the original employer page/);
  assert.match(feature, /btv:destination-changed/);
});

test("the destination-aware Opportunity Centre release is cache busted", async () => {
  const page = await read("web/index.html");
  assert.match(page, /opportunity-centre-v138\.js\?v=291/);
  assert.match(page, /usa-jobs-v155\.js\?v=291/);
});
