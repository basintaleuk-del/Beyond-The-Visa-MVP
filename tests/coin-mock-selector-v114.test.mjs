import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const coins=fs.readFileSync('web/beyond-coins-v112.js','utf8');
const access=fs.readFileSync('web/mock-access-v72.js','utf8');

test('mock purchase opens a 15 or 30 minute selector before purchase',()=>{
  assert.match(coins,/function chooseMock/);
  assert.match(coins,/CHOOSE YOUR MOCK/);
  assert.match(coins,/p\.duration_minutes}-minute mock/);
  assert.ok(coins.includes('product(`${prefix}_short`)'));
  assert.ok(coins.includes('product(`${prefix}_full`)'));
  assert.match(coins,/No coins were deducted/);
  assert.match(access,/BTVCoins\.chooseMock/);
});

test('selected duration controls the authoritative product code and route',()=>{
  assert.match(coins,/data-mock-choice/);
  assert.match(coins,/start\(code/);
  assert.match(access,/selectedCode/);
  assert.match(access,/route\(selectedCode,attempt\)/);
});
