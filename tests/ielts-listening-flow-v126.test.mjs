import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('IELTS listening now uses guided readiness flow',()=>{
  const script=read('web/release-v67.js');
  assert.match(script,/Are you ready for your IELTS Listening\?/);
  assert.match(script,/Yes, I am ready/);
  assert.match(script,/Start my listening test/);
  assert.match(script,/LISTENING_INSTRUCTION_SET='ielts-listening-test-instructions'/);
});

test('Listening playback runs in blank-screen mode without media controls',()=>{
  const script=read('web/release-v67.js');
  const css=read('web/release-v67.css');
  assert.match(script,/class="ieltsListeningBlank"/);
  assert.doesNotMatch(script,/controls=/);
  assert.match(css,/\.ieltsListeningBlank\{/);
});
