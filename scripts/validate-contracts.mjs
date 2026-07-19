import { readFile } from 'node:fs/promises';

const files = {
  coins: await readFile('web/beyond-coins-v72.js', 'utf8'),
  start: await readFile('supabase/functions/start-mock/index.ts', 'utf8'),
  complete: await readFile('supabase/functions/complete-mock/index.ts', 'utf8'),
  dashboard: await readFile('web/dashboard-premium-v73.js', 'utf8'),
};

const requirements = [
  ['wallet bootstrap uses p_user', files.coins.includes("p_user:s.user.id")],
  ['catalog uses is_active', files.coins.includes("eq('is_active',true)")],
  ['start request uses snake_case', files.coins.includes('mock_code:code')],
  ['completion request uses session_id', files.coins.includes('session_id:id')],
  ['dashboard journey uses is_active', files.dashboard.includes("eq('is_active',true)")],
  ['dashboard orders journey by sort_order', files.dashboard.includes("order('sort_order')")],
];

const failed = requirements.filter(([, ok]) => !ok);
for (const [name, ok] of requirements) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exitCode = 1;
