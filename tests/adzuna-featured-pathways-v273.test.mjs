import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root=path.resolve(import.meta.dirname,".."),read=(file)=>fs.readFileSync(path.join(root,file),"utf8"),require=createRequire(import.meta.url);
const core=require(path.join(root,"api/_lib/adzuna-core.cjs"));
const fixture={id:"job-123",title:"Registered Nurse - ICU",description:"Critical care nursing role.",redirect_url:"https://www.adzuna.com/details/123",created:"2026-08-01T08:00:00Z",salary_min:70000,salary_max:90000,company:{display_name:"Example Health"},location:{display_name:"Central",area:["Country","Region","City"]}};

test("Adzuna maps every Featured Pathway destination and currency",()=>{
  for(const [key,expected] of Object.entries({ca:["CA","Canada","CAD"],au:["AU","Australia","AUD"],nz:["NZ","New Zealand","NZD"],gb:["GB","United Kingdom","GBP"],us:["US","United States","USD"]})){
    const row=core.normalizeItem({...fixture,id:`${key}-123`},new Date("2026-08-01T10:00:00Z"),key);
    assert.deepEqual([row.country_code,row.country,row.salary_currency],expected);
  }
});

test("new destinations use the existing endpoint and never return credentials",async()=>{
  for(const countryCode of ["ca","au","nz"]){
    let captured;
    const result=await core.testConnection({appId:"private-id",appKey:"private-key",countryCode,fetchImpl:async(url)=>{captured=new URL(String(url));return{ok:true,status:200,json:async()=>({count:1,results:[fixture]})};}});
    assert.equal(captured.origin+captured.pathname,`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`);
    assert.equal(JSON.stringify(result).includes("private-id")||JSON.stringify(result).includes("private-key"),false);
  }
});

test("new country application URLs stay on the matching trusted Adzuna domains",()=>{
  for(const [countryCode,host] of Object.entries({ca:"www.adzuna.ca",au:"www.adzuna.com.au",nz:"www.adzuna.co.nz"})){
    const row=core.normalizeItem({...fixture,id:`${countryCode}-domain`,redirect_url:`https://${host}/details/123`},new Date("2026-08-01T10:00:00Z"),countryCode);
    assert.equal(new URL(row.canonical_application_url).hostname,host);
  }
});

test("one sequential daily importer persists and filters all five countries",()=>{
  const importer=read("api/global-jobs-import.js"),jobs=read("api/jobs.js"),ui=read("web/global-jobs-v168.js"),sql=read("supabase/migrations/20260801120000_adzuna_featured_pathways.sql");
  assert.match(importer,/key:"gb"[\s\S]*key:"us"[\s\S]*key:"ca"[\s\S]*key:"au"[\s\S]*key:"nz"/);
  assert.match(importer,/for\(const country of ADZUNA_COUNTRIES\)/);
  assert.match(importer,/on_conflict=source_name,country_code,external_id/);
  assert.match(jobs,/country_code=eq\.\$\{country\.code\}/);
  assert.match(jobs,/limit=Math\.min\(100[\s\S]*page=Math\.max/);
  assert.match(sql,/btv_jobs_source_country_external_uq/);
  assert.match(ui,/Jobs by Adzuna/);assert.match(ui,/View and apply/);assert.match(ui,/Date posted/);assert.match(ui,/Job type/);
});

test("the search plan covers requested and country-specific nursing titles",()=>{
  const terms=core.TERMS.map((item)=>item.keyword);
  for(const term of ["Registered Nurse","Staff Nurse","Clinical Nurse","Nurse Practitioner","Licensed Practical Nurse","Nursing Assistant","Theatre Nurse","Operating Room Nurse","PACU Nurse","Recovery Nurse","ICU Nurse","Critical Care Nurse","Emergency Nurse","Mental Health Nurse","Public Health Nurse","Nurse Educator"])assert.ok(terms.includes(term),term);
  assert.equal(core.COUNTRY_TERMS.ca[0].keyword,"Registered Psychiatric Nurse");assert.equal(core.COUNTRY_TERMS.au[0].keyword,"Enrolled Nurse");assert.equal(core.COUNTRY_TERMS.nz[0].keyword,"Enrolled Nurse");
});
