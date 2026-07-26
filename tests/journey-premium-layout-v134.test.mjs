import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(file)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('My Journey keeps the premium desktop shell instead of the legacy narrow page',()=>{
  const css=read('web/journey-polish-v101.css');
  const js=read('web/journey-polish-v101.js');
  const html=read('web/index.html');
  const worker=read('web/sw.js');
  assert.match(js,/installPremiumShell/);
  assert.match(js,/__btvJourneyPolish134/);
  assert.match(js,/#dashboardV3 \.sidebar73/);
  assert.match(html,/journey-polish-v101\.css\?v=134/);
  assert.match(html,/journey-polish-v101\.js\?v=134/);
  assert.match(worker,/beyond-the-visa-assets-v134/);
  assert.match(css,/grid-template-columns:286px minmax\(0,1fr\)/);
  assert.match(css,/width:min\(1360px,calc\(100% - 48px\)\)/);
  assert.match(css,/#checklistItems\.checklist\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('My Journey remains responsive when the premium sidebar collapses',()=>{
  const css=read('web/journey-polish-v101.css');
  const laptop=read('web/journey-layout-v135.css');
  const html=read('web/index.html');
  assert.match(css,/@media\(max-width:1090px\)/);
  assert.match(css,/journeySidebar101\{display:none\}/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*grid-template-columns:1fr/);
  assert.match(laptop,/@media\(max-width:1279px\)/);
  assert.match(laptop,/journeySidebar101\{display:none\}/);
  assert.match(laptop,/#checklist\{width:calc\(100% - 28px\)/);
  assert.match(html,/journey-layout-v135\.css\?v=135/);
});
