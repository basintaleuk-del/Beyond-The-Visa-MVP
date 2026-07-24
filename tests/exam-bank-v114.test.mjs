import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('CBT and NCLEX tooling keeps the capacity target without generating cosmetic variants', async () => {
  const factory = await read('web/question-factory.js');
  assert.match(factory, /TARGET: 2000/);
  assert.match(factory, /NMC Test of Competence 2021 blueprint/);
  assert.match(factory, /Unofficial sample aligned to the NCSBN 2026 NCLEX-RN Test Plan/);
  assert.match(factory, /quality_status: 'needs_clinical_review'/);
  assert.match(factory, /normaliseStem/);
  assert.doesNotMatch(factory, /Array\.from\(\{ length: total \}/);
});

test('repeated drafts are quarantined and unofficial samples remain review-gated', async () => {
  const migration = await read('supabase/migrations/202607240012_independent_sample_question_bank_v115.sql');
  assert.match(migration, /duplicate_quarantined/);
  assert.match(migration, /content_kind.*unofficial_sample/s);
  assert.match(migration, /sample_unreviewed/);
  assert.match(migration, /live_semantic_hash_uidx/);
  assert.match(migration, /'free', false, 'single', 'sample_unreviewed'/);
});

test('exam clients and bank health paginate beyond the Supabase 1,000-row limit', async () => {
  for (const path of ['web/cbt.js', 'web/nclex.js', 'web/admin-bank-tools.js']) {
    const source = await read(path);
    assert.match(source, /range\(from,from\+999\)/, `${path} must load every bank page`);
  }
  const admin = await read('web/admin.js');
  assert.match(admin, /limit\(150\)/, 'Admin must render a bounded recent-question page');
  assert.doesNotMatch(admin, /function readAll/, 'Admin must not load all full question records at startup');
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
