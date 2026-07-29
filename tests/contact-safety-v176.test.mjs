import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260729161038_contact_sharing_prevention.sql'),'utf8');
const client=fs.readFileSync(path.join(root,'web/contact-safety-v176.js'),'utf8');
const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const goldenEdge=fs.readFileSync(path.join(root,'supabase/functions/golden-question/index.ts'),'utf8');

test('moderation audit tables are additive, RLS protected and do not retain raw attempted content',()=>{
  for(const table of ['moderation_events','contact_sharing_attempts','user_moderation_status','conversation_risk_scores','moderation_appeals']){
    assert.match(migration,new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.doesNotMatch(migration,/raw_content|attempted_content|content_excerpt/);
  assert.match(migration,/content_fingerprint/);
});

test('server detection covers contact, link, payment and circumvention signals',()=>{
  for(const category of ['email','phone','social_handle','external_link','external_payment','circumvention_intent']){
    assert.match(migration,new RegExp(`'${category}'`));
  }
  assert.match(migration,/zero\|oh\|one\|two\|three\|four\|five\|six\|seven\|eight\|nine/);
  assert.match(migration,/chr\(8203\)/);
});

test('obvious healthcare false positives are not encoded as unconditional blocks',()=>{
  assert.doesNotMatch(migration,/NMC PIN|postcode|salary|exam date/i);
  assert.match(migration,/char_length\(v_digits\) between 7 and 15/);
  assert.match(migration,/0\[1-9\]\[0-9\]\{2,4\}/);
});

test('only existing shared user-authored tables receive moderation triggers',()=>{
  assert.match(migration,/array\['bookings','btv_mentor_bookings','btv_mentor_reviews','btv_mentors','golden_question_comments','cv_service_requests','manager_requests','profiles'\]/);
  assert.doesNotMatch(migration,/btv_user_journey_progress.*btv_contact_moderation_trigger/);
  assert.doesNotMatch(migration,/btv_job_applications.*btv_contact_moderation_trigger/);
});

test('existing forms use one server-side preflight without replacing their submit handlers',()=>{
  assert.match(html,/contact-safety-v176\.js\?v=176/);
  assert.match(client,/\.rpc\('btv_enforce_contact_sharing'/);
  for(const selector of ['btvBookingForm','cvServicePanel','gqCommentForm','contactForm','feedbackForm','chatForm'])assert.match(client,new RegExp(selector));
  assert.match(client,/form\.requestSubmit/);
});

test('service-role comment writes pass through the same audited enforcement boundary',()=>{
  assert.match(migration,/grant execute on function public\.btv_enforce_contact_sharing\(text,text,uuid\) to authenticated, service_role/);
  assert.match(goldenEdge,/db\.rpc\([\s\S]{0,80}"btv_enforce_contact_sharing"/);
  assert.match(goldenEdge,/moderation\?\.allowed === false/);
});
