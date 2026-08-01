import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Beyond Coins keeps its final content inside a scrollable viewport", () => {
  const css = read("web/member-surfaces-v292.css"), html = read("web/index.html");
  assert.match(html, /member-surfaces-v292\.css\?v=297/);
  assert.match(css, /#btvCoins178\.btvCoins178\[open\]\{position:fixed!important;inset:0!important;[^}]*height:100lvh!important/);
  assert.match(css, />\.coinApp178\{width:100%!important;max-width:none!important;height:100vh!important;height:100lvh!important;[^}]*padding:0!important/);
  assert.match(css, /\.coinBody178\{[^}]*min-height:0!important/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /scroll-padding-bottom:max\(48px/);
  assert.match(css, /\.coinBody178:after\{display:none!important/);
  assert.match(css, /\.coinBody178>:last-child\{margin-bottom:0!important/);
  assert.match(css, /\.coinTabs178\{display:grid!important;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.coinTabs178>button span\{[^}]*overflow:visible!important/);
});

test("USA jobs use equal-height responsive vacancy tiles", () => {
  const css = read("web/jobs-unified-v280.css"), client = read("web/usa-jobs-v155.js");
  assert.match(css, /USA premium tile release v292/);
  assert.match(css, /\.usaJobs155 \.usaGrid155\{grid-template-columns:repeat\(3,minmax\(250px,1fr\)\)/);
  assert.match(css, /\.usaJobs155 \.usaJob155\{display:grid!important/);
  assert.match(css, /@media\(max-width:640px\)[^{]*\{[^}]*\.usaGrid155\{grid-template-columns:1fr!important/);
  for (const feature of ["data-usa-detail", "data-save-usa", "canonical_application_url", "usaFacts155"]) assert.match(client, new RegExp(feature));
});
