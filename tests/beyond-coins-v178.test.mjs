import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("loyalty upgrade extends the canonical wallet without duplicating it", async () => {
  const sql = await read("supabase/migrations/20260729175813_beyond_coins_loyalty_v178.sql");
  assert.match(sql, /alter table public\.btv_wallets/);
  assert.match(sql, /btv_wallet_transactions/);
  assert.doesNotMatch(sql, /create table if not exists public\.btv_coin_wallets/i);
  assert.doesNotMatch(sql, /update public\.btv_wallets set balance\s*=\s*0/i);
  assert.match(sql, /btv_coin_migration_reconciliation_v178/);
});

test("financial mutations are server-side, idempotent and RLS protected", async () => {
  const sql = await read("supabase/migrations/20260729175813_beyond_coins_loyalty_v178.sql");
  assert.match(sql, /security definer set search_path=''/i);
  assert.match(sql, /idempotency_key/);
  assert.match(sql, /for update/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on function public\.btv_coin_credit[^;]+from public,anon,authenticated/i);
  assert.match(sql, /pending_balance/);
  assert.match(sql, /remaining_amount/);
});

test("premium wallet uses snapshot and atomic RPCs instead of direct balance writes", async () => {
  const js = await read("web/beyond-coins-v178.js");
  assert.match(js, /btv_coin_wallet_snapshot/);
  assert.match(js, /btv_coin_claim_reward/);
  assert.match(js, /btv_purchase_resource/);
  assert.doesNotMatch(js, /from\(["']btv_wallets["']\)\.(?:insert|update|delete)/);
  for (const section of ["Overview", "Earn", "Rewards", "Challenges", "History", "Buy", "How it works"]) assert.match(js, new RegExp(section));
});

test("wallet is responsive, dark-mode aware and reduced-motion safe", async () => {
  const css = await read("web/beyond-coins-v178.css");
  assert.match(css, /@media\s*\(max-width:\s*(?:470|520)px\)/);
  assert.match(css, /body\.dark/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /grid-template-columns:\s*248px minmax\(0,\s*1fr\)/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  const js = await read("web/beyond-coins-v178.js");
  assert.match(js, /coinNavIntro178/);
  const html = await read("web/index.html");
  assert.match(html, /beyond-coins-v178\.css\?v=179/);
  assert.match(html, /beyond-coins-v178\.js\?v=179/);
});

test("admin tools and checkout use the current production contract", async () => {
  const admin = await read("web/admin-coins-loyalty-v178.js");
  assert.match(admin, /btv_admin_release_pending_coin_reward/);
  assert.match(admin, /btv_admin_qualify_referral/);
  assert.match(admin, /btv_admin_set_coin_config_status/);
  const checkout = await read("supabase/functions/coin-checkout/index.ts");
  assert.match(checkout, /coin_amount: coins/);
  assert.doesNotMatch(checkout, /coin_total: coins/);
});

test("wallet ledger permits canonical paid exam charges and refunds", async () => {
  const sql = await read("supabase/migrations/20260729203945_restore_exam_wallet_transaction_types.sql");
  assert.match(sql, /'exam_charge'/);
  assert.match(sql, /'exam_refund'/);
  for (const existing of ["challenge_reward", "streak_reward", "golden_question_monthly_prize"]) {
    assert.match(sql, new RegExp(`'${existing}'`));
  }
});
