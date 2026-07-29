import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=file=>readFile(new URL(`../${file}`,import.meta.url),"utf8");

test("every NHS job tile is pointer and keyboard selectable without hijacking controls",async()=>{
  const [ui,css]=await Promise.all([read("web/jobs-centre-v148.js"),read("web/jobs-centre-v148.css")]);
  assert.match(ui,/data-select-nhs-job/);assert.match(ui,/tabindex="0" role="link"/);
  assert.match(ui,/event\.key==="Enter"\|\|event\.key===" "/);assert.match(ui,/closest\("a,button,input,select,textarea,label"\)/);
  assert.match(css,/\.nhsJob148:hover,\.nhsJob148:focus-visible/);assert.match(css,/cursor:pointer/);
});

test("long job names wrap inside cards and the detail header",async()=>{
  const css=await read("web/jobs-centre-v148.css");
  assert.match(css,/\.nhsJob148 h3,.nhsJob148 h3 a,.nhsJobDetail150 h1[\s\S]*overflow-wrap:anywhere/);
  assert.match(css,/\.nhsJob148\{overflow:hidden/);
});

test("on-site application form posts only authenticated applicant fields",async()=>{
  const [client,api]=await Promise.all([read("web/job-application-v174.js"),read("api/jobs.js")]);
  for(const field of ["applicant_name","applicant_email","professional_registration","work_authorisation","experience_summary","supporting_statement","consent_confirmed"])assert.match(client,new RegExp(field));
  assert.match(client,/Authorization:`Bearer \$\{await token\(\)\}`/);assert.match(api,/action==="submit_application"/);
  assert.match(api,/user_id:user\.id/);assert.match(api,/body\.consent_confirmed!==true/);assert.doesNotMatch(api,/user_id:body\.user_id/);
  assert.match(api,/external_submission_required/);assert.match(client,/employer will not receive it until you complete their official form/);
});

test("migration keeps application data owner-only and exposes required grants",async()=>{
  const sql=await read("supabase/migrations/20260728234943_onsite_job_applications.sql");
  assert.match(sql,/alter table public\.btv_job_applications/);assert.match(sql,/employer_submission_required boolean not null default true/);
  assert.match(sql,/for select to authenticated using \(\(select auth\.uid\(\)\)=user_id\)/);
  assert.match(sql,/for update to authenticated using \(\(select auth\.uid\(\)\)=user_id\) with check/);
  assert.match(sql,/grant select,insert,update,delete on public\.btv_job_applications to authenticated/);
  assert.doesNotMatch(sql,/user_metadata/);
});
