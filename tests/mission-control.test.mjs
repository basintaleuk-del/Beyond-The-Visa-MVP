import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('v71 presentation replaces Mission Control without deleting its source', () => {
  const html = read('web/index.html');
  assert.doesNotMatch(html, /mission-control-v76\.css/);
  assert.doesNotMatch(html, /mission-control-v76\.js/);
  assert.match(html, /release-v71\.css\?v=88/);
  assert.match(html, /release-v71\.js\?v=88/);
  assert.doesNotMatch(html, /dashboard-reference-v74/);
});
test('Mission Control source remains scoped for future use', () => {
  const js = read('web/mission-control-v76.js');
  const css = read('web/mission-control-v76.css');
  assert.doesNotMatch(js, /tile73|dashGrid73|#appShell>nav/);
  assert.doesNotMatch(css, /#appShell\s*>\s*nav|\.dashGrid73|\.tile73/);
});