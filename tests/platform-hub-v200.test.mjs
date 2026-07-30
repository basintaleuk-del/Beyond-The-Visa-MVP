import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync('web/platform-upgrade-v72.js','utf8');
const css=fs.readFileSync('web/platform-upgrade-v72.css','utf8');
const profileMenu=fs.readFileSync('web/profile-menu-v82.js','utf8');
const headerMenu=fs.readFileSync('web/header-experience-v83.js','utf8');
const index=fs.readFileSync('web/index.html','utf8');
const experience=fs.readFileSync('web/experience-v85-home.js','utf8');

test('Platform Hub retains all seven established destinations',()=>{
  for(const tab of ['wallet','journey','analytics','jobs','notifications','stories','mentors']) assert.match(js,new RegExp(`'${tab}'`));
  assert.match(js,/hubPrimaryNav200/);
  assert.match(js,/aria-current="page"/);
});

test('previously incomplete career actions now open their full experiences',()=>{
  assert.match(js,/btvOpenJobDetail/);
  assert.match(js,/BTVFeatures\?\.open\?\.\('jobs'\)/);
  assert.match(js,/BTVFeatures\?\.open\?\.\('mentors'\)/);
  assert.match(js,/data-mentor/);
  assert.match(js,/data-market/);
});

test('saved jobs support both safe save and remove operations',()=>{
  assert.match(js,/from\('btv_saved_jobs'\)\.delete\(\)/);
  assert.match(js,/from\('btv_saved_jobs'\)\.upsert/);
  assert.doesNotMatch(js,/from\('btv_wallets'\)\.update/);
});

test('premium hub is responsive and accessible without changing global navigation',()=>{
  assert.match(css,/grid-template-columns:260px minmax\(0,1fr\)/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/:focus-visible/);
  assert.match(js,/event\.key==='Escape'/);
});

test('Platform Hub 211 prevents stale phone and wallet layouts on learning progress',()=>{
  assert.match(index,/platform-upgrade-v72\.css\?v=211/);
  assert.match(index,/platform-upgrade-v72\.js\?v=211/);
  assert.match(js,/h\.dataset\.hubTab=tab/);
  assert.match(js,/sub\.innerHTML=''/);
  assert.match(js,/sub\.hidden=tab!=='wallet'/);
  assert.match(css,/walletShell85:not\(\[data-hub-tab="wallet"\]\)/);
  assert.match(css,/width:min\(1560px,calc\(100vw - 32px\)\)/);
  assert.match(experience,/hub\.dataset\.hubTab==='wallet'/);
});

test('phone view exposes one accessible working sections menu',()=>{
  assert.match(js,/hubMobileToggle200/);
  assert.match(js,/aria-controls="hubPrimaryNav200"/);
  assert.match(js,/aria-expanded/);
  assert.match(css,/#platformHubV72\.hubMobileOpen211 \.hubPrimaryNav200\{display:grid!important\}/);
  assert.match(css,/@media\(max-width:440px\)/);
});

test('account and header menus no longer target retired member-centre panes',()=>{
  assert.match(profileMenu,/open\?\.\('notifications'\)/);
  assert.match(profileMenu,/open\?\.\('mentors'\)/);
  assert.match(profileMenu,/open\?\.\('study'\)/);
  assert.match(profileMenu,/open\?\.\('resources'\)/);
  assert.doesNotMatch(profileMenu,/data-btv-pane/);
  assert.doesNotMatch(headerMenu,/data-btv-pane/);
});
