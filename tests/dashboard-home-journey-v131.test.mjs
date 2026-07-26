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
  assert.match(js, /class="nextCopy73"/);
  assert.match(js, /class="nextActionBtn73"/);
  assert.match(css, /\.nextActionBtn73\{/);
  assert.match(css, /\.nextTag73\{/);
});
