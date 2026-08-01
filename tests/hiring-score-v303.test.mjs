import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage loads the isolated Hiring Score tile styles", async () => {
  const index = await read("web/index.html");
  assert.match(index, /hiring-score-v303\.css\?v=303/);
  assert.match(index, /dashboard-premium-v73\.js\?v=304/);
});

test("dashboard renders an accessible dynamic Hiring Score without removing existing panels", async () => {
  const dashboard = await read("web/dashboard-premium-v73.js");
  assert.match(dashboard, /btv_refresh_hiring_score/);
  assert.match(dashboard, /function hiringScoreMarkup\(\)/);
  assert.match(dashboard, /id="hiring-score-title303">Hiring Score/);
  assert.match(dashboard, /Advisory estimate based on the career evidence saved to your profile/);
  assert.match(dashboard, /class="journeyPanel73"/);
  assert.match(dashboard, /class="quickPanel73"/);
  assert.match(dashboard, /console\.warn\("v303 hiring score fallback"/);
  assert.match(dashboard, /state = \{ u, \.\.\.platform \};\s+requestHiringScore\(u\.id\);\s+return state/);
  assert.doesNotMatch(dashboard, /await withDeadline\(\s*db\(\)\.rpc\("btv_refresh_hiring_score"\)/);
});

test("Hiring Score database objects are private, owner-scoped and evidence-backed", async () => {
  const sql = await read("supabase/migrations/20260801222918_hiring_score_home_tile.sql");
  assert.match(sql, /create table if not exists public\.btv_hiring_score_snapshots/);
  assert.match(sql, /alter table public\.btv_hiring_score_snapshots enable row level security/);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /if v_user is null then/);
  assert.match(sql, /revoke all on function public\.btv_refresh_hiring_score\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.btv_refresh_hiring_score\(\) to authenticated/);
  assert.match(sql, /Complete CBT/);
  assert.match(sql, /Add references/);
  assert.match(sql, /Verify documents/);
});
