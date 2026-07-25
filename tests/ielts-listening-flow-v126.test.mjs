import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('Dashboard IELTS marks listening and speaking as coming soon',()=>{
  const script=read('web/release-v67.js');
  assert.match(script,/listening','Listening','Marked as coming soon/);
  assert.match(script,/speaking','Speaking','Marked as coming soon/);
  assert.match(script,/renderComingSoon\(state\.section\)/);
});

test('Dashboard IELTS reading remains available',()=>{
  const script=read('web/release-v67.js');
  assert.match(script,/if\(!hasAccess\(state\.section\)&&!\['listening','speaking'\]\.includes\(state\.section\)\)/);
  assert.doesNotMatch(script,/Listening audio-first/);
});
