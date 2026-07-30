import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read=file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');

test('Costs is replaced at runtime without changing the other four bottom tabs',async()=>{
  const [page,feature,icons]=await Promise.all([read('web/index.html'),read('web/opportunity-centre-v138.js'),read('web/menu-icons-v72.js')]);
  for(const label of ['Home','Journey','Ask Zibur','Learn'])assert.match(page,new RegExp(`<small>${label}</small>`));
  assert.match(feature,/oldNav\.dataset\.open = "opportunities"/);
  assert.match(feature,/label\.textContent = "Opportunities"/);
  assert.match(icons,/opportunities:.*<rect/);
  assert.match(page,/id="cost-estimator"/);assert.doesNotMatch(page,/id="costs"/);
  assert.match(page,/#cost-estimator \.pageTitle/);
});

test('Opportunity Centre is available from the Career and Journey side menu',async()=>{
  const [dashboard,page]=await Promise.all([read('web/dashboard-premium-v73.js'),read('web/index.html')]);
  assert.match(dashboard,/\["Opportunities", "opportunities"\]/);
  assert.match(dashboard,/if \(id === "opportunities"\) return window\.openScreen\?\.\("opportunities"\)/);
  assert.match(page,/dashboard-premium-v73\.js\?v=228/);
});

test('semantic routes preserve old links and the relocation estimator',async()=>{
  const config=JSON.parse(await read('vercel.json'));
  assert.ok(config.redirects.some(x=>x.source==='/costs'&&x.destination==='/opportunities'));
  assert.ok(config.rewrites.some(x=>x.source==='/opportunities'&&x.destination.includes('screen=opportunities')));
  assert.ok(config.rewrites.some(x=>x.source==='/journey/tools/cost-estimator'&&x.destination.includes('cost-estimator')));
  const feature=await read('web/opportunity-centre-v138.js');
  assert.match(feature,/function showScreen\(id\)/);assert.match(feature,/return showScreen\("cost-estimator"\)/);
});

test('Opportunity Centre uses live records, deterministic recommendations and reusable saves',async()=>{
  const feature=await read('web/opportunity-centre-v138.js');
  assert.match(feature,/from\("btv_jobs"\)/);assert.match(feature,/from\("btv_saved_jobs"\)/);
  assert.match(feature,/from\("profiles"\)/);assert.match(feature,/function score\(row\)/);
  assert.match(feature,/countRows/);assert.match(feature,/navigator\.share/);
  assert.match(feature,/No matching opportunities are currently available/);
  assert.doesNotMatch(feature,/42 new jobs|18 sponsorship roles|3 scholarships|5 events this week|12 recommended/);
});

test('migration extends jobs non-destructively and protects user-owned state',async()=>{
  const sql=await read('supabase/migrations/20260726014632_opportunity_centre_v138.sql');
  assert.match(sql,/alter table public\.btv_jobs/);assert.doesNotMatch(sql,/drop table public\.btv_jobs/);
  assert.match(sql,/btv_saved_jobs/);assert.match(sql,/\(select auth\.uid\(\)\) = user_id/);
  assert.match(sql,/status = 'published'/);assert.match(sql,/expired_at is null/);
  assert.match(sql,/btv_jobs_source_record_uq/);assert.match(sql,/enable row level security/);
  assert.match(sql,/btv_opportunity_source_reviews/);assert.match(sql,/opportunity_source_reviews_admin/);
});

test('mobile styles avoid horizontal overflow and protect bottom navigation space',async()=>{
  const css=await read('web/opportunity-centre-v138.css');
  assert.match(css,/@media\(max-width:650px\)/);assert.match(css,/minmax\(0,1fr\)/);
  assert.doesNotMatch(css,/width:\s*100vw/);assert.doesNotMatch(css,/overflow-x:\s*hidden/);
});

test('Opportunity Centre uses the approved responsive hero, statistics and advisor presentation',async()=>{
  const [feature,css,hero,advisor]=await Promise.all([
    read('web/opportunity-centre-v138.js'),
    read('web/opportunity-centre-v138.css'),
    stat(new URL('../web/assets/opportunities/opportunity-centre-hero-v165.webp',import.meta.url)),
    stat(new URL('../web/assets/opportunities/zibur-advisor.jpg',import.meta.url)),
  ]);
  assert.match(feature,/opportunityHeroArt138/);assert.match(feature,/opportunitySummaryIcon138/);assert.match(feature,/ziburOpportunityArt138/);
  assert.match(feature,/NEXT STEP/);assert.match(feature,/Opportunity <em>Centre<\/em>/);assert.match(feature,/partnerships and events selected for your journey/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/@media\(min-width:1024px\)/);assert.match(css,/@media\(min-width:1440px\)/);
  assert.ok(hero.size<150_000);assert.ok(advisor.size<100_000);
  assert.doesNotMatch(feature,/New jobs today",\s*\d/);
});

test('all eight live statistic tiles open current filtered NHS job results',async()=>{
  const [feature,css,config]=await Promise.all([read('web/opportunity-centre-v138.js'),read('web/opportunity-centre-v138.css'),read('vercel.json')]);
  for(const key of ['new-today','nursing','midwifery','sponsorship-confirmed','sponsorship-possible','closing-week','recommended','employers'])assert.match(feature,new RegExp(`"${key}"`));
  assert.match(feature,/data-summary-filter/);assert.match(feature,/function showSummaryJobs/);assert.match(feature,/data-opportunity-summary-dialog/);
  assert.match(feature,/\.in\("status", ACTIVE_OPPORTUNITY_STATUSES\)\.is\("expired_at", null\)\.eq\("source_name", "NHS Jobs"\)/);
  assert.match(feature,/state\.summaryRows = data \|\| \[\]/);assert.match(feature,/return showDetail\(row\)/);
  assert.match(css,/\.opportunitySummary138>button/);assert.match(css,/\.opportunitySummaryDialog138/);assert.match(css,/\.opportunitySummaryResults138/);
  assert.match(config,/\/api\/global-jobs-import/);assert.match(config,/15 3 \* \* \*/);
});

test('statistic tiles use the premium arrow-free presentation and reduced-motion-safe count animation',async()=>{
  const [feature,css]=await Promise.all([read('web/opportunity-centre-v138.js'),read('web/opportunity-centre-v138.css')]);
  assert.doesNotMatch(feature,/opportunitySummaryArrow/);assert.doesNotMatch(css,/opportunitySummaryArrow/);
  assert.match(feature,/data-stat-value/);assert.match(feature,/function animateSummaryCounts/);assert.match(feature,/duration = 620/);assert.match(feature,/prefers-reduced-motion: reduce/);
  assert.match(css,/min-height:128px;padding:16px/);assert.match(css,/width:48px;height:48px/);assert.match(css,/border-radius:20px/);assert.match(css,/translateY\(-3px\) scale\(1\.015\)/);
  assert.match(css,/@media\(min-width:768px\) and \(max-width:1023px\)[\s\S]*?repeat\(3,minmax\(0,1fr\)\)/);assert.match(css,/@media\(min-width:1024px\)[\s\S]*?repeat\(4,minmax\(0,1fr\)\)/);
});

test('existing Admin Centre is extended with opportunity and employer governance',async()=>{
  const [page,admin]=await Promise.all([read('web/admin.html'),read('web/admin-opportunity-centre-v138.js')]);
  assert.match(page,/admin-opportunity-centre-v138\.js/);
  for(const action of ['Create opportunity','Duplicate','Publish','Expire','Create employer','Source verified'])assert.match(admin,new RegExp(action));
  assert.match(admin,/btv_opportunity_source_reviews/);
  assert.doesNotMatch(admin,/data\.verified_by/);
});
