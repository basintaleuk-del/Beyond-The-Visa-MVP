import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client=readFileSync(new URL('../web/destination-sync-v111.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/202607240016_destination_journey_accuracy_v121.sql',import.meta.url),'utf8');

test('authenticated destination is loaded from the authoritative account column',()=>{
  assert.match(client,/select\(["']destination_country,destination,profession["']\)/);
  assert.match(client,/let key\s*=\s*clean\(profile\.destination_country\)/);
  assert.doesNotMatch(client,/btv-destination-choice-v119/);
});

test('destination UI changes only after RPC confirmation and rolls back on failure',()=>{
  const rpc=client.search(/rpc\(["']btv_set_destination_country["']/);
  const apply=client.search(/apply\(["']account-selection["']/);
  assert.ok(rpc>=0&&apply>rpc);
  assert.match(client,/Object\.assign\(model, previous\)/);assert.match(client,/apply\(["']save-rollback["']\)/);
  assert.match(client,/setPickerBusy\(true\)/);
});

test('journey totals include only active required non-archived destination steps',()=>{
  assert.match(client,/step\.is_active\s*!==\s*false[\s\S]*step\.is_archived\s*!==\s*true[\s\S]*step\.is_required\s*!==\s*false[\s\S]*appliesToProfession/);
  assert.match(client,/applicable_professions/);
  assert.match(migration,/count\(distinct p\.step_code\)/i);
  assert.match(migration,/s\.destination=v_country and s\.is_active and not s\.is_archived and s\.is_required/i);
});

test('profile onboarding writes the authoritative and compatibility fields together',()=>{
  assert.match(page,/destination_country:profile\.destination,destination:profile\.destination/);
  assert.match(page,/await window\.BTVDestinationJourney\.hydrate\(session\.user\)/);
});

test('database uniqueness and RPC validation prevent duplicate or cross-country progress',()=>{
  assert.match(migration,/on conflict\(user_id,step_code\) do update/i);
  assert.match(migration,/code=p_step_code and destination=v_country/i);
  assert.match(migration,/grant execute on function public\.btv_set_journey_step\(text,boolean\) to authenticated/i);
});

test('legacy completed steps are restored only for the matching signed-in user and destination',()=>{
  assert.match(client,/account\.id\s*!==\s*userId/);
  assert.match(client,/read\(["']btv-v1["']\)\.done\?\.\[key\]/);
  assert.match(client,/legacyStepCodes\[key\]/);
  assert.match(client,/available\.has\(code\)\s*&&\s*!already\.has\(code\)/);
  assert.match(client,/p_step_code:\s*code[\s\S]*p_completed:\s*true/);
});

test('optional destination renderers cannot block successful authentication hydration',()=>{
  assert.match(client,/const safeRender\s*=/);
  assert.match(client,/try\s*\{[\s\S]*typeof callback\s*===\s*["']function["'][\s\S]*callback\.call\(window\)[\s\S]*catch/);
  assert.match(client,/safeRender\(["']culture["'],\s*window\.renderCulture\)/);
  assert.doesNotMatch(client,/window\.renderCulture\?\.\(\)/);
});
