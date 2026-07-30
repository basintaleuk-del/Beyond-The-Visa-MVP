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
  assert.match(html,/legal-centre-v196\.js\?v=212/);
  assert.match(html,/legal-centre-v196\.css\?v=212/);
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

test('legal centre stays inside the app and contains long privacy copy',()=>{
  assert.match(legal,/backButton\.dataset\.historyBack\s*=\s*'1'/);
  assert.doesNotMatch(legal,/history\.back\(\)/);
  assert.match(legalCss,/\.legalDocumentHead196>div/);
  assert.match(legalCss,/\.legalCopy196 p[^\{]*\{max-width:100%;overflow-wrap:anywhere\}/);
  assert.match(legalCss,/\.legalShell196>main>\.policyBody[^\{]*\{overflow:hidden\}/);
})

test('privacy policy has a premium ten-section guide and structured reading cards',()=>{
  assert.match(legal,/primaryHeadings\s*=\s*headings\.slice\(0,\s*10\)/);
  assert.match(legal,/class="legalPolicyMap212"/);
  assert.match(legal,/className\s*=\s*'legalPrivacyChapter212'/);
  assert.match(legal,/aria-label="Privacy Policy sections"/);
  assert.match(legalCss,/\.legalPolicyMap212 nav\{[^}]*grid-template-columns:repeat\(5/);
  assert.match(legalCss,/@media\(max-width:640px\)/);
})
