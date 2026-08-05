import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');

test('first-visit introduction explains a safe starting sequence',async()=>{
  const js=await read('web/release-v66.js');
  for(const phrase of ['Confirm your profile','Open Journey','Save real progress','Use the supporting tools','responsible regulator or government authority'])assert.match(js,new RegExp(phrase));
  assert.match(js,/btv-welcome-v67:/);
  assert.match(js,/preload="none"/);
});

test('guided walkthrough covers the live member workflow',async()=>{
  const js=await read('web/release-v66.js');
  for(const title of ['Start from Home','Keep your profile accurate','Use Journey as your main plan','Explore opportunities carefully','Prepare in Learning','Build a realistic cost plan','Ask Zibur for direction','Stay on top of updates','You can always get help'])assert.match(js,new RegExp(title));
  assert.match(js,/nav \[data-open="checklist"\]/);
  assert.doesNotMatch(js,/data-open="journey"/);
  assert.match(js,/data-back/);
  assert.match(js,/event\.key==='Escape'/);
});

test('walkthrough assets use the refreshed cache version',async()=>{
  const html=await read('web/index.html');
  assert.match(html,/welcome-walkthrough-v67\.css\?v=67/);
  assert.match(html,/release-v66\.js\?v=67/);
});
