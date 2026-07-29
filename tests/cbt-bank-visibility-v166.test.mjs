import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('secure practice releases every non-rejected question including unreviewed records', async () => {
  const migration=await read('supabase/migrations/20260729192510_release_unreviewed_cbt_practice_v175.sql');
  assert.match(migration,/quality_status, ''\) <> 'rejected'/);
  assert.doesNotMatch(migration,/review_status <> 'duplicate_quarantined'/);
  assert.doesNotMatch(migration,/update\s+public\.cbt_questions[\s\S]*is_active\s*=\s*true/i);
  assert.doesNotMatch(migration,/delete\s+from|truncate/i);
});

test('CBT practice loads the complete usable bank and labels its review state', async () => {
  const [client,page,secure]=await Promise.all([read('web/exam-prep-v167.js'),read('web/exam-prep.html'),read('supabase/migrations/20260729192510_release_unreviewed_cbt_practice_v175.sql')]);
  assert.match(client,/btv_cbt_practice_catalog/);
  assert.match(client,/btv_cbt_next_practice_question/);
  assert.match(client,/btv_submit_cbt_practice_answer/);
  assert.match(client,/Awaiting clinical review/);
  assert.match(client,/Clinically reviewed/);
  assert.match(page,/id="bankStatus"/);
  assert.match(page,/id="bankQuestionCard"/);
  assert.match(page,/free-question allowance/);
  assert.match(secure,/v_question\.correct_option/);
  assert.doesNotMatch(secure,/review_status\s*<>\s*'duplicate_quarantined'/);
  assert.match(secure,/btv_use_free_practice\('cbt'\)/);
  assert.doesNotMatch(client,/from\('cbt_questions'\)\.select\('\*'\)/);
  assert.doesNotMatch(client,/correct_option\s*===/);
});
