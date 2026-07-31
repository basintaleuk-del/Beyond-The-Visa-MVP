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
const migration = await readFile(new URL("../supabase/migrations/20260730160000_mentor_marketplace_filters.sql", import.meta.url), "utf8");

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
  assert.match(index, /mentor-marketplace-v205\.css\?v=213/);
  assert.match(index, /mentor-marketplace-v205\.js\?v=213/);
  assert.match(index, /dashboard-premium-v73\.js\?v=264/);
  for (const command of ["discover", "match", "sessions", "standards"]) assert.match(upgrade, new RegExp(`data-mentor-command205=\\"${command}\\"`));
  assert.match(upgrade, /dialog\.addEventListener\('click'/);
  assert.match(upgrade, /dialog\.addEventListener\('input'/);
  assert.match(upgrade, /MutationObserver\(\(\) => filterVisibleCards/);
  assert.match(upgrade, /mentor205Bound/);
  assert.match(upgrade, /mentor205Observed/);
  assert.match(upgradeCss, /\.mentorCommandNav205/);
  assert.match(upgradeCss, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test("mentor categories are approved-only and filtered by Supabase", () => {
  assert.match(js, /rpc\("btv_list_approved_mentors"/);
  assert.match(js, /p_category:\s*category/);
  assert.match(js, /p_search:\s*query/);
  assert.match(migration, /create or replace function public\.btv_list_approved_mentors/);
  assert.match(migration, /where m\.status = 'approved'/);
  assert.match(migration, /v_category not in \('all', 'registration', 'exam', 'career'\)/);
  assert.match(migration, /grant execute on function public\.btv_list_approved_mentors\(text,text\) to authenticated/);
});

test("mentor hero and navigation are isolated from global layout rules", () => {
  assert.match(upgradeCss, /\.mentorHero177\{position:relative!important;inset:auto!important/);
  assert.match(upgradeCss, /\.mentorCommandNav205\{position:relative!important;inset:auto!important/);
  assert.match(upgradeCss, /\.mentorHeroCopy177\{position:relative!important;inset:auto!important/);
  assert.match(upgradeCss, /@media\(max-width:700px\)/);
  assert.match(upgradeCss, /\.mentorFilters177\{display:grid!important;grid-template-columns:repeat\(2/);
});
