import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('signed-in learners can read every usable CBT question while quarantined duplicates stay hidden', async () => {
  const migration=await read('supabase/migrations/202607281700_cbt_practice_bank_visibility_v166.sql');
  assert.match(migration,/quality_status <> 'rejected'/);
  assert.match(migration,/review_status <> 'duplicate_quarantined'/);
  assert.doesNotMatch(migration,/update\s+public\.cbt_questions[\s\S]*is_active\s*=\s*true/i);
  assert.doesNotMatch(migration,/delete\s+from|truncate/i);
});

test('CBT practice loads the complete usable bank and labels its review state', async () => {
  const [client,page]=await Promise.all([read('web/cbt.js'),read('web/cbt.html')]);
  assert.match(client,/neq\('quality_status','rejected'\)/);
  assert.match(client,/neq\('review_status','duplicate_quarantined'\)/);
  assert.match(client,/Awaiting clinical review/);
  assert.match(client,/REVIEWED PRACTICE QUESTION/);
  assert.match(client,/practiceBags/);
  assert.match(client,/function nextFromPool/);
  assert.match(page,/id="bankStatus"/);
  assert.match(page,/official NMC preparation materials/);
});
