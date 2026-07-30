import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../web/dashboard-premium-v73.js", import.meta.url), "utf8");
const css = await readFile(new URL("../web/dashboard-premium-v73.css", import.meta.url), "utf8");
const routes = await readFile(new URL("../web/feature-routes-v73.js", import.meta.url), "utf8");
const platform = await readFile(new URL("../web/platform-upgrade-v72.js", import.meta.url), "utf8");
const upgrade = await readFile(new URL("../web/mentor-marketplace-v205.js", import.meta.url), "utf8");
const upgradeCss = await readFile(new URL("../web/mentor-marketplace-v205.css", import.meta.url), "utf8");
const index = await readFile(new URL("../web/index.html", import.meta.url), "utf8");

test("Mentors opens the redesigned marketplace without replacing other standalone panels", () => {
  assert.match(js, /if \(type === "mentors"\) return openMentorMarketplace\(\)/);
  assert.match(js, /mentorMarketplaceDialog177/);
  assert.match(js, /id === "mentors" \|\| id === "bookings"/);
  assert.match(js, /id === "stories"/);
});

test("every mentor entry opens the exported full-screen marketplace", () => {
  assert.match(js, /window\.BTVMentorMarketplace = \{ open: openMentorMarketplace \}/);
  assert.match(routes, /action:'mentor-marketplace'/);
  assert.match(routes, /BTVMentorMarketplace\?\.open/);
  assert.match(platform, /BTVMentorMarketplace\?\.open/);
});

test("marketplace loads approved mentors and keeps safe fallback guidance", () => {
  assert.match(js, /\.from\("btv_mentors"\)/);
  assert.match(js, /\.eq\("status", "approved"\)/);
  assert.match(js, /New mentor profiles are being reviewed/);
  assert.match(js, /Never share private contact or payment details/);
});

test("marketplace is responsive and honours reduced motion", () => {
  assert.match(css, /\.mentorMarketplaceDialog177/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("v205 mentor commands and filters work before the network request completes", () => {
  assert.match(index, /mentor-marketplace-v205\.css\?v=205/);
  assert.match(index, /mentor-marketplace-v205\.js\?v=205/);
  for (const command of ["discover", "match", "sessions", "standards"]) assert.match(upgrade, new RegExp(`data-mentor-command205=\\"${command}\\"`));
  assert.match(upgrade, /dialog\.addEventListener\('click'/);
  assert.match(upgrade, /dialog\.addEventListener\('input'/);
  assert.match(upgrade, /MutationObserver\(\(\) => filterVisibleCards/);
  assert.match(upgrade, /mentor205Bound/);
  assert.match(upgrade, /mentor205Observed/);
  assert.match(upgradeCss, /\.mentorCommandNav205/);
  assert.match(upgradeCss, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
