import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync('web/admin-phase7.js','utf8');
const css=fs.readFileSync('web/admin-mentor-centre-v195.css','utf8');
const html=fs.readFileSync('web/admin.html','utf8');

test('mentor operations centre uses existing production records',()=>{
  for(const table of ['btv_mentors','btv_mentor_bookings','btv_mentor_availability','btv_mentor_reviews']) assert.match(js,new RegExp(`from\\('${table}'\\)`));
  assert.match(js,/Mentor Operations Centre/);
  assert.match(js,/Network quality/);
  assert.match(js,/Open slots/);
});

test('mentor governance preserves audited profile actions without wallet mutations',()=>{
  assert.match(js,/data-mentor-edit/);
  assert.match(js,/data-state="\$\{v\}"/);
  assert.match(js,/Financial controls protected/);
  assert.doesNotMatch(js,/btv_wallets.*update|btv_wallet_transactions.*insert/s);
});

test('mentor admin release is loaded and responsive',()=>{
  assert.match(html,/admin-mentor-centre-v195\.css\?v=195/);
  assert.match(html,/admin-phase7\.js\?v=202/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/prefers-reduced-motion/);
});

test('mentor navigation repairs handlers removed by later admin renders',()=>{
  assert.match(js,/button\.onclick=\(\)=>activate\(id,label,load\)/);
  assert.match(js,/button\.dataset\.phase7Wired='true'/);
  assert.doesNotMatch(js,/!nav\|\|!main\|\|\$\(`\[data-tab=/);
});
