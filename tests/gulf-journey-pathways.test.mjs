import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');
const migration='supabase/migrations/20260728233232_gulf_journey_pathways.sql';

test('Journey client recognises UAE and Saudi Arabia',async()=>{
  const [guidance,sync]=await Promise.all([
    read('web/journey-guidance-v133.js'),
    read('web/destination-sync-v111.js')
  ]);
  assert.match(guidance,/ae:'United Arab Emirates'/);
  assert.match(guidance,/sa:'Saudi Arabia'/);
  for(const code of ['ae_authority','ae_arrival','sa_mumaris','sa_arrival'])assert.match(sync,new RegExp(code));
});

test('migration publishes eight complete destination-specific steps per Gulf country',async()=>{
  const sql=await read(migration);
  for(const code of [
    'ae_authority','ae_pqr','ae_verification','ae_assessment','ae_eligibility','ae_employment','ae_work_residence','ae_arrival',
    'sa_mumaris','sa_classification','sa_verification','sa_assessment','sa_employment','sa_work_residence','sa_registration','sa_arrival'
  ])assert.match(sql,new RegExp(`'${code}'`));
  assert.match(sql,/Expected exactly eight published Journey steps/);
  assert.match(sql,/jsonb_array_length\(action_items\)<6/);
  assert.match(sql,/destination in \('uk','us','au','ca','nz','ie','ae','sa'\)/);
});

test('Gulf pathways cite official authorities and do not invent exact costs',async()=>{
  const sql=await read(migration);
  for(const domain of ['dha.gov.ae','doh.gov.ae','mohap.gov.ae','u.ae','scfhs.org.sa','hrsd.gov.sa']){
    assert.match(sql,new RegExp(domain.replaceAll('.','\\.')));
  }
  assert.match(sql,/null,null,case destination when 'ae' then 'AED' else 'SAR' end/);
  assert.doesNotMatch(sql,/estimated_cost_min[^\n]*[1-9][0-9]/);
  assert.match(sql,/date '2026-07-29'/);
});

test('existing country steps are not updated by the Gulf content migration',async()=>{
  const sql=await read(migration);
  assert.doesNotMatch(sql,/where destination in \('uk'/);
  assert.doesNotMatch(sql,/delete from public\.btv_journey_steps/);
  assert.match(sql,/Existing destinations and progress rows are deliberately left unchanged/);
});
