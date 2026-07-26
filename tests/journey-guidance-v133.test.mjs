import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');

test('existing Journey routes load the enhanced experience',async()=>{
  const [root,web,admin,webAdmin]=await Promise.all([read('index.html'),read('web/index.html'),read('admin.html'),read('web/admin.html')]);
  for(const page of [root,web]){assert.match(page,/journey-guidance-v133\.css/);assert.match(page,/journey-guidance-v133\.js/)}
  for(const page of [admin,webAdmin]){assert.match(page,/admin-journey-guidance-v133\.css/);assert.match(page,/admin-journey-guidance-v133\.js/)}
});

test('migration extends rather than duplicates Journey source-of-truth tables',async()=>{
  const sql=await read('supabase/migrations/20260725143233_journey_guidance_centre_v133.sql');
  assert.match(sql,/alter table public\.btv_journey_steps/);assert.match(sql,/alter table public\.btv_user_journey_progress/);
  assert.doesNotMatch(sql,/create table if not exists public\.btv_journey_steps/);assert.doesNotMatch(sql,/create table if not exists public\.btv_user_journey_progress/);
  assert.match(sql,/btv_set_journey_step\(p_step_code text,p_completed boolean\)/);
});

test('destination and profession-specific guidance is explicit',async()=>{
  const [sql,client]=await Promise.all([read('supabase/migrations/20260725143233_journey_guidance_centre_v133.sql'),read('web/journey-guidance-v133.js')]);
  for(const country of ['uk','us','au','ca','nz','ie'])assert.match(sql,new RegExp(`'${country}'`));
  for(const code of ['us_midwife_credentials','ca_midwife_registration','nz_midwife_registration'])assert.match(sql,new RegExp(code));
  assert.match(client,/applicable_professions/);assert.match(client,/profession\(state\.profile/);assert.match(client,/\.eq\('destination',destination\)/);
});

test('progress uses applicable required steps and persists server-side',async()=>{
  const client=await read('web/journey-guidance-v133.js');
  assert.match(client,/visibleSteps\(\)\.filter\(step=>step\.is_required!==false\)/);
  assert.match(client,/Math\.round\(completed\.length\*100\/required\.length\)/);
  assert.match(client,/from\('btv_user_journey_progress'\)\.upsert/);
  assert.match(client,/status==='completed'/);assert.match(client,/Mark step complete/);assert.match(client,/Mark incomplete/);
});

test('private status, references, notes, dates, reminders and checklist are supported',async()=>{
  const [sql,client]=await Promise.all([read('supabase/migrations/20260725143233_journey_guidance_centre_v133.sql'),read('web/journey-guidance-v133.js')]);
  for(const field of ['application_reference','submission_date','expected_decision_date','exam_date','expiry_date','supporting_document_reference','reminder_at','notes'])assert.match(client,new RegExp(field));
  assert.match(client,/btv_user_journey_checklist_items/);assert.match(sql,/primary key\(user_id,step_code,item_code\)/);
  assert.match(sql,/completed_at=coalesce\(new\.completed_at,now\(\)\)/);
});

test('RLS keeps user Journey details private and guidance admin-only for writes',async()=>{
  const sql=await read('supabase/migrations/20260725143233_journey_guidance_centre_v133.sql');
  assert.match(sql,/journey_progress_own_read[\s\S]*\(select auth\.uid\(\)\)=user_id/);
  assert.match(sql,/journey_checklist_own_select[\s\S]*\(select auth\.uid\(\)\)=user_id/);
  assert.match(sql,/journey_guidance_admin[\s\S]*\(select public\.btv_is_admin\(\)\)/);
  assert.match(sql,/alter table public\.btv_journey_step_resources enable row level security/);
  assert.doesNotMatch(sql,/user_metadata/);
});

test('modal is accessible, responsive and returns focus',async()=>{
  const [client,css]=await Promise.all([read('web/journey-guidance-v133.js'),read('web/journey-guidance-v133.css')]);
  assert.match(client,/dialog\.addEventListener\('cancel'/);assert.match(client,/event\.key!=='Tab'/);assert.match(client,/state\.returnFocus/);assert.match(client,/focus\?\.isConnected&&focus\.focus/);
  assert.match(client,/aria-labelledby/);assert.match(client,/role="progressbar"/);assert.match(css,/@media\(max-width:620px\)/);assert.match(css,/height:96dvh/);assert.doesNotMatch(css,/width:\s*100vw/);
});

test('external references are HTTPS-only and safely opened',async()=>{
  const client=await read('web/journey-guidance-v133.js');
  assert.match(client,/parsed\.protocol==='https:'/);assert.match(client,/target="_blank" rel="noopener noreferrer"/);assert.match(client,/OFFICIAL SOURCE/);assert.match(client,/Last reviewed/);
});

test('friendly missing, offline and no-destination states are present',async()=>{
  const client=await read('web/journey-guidance-v133.js');
  assert.match(client,/You appear to be offline/);assert.match(client,/Choose your destination/);assert.match(client,/Guidance is under review/);assert.match(client,/Journey unavailable/);assert.doesNotMatch(client,/innerHTML=`[^`]*error\.message/);
});

test('admin Guidance Centre supports lifecycle and version operations behind role checks',async()=>{
  const admin=await read('web/admin-journey-guidance-v133.js');
  assert.match(admin,/profile\?\.role!=='admin'/);assert.match(admin,/Create guidance/);assert.match(admin,/Duplicate/);assert.match(admin,/Preview/);assert.match(admin,/Archive/);assert.match(admin,/Scheduled publish/);assert.match(admin,/Version history/);assert.match(admin,/btv_journey_content_versions/);assert.match(admin,/btv_journey_content_reviews/);
});

test('existing destination persistence and country-change contracts remain in use',async()=>{
  const [sync,client]=await Promise.all([read('web/destination-sync-v111.js'),read('web/journey-guidance-v133.js')]);
  assert.match(sync,/rpc\(["']btv_set_destination_country["']/);assert.match(sync,/destination_country/);assert.match(sync,/localStorage\.setItem\(["']btv-profile["']/);assert.match(sync,/btv:destination-changed/);
  assert.match(client,/addEventListener\('btv:destination-changed'/);assert.match(client,/data-change-destination/);assert.match(sync,/BTVDestinationJourney/);
});

test('migration seeds reviewed official sources without invented exact fees',async()=>{
  const sql=await read('supabase/migrations/20260725143233_journey_guidance_centre_v133.sql');
  for(const domain of ['nmc.org.uk','ncsbn.org','ahpra.gov.au','nnas.ca','nursingcouncil.org.nz','nmbi.ie'])assert.match(sql,new RegExp(domain.replaceAll('.','\\.')));
  assert.match(sql,/estimated_cost_min numeric/);assert.match(sql,/Exact fees remain null until reviewed/);assert.match(sql,/last_reviewed_at=coalesce\(s\.last_reviewed_at,date '2026-07-25'\)/);
});

test('every active Journey step receives complete, step-aware modal guidance',async()=>{
  const [sql,client,css]=await Promise.all([
    read('supabase/migrations/20260725231410_enrich_every_journey_step.sql'),
    read('web/journey-guidance-v133.js'),
    read('web/journey-guidance-v133.css')
  ]);
  for(const kind of ['identity','language','immigration','arrival','employment','jurisdiction','checks','career','registration'])assert.match(sql,new RegExp(`'${kind}'`));
  assert.match(sql,/jsonb_array_length\(action_items\)<6/);
  assert.match(sql,/jsonb_array_length\(required_documents\)<5/);
  assert.match(sql,/Journey guidance enrichment left one or more active steps incomplete/);
  assert.match(sql,/next_step_code=o\.next_code/);
  assert.match(sql,/content_version=greatest\(s\.content_version,2\)/);
  assert.match(client,/item\.description\|\|item\.detail/);
  assert.match(client,/SUGGESTED NEXT STEP/);
  assert.match(client,/data-open-next-guidance/);
  assert.match(css,/\.jgDetailedList/);
  assert.match(css,/\.jgNext/);
});
