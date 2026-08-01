import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const client = read("web/jobs-centre-v272.js");
const html = read("web/index.html");
const importer = read("api/global-jobs-import.js");

test("UK jobs have no database-result ceiling", () => {
  assert.match(client, /for\(let from=0;;from\+=500\)/);
  assert.doesNotMatch(client, /from<3000/);
  assert.match(client, /if\(\(result\.data\|\|\[\]\)\.length<500\)break/);
});

test("providers are shuffled daily and interleaved fairly", () => {
  for (const marker of ["dailySeed", "sourceKey", "mixedSources", "groups", "round"]) assert.match(client, new RegExp(marker));
  assert.match(client, /return mixedSources\(rows\)/);
  assert.match(client, /NHS Jobs, Reed,[\s\S]*Jobs by Adzuna[\s\S]*Jooble and Careerjet/);
});

test("all matching jobs stay reachable through progressive pagination", () => {
  assert.match(client, /const PAGE_SIZE = 48/);
  assert.match(client, /view\.visible\+=PAGE_SIZE/);
  assert.match(client, /All \$\{matches\.length\} jobs available/);
  assert.match(client, /Show \$\{Math\.min\(PAGE_SIZE,matches\.length-view\.visible\)\} more jobs/);
  assert.match(html, /jobs-centre-v272\.js\?v=300/);
});

test("each provider validates its own credential without cross-provider assumptions", () => {
  assert.match(importer, /provider === "jooble" && !jooble/);
  assert.match(importer, /provider === "careerjet" && !careerjet/);
  assert.doesNotMatch(importer, /jooble === careerjet/);
  assert.match(importer, /apiKey:env\("JOOBLE_API_KEY"\)\.trim\(\)/);
  assert.match(importer, /affiliateId:env\("CAREERJET_AFFILIATE_ID"\)\.trim\(\)/);
});
