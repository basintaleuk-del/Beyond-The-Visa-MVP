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
  assert.match(index, /help-support-v210\.css\?v=218/);
  assert.match(index, /help-support-v210\.js\?v=218/);
  assert.match(dashboard, /\["Help and support", "help-support"\]/);
  assert.match(profile, /BTVHelpSupport\?\.open/);
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
