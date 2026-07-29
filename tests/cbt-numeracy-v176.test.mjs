import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Numeracy Studio routes from Learn and exposes the three requested session choices', async () => {
  const [html, learn, routes] = await Promise.all([read('web/numeracy.html'), read('web/learn-v90.js'), read('web/feature-routes-v73.js')]);
  assert.match(learn, /url:'numeracy\.html'/);
  assert.match(routes, /target:\{url:'numeracy\.html'\}/);
  assert.match(html, /Ten focused calculations/);
  assert.match(html, /30 questions · 15 minutes/);
  assert.match(html, /60 questions · 30 minutes/);
  assert.match(html, /data-start-paid="numeracy_short"/);
  assert.match(html, /data-start-paid="numeracy_full"/);
});

test('calculator is part of every rendered question and Next remains explicit', async () => {
  const [html, js] = await Promise.all([read('web/numeracy.html'), read('web/numeracy-v176.js')]);
  const question = html.indexOf('id="questionText"');
  const calculator = html.indexOf('class="numCalculator"');
  const answer = html.indexOf('id="answerForm"');
  assert.ok(question > -1 && calculator > question && answer > calculator);
  assert.match(html, /id="nextQuestion"[^>]+hidden/);
  assert.doesNotMatch(js, /setTimeout\([^)]*(next|nextFree|renderQuestion)/);
  assert.match(js, /Answer saved[\s\S]*choose Next/);
});

test('migration builds a private 3,000-question bank and real coin products', async () => {
  const sql = await read('supabase/migrations/20260729213000_cbt_numeracy_hub_v176.sql');
  assert.match(sql, /generate_series\(1,3000\)/);
  assert.match(sql, /revoke all on public\.btv_numeracy_questions from anon, authenticated/);
  assert.match(sql, /'numeracy_short'[\s\S]*50,15,30/);
  assert.match(sql, /'numeracy_full'[\s\S]*100,30,60/);
  assert.match(sql, /btv_use_free_practice\('numeracy'\)/);
  assert.match(sql, /btv_numeracy_questions'\)/);
  assert.match(sql, /abs\(\(trim\(both/);
});

test('clinical visuals are compact deterministic diagrams, not answer-bearing assets', async () => {
  const [html, js, css] = await Promise.all([read('web/numeracy.html'), read('web/numeracy-v176.js'), read('web/numeracy-v176.css')]);
  assert.match(html, /canvas id="clinicalVisual" width="640" height="210"/);
  for (const type of ['syringe', 'medicine_cup', 'iv_bag', 'fluid_chart']) assert.match(js, new RegExp(type));
  assert.match(css, /max-height:190px/);
});
