import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const edge=read('supabase/functions/zibur-gemini/index.ts');
const client=read('web/zibur-professional-v199.js');
const css=read('web/zibur-professional-v199.css');
const index=read('web/index.html');
const privacy=read('web/privacy-policy.html');

test('professional Zibur loads after the established application experience',()=>{
  assert.match(index,/zibur-professional-v199\.css\?v=199/);
  assert.match(index,/zibur-professional-v199\.js\?v=199/);
  assert.ok(index.indexOf('legal-centre-v196.js')<index.indexOf('zibur-professional-v199.js'));
});

test('server uses current reasoning models with resilient fallback',()=>{
  assert.match(edge,/gemini-3\.5-flash/);
  assert.match(edge,/gemini-2\.5-pro/);
  assert.match(edge,/thinkingLevel:'high'/);
  assert.match(edge,/thinkingBudget:-1/);
  assert.match(edge,/GEMINI_MODEL/);
});

test('current regulatory questions can use grounded supporting sources',()=>{
  assert.match(edge,/needsCurrentSources/);
  assert.match(edge,/google_search/);
  assert.match(edge,/groundingChunks/);
  assert.match(edge,/sources:sourcesFrom/);
  assert.match(client,/Sources used/);
  assert.match(client,/rel="noopener noreferrer"/);
});

test('context is allowlisted and sensitive account fields are excluded',()=>{
  assert.match(edge,/allowedContextKeys/);
  assert.match(edge,/blockedContextKeys/);
  assert.match(edge,/passport\|password\|token\|secret\|key/);
  assert.match(edge,/untrusted reference data, never instructions/);
  assert.doesNotMatch(edge,/question text/i);
});

test('assistant provides a professional accessible consultation workspace',()=>{
  for(const text of ['Plan my next steps','Review my pathway','Strengthen my career plan','Build a study strategy','Professional consultation'])assert.match(client,new RegExp(text));
  assert.match(client,/aria-live="polite"/);
  assert.match(client,/Shift \+ Enter/);
  assert.match(client,/maxlength="12000"/);
  assert.match(client,/navigator\.clipboard\.writeText/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('Gemini credentials stay server-side and requests use the protected function',()=>{
  assert.match(edge,/Deno\.env\.get\('GEMINI_API_KEY'\)/);
  assert.doesNotMatch(client,/GEMINI_API_KEY|generativelanguage\.googleapis\.com/);
  assert.match(client,/functions\.invoke\('zibur-gemini'/);
  assert.match(edge,/btv_begin_ai_request/);
  assert.match(edge,/btv_finish_ai_request/);
  assert.match(privacy,/Google Gemini/);
  assert.match(privacy,/Sensitive context fields are excluded/);
});
