import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('CBT and Numeracy mock products use the requested Beyond Coins rules', async () => {
  const sql = await readFile('supabase/migrations/20260729200853_align_cbt_mock_coin_prices_v177.sql','utf8');
  for (const code of ['cbt_short','cbt_full','numeracy_short','numeracy_full']) assert.match(sql,new RegExp(`'${code}'`));
  assert.match(sql,/when 'cbt_short' then 50/);
  assert.match(sql,/when 'cbt_full' then 100/);
  assert.match(sql,/when 'numeracy_short' then 50/);
  assert.match(sql,/when 'numeracy_full' then 100/);
  assert.match(sql,/when 'cbt_short' then 15/);
  assert.match(sql,/when 'cbt_full' then 30/);
  assert.match(sql,/when 'cbt_short' then 30/);
  assert.match(sql,/when 'cbt_full' then 60/);
  assert.match(sql,/update public\.btv_mock_catalog/);
  assert.match(sql,/update public\.btv_coin_products/);
});
