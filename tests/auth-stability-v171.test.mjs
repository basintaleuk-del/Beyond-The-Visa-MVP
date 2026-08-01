import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const platformConfig=fs.readFileSync(path.join(root,'web/platform-config.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'web/sw.js'),'utf8');
const appContent=fs.readFileSync(path.join(root,'web/app-content-v171.js'),'utf8');
const authStyles=fs.readFileSync(path.join(root,'web/auth-redesign-v69.css'),'utf8');
const supabaseClient=fs.readFileSync(path.join(root,'web/supabase-client.js'),'utf8');

test('Supabase auth callbacks return before profile queries begin',()=>{
  assert.match(html,/onAuthStateChange\(\(event,session\)=>\{/);
  assert.match(html,/onAuthStateChange[\s\S]*setTimeout\(\(\)=>\{/);
  assert.doesNotMatch(html,/onAuthStateChange\(async/);
});

test('the application installs exactly one global Supabase auth listener',()=>{
  const loadedAuthSources=html+platformConfig;
  assert.equal((loadedAuthSources.match(/\.auth\.onAuthStateChange\(/g)||[]).length,1);
  assert.doesNotMatch(platformConfig,/\.auth\.onAuthStateChange\(/);
  assert.match(html,/BTVCheckAccountStatus\?\.\(session\.user\)/);
});

test('the deferred app content loader supplies non-visual legacy brand targets when needed',()=>{
  assert.match(html,/legacyBrandTargets\.hidden=true/);
  assert.match(html,/legacyBrandTargets\?\.remove\(\)/);
});

test('password login and initial session lookup have bounded recovery',()=>{
  assert.match(html,/authDeadline\(window\.btvSupabase\.auth\.signUp/);
  assert.match(html,/authDeadline\(window\.btvSupabase\.auth\.signInWithPassword/);
  assert.match(html,/authDeadline\(window\.btvSupabase\.auth\.getSession/);
  assert.match(html,/Account creation is taking longer than expected/);
  assert.match(html,/authMessage\('signupForm',window\.btvSupabaseError/);
  assert.match(html,/finally\{button\.disabled=false;button\.textContent='Sign in'\}/);
});

test('signup bootstrap records the required wallet transaction source',()=>{
  const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260801143000_repair_signup_wallet_bootstrap.sql'),'utf8');
  assert.match(migration,/transaction_type,\s*source_type,/);
  assert.match(migration,/'welcome',\s*'welcome_bonus'/);
  assert.match(migration,/on conflict \(user_id, idempotency_key\) do nothing/);
});

test('profile and destination hydration cannot block an authenticated user',()=>{
  assert.match(html,/authDeadline\(window\.btvSupabase\.from\('profiles'\)/);
  assert.match(html,/Destination hydration continued in the background/);
  assert.match(html,/setVisible\(document\.getElementById\('appShell'\),true\)[\s\S]*await destinationHydration/);
  assert.match(html,/resumeAuthenticatedSession/);
});

test('switching accounts cannot reuse another users cached profile',()=>{
  assert.match(html,/if\(!sameUser\)\{[\s\S]*localStorage\.removeItem\('btv-profile'\)/);
  assert.match(html,/localStorage\.removeItem\('btv-profile-extra'\)/);
  assert.match(html,/activeAuthUserId=null/);
});

test('navigation retries before showing a self-recovering offline screen',()=>{
  assert.match(worker,/async function networkDocument/);
  assert.match(worker,/cache:'reload'/);
  assert.match(worker,/setTimeout\(retry,3000\)/);
  assert.match(worker,/addEventListener\('online',retry\)/);
  assert.match(worker,/Cache-Control':'no-store/);
});

test('the login document no longer parses the megabyte application block inline',()=>{
  assert.ok(Buffer.byteLength(html)<350_000);
  assert.ok(Buffer.byteLength(appContent)<100_000);
  assert.match(html,/app-content-v171\.js\?v=301/);
  assert.match(html,/btvAppContentLoader172/);
  assert.match(html,/addEventListener\('btv:session-restored',loadForApp\)/);
  assert.match(html,/event\?\.detail\?\.state==='app'/);
  assert.doesNotMatch(html,/setTimeout\(load,5000\)/);
  assert.match(html,/script\.async=true/);
  assert.match(appContent,/const legalUpdated='30 July 2026'/);
});

test('deferred app content does not embed a duplicate megabyte logo',()=>{
  assert.doesNotMatch(appContent,/data:image\/png;base64/);
  assert.ok(Buffer.byteLength(appContent,'utf8')<100_000);
  assert.match(appContent,/favicon-512-v281\.png/);
});

test('visible authentication controls remain above full-page application overlays',()=>{
  assert.match(html,/auth-redesign-v69\.css\?v=302/);
  assert.ok(
    html.indexOf('social-auth-v69.js?v=302') < html.indexOf('storage-v21.js'),
    'the signed-out auth upgrade must run before authenticated feature assets',
  );
  assert.match(authStyles,/#auth\.btvAuthV69:not\(\[hidden\]\)[\s\S]*z-index:\s*2147483000/);
  assert.match(authStyles,/#auth\.btvAuthV69:not\(\[hidden\]\)[\s\S]*input[\s\S]*pointer-events:\s*auto\s*!important/);
  assert.match(authStyles,/\.authStory::after[\s\S]*pointer-events:\s*none\s*!important/);
  assert.match(worker,/beyond-the-visa-assets-v250/);
});

test('global feature installers do not poll or observe every page mutation',()=>{
  const jobs=fs.readFileSync(path.join(root,'web/global-jobs-v168.js'),'utf8');
  const usaJobs=fs.readFileSync(path.join(root,'web/usa-jobs-v155.js'),'utf8');
  const edge=fs.readFileSync(path.join(root,'web/edge-functions-v22.js'),'utf8');
  const inbox=fs.readFileSync(path.join(root,'web/manager-inbox-v26.js'),'utf8');
  const mockAccess=fs.readFileSync(path.join(root,'web/mock-access-v72.js'),'utf8');
  assert.doesNotMatch(jobs,/new MutationObserver\(\(\)=>dashboard\(\)\)/);
  assert.doesNotMatch(jobs,/new MutationObserver\(\(\)=>restorePreviousJobsHeader\(\)\)/);
  assert.doesNotMatch(jobs,/dashboardLoading|globalJobsDashboard168|btv:app-content-ready/);
  assert.doesNotMatch(usaJobs,/new MutationObserver[\s\S]*updateEntry\(\)[\s\S]*dashboardRecommendations\(\)/);
  assert.doesNotMatch(edge,/setInterval\(entry,5000\)/);
  assert.doesNotMatch(edge,/new MutationObserver\(entry\)/);
  assert.doesNotMatch(inbox,/new MutationObserver\(refresh\)/);
  assert.match(mockAccess,/if\(b\.dataset\.mockLabelV72===tier\)return/);
});

test('learning experience observer does not rebuild its own mock panels',()=>{
  const experience=fs.readFileSync(path.join(root,'web/experience-v86.js'),'utf8');
  assert.match(experience,/if\(!p\|\|p\.querySelector\('\.mockAccess85'\)\)return/);
  assert.doesNotMatch(experience,/if\(box\)box\.remove\(\)/);
  assert.match(html,/experience-v86\.js\?v=174/);
});

test('automatic login is single-flight and does not duplicate auth infrastructure',()=>{
  assert.equal((supabaseClient.match(/createClient\(/g)||[]).length,1);
  assert.equal((html.match(/\.auth\.getSession\(\)/g)||[]).length,1);
  assert.equal((html.match(/\.auth\.onAuthStateChange\(/g)||[]).length,1);
  assert.match(html,/if\(authSubscription\)return/);
  assert.match(html,/authSubscription=subscription/);
  assert.match(html,/pagehide'[\s\S]{0,100}authSubscription\?\.unsubscribe\(\)/);
  assert.match(html,/if\(activeAuthUserId===userId&&\(!app\?\.hidden\|\|onboarding\?\.hidden===false\)\)return/);
  assert.match(html,/if\(authTransition\)return authTransition/);
  assert.match(html,/authTransition=\(async\(\)=>\{/);
  assert.match(html,/\.finally\(\(\)=>\{authTransition=null\}\)/);
});

test('restoring a session does not automatically invoke Zibur or open realtime channels',()=>{
  assert.match(html,/form\.onsubmit=e=>[\s\S]*askSmartZibur\(q\)/);
  assert.doesNotMatch(html,/resumeAuthenticatedSession[\s\S]{0,800}askSmartZibur\(/);
  assert.doesNotMatch(html,/\.channel\(|\.subscribe\(/);
});

test('session restoration performs one profile hydration without redirecting the homepage',()=>{
  const start=html.indexOf('async function cacheSignedInUser');
  const end=html.indexOf("document.getElementById('signupForm')",start);
  const restoration=html.slice(start,end);
  assert.equal((restoration.match(/from\('profiles'\)/g)||[]).length,1);
  assert.equal((restoration.match(/showApp\(\)/g)||[]).length,1);
  assert.doesNotMatch(restoration,/router\.(?:push|replace|refresh)|location\.(?:assign|replace)|window\.location/);
  assert.match(html,/SIGNED_OUT'[\s\S]{0,80}showAuth\(\)/);
  assert.match(html,/signInWithPassword[\s\S]{0,500}resumeAuthenticatedSession\(data\.session\)/);
});
