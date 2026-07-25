import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('Standalone IELTS labels listening and speaking as coming soon',()=>{
  const html=read('web/ielts.html');
  const js=read('web/ielts-centre-v103.js');
  assert.match(html,/ielts-centre-v103\.js\?v=128/);
  assert.match(js,/listening:\{icon:'LI',title:'Listening',copy:'Coming soon\.'/);
  assert.match(js,/speaking:\{icon:'SP',title:'Speaking',copy:'Coming soon\.'/);
  assert.match(js,/if\(\['listening','speaking'\]\.includes\(section\)\)/);
});
