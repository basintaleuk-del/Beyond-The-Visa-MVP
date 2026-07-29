import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../web/dashboard-premium-v73.js", import.meta.url), "utf8");
const css = await readFile(new URL("../web/dashboard-premium-v73.css", import.meta.url), "utf8");

test("Mentors opens the redesigned marketplace without replacing other standalone panels", () => {
  assert.match(js, /if \(type === "mentors"\) return openMentorMarketplace\(\)/);
  assert.match(js, /mentorMarketplaceDialog177/);
  assert.match(js, /id === "mentors" \|\| id === "bookings"/);
  assert.match(js, /id === "stories"/);
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
