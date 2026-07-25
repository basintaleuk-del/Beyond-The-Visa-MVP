import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('dashboard menu groups render as standalone sections without accordion toggles', () => {
  const js = read('web/dashboard-premium-v73.js');
  assert.match(js, /class="menuSectionTitle73"/);
  assert.doesNotMatch(js, /class="menuGroupToggle73"/);
  assert.match(js, /function setupMenuGroups\(\) \{\}/);
});

test('wallet route opens custom beyond coins centre with nested details', () => {
  const js = read('web/dashboard-premium-v73.js');
  const css = read('web/dashboard-premium-v73.css');
  assert.match(js, /if \(id === "wallet"\) return openCoinsCentre\(\);/);
  assert.match(js, /data-coin-detail="earning"/);
  assert.match(js, /function openCoinDetail\(key\)/);
  assert.match(css, /\.coinsCentrePanel73:before\{/);
  assert.match(css, /background:url\("beyond-coin-v84\.png"\)/);
});
