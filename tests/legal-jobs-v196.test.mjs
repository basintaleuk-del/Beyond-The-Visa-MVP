import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('web/index.html');
const legal=read('web/legal-centre-v196.js');
const legalCss=read('web/legal-centre-v196.css');
const jobsCss=read('web/job-title-containment-v196.css');

test('job titles remain inside NHS and USA cards and detail headers',()=>{
  assert.match(html,/job-title-containment-v196\.css\?v=196/);
  assert.match(jobsCss,/\.nhsJob148 h3/);
  assert.match(jobsCss,/\.nhsJobDetail150 header h1/);
  assert.match(jobsCss,/\.usaJob155 h3/);
  assert.match(jobsCss,/\.usaJobDetail155 header h1/);
  assert.match(jobsCss,/overflow-wrap:\s*anywhere/);
  assert.match(jobsCss,/max-width:\s*100%/);
  assert.match(jobsCss,/min-width:\s*0/);
})

test('legal centre records terms, privacy acknowledgement and necessary storage separately',()=>{
  assert.match(html,/legal-centre-v196\.js\?v=196/);
  assert.match(html,/legal-centre-v196\.css\?v=196/);
  assert.match(legal,/terms_status:\s*'accepted'/);
  assert.match(legal,/privacy_status:\s*'acknowledged'/);
  assert.match(legal,/cookie_status:\s*'necessary_only'/);
  assert.match(legal,/analytics:\s*false/);
  assert.match(legal,/advertising:\s*false/);
  assert.match(legal,/auth\.updateUser/);
  assert.doesNotMatch(legal,/privacy_status:\s*'accepted'/);
})

test('legal centre is responsive, accessible and stops its bootstrap observer',()=>{
  assert.match(legal,/role="tablist"/);
  assert.match(legal,/role="tabpanel"/);
  assert.match(legal,/aria-live="polite"/);
  assert.match(legal,/observer\.disconnect\(\)/);
  assert.match(legalCss,/@media\s*\(max-width:\s*780px\)/);
  assert.match(legalCss,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(legalCss,/:focus-visible/);
  assert.ok(fs.existsSync(path.join(root,'web/cookie-policy.html')));
})
