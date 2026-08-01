import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Australian IQNM guidance follows the selected destination", async () => {
  const feature = await read("web/qualifications-registration-v139.js");
  assert.match(feature, /select\("profession,qualification_country,destination_country,destination"\)/);
  assert.match(feature, /usesAustralianRegistration = \(\) => destinationCode\(state\.destination\) === "au"/);
  assert.match(feature, /if \(!usesAustralianRegistration\(\)\)/);
  assert.match(feature, /australianAssessmentNames\.has\(option\.value\)/);
  assert.match(feature, /INDICATIVE AUSTRALIAN PATHWAY/);
});

test("the modern home has one launch-gated Golden Question tile", async () => {
  const [dashboard, golden] = await Promise.all([
    read("web/dashboard-premium-v73.js"),
    read("web/golden-question-v126.js"),
  ]);
  assert.equal((dashboard.match(/title: "Golden Question"/g) || []).length, 1);
  assert.match(dashboard,/Coming soon — daily clinical challenge/);
  assert.match(dashboard, /id: "golden-question"/);
  assert.match(dashboard, /BTVGoldenQuestion\?\.openToday/);
  assert.match(golden, /async function openToday\(\)/);
  assert.match(golden, /class="gqExperience"/);
  assert.match(golden, /Today’s Golden Question is being prepared for launch/);
  assert.doesNotMatch(golden, /h\.id = "goldenQuestion126"/);
});
