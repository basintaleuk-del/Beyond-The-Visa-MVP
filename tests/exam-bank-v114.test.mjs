import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('CBT and NCLEX tooling targets 2,000 blueprint-tagged records', async () => {
  const factory = await read('web/question-factory.js');
  assert.match(factory, /TARGET: 2000/);
  assert.match(factory, /NMC Test of Competence blueprint \(current 2026\)/);
  assert.match(factory, /NCSBN 2026 NCLEX-RN Test Plan/);
  assert.match(factory, /quality_status: 'needs_clinical_review'/);
});

test('exam and admin clients paginate beyond the Supabase 1,000-row limit', async () => {
  for (const path of ['web/cbt.js', 'web/nclex.js', 'web/admin.js', 'web/admin-bank-tools.js']) {
    const source = await read(path);
    assert.match(source, /range\(from,from\+999\)/, `${path} must load every bank page`);
  }
});

test('publication requires review and approved standards metadata', async () => {
  const migration = await read('supabase/migrations/202607240010_exam_blueprint_and_bank_capacity_v114.sql');
  assert.match(migration, /cbt_questions_publication_review_check/);
  assert.match(migration, /nclex_questions_publication_review_check/);
  assert.match(migration, /quality_status = 'approved'/);
  assert.match(migration, /reviewed_at is not null/);
});

test('browser Back preserves the latest destination selection', async () => {
  const destination = await read('web/destination-sync-v111.js');
  const back = await read('web/back-navigation-v108.js');
  assert.match(destination, /btv-current-destination/);
  assert.match(destination, /pageshow/);
  assert.match(destination, /history-restore/);
  assert.match(back, /BTVDestination\?\.remember/);
  assert.match(back, /BTVDestination\?\.restore/);
});
