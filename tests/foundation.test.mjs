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
  assert.match(dashboard, /eq\('is_active',true\).*order\('sort_order'\)/);
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
  for (const label of ['Home', 'Journey', 'Ask Zibur', 'Learn', 'Costs']) assert.match(nav, new RegExp(`>${label}<`));
});
