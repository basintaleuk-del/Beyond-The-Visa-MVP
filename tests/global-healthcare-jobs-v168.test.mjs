import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root=path.resolve(import.meta.dirname,".."),read=(file)=>fs.readFileSync(path.join(root,file),"utf8"),require=createRequire(import.meta.url);
const core=require(path.join(root,"api/_lib/global-jobs-core.cjs")),samples=require(path.join(root,"api/_lib/global-job-samples.cjs"));

test("all eight pathway aliases map to ISO countries",()=>{
  assert.equal(core.countryForPathway("uk").code,"GB");assert.equal(core.countryForPathway("USA").code,"US");assert.equal(core.countryForPathway("australia").code,"AU");assert.equal(core.countryForPathway("new-zealand").code,"NZ");
  assert.equal(core.countryForPathway("canada").code,"CA");assert.equal(core.countryForPathway("ireland").code,"IE");assert.equal(core.countryForPathway("uae").code,"AE");assert.equal(core.countryForPathway("saudi-arabia").code,"SA");
});

test("unsafe application links and imported HTML are rejected or sanitised",()=>{
  assert.equal(core.safeExternalUrl("http://example.com/apply"),null);assert.equal(core.safeExternalUrl("https://127.0.0.1/apply"),null);assert.equal(core.safeExternalUrl("https://employer.example/apply").startsWith("https://"),true);
  assert.equal(core.plainText('<script>alert(1)</script><p>Safe &amp; clear</p>'),"Safe & clear");
});

test("shared providers must implement the complete import contract",()=>{
  const methods={fetchJobs(){},mapJob(){},validateJob(){},upsertJob(){},expireMissingJobs(){},reportImportStatus(){}};
  assert.equal(core.createProvider({name:"fixture",...methods}).name,"fixture");assert.throws(()=>core.createProvider({name:"broken",fetchJobs(){}}),/must implement mapJob/);
});

test("sponsorship is never inferred and closing status is server-derived",()=>{
  const source={name:"Approved fixture",country_code:"AU",source_type:"approved_json"},input={external_id:"1",title:"Registered Nurse",employer_name:"Hospital",application_url:"https://hospital.example/jobs/1",source_url:"https://hospital.example/feed",country_code:"AU",relocation_support_available:true,closing_date:"2026-07-30T00:00:00Z"};
  const {job,errors}=core.normalizeJob(input,source,new Date("2026-07-28T00:00:00Z"));assert.deepEqual(errors,[]);assert.equal(job.sponsorship_status,"not_stated");assert.equal(job.visa_sponsorship,false);assert.equal(job.status,"closing_soon");
});

test("development samples cover every country and cannot enter production",()=>{
  assert.equal(samples.getDevelopmentSamples({NODE_ENV:"development",BTV_JOB_SAMPLE_MODE:"true"}).length,8);assert.equal(samples.getDevelopmentSamples({NODE_ENV:"production",BTV_JOB_SAMPLE_MODE:"true"}).length,0);assert.equal(samples.getDevelopmentSamples({NODE_ENV:"development"}).length,0);
});

test("migration is non-destructive, backfills UK and enforces pathway RLS",()=>{
  const sql=read("supabase/migrations/202607282030_global_healthcare_jobs_v168.sql");
  assert.match(sql,/add column if not exists country_code/);assert.match(sql,/when 'uk' then 'GB'/);assert.match(sql,/destination_country in \('uk','us','au','nz','ca','ie','ae','sa'\)/);
  assert.match(sql,/create policy jobs_read[\s\S]*profiles p[\s\S]*destination_country/);assert.match(sql,/btv_saved_jobs sj[\s\S]*sj\.user_id=\(select auth\.uid\(\)\)/);assert.doesNotMatch(sql,/drop table public\.btv_jobs|truncate public\.btv_jobs/i);
  assert.match(sql,/insert into public\.btv_jobs\([\s\S]*from public\.btv_usa_jobs/);assert.match(sql,/job_reference/);assert.match(sql,/source_last_modified_at/);assert.match(sql,/last_verified_at/);
});

test("alerts, applications, submissions and audit data retain country",()=>{
  const sql=read("supabase/migrations/202607282030_global_healthcare_jobs_v168.sql");
  assert.match(sql,/create table if not exists public\.btv_job_alerts[\s\S]*country_code text not null/);assert.match(sql,/alter table public\.btv_job_applications[\s\S]*country_code text/);
  assert.match(sql,/create table if not exists public\.btv_employer_job_submissions/);assert.match(sql,/publication_authority_confirmed boolean not null/);assert.match(sql,/create table if not exists public\.btv_job_audit_log/);
});

test("listing API derives country from the authenticated profile",()=>{
  const api=read("api/jobs.js");assert.match(api,/profiles\?select=destination_country,profession/);assert.match(api,/country_code=eq\.\$\{country\.code\}/);assert.doesNotMatch(api,/req\.query\.country/);
  assert.match(api,/DESTINATION_REQUIRED/);assert.match(api,/view==="saved"/);assert.match(api,/outside_pathway/);assert.match(api,/btv_job_alerts/);assert.match(api,/track_application/);
});

test("one protected daily orchestrator owns imports, retries and locking",()=>{
  const api=read("api/global-jobs-import.js"),config=JSON.parse(read("vercel.json"));assert.ok(config.crons.some(cron=>cron.path==="/api/global-jobs-import"&&cron.schedule==="15 3 * * *"));assert.equal(config.crons.filter(cron=>cron.path==="/api/global-jobs-import").length,1);
  assert.match(api,/authorization === `Bearer \$\{cronSecret\}`/);assert.match(api,/run_scope:"global_daily"/);assert.match(api,/already running/);assert.match(api,/withRetry/);assert.match(api,/NHS Jobs/);assert.match(api,/USAJOBS/);
  assert.match(api,/status: "expired"/);assert.match(api,/SOURCE_STALE/);assert.match(api,/DAILY_IMPORT_FAILED/);assert.match(api,/records_created/);assert.match(api,/records_unchanged/);
});

test("only authorised active connectors run and pending countries are explicit",()=>{
  const sql=read("supabase/migrations/202607282030_global_healthcare_jobs_v168.sql"),api=read("api/global-jobs-import.js");
  for(const code of ["AU","NZ","CA","IE","AE","SA"])assert.match(sql,new RegExp(`'${code}'`));assert.match(sql,/pending_configuration/g);assert.match(sql,/No feed is enabled until an authorised/);
  assert.doesNotMatch(api,/cheerio|puppeteer|playwright|scrape/i);assert.match(sql,/USAJOBS Search API/);assert.match(sql,/NHS Jobs/);
});

test("Trac-style information hierarchy keeps Beyond The Visa identity",()=>{
  const ui=read("web/global-jobs-v168.js"),css=read("web/global-jobs-v168.css"),html=read("web/index.html");
  for(const text of ["Job reference","Job overview","Main duties","About the employer","Person specification","Essential criteria","Desirable criteria","Professional registration requirements","Visa and sponsorship details","Last verified"])assert.match(ui,new RegExp(text));
  assert.match(ui,/Apply on employer website/);assert.match(ui,/Sponsorship not stated/);assert.doesNotMatch(ui,/visa_sponsorship.*relocation_support_available/);assert.doesNotMatch(ui,/Trac Jobs|trac\.jobs/i);
  assert.match(css,/@media\(max-width:520px\)/);assert.match(css,/@media\(max-width:340px\)/);assert.match(css,/body\.dark/);assert.match(css,/prefers-reduced-motion/);assert.match(html,/global-jobs-v168\.js\?v=252/);
});

test("Jobs keeps its original page title, hero layout and account destination",()=>{
  const ui=read("web/jobs-centre-v148.js"),html=read("web/index.html");
  assert.match(html,/PREMIUM CAREER TOOLS[\s\S]*Job search/);
  assert.match(ui,/nhsJobsHero148/);assert.match(ui,/Find your next role across the NHS/);assert.match(ui,/UPDATED DIRECTLY FROM NHS JOBS/);
  assert.match(html,/jobs-centre-v148\.js\?v=272/);assert.match(html,/jobs-centre-v148\.css\?v=176/);
  assert.match(html,/jobs-centre-v148\.js\?v=272[\s\S]*usa-jobs-v155\.js\?v=270[\s\S]*global-jobs-v168\.js\?v=252/);
  assert.match(read("web/global-jobs-v168.js"),/previousRenderJobs=window\.renderJobs/);
  assert.match(read("web/global-jobs-v168.js"),/if\(\["GB","US"\]\.includes\(code\)\)return previousRenderJobs\?\.\(\)/);
});

test("every destination exposes a current official vacancy search without inventing listings",()=>{
  const ui=read("web/global-jobs-v168.js"),css=read("web/jobs-navigation-v169.css");
  for(const code of ["GB","US","AU","NZ","CA","IE","AE","SA"])assert.match(ui,new RegExp(`${code}:\\{name:`));
  for(const source of ["NHS Jobs","USAJOBS Nurse","NSW Health Careers","Health New Zealand Careers","Canada Job Bank","HSE Job Search","Mediclinic Middle East Careers","Saudi Ministry of Health Careers"])assert.match(ui,new RegExp(source));
  assert.match(ui,/VERIFIED ORIGINAL SOURCE/);assert.match(ui,/Current vacancies are displayed below on Beyond The Visa/);assert.match(ui,/Apply for job/);assert.match(ui,/target="_blank" rel="noopener noreferrer" data-track-apply/);assert.match(ui,/The verified vacancy feed is refreshing/);assert.doesNotMatch(ui,/>Search current vacancies/);assert.doesNotMatch(ui,/fake|sample vacancies/i);
  assert.match(css,/globalOfficialJobs170/);assert.match(css,/@media \(max-width: 360px\)/);assert.match(css,/body\.dark \.globalOfficialJobs170/);
});

test("app navigation survives authentication and never backs into the login screen",()=>{
  const nav=read("web/navigation-state-v63.js"),back=read("web/back-navigation-v108.js"),auth=read("web/social-auth-v69.js"),html=read("web/index.html");
  assert.match(nav,/URLSearchParams\(location\.search\)\.get\('screen'\)/);assert.match(nav,/btv-previous-screen-v169/);assert.match(nav,/blocked=new Set\(\['auth'\]\)/);
  assert.match(back,/btv-screen-history-v169/);assert.match(back,/if\(app&&!app\.hidden\)/);assert.match(back,/target\|\|previousScreen\(\)\|\|'home'/);
  assert.match(auth,/location\.pathname\}\$\{location\.search\}/);assert.match(html,/redirectTo=location\.origin\+location\.pathname\+location\.search/);assert.match(html,/buildOnboarding\(\);authTab\(true\)/);
});

test("destination changes refresh an open Jobs page without injecting jobs into Home",()=>{
  const ui=read("web/global-jobs-v168.js");assert.match(ui,/btv:destination-changed/);assert.match(ui,/BTV_JOB_CONTEXT/);assert.match(ui,/Recommend only active verified database jobs for this destination/);assert.match(ui,/window\.ziburContext=wrapped/);
  assert.doesNotMatch(ui,/globalJobsDashboard168|data-dashboard-job|btv:home-rendered|btv:session-restored|btv:app-content-ready/);
  assert.match(ui,/if\(id==="jobs"\)setTimeout\(render,0\)/);assert.doesNotMatch(ui,/if\(id==="home"\)/);
});

test("admin area exposes sources, reports, retries and review controls",()=>{
  const ui=read("web/admin-global-jobs-v168.js"),html=read("web/admin.html");for(const token of ["btv_approved_sources","btv_opportunity_import_runs","btv_job_admin_alerts","btv_employer_job_submissions","data-source-toggle","data-retry-import","data-review-job","btv_job_audit_log"])assert.match(ui,new RegExp(token));
  assert.match(html,/admin-global-jobs-v168\.js\?v=168/);
});
