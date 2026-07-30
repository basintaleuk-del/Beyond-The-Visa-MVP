import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const index=read('web/index.html');
const admin=read('web/admin.html');
const platform=read('web/platform-upgrade-v72.js');
const client=read('web/success-stories-v198.js');
const clientCss=read('web/success-stories-v198.css');
const adminJs=read('web/admin-success-stories-v198.js');
const adminCss=read('web/admin-success-stories-v198.css');
const migration=read('supabase/migrations/20260730080000_success_stories_v198.sql');

test('success stories are integrated through the existing platform route',()=>{
  assert.match(platform,/window\.BTVSuccessStories\?\.render/);
  assert.match(platform,/storiesHub198/);
  assert.ok(index.indexOf('success-stories-v198.js')<index.indexOf('platform-upgrade-v72.js'));
  assert.match(index,/success-stories-v198\.css\?v=208/);
  assert.match(index,/success-stories-v198\.js\?v=208/);
  assert.match(index,/platform-upgrade-v72\.js\?v=211/);
});

test('every authenticated member receives a complete moderated submission flow',()=>{
  assert.match(client,/data-submit-story/);
  assert.match(client,/data-story-form/);
  assert.match(client,/minlength="120"/);
  assert.match(client,/btv_submit_success_story/);
  assert.match(client,/status:'review',featured:false,submitted_by:user\.id/);
  assert.doesNotMatch(client,/status:'approved',featured:false,submitted_by:user\.id/);
  assert.match(client,/My submissions/);
  assert.match(client,/data-story-detail/);
});

test('database submission cannot self-publish and derives ownership from auth',()=>{
  assert.match(migration,/submitted_by = auth\.uid\(\)/);
  assert.match(migration,/and status = 'review'/);
  assert.match(migration,/and featured = false/);
  assert.match(migration,/v_user uuid := auth\.uid\(\)/);
  assert.match(migration,/v_timeline, 'review', false, v_user/);
  assert.match(migration,/revoke all on function public\.btv_submit_success_story/);
});

test('admin moderation is protected and connected to the existing menu',()=>{
  assert.ok(admin.indexOf('admin-phase7.js')<admin.indexOf('admin-success-stories-v198.js'));
  assert.match(adminJs,/\[data-tab="storiesAdmin"\]/);
  assert.match(adminJs,/Success Story Centre/);
  assert.match(adminJs,/data-story-admin-filter/);
  assert.match(adminJs,/Approve & publish/);
  assert.match(adminJs,/btv_admin_review_success_story/);
  assert.match(migration,/not public\.btv_is_admin\(\)/);
});

test('premium client and admin layouts are responsive and accessible',()=>{
  assert.match(clientCss,/@media\(max-width:560px\)/);
  assert.match(clientCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(clientCss,/\.storyGrid198/);
  assert.match(client,/aria-label="Search success stories"|<span class="srOnly">Search success stories/);
  assert.match(client,/role="status"/);
  assert.match(client,/successStoriesPage208/);
  assert.match(client,/window\.BTVSuccessStories=\{render,open,close:closePage\}/);
  assert.match(platform,/tab==='stories'&&window\.BTVSuccessStories\?\.open/);
  assert.match(clientCss,/\.successStoriesPage208/);
  assert.match(adminCss,/@media\(max-width:720px\)/);
  assert.match(adminCss,/\.storyAdminMetrics198/);
  assert.match(adminJs,/aria-label="Close"/);
});
