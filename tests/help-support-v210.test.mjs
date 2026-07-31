import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const script = read("web/help-support-v210.js");
const style = read("web/help-support-v210.css");
const index = read("web/index.html");
const dashboard = read("web/dashboard-premium-v73.js");
const profile = read("web/profile-menu-v82.js");
const migration = read("supabase/migrations/20260730143000_help_support_centre.sql");

test("Help Centre assets are loaded and primary entry points use the new route", () => {
  assert.match(index, /help-support-v210\.css\?v=259/);
  assert.match(index, /help-support-v210\.js\?v=259/);
  assert.match(dashboard, /\["Help and support", "help-support"\]/);
  assert.match(profile, /BTVHelpSupport\?\.open/);
});

test("Advertisement surface includes secure, accessible social destinations", () => {
  assert.match(script, /Connect With Beyond the Visa/);
  assert.match(script, /Follow us for nursing opportunities, immigration updates, career guidance and community support\./);
  assert.match(script, /href="https:\/\/www\.facebook\.com\/share\/1JsB8W8Wtg\/\?mibextid=wwXIfr"/);
  assert.match(script, /href="https:\/\/www\.tiktok\.com\/@beyond_the_visa\?_r=1&amp;_t=ZN-98V2UDlDXD4"/);
  assert.match(script, /href="https:\/\/www\.instagram\.com\/beyondthevisa_official\?igsh=eTlraTNjdnNpdWwy&amp;utm_source=qr"/);
  assert.match(script, /href="https:\/\/wa\.me\/447723126429\?text=Hello%20Beyond%20the%20Visa%2C%20I%20found%20your%20contact%20through%20your%20website%20and%20would%20like%20to%20make%20an%20enquiry\."/);
  assert.equal((script.match(/target="_blank" rel="noopener noreferrer" aria-label=/g) || []).length, 4);
  for (const label of ["Visit Beyond the Visa on Facebook", "Visit Beyond the Visa on TikTok", "Visit Beyond the Visa on Instagram", "Contact Beyond the Visa on WhatsApp"]) assert.match(script, new RegExp(label));
  for (const account of ["@beyond_the_visa", "@beyondthevisa_official", "\\+44 7723 126429"]) assert.match(script, new RegExp(account));
});

test("social cards are balanced and responsive in light and dark modes", () => {
  assert.match(style, /\.helpSocialGrid259\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(style, /@media\(max-width:980px\)\{\.helpSocialGrid259\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(style, /@media\(max-width:390px\)\{\.helpSocialGrid259\{grid-template-columns:1fr/);
  assert.match(style, /body\.dark \.helpSocial259/);
  assert.match(style, /\.helpSocialCard259:hover/);
  assert.match(style, /prefers-reduced-motion:reduce/);
});

test("member actions use authenticated Supabase RPCs", () => {
  assert.match(script, /auth\.getUser\(\)/);
  assert.match(script, /rpc\("btv_get_my_support_requests"\)/);
  assert.match(script, /rpc\("btv_submit_support_request"/);
  assert.match(script, /rpc\("btv_add_support_update"/);
  assert.match(script, /missingRpc/);
  assert.match(script, /from\("manager_requests"\)/);
  assert.match(script, /user_id: user\.id/);
});

test("database contract derives ownership server-side and restricts operations", () => {
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(migration, /mr\.user_id = auth\.uid\(\)/);
  assert.match(migration, /and mr\.user_id = v_user_id/);
  assert.match(migration, /revoke all on function public\.btv_submit_support_request[\s\S]*from public, anon/);
  assert.match(migration, /grant execute on function public\.btv_submit_support_request[\s\S]*to authenticated/);
  assert.match(migration, /char_length\(v_message\) < 10/);
});

test("all visible Help Centre controls have interaction bindings", () => {
  for (const action of [
    "data-help-new",
    "data-help-tickets",
    "data-help-category",
    "data-help-refresh",
    "data-help-form",
    "data-help-search",
    "data-help-zibur",
    "data-help-route",
    "data-help-update",
  ]) assert.match(script, new RegExp(action));
});

test("responsive and accessible UI includes mobile layout, focus and tap targets", () => {
  assert.match(style, /\.helpSupport210 \.helpMain210\{display:block;width:100%;max-width:none;margin:0/);
  assert.match(style, /\.helpSupport210 \.helpQuickLinks210\{position:static;inset:auto;z-index:auto;display:block;width:auto;transform:none/);
  assert.match(style, /@media\(max-width:680px\)/);
  assert.match(style, /@media\(max-width:360px\)/);
  assert.match(style, /min-height:44px/);
  assert.match(style, /:focus-visible/);
  assert.match(script, /aria-modal="true"/);
  assert.match(script, /aria-expanded="false"/);
  assert.match(script, /role="status"/);
});
