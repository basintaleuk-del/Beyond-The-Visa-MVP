import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const html=read('web/admin.html');
const admin=read('web/admin-user-management-v303.js');
const tracker=read('web/user-activity-v303.js');
const css=read('web/admin-user-management-v303.css');
const sql=read('supabase/migrations/20260801190924_admin_user_engagement_analytics.sql');

test('one final admin user console is loaded',()=>{
  assert.match(html,/admin-user-management-v303\.css/);
  assert.match(html,/defer src="admin-user-management-v303\.js/);
  assert.match(admin,/users:'cmsUsers'/);
  assert.match(admin,/coinsV86:'coinsCentre112'/);
  assert.match(admin,/globalJobsAdmin168:'opportunityAdmin138'/);
  assert.match(admin,/seen\.has\(id\)/);
  assert.match(admin,/if\(users\.textContent!==\x27User management\x27\)users\.textContent=/);
  assert.match(admin,/users\.onclick=openUserManagement/);
  assert.match(html,/admin-user-management-v303\.js\?v=306/);
});

test('user management includes refresh, presence, time and activity drill-down',()=>{
  for(const contract of ['data-user-refresh','Online now','Time on site','admin_user_activity_timeline','admin_set_user_access'])assert.match(admin,new RegExp(contract));
  assert.match(admin,/online_window_seconds|2 minutes/);
  assert.match(admin,/data-user-search/);
  assert.match(admin,/data-user-presence/);
});

test('user management survives missing RPCs and transient network failures',()=>{
  assert.match(admin,/rpcWithRetry/);
  assert.match(admin,/directoryFallback/);
  assert.match(admin,/admin_list_users/);
  assert.match(admin,/Showing the last successful result/);
  assert.match(admin,/addEventListener\('online'/);
  assert.match(admin,/attempts:1,timeoutMs:12000/);
  assert.doesNotMatch(admin,/Could not load user intelligence: \$\{error\.message\}/);
  assert.match(tracker,/disabledUntil/);
  assert.match(tracker,/catch\{disabledUntil=Date\.now\(\)\+15000/);
});

test('telemetry is coarse, authenticated and avoids captured content',()=>{
  assert.match(tracker,/HEARTBEAT_MS=60000/);
  assert.match(tracker,/session_start/);
  assert.match(tracker,/screen_view/);
  assert.match(tracker,/interaction/);
  assert.doesNotMatch(tracker,/FormData|\.value|textContent|innerText|localStorage/);
  assert.match(tracker,/auth\.getUser/);
});

test('engagement storage uses RLS and locked-down RPCs',()=>{
  for(const contract of ['enable row level security','btv_is_admin()','security definer','set search_path','from public, anon','to authenticated, service_role','interval \'2 minutes\''])assert.match(sql,new RegExp(contract.replace(/[()]/g,'\\$&'),'i'));
  assert.match(sql,/event_type in \('session_start','screen_view','interaction','session_end'\)/);
  assert.match(sql,/references auth\.users\(id\) on delete cascade/);
  assert.match(sql,/btv_user_sessions_online_idx/);
});

test('premium console is responsive and motion-safe',()=>{
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/adminUserDrawerV303/);
  assert.match(css,/adminPresenceV303\.online/);
});
