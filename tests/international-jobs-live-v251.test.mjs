import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const require = createRequire(import.meta.url);
const providers = require(path.join(root, "api/_lib/international-jobs-live.cjs"));

test("live providers cover every non-UK destination without changing UK", () => {
  assert.deepEqual(providers.SOURCES.map((source) => source.countryCode), ["AU", "NZ", "CA", "IE", "AE", "SA"]);
  assert.ok(providers.SOURCES.every((source) => source.url.startsWith("https://")));
  const importer = read("api/global-jobs-import.js");
  assert.match(importer, /NHS Jobs/);
  assert.match(importer, /USAJOBS/);
  assert.match(importer, /liveInternationalSources/);
  assert.match(importer, /fetchLiveSource/);
  assert.match(importer, /btv_approved_sources\?on_conflict=name/);
  assert.match(importer, /approved_api/);
  const jobsApi = read("api/jobs.js");
  assert.match(jobsApi, /warmInternationalJobs/);
  assert.match(jobsApi, /internationalSources\.some/);
  assert.match(jobsApi, /country\.code/);
});

test("Australia vacancies become on-site records with original Apply URLs", () => {
  const html = `<!--Summary Body org 14093--><li><h3><A HREF="jncustomsearch.viewFullSingle?in_organid=14904&amp;in_jnCounter=223180008"><span class="result-title"><strong>Registered Nurse - Critical Care</strong>, Queensland Health</span></a><span class="type">Permanent Full-time</span></h3><strong class="locality">Brisbane</strong><div class="search-description">Provide safe clinical nursing care.</div><strong class="grade">Nurse Grade 5</strong><time class="date-closes" datetime="2026-08-15T23:59:59+10:00">closes</time></li>`;
  const [job] = providers.parseQueensland(html);
  assert.equal(job.country_code, "AU");
  assert.equal(job.title, "Registered Nurse - Critical Care");
  assert.match(job.application_url, /^https:\/\/smartjobs\.qld\.gov\.au\/jobtools\/jncustomsearch\.viewFullSingle/);
  assert.equal(job.source_url, job.application_url);
  assert.equal(job.application_kind, "external");
  assert.equal(job.sponsorship_status, "not_stated");
});

test("New Zealand, Canada and Ireland parsers preserve official details", () => {
  const nz = providers.parseNewZealand(`<tr><td class="job_title"><div class="position"><A HREF="/jobs/Otago/1939263">Registered Nurse - Medical Assessment Unit</a></div><div>at Health New Zealand - Te Whatu Ora Southern</div><div class="salary-range"><span class="minimum-sal">81,683</span><span class="salary-divider"> - </span><span class="maximum-sal">106,739</span></div><div class="highlight Permanent Full time"></div></td><td class="job_location">Otago</td><td class="job_listed">31-Jul-2026</td><td class="job_closing">14-Aug-2026</td></tr>`)[0];
  assert.equal(nz.country_code, "NZ");
  assert.equal(nz.salary_currency, "NZD");
  assert.match(nz.application_url, /^https:\/\/jobs\.govt\.nz\/jobs\/Otago\//);

  const ca = providers.parseCanada(`<article id="article-49966017"><a href="/jobsearch/jobposting/49966017;jsessionid=unsafe?source=searchresults"><span class="noctitle">RN (registered nurse)</span><li class="date">July 27, 2026</li><li class="business">Community Hospital</li><li class="location"><span>Location</span>Toronto (ON)</li><li class="salary">Salary $55.00 hourly</li></a></article>`)[0];
  assert.equal(ca.country_code, "CA");
  assert.equal(ca.application_url, "https://www.jobbank.gc.ca/jobsearch/jobposting/49966017");
  assert.doesNotMatch(ca.application_url, /jsessionid|source=/);

  const ie = providers.parseIreland(`href\\":\\"/jobs/job-search/staff-nurse-101580/\\",\\"className\\":\\"hse-listing__link\\",\\"children\\":\\"Staff Nurse 101580\\"}],\\"children\\":\\"County: Galway\\"},\\"dateTime\\":\\"2026-07-30T08:17:15+01:00\\"`)[0];
  assert.equal(ie.country_code, "IE");
  assert.match(ie.application_url, /^https:\/\/about\.hse\.ie\/jobs\/job-search\//);
});

test("Gulf providers publish only verified official careers routes", () => {
  const ae = providers.parseEmirates("<h2>Explore Current Openings</h2><p>Doctors, Nurses, Allied Health Professionals</p><a>View All Job Vacancies</a>")[0];
  assert.equal(ae.country_code, "AE");
  assert.match(ae.application_url, /^https:\/\/www\.ehs\.gov\.ae\//);
  assert.deepEqual(providers.parseEmirates("<p>No current recruitment information</p>"), []);

  const sa = providers.parseSaudi(`<table><tr><td><a href="/en/home/careers/vacancies/158433">STAFF NURSE I</a></td><td>Nursing Recruitment</td><td>Riyadh</td><td>16/06/2027</td></tr></table>`)[0];
  assert.equal(sa.country_code, "SA");
  assert.match(sa.application_url, /^https:\/\/services\.kfshrc\.edu\.sa\//);
});

test("international job cards display on site and Apply opens the original employer", () => {
  const ui = read("web/global-jobs-v168.js");
  const css = read("web/international-jobs-v251.css");
  assert.match(ui, /Current vacancies are displayed below on Beyond The Visa/);
  assert.match(ui, /Apply for job/);
  assert.match(ui, /target="_blank" rel="noopener noreferrer" data-track-apply/);
  assert.doesNotMatch(ui, />Search current vacancies/);
  assert.match(ui, /data-job-detail/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test("source governance enables only the reviewed live adapters", () => {
  const sql = read("supabase/migrations/20260731020000_live_international_jobs_v251.sql");
  for (const source of ["Queensland Health SmartJobs", "New Zealand Government Jobs", "Canada Job Bank", "HSE Job Search", "Emirates Health Services Careers", "King Faisal Specialist Hospital Careers"]) {
    assert.match(sql, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(sql, /approved_api/);
  assert.match(sql, /'approved'/);
  assert.doesNotMatch(sql, /delete from|drop table|truncate/i);
});
