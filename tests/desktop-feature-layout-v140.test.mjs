import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const opportunityCss = await readFile(new URL("../web/opportunity-centre-v138.css", import.meta.url), "utf8");
const qualificationsCss = await readFile(new URL("../web/qualifications-registration-v139.css", import.meta.url), "utf8");
const index = await readFile(new URL("../web/index.html", import.meta.url), "utf8");

test("Opportunity Centre uses a bounded twelve-column desktop canvas", () => {
  assert.match(opportunityCss, /@media\(min-width:1024px\)/);
  assert.match(opportunityCss, /max-width:1440px/);
  assert.match(opportunityCss, /\[data-opportunity-body\]\{display:grid;grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(opportunityCss, /\[data-recommended-section\]\{grid-column:1\/-1\}/);
  assert.match(opportunityCss, /\[data-recommended-section\]\.opportunitySection138>\.opportunityGrid138\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(opportunityCss, />\.opportunitySection138\{grid-column:span 4\}/);
  assert.match(opportunityCss, />\.opportunitySummary138\{grid-column:1\/-1;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(opportunityCss, />\[data-opportunity-discover\]\{grid-column:1\/-1\}/);
  assert.match(opportunityCss, /article:last-child:nth-child\(odd\)\{grid-column:1\/-1\}/);
  assert.match(opportunityCss, />p:not\(\.opportunityFreshness138\)\{grid-column:2;grid-row:1/);
  assert.match(opportunityCss, />\.opportunityFreshness138\{grid-column:2;grid-row:2/);
  assert.doesNotMatch(opportunityCss, /opportunitySection138:nth-child/);
});

test("Qualifications hub separates guidance and records on desktop", () => {
  assert.match(qualificationsCss, /@media\(min-width:1024px\)/);
  assert.match(qualificationsCss, /max-width:1440px/);
  assert.match(qualificationsCss, /\[data-qr-content\]\{display:block;min-width:0\}/);
  assert.match(qualificationsCss, /\[data-qr-content\]\.qrContentWithPathway139\{display:grid;grid-template-columns:minmax\(300px,360px\) minmax\(0,1fr\)/);
  assert.match(qualificationsCss, /:not\(\.qrContentWithPathway139\) \.qrSections139\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(qualificationsCss, /\.qrSection139\[open\]\{grid-column:1\/-1/);
  assert.match(qualificationsCss, /qrFormGrid139\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test("desktop stylesheet revisions are cache-busted", () => {
  assert.match(index, /opportunity-centre-v138\.css\?v=165/);
  assert.match(index, /qualifications-registration-v139\.css\?v=163/);
});
