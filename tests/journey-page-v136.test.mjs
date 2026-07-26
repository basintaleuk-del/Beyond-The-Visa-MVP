import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(file)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('My Journey has one authoritative full-width page without the legacy shell',()=>{
  const css=read('web/journey-page-v136.css');
  const js=read('web/journey-page-v136.js');
  const html=read('web/index.html');
  assert.match(js,/__btvJourneyPage136/);
  assert.doesNotMatch(js,/installPremiumShell|sidebar73|journeyLayout101|journeySidebar101/);
  assert.equal((html.match(/journey-page-v136\.css\?v=136/g)||[]).length,1);
  assert.equal((html.match(/journey-page-v136\.js\?v=136/g)||[]).length,1);
  assert.doesNotMatch(html,/journey-polish-v101|journey-layout-v135/);
  assert.match(css,/#checklist \{[\s\S]*width: 100%;[\s\S]*max-width: 1600px;[\s\S]*min-width: 0;[\s\S]*margin-inline: auto;/);
  assert.doesNotMatch(css,/journeyLayout101|journeySidebar101|grid-template-columns:\s*286px/);
  assert.match(css,/#checklistItems\.checklist \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css,/#checklistItems\.checklist\.jgChecklistSurface \{ display: block; \}/);
  assert.match(css,/#checklistItems\.jgChecklistSurface \.jgTiles \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});

test('My Journey uses responsive card columns without reserving a sidebar',()=>{
  const css=read('web/journey-page-v136.css');
  assert.match(css,/@media \(max-width: 1279px\)[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css,/@media \(max-width: 760px\)[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(css,/overflow-x:\s*hidden|#checklist\s*\{[^}]*transform|#checklist\s*\{[^}]*width:\s*(?:4\d|5\d)%/);
});
