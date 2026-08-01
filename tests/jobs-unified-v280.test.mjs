import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("web/index.html");
const css = read("web/jobs-unified-v280.css");
const nightCss = read("web/jobs-night-v300.css");
const usa = read("web/usa-jobs-v155.js");
const globalJobs = read("web/global-jobs-v168.js");
const opportunities = read("web/opportunity-centre-v138.js");

test("Jobs escapes the legacy narrow application shell without clipping headings or cards", () => {
  assert.match(html, /jobs-unified-v280\.css\?v=299/);
  assert.ok(html.lastIndexOf("jobs-unified-v280.css") > html.lastIndexOf("profile-premium-v215.css"));
  assert.match(css, /#appShell>main\{[^}]*max-width:none!important/);
  assert.match(css, /#jobs\.screen,#opportunities\.screen\{[^}]*max-width:none!important/);
  assert.match(css, /#jobs>#jobsContent,#jobsContent\{[^}]*width:100%!important/);
  assert.match(css, /width:min\(100%,1500px\)!important/);
  assert.match(css, /#jobs>\.pageTitle h1\{[^}]*overflow-wrap:break-word!important/);
  assert.match(css, /\.nhsJob148 h3,[\s\S]*\.usaJob155 h3,[\s\S]*\.globalJobTop168 h3\{[^}]*overflow-wrap:anywhere!important/);
});

test("UK USA and international Jobs share one responsive visual system", () => {
  assert.match(css, /\.nhsJobsHero148,#jobsContent \.usaHero155,#jobsContent \.globalJobsHero168/);
  assert.match(css, /\.nhsJobsLayout148,#jobsContent \.usaLayout155,#jobsContent \.globalJobsLayout168/);
  assert.match(css, /\.nhsJobList148,#jobsContent \.usaGrid155,#jobsContent \.globalJobsList168/);
  assert.match(css, /\.nhsJob148,#jobsContent \.usaJob155,#jobsContent \.globalJobCard168/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(globalJobs, /if\(\["GB","US"\]\.includes\(code\)\)return previousRenderJobs/);
});

test("night mode keeps every job name readable on its vacancy card", () => {
  assert.match(html, /jobs-night-v300\.css\?v=300/);
  assert.match(nightCss, /html body\.dark #appShell #jobsContent \.usaJobs155 \.usaJob155,[\s\S]*html body\.dark #appShell #jobsContent \.globalJobCard168\{[^}]*background:#172526!important/);
  assert.match(nightCss, /html body\.dark #appShell #jobsContent \.nhsJob148 h3 a,[\s\S]*html body\.dark #appShell #jobsContent \.usaJob155 h3 a,[\s\S]*html body\.dark #appShell #jobsContent \.globalJobTop168 h3\{color:#f4faf8!important/);
  assert.match(nightCss, /html body\.dark #appShell #jobsContent \.globalJobSide168\{[^}]*background:linear-gradient\(135deg,#132a2b,#172526\)!important/);
});

test("all destination feeds render as premium responsive vacancy tiles", () => {
  assert.match(css, /Premium vacancy tile system v299/);
  assert.match(css, /\.nhsJobList148,[\s\S]*\.globalJobsList168\{grid-template-columns:repeat\(2,minmax\(300px,1fr\)\)/);
  assert.match(css, /\.nhsJob148,[\s\S]*\.globalJobCard168\{height:100%!important/);
  assert.match(css, /\.globalJobCard168\{display:grid!important;grid-template-columns:1fr!important/);
  assert.match(css, /@media\(max-width:1220px\)[^{]*\{[\s\S]*\.globalJobsList168\{grid-template-columns:1fr!important/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /dt:nth-of-type\(3\)\{grid-column:3!important;grid-row:1!important/);
  assert.match(css, /button:last-child\{grid-column:2!important;grid-row:1!important/);
});

test("USA now keeps the shared destination-aware Opportunity Centre used by UK and every country", () => {
  assert.match(opportunities, /function renderDestinationOpportunities\(destination\)/);
  assert.match(opportunities, /Live healthcare roles and career opportunities matched to your selected/);
  assert.match(usa, /if \(id === "jobs"\) renderJobs\(\);/);
  assert.doesNotMatch(usa, /if \(id === "opportunities"\) renderOpportunity\(\);/);
  assert.match(css, /#opportunities\.opportunityCentre138\{[^}]*width:min\(100%,1500px\)!important/);
});
