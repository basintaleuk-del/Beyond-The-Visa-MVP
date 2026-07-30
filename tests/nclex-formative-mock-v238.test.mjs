import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const page=read('web/nclex.html');
const client=read('web/nclex.js');
const service=read('web/coin-exam-service-v87.js');
const access=read('web/mock-access-v72.js');
const edge=read('supabase/functions/exam-attempt/index.ts');
const migration=read('supabase/migrations/20260730235000_nclex_formative_mock_feedback.sql');

test('NCLEX Start mock actions use one native checkout path and route into the paid attempt',()=>{
  assert.equal((page.match(/data-nclex-mock-launch="1"/g)||[]).length,2);
  assert.match(client,/function launchMockCheckout/);
  assert.match(client,/BTVCoins\.chooseMock\('nclex'/);
  assert.match(client,/attempt=\$\{encodeURIComponent\(attempt\.attempt_id\)\}/);
  assert.match(access,/b\.dataset\.nclexMockLaunch==='1'/);
  assert.doesNotMatch(client,/\$\('startMock'\)\.onclick=startMock/);
});

test('mock answers reveal feedback and require an explicit Next action',()=>{
  assert.match(client,/mode==='mock'\?'<button class="next" type="button" hidden>Next question<\/button>'/);
  assert.match(client,/markAnswer\(box,reviewed,choices,true\);showMockNext\(box,ok\)/);
  assert.match(client,/if\(mode==='mock'\)\{showMockNext\(\$\('mockCard'\),ok\);return\}/);
  assert.match(client,/Correct answer: \$\{esc\(correct\.join\(', '\)\)\}/);
  assert.match(client,/next\.onclick=\(\)=>\{next\.disabled=true;advanceSession\('mock',ok\)\}/);
  assert.doesNotMatch(client,/setTimeout\(\(\)=>advanceSession\(mode,false\),180\)/);
});

test('paid feedback is checked server-side for only the submitted NCLEX attempt question',()=>{
  assert.match(service,/async function reviewAnswer/);
  assert.match(edge,/action==='review'/);
  assert.match(edge,/btv_review_nclex_mock_answer/);
  assert.match(migration,/and user_id=v_user/);
  assert.match(migration,/v_attempt\.status<>'active'/);
  assert.match(migration,/v_attempt\.question_source<>'nclex_questions'/);
  assert.match(migration,/question_id=p_question_id/);
  assert.match(migration,/set selected_answer=p_selected/);
  assert.match(migration,/'correct_options',to_jsonb\(v_correct\)/);
  assert.match(migration,/grant execute on function public\.btv_review_nclex_mock_answer\(uuid,text,jsonb\) to authenticated,service_role/);
});
