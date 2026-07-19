import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync('web/index.html', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

test('release scripts expose repeatable verification', () => {
  assert.match(packageJson.scripts.test, /node --test/);
  assert.match(packageJson.scripts.qa, /qa-release-audit/);
  assert.match(packageJson.scripts.verify, /build:web/);
});

test('security controls remain in the production shell', () => {
  assert.match(index, /Content-Security-Policy/);
  assert.match(index, /security-hardening-v80\.js/);
  assert.match(index, /<meta name=\"referrer\" content=\"strict-origin-when-cross-origin\">/);
});

test('bottom navigation is preserved through release QA', () => {
  for (const label of ['Home', 'Journey', 'Ask Zibur', 'Learn', 'Costs']) assert.ok(index.includes(label), label);
});
