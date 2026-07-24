import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/202607240015_sample_mock_pool_terms_and_500_banks_v118.sql');

test('v118 adds exactly 500 gated sample items per supported bank',()=>{
  assert.match(migration,/v118 expected 500 items per bank/);
  for(const prefix of ['CBT','NCLEX','IELTS'])assert.match(migration,new RegExp(`BTV-${prefix}-SAMPLE-V118-`));
  assert.match(migration,/sample_unreviewed/g);
  assert.match(migration,/needs_clinical_review/g);
  assert.match(migration,/review-state validation failed/);
});

test('sample mock purchase uses non-rejected pool and recorded clickwrap',()=>{
  const coins=read('web/beyond-coins-v112.js');
  assert.match(migration,/btv_exam_sample_acceptances/);
  assert.match(migration,/btv_accept_sample_mock_terms/);
  assert.match(migration,/quality_status<>''rejected''/);
  assert.match(migration,/review_status<>''rejected''/);
  assert.match(coins,/data-sample-accept/);
  assert.match(coins,/btv_accept_sample_mock_terms/);
  assert.match(coins,/No coins were deducted/);
});

test('all exam renderers display conspicuous sample labels',()=>{
  assert.match(read('web/cbt.js'),/SAMPLE QUESTION · NOT CLINICALLY REVIEWED/);
  assert.match(read('web/nclex.js'),/SAMPLE QUESTION · NOT CLINICALLY REVIEWED/);
  assert.match(read('web/ielts-mock.js'),/SAMPLE QUESTION · NOT CLINICALLY REVIEWED/);
  assert.match(read('web/mock-access-v72.js'),/ielts-mock\.html/);
});

test('terms describe sample limitations and preserve mandatory rights',()=>{
  const terms=read('web/terms-and-conditions.html');
  assert.match(terms,/id="sample-questions"/);
  assert.match(terms,/may not have been clinically or professionally reviewed/);
  assert.match(terms,/do not replace official examination materials/);
  assert.match(terms,/Mandatory consumer rights/);
});
