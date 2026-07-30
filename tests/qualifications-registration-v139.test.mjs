import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');

test('Account menu replaces only the duplicate destination entry',async()=>{
  const menu=await read('web/dashboard-premium-v73.js');
  assert.doesNotMatch(menu,/Change destination country/);
  assert.equal((menu.match(/Qualifications & Registration/g)||[]).length,2);
  assert.match(menu,/\["Qualifications & Registration", "qualifications-registration"\]/);
  assert.match(menu,/BTVQualificationsRegistration139\?\.open/);
  for(const label of ['Profile','My Documents','Notifications','Beyond Coins','Privacy & legal'])assert.match(menu,new RegExp(label));
});

test('professional hub ships every focused section and independent save form',async()=>{
  const [page,feature]=await Promise.all([read('web/index.html'),read('web/qualifications-registration-v139.js')]);
  assert.match(page,/qualifications-registration-v139\.css/);
  assert.match(page,/australia-pathway-v139\.js/);
  assert.match(page,/qualifications-registration-v139\.js/);
  for(const section of ['Primary Qualification','Registration History','Practice History','Examinations & Assessments','English-Language Evidence','Supporting Documents'])assert.match(feature,new RegExp(section.replace('&','&')));
  for(const form of ['primary','registration','practice','assessment','english'])assert.match(feature,new RegExp(`data-qr-form="${form}"`));
  assert.match(feature,/data-edit-record/);assert.match(feature,/data-delete-record/);
});

test('Australia indication is isolated, conservative and uses only approved labels',async()=>{
  const service=await read('web/australia-pathway-v139.js');
  for(const label of ['Pathway 1','Pathway 2','Stream A','Stream B — Outcomes-Based Assessment','Qualification Assessment Required'])assert.match(service,new RegExp(label));
  for(const assessment of ['IQNM Self-check','Outcomes-Based Assessment — OBA','Multiple-choice question examination — MCQ','NCLEX-RN','Objective Structured Clinical Examination — OSCE','Orientation Part 1','Orientation Part 2'])assert.match(service,new RegExp(assessment));
  assert.match(service,/verifiedRulesConfigured: false/);
  assert.doesNotMatch(service,/Fast-track pathway|Direct registration route|Easy pathway|NCLEX-RN is required/);
});

test('migration stores multiple owner-only professional records with RLS',async()=>{
  const sql=await read('supabase/migrations/20260726080543_qualifications_registration_v139.sql');
  for(const table of ['btv_professional_profiles','btv_professional_registrations','btv_professional_practice_history','btv_professional_assessments'])assert.match(sql,new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql,/\(select auth\.uid\(\)\) = user_id/);
  assert.match(sql,/enable row level security/g);
  assert.match(sql,/on delete cascade/);
  assert.doesNotMatch(sql,/drop table|alter table public\.profiles/);
});

test('existing private document vault is reused and Journey destinations remain untouched',async()=>{
  const [feature,storage,index]=await Promise.all([read('web/qualifications-registration-v139.js'),read('web/storage-v21.js'),read('web/index.html')]);
  assert.match(feature,/btv-user-files/);assert.match(feature,/data-storage-open/);
  assert.match(storage,/BUCKET='btv-user-files'/);
  assert.doesNotMatch(feature,/\.storage\.from\([^)]*\)\.upload/);
  for(const code of ['uk','au','ca','nz','ie','us'])assert.match(index,new RegExp(`${code}:\\{name:`));
});

test('mobile styles remain single-column without forced horizontal hiding',async()=>{
  const css=await read('web/qualifications-registration-v139.css');
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/grid-template-columns:1fr/);
  assert.doesNotMatch(css,/width:\s*100vw|overflow-x:\s*hidden/);
});

test('professional hub uses the premium illustration and live section progress',async()=>{
  const [feature,css,index,menu,inbox]=await Promise.all([
    read('web/qualifications-registration-v139.js'),read('web/qualifications-registration-v139.css'),read('web/index.html'),read('web/profile-menu-v82.js'),read('web/manager-inbox-v26.js')
  ]);
  assert.match(feature,/qualifications-registration-hero\.jpg/);
  assert.match(feature,/function sectionProgress/);
  assert.match(feature,/--qr-progress:/);
  for(const label of ['Complete','In progress','Not started'])assert.match(feature,new RegExp(label));
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/qrProgress139/);
  assert.match(index,/premium-surfaces-v163\.css\?v=163/);
  assert.match(menu,/Help & support/);
  assert.match(menu,/BTVHelpSupport\?\.open/);
  assert.match(inbox,/from\('manager_requests'\)\.insert/);
});

test('qualification back is an explicit home return, not a stale screen-history replay',async()=>{
  const [feature,back]=await Promise.all([read('web/qualifications-registration-v139.js'),read('web/back-navigation-v108.js')]);
  assert.match(feature,/data-history-home/);
  assert.match(back,/function home\(\)\{[^}]*stack\.length=0/);
  assert.match(back,/closest\('\[data-history-home\]'\)/);
  assert.match(back,/window\.BTVGoHome=home/);
});
