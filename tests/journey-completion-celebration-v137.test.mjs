import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');

test('celebration is lazy-loaded only after a journey step is saved as completed',async()=>{
  const client=await read('web/journey-guidance-v133.js');
  const saveStart=client.indexOf('async function saveProgress');
  const saveEnd=client.indexOf('async function saveChecklist',saveStart);
  const save=client.slice(saveStart,saveEnd);
  assert.match(save,/const before=progressFor\(step\.code\)/);
  assert.ok(save.indexOf("upsert(row")<save.indexOf('const totals=summary()'));
  assert.ok(save.indexOf('if(error)throw error')<save.indexOf('celebrateStepCompletion(step,before,data)'));
  assert.match(client,/isCompleted\(before\)\|\|!isCompleted\(after\)/);
  assert.match(client,/import\('\.\/journey-celebration-v137\.js\?v=137'\)/);
});

test('a user, destination and step-specific marker prevents repeat celebrations',async()=>{
  const client=await read('web/journey-guidance-v133.js');
  assert.match(client,/btv:journey-step-celebrated:/);
  assert.match(client,/destination.*step\.code/s);
  assert.match(client,/localStorage\.getItem\(key\)==='1'/);
  assert.match(client,/localStorage\.setItem\(key,'1'\)/);
  assert.match(client,/if\(celebrationLoading\)return celebrationLoading/);
});

test('celebration is lightweight, dismissible and cleans up every resource',async()=>{
  const module=await read('web/journey-celebration-v137.js');
  assert.match(module,/const count=matchMedia\('\(max-width: 640px\), \(max-height: 500px\)'\)\.matches\?18:28/);
  assert.match(module,/duration=5200/);
  assert.match(module,/clearTimeout\(timer\)/);
  assert.match(module,/removeEventListener\('visibilitychange',visibility\)/);
  assert.match(module,/root\.remove\(\)/);
  assert.match(module,/close\.addEventListener\('click',cleanup,\{once:true\}\)/);
  assert.doesNotMatch(module,/requestAnimationFrame|canvas|confetti|lottie|setInterval/);
});

test('reduced motion and accessibility contracts are present',async()=>{
  const module=await read('web/journey-celebration-v137.js');
  assert.match(module,/prefers-reduced-motion: reduce/);
  assert.match(module,/if\(!reduced\)/);
  assert.match(module,/setAttribute\('role','status'\)/);
  assert.match(module,/setAttribute\('aria-live','polite'\)/);
  assert.match(module,/aria-label','Dismiss celebration/);
  assert.match(module,/document\.hidden/);
  assert.match(module,/is-paused/);
  assert.match(module,/Amazing\. Keep it up\./);
});
