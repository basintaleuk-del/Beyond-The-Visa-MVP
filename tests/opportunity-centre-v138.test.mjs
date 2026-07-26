import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
  assert.match(page,/dashboard-premium-v73\.js\?v=156/);
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

test('existing Admin Centre is extended with opportunity and employer governance',async()=>{
  const [page,admin]=await Promise.all([read('web/admin.html'),read('web/admin-opportunity-centre-v138.js')]);
  assert.match(page,/admin-opportunity-centre-v138\.js/);
  for(const action of ['Create opportunity','Duplicate','Publish','Expire','Create employer','Source verified'])assert.match(admin,new RegExp(action));
  assert.match(admin,/btv_opportunity_source_reviews/);
  assert.doesNotMatch(admin,/data\.verified_by/);
});
