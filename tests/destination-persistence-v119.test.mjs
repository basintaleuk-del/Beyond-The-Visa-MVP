import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client=fs.readFileSync('web/destination-sync-v111.js','utf8');
const index=fs.readFileSync('web/index.html','utf8');

test('authenticated destination is rehydrated from Supabase after Back and refresh',()=>{
  assert.match(client,/let key=clean\(profile\.destination_country\)/);
  assert.match(client,/window\.addEventListener\('pageshow'/);
  assert.match(client,/window\.addEventListener\('popstate'/);
  assert.doesNotMatch(client,/btv-destination-choice-v119/);
});

test('authenticated profile cache follows the account source of truth',()=>{
  assert.match(index,/select\('full_name,profession,qualification_country,destination_country,destination/);
  assert.match(index,/const destination=profile\.destination_country\|\|profile\.destination\|\|'uk'/);
  assert.match(index,/destination-sync-v111\.js\?v=122/);
});
