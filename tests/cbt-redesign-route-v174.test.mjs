import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(path,'utf8');

test('every standard CBT entry point opens the upgraded Exam Prep layout',async()=>{
  const [routes,learn,experience,page]=await Promise.all([
    read('web/feature-routes-v73.js'),read('web/learn-v90.js'),read('web/experience-v86.js'),read('web/cbt.html')
  ]);
  assert.match(routes,/id:'cbt'.*url:'exam-prep\.html'/);
  assert.match(learn,/id:'cbt'.*url:'exam-prep\.html'/);
  assert.match(experience,/choice\('cbt','exam-prep\.html'\)/);
  assert.match(page,/location\.replace\(`exam-prep\.html/);
});

test('the upgraded layout keeps the working CBT bank available as a fallback',async()=>{
  const [html,client,legacy]=await Promise.all([
    read('web/exam-prep.html'),read('web/exam-prep-v167.js'),read('web/cbt.html')
  ]);
  assert.match(html,/Prepare with confidence/);
  assert.match(html,/BTVExamPrepFallbackUrl='cbt\.html\?legacy=1'/);
  assert.match(client,/Open CBT practice bank/);
  assert.match(client,/function openFallback/);
  assert.match(legacy,/!p\.has\('legacy'\)&&!p\.has\('attempt'\)/);
  assert.match(legacy,/cbt\.js\?v=169/);
});
