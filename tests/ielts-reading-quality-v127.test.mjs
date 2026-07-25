import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(file,'utf8');

test('IELTS Academic reading bank avoids missing visual references and keeps standard types',()=>{
  const context={window:{}};
  vm.runInNewContext(read('web/ielts-academic-bank-v67.js'),context);
  const reading=context.window.BTVIELTSAcademic.bank('reading');
  assert.ok(reading.length>=500);
  const blocked=/\b(table|chart|graph|diagram|figure)\b/i;
  const standard=new Set(['multiple choice','True / False / Not Given','matching heading','sentence completion','short answer','Yes / No / Not Given','matching information','summary completion']);
  for(const item of reading){
    assert.doesNotMatch(item.prompt,blocked);
    assert.ok(standard.has(item.type),`Unexpected reading type: ${item.type}`);
  }
});
