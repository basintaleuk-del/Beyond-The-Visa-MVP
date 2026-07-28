import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('home journey summary uses destination-scoped or synced steps', () => {
  const js = read('web/dashboard-premium-v73.js');
  assert.match(js, /const synced\s*=\s*window\.destinationSync\?\.snapshot\?\.\(\)\s*\|\|\s*null/);
  assert.match(js, /const scopedSteps\s*=\s*\(state\.steps \|\| \[\]\)\.filter/);
  assert.match(js, /applicable_professions/);
  assert.match(js, /const total\s*=\s*useSynced[\s\S]*syncedSteps\.length[\s\S]*scopedSteps\.length/);
});

test('recommended next step tile uses professional CTA structure', () => {
  const js = read('web/dashboard-premium-v73.js');
  const css = read('web/dashboard-premium-v73.css');
  const section = js.match(/<article class="panel73 recommendedPanel73">[\s\S]*?<\/article>/)?.[0] || '';
  assert.match(section, /Recommended next step/);
  assert.match(section, /Based on your current journey/);
  assert.match(section, />View plan<\/button>/);
  assert.match(section, /class="studyPlanCard73"/);
  assert.match(section, /RECOMMENDED NOW/);
  assert.match(section, /Continue today’s study plan/);
  assert.match(section, /Keep your learning streak moving forward\./);
  assert.match(section, /iconSvg\([\s\S]*"spark"/);
  assert.doesNotMatch(section, /arrowRight|nextActionBtn73|nextIcon73/);
  assert.match(css, /\.recommendedHead73 button\{[\s\S]*border:1\.5px solid #2f8f67/);
  assert.match(css, /\.studyPlanCard73\{[\s\S]*background:linear-gradient/);
});
