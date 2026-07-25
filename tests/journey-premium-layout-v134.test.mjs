import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(file)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('My Journey keeps the premium desktop shell instead of the legacy narrow page',()=>{
  const css=read('web/journey-polish-v101.css');
  const js=read('web/journey-polish-v101.js');
  assert.match(js,/installPremiumShell/);
  assert.match(js,/#dashboardV3 \.sidebar73/);
  assert.match(css,/grid-template-columns:286px minmax\(0,1fr\)/);
  assert.match(css,/width:min\(1360px,calc\(100% - 48px\)\)/);
  assert.match(css,/#checklistItems\.checklist\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('My Journey remains responsive when the premium sidebar collapses',()=>{
  const css=read('web/journey-polish-v101.css');
  assert.match(css,/@media\(max-width:1090px\)/);
  assert.match(css,/journeySidebar101\{display:none\}/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*grid-template-columns:1fr/);
});
