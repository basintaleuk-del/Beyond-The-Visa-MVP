import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const require=createRequire(import.meta.url);
const {qualifiesForJob,countryCode}=require(path.join(root,"api/_lib/job-alert-matching.cjs"));
const profile={id:"00000000-0000-4000-8000-000000000001",destination_country:"uk",profession:"Registered Nurse",registration_stage:"Registered"};
const professional={profession:"registered_nurse",clinical_specialty:"Adult nursing",experience_level:"6–10 years"};
const job={id:"00000000-0000-4000-8000-000000000002",country:"United Kingdom",country_code:"GB",profession:"nurse",title:"Staff Nurse",specialty:"Nursing",status:"published"};

test("job alerts normalize destination aliases and require the matching pathway",()=>{
  assert.equal(countryCode("United Kingdom"),"GB");
  assert.equal(countryCode("us"),"US");
  assert.equal(qualifiesForJob(profile,job,{professional}),true);
  assert.equal(qualifiesForJob({...profile,destination_country:"ca"},job,{professional}),false);
});

test("specialist and advanced roles require matching saved specialty evidence",()=>{
  const intensive={...job,title:"Registered Nurse - Intensive Care Unit",specialty:"Critical Care / ICU"};
  assert.equal(qualifiesForJob(profile,intensive,{professional}),false);
  assert.equal(qualifiesForJob(profile,intensive,{professional:{...professional,clinical_specialty:"Critical Care and ICU"}}),true);
  const advanced={...job,title:"Advanced Practice Nurse (Nurse Practitioner)",specialty:"Advanced Practice"};
  assert.equal(qualifiesForJob(profile,advanced,{professional}),false);
  assert.equal(qualifiesForJob(profile,advanced,{professional:{...professional,clinical_specialty:"Nurse Practitioner"}}),true);
});

test("registration, experience and explicit alert filters are qualification gates",()=>{
  const regulated={...job,registration_required:"Active NMC registration required",experience_level:"6–10 years"};
  assert.equal(qualifiesForJob({...profile,registration_stage:"Pending"},regulated,{professional,registrations:[]}),false);
  assert.equal(qualifiesForJob({...profile,registration_stage:"Pending"},regulated,{professional,registrations:[{country:"GB",status:"Active"}]}),true);
  assert.equal(qualifiesForJob(profile,{...regulated,experience_level:"More than 10 years"},{professional}),false);
  assert.equal(qualifiesForJob(profile,job,{professional,alerts:[{country_code:"GB",specialties:["Mental Health"]}]}),false);
});

test("scheduler caps new matches and stores an exact job route",()=>{
  const source=readFileSync(path.join(root,"api/_lib/notifications.cjs"),"utf8");
  assert.match(source,/if\(userMatches>=3\)break/);
  assert.match(source,/action_url: `\/jobs\/\$\{job\.id\}`/);
  assert.match(source,/data:\{job_id:job\.id,country_code:/);
  assert.match(source,/btv_job_alerts\?select=user_id,country_code,profession,specialties,locations,sponsorship_preference,employment_types/);
});

test("Open update routes directly through the Jobs centre",()=>{
  const notifications=readFileSync(path.join(root,"web/notification-centre-v250.js"),"utf8");
  const jobs=readFileSync(path.join(root,"web/global-jobs-v168.js"),"utf8");
  assert.match(notifications,/note\?\.category==="jobs"&&await window\.BTVJobs\?\.openNotification/);
  assert.match(jobs,/async function openNotification\(target,data=\{\}\)/);
  assert.match(jobs,/window\.openScreen\?\.\("jobs"\)/);
  assert.match(jobs,/await detail\(id\)/);
});

test("legacy USA alerts are also profile-qualified and limited",()=>{
  const sql=readFileSync(path.join(root,"supabase/migrations/20260801123000_qualified_job_alerts_v277.sql"),"utf8");
  assert.match(sql,/join public\.btv_professional_profiles pp/);
  assert.match(sql,/btv_professional_registrations/);
  assert.match(sql,/limit 3/);
  assert.match(sql,/'\/jobs\/usa\/'\|\|j\.id/);
});
