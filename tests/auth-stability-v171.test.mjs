import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'web/sw.js'),'utf8');

test('Supabase auth callbacks return before profile queries begin',()=>{
  assert.match(html,/onAuthStateChange\(\(event,session\)=>\{/);
  assert.match(html,/onAuthStateChange[\s\S]*setTimeout\(\(\)=>\{/);
  assert.doesNotMatch(html,/onAuthStateChange\(async/);
});

test('password login and initial session lookup have bounded recovery',()=>{
  assert.match(html,/authDeadline\(window\.btvSupabase\.auth\.signInWithPassword/);
  assert.match(html,/authDeadline\(window\.btvSupabase\.auth\.getSession/);
  assert.match(html,/finally\{button\.disabled=false;button\.textContent='Sign in'\}/);
});

test('profile and destination hydration cannot block an authenticated user',()=>{
  assert.match(html,/authDeadline\(window\.btvSupabase\.from\('profiles'\)/);
  assert.match(html,/Destination hydration continued in the background/);
  assert.match(html,/setVisible\(document\.getElementById\('appShell'\),true\)[\s\S]*await destinationHydration/);
  assert.match(html,/resumeAuthenticatedSession/);
});

test('switching accounts cannot reuse another users cached profile',()=>{
  assert.match(html,/if\(!sameUser\)localStorage\.removeItem\('btv-profile'\)/);
  assert.match(html,/activeAuthUserId=null/);
});

test('navigation retries before showing a self-recovering offline screen',()=>{
  assert.match(worker,/async function networkDocument/);
  assert.match(worker,/cache:'reload'/);
  assert.match(worker,/setTimeout\(retry,3000\)/);
  assert.match(worker,/addEventListener\('online',retry\)/);
  assert.match(worker,/Cache-Control':'no-store/);
});
