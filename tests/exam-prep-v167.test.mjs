import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const foundation=await read('supabase/migrations/202607281900_exam_prep_foundation_v167.sql');
const seed=await read('supabase/migrations/202607281901_exam_prep_demo_seed_v167.sql');
const adminMigration=await read('supabase/migrations/202607281902_exam_prep_admin_workflow_v167.sql');
const html=await read('web/exam-prep.html');
const js=await read('web/exam-prep-v167.js');
const css=await read('web/exam-prep-v167.css');
const routes=await read('web/feature-routes-v73.js');

test('creates the ten requested equivalent data models',()=>{
 for(const name of ['exams','topics','questions','answer_options','study_sessions','session_questions','user_question_progress','saved_questions','user_exam_progress','question_reports'])assert.match(foundation,new RegExp(`create table if not exists public\\.btv_exam_prep_${name}`));
});

test('enables RLS and confines learner records to auth.uid()',()=>{
 assert.equal((foundation.match(/enable row level security/g)||[]).length,11);
 for(const name of ['sessions_own','question_progress_own','saved_own','exam_progress_own','reports_own'])assert.match(foundation,new RegExp(`exam_prep_${name}`));
 assert.match(foundation,/user_id=auth\.uid\(\)/);
});

test('never exposes answer correctness in the initial question payload',()=>{
 const safeFunction=foundation.slice(foundation.indexOf('create or replace function public.btv_exam_prep_session_question'),foundation.indexOf('create or replace function public.btv_submit_exam_prep_answer'));
 assert.doesNotMatch(safeFunction,/is_correct|option_rationale|correct_answer/);
 assert.match(foundation,/revoke all on public\.btv_exam_prep_questions, public\.btv_exam_prep_answer_options from anon, authenticated/);
});

test('uses server-side session selection without duplicates',()=>{
 assert.match(foundation,/unique\(session_id, question_id\)/);
 assert.match(foundation,/q\.is_active and q\.review_status='published'/);
 assert.match(foundation,/coalesce\(up\.mastery_score,0\)/);
 assert.match(foundation,/up\.last_attempted_at is null/);
});

test('supports secure single and multiple-response scoring',()=>{
 assert.match(foundation,/question_type in \('single','multiple_response'\)/);
 assert.match(foundation,/array_agg\(id order by id\).*is_correct/s);
 assert.match(foundation,/v_selected.*=.*v_correct/s);
});

test('mock answers remain hidden until completion and review',()=>{
 assert.match(foundation,/if v_s\.mode='mock' then return jsonb_build_object\('recorded',true\)/);
 assert.match(foundation,/btv_exam_prep_review_session/);
 assert.match(foundation,/SESSION_NOT_COMPLETED/);
 assert.match(js,/finishSession\(true\)/);
});

test('daily practice is stable for one user, exam and date',()=>{
 assert.match(foundation,/unique\(user_id, exam_id, mode, practice_date\)/);
 assert.match(foundation,/if p_mode='daily'/);
 assert.match(js,/startDaily/);
});

test('seed contains thirty original demonstrations and no provider scraping',()=>{
 assert.match(seed,/content_kind='unofficial_sample'/);
 assert.match(seed,/limit 10[\s\S]*limit 10/);
 const seedValues=seed.slice(seed.indexOf('with seeds('),seed.indexOf('), inserted as (',seed.indexOf('with seeds(')));
 const additional=(seedValues.match(/^ \('/gm)||[]).length;
 assert.equal(additional,10);
 assert.match(seed,/'demonstration_seed','draft'/);
 assert.doesNotMatch(seed,/scrape|leaked|recalled question/i);
});

test('admin AI and bulk imports are validation-only before confirmation',()=>{
 assert.match(adminMigration,/p_commit boolean default false/);
 assert.match(adminMigration,/ai_assisted_draft/);
 assert.match(adminMigration,/QUESTION_MUST_BE_APPROVED_FIRST/);
 assert.match(adminMigration,/btv_exam_prep_audit_log/);
});

test('learner UI includes modes, accessibility, Zibur, progress and disclaimers',()=>{
 for(const text of ['Quick Practice','Topic Practice','Timed Mock Exam','Review Mistakes','Saved Questions','Adaptive Practice'])assert.match(html,new RegExp(text));
 assert.match(js,/Ask Zibur/);
 assert.match(html,/They are not official examination questions/);
 assert.match(html,/aria-live="assertive"|aria-live="polite"/);
 assert.match(js,/zibur-gemini/);
 assert.match(js,/question_reported/);
});

test('responsive design covers narrow phones, dark mode and reduced motion',()=>{
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/body\.dark/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/overflow-x:hidden/);
});

test('Exam Prep is a primary feature without replacing existing routes',()=>{
 assert.match(routes,/id:'exam-prep'.*category:'main'.*exam-prep\.html/);
 for(const id of ['dashboard','study','jobs','assistant','mentors'])assert.match(routes,new RegExp(`id:'${id}'`));
});
