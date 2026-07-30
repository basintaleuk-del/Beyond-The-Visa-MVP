import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const checkout = read('web/beyond-coins-v112.js');
const access = read('web/mock-access-v72.js');
const migration = read('supabase/migrations/20260730170000_nclex_mock_checkout_alignment.sql');
const acceptanceApi = read('api/accept-sample-terms.js');

test('NCLEX uses the same shared Beyond Coins mock chooser and checkout as CBT', () => {
  assert.match(access, /CODES\['nclex_'\+tier\]/);
  assert.match(access, /window\.BTVCoins\.chooseMock\(exam/);
  assert.match(checkout, /function chooseMock\(exam,onApproved\)/);
  assert.match(checkout, /btv_accept_sample_mock_terms/);
  assert.match(checkout, /btv_purchase_resource/);
  assert.match(checkout, /btv_start_entitled_mock/);
  assert.match(checkout, /acceptSampleTerms/);
  assert.match(checkout, /row-level security policy/);
  assert.match(access, /15 minutes · 50 Beyond Coins/);
  assert.match(access, /30 minutes · 100 Beyond Coins/);
});

test('legacy acknowledgement fallback verifies the caller before using the server credential', () => {
  assert.match(acceptanceApi, /auth\/v1\/user/);
  assert.match(acceptanceApi, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(acceptanceApi, /user_id: user\.id/);
  assert.match(acceptanceApi, /on_conflict=user_id,terms_version/);
  assert.match(acceptanceApi, /resolution=merge-duplicates/);
});

test('repeat sample acknowledgement is owner-only and NCLEX offer matches CBT timing and prices', () => {
  assert.match(migration, /for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)\s+with check \(\(select auth\.uid\(\)\) = user_id\)/s);
  assert.match(migration, /grant update on public\.btv_exam_sample_acceptances to authenticated/);
  assert.match(migration, /'nclex_short' then 50/);
  assert.match(migration, /'nclex_full' then 100/);
  assert.match(migration, /'nclex_short' then 15/);
  assert.match(migration, /'nclex_full' then 30/);
  assert.match(migration, /'nclex_short' then 30/);
  assert.match(migration, /'nclex_full' then 60/);
});
