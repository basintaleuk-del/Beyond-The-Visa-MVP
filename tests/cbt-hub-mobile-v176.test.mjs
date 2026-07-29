import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('CBT hub retains exact approved copy, actions and full disclaimer', async () => {
  const html = await read('web/exam-prep.html');
  assert.match(html, /YOUR CBT LEARNING HUB/);
  assert.match(html, /Prepare with confidence/);
  assert.match(html, /Move from focused practice to timed mock exams in one seamless learning space, with clear explanations and personalised progress\./);
  assert.match(html, /Start practising/);
  assert.match(html, /Mock exams/);
  assert.match(html, /View my progress/);
  assert.match(html, /Independent educational content/);
  assert.match(html, /They are not official examination questions and are not affiliated with or endorsed by Pearson VUE or any examination provider\./);
});

test('practice-bank figures stay dynamic and the existing routes remain connected', async () => {
  const [html, client] = await Promise.all([read('web/exam-prep.html'), read('web/exam-prep-v167.js')]);
  for (const id of ['bankQuestions', 'bankAccuracy', 'bankMocks', 'bankStart']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(client, /state\.bank\.catalog/);
  assert.match(client, /state\.dashboard\.overall_accuracy/);
  assert.match(client, /btv_exam_prep_study_sessions/);
  assert.match(client, /\$\('#heroStart'\)\.onclick=openBank/);
  assert.match(client, /\$\('#heroMocks'\)\.onclick=\(\)=>\$\('#mockChooser'\)\.showModal\(\)/);
  assert.match(html, /data-mock-tier="short"[\s\S]*30 questions[\s\S]*15 minutes[\s\S]*50/);
  assert.match(html, /data-mock-tier="full"[\s\S]*60 questions[\s\S]*30 minutes[\s\S]*100/);
  assert.match(client, /\$\('#bankStart'\)\.onclick=openBank/);
});

test('mobile layout has accessible tap targets, wrapping and a lightweight nurse asset', async () => {
  const [html, css, image] = await Promise.all([read('web/exam-prep.html'), read('web/exam-prep-v167.css'), stat('web/cbt-learning-hero-v176.webp')]);
  assert.match(html, /alt="Professional African female nurse in green scrubs holding a tablet"/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /\.heroActions\{display:grid/);
  assert.match(css, /overflow:hidden/);
  assert.ok(image.size < 100_000, `hero image should stay below 100 KB, received ${image.size}`);
});
