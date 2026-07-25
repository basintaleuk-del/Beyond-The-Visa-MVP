import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('Standalone IELTS page uses listening readiness flow',()=>{
  const html=read('web/ielts.html');
  const js=read('web/ielts-centre-v103.js');
  assert.match(html,/ielts-centre-v103\.js\?v=126/);
  assert.match(js,/Are you ready for your IELTS Listening\?/);
  assert.match(js,/Start my listening test/);
  assert.doesNotMatch(js,/practice transcript/);
});
