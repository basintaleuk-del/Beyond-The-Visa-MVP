import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('mock client uses the canonical server contract', async () => {
  const source = await read('web/beyond-coins-v72.js');
  assert.match(source, /mock_code:code/);
  assert.match(source, /client_session_key:key/);
  assert.match(source, /session_id:id/);
  assert.match(source, /eq\('is_active',true\)/);
});

test('Edge Functions retain compatibility during client rollout', async () => {
  const start = await read('supabase/functions/start-mock/index.ts');
  const complete = await read('supabase/functions/complete-mock/index.ts');
  assert.match(start, /body\.mock_code\|\|body\.mockCode/);
  assert.match(start, /body\.client_session_key\|\|body\.clientKey/);
  assert.match(complete, /b\.session_id\|\|b\.sessionId/);
});

test('journey data uses the checked-in schema', async () => {
  const dashboard = await read('web/dashboard-premium-v73.js');
  const hub = await read('web/platform-upgrade-v72.js');
  assert.match(dashboard, /\.eq\((['"])is_active\1,\s*true\)[\s\S]*\.order\((['"])sort_order\2\)/);
  assert.match(hub, /step_code/);
  assert.match(hub, /onConflict:'user_id,step_code'/);
});

test('canonical Zibur code avoids prohibited response wording', async () => {
  const fallback = await read('web/zibur-foundation-v75.js');
  const edge = await read('supabase/functions/zibur-gemini/index.ts');
  assert.doesNotMatch(fallback, /The stored answer is/i);
  assert.doesNotMatch(edge, /The stored answer is/i);
  assert.doesNotMatch(fallback, /Gemini/i);
});

test('five-item bottom navigation remains in the application shell', async () => {
  const html = await read('web/index.html');
  const nav = html.match(/<nav>([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.equal((nav.match(/class="nav/g) || []).length, 5);
  for (const label of ['Home', 'Journey', 'Learn', 'Costs']) {
    if (label === 'Costs') assert.match(html, /data-open="costs">[\s\S]*?<small>Costs<\/small>[\s\S]*?opportunity-centre-v138\.js/);
    else assert.match(nav, new RegExp(`>${label}<`));
  }
});

test('mobile bottom navigation replaces only Ask Zibur with destination-aware Jobs', async () => {
  const html = await read('web/index.html');
  const navigation = await readFile(new URL('../web/mobile-jobs-nav-v157.js', import.meta.url), 'utf8');
  assert.match(html, /mobile-jobs-nav-v157\.js\?v=158/);
  assert.match(navigation, /#appShell>nav \.nav\[data-open="assistant"\]/);
  assert.match(navigation, /button\.dataset\.open = "jobs"/);
  assert.match(navigation, /label\.textContent = "Jobs"/);
  assert.match(navigation, /M9 7V5a2 2 0 0 1 2-2h2/);
  assert.match(navigation, /country === "us" \? "\/jobs\/usa" : "\/jobs"/);
  assert.match(html, /<section id="assistant"/);
  for (const label of ['Home', 'Journey', 'Learn', 'Costs']) assert.match(html, new RegExp(`<small>${label}</small>`));
});
