import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root=path.resolve(import.meta.dirname,".."),read=(file)=>fs.readFileSync(path.join(root,file),"utf8"),require=createRequire(import.meta.url);
const core=require(path.join(root,"api/_lib/adzuna-core.cjs"));
const fixture={id:"gb-123",title:"Registered Nurse - ICU",description:"Provide critical nursing care.",redirect_url:"https://www.adzuna.co.uk/jobs/details/123",created:"2026-08-01T08:00:00Z",salary_min:36000,salary_max:44000,company:{display_name:"Example NHS Trust"},location:{display_name:"Leeds, West Yorkshire",area:["UK","Yorkshire","Leeds"]}};

test("the existing Adzuna connector maps gb jobs to the UK contract",()=>{
  const row=core.normalizeItem(fixture,new Date("2026-08-01T10:00:00Z"),"gb");
  assert.equal(row.source_name,"ADZUNA");assert.equal(row.country,"United Kingdom");assert.equal(row.country_code,"GB");assert.equal(row.destination_country,"United Kingdom");assert.equal(row.salary_currency,"GBP");assert.equal(row.attribution_text,"Jobs by Adzuna");
});

test("the shared connector targets the gb endpoint without exposing credentials",async()=>{
  let captured;
  const result=await core.testConnection({appId:"private-id",appKey:"private-key",countryCode:"gb",fetchImpl:async(url)=>{captured=new URL(String(url));return{ok:true,status:200,json:async()=>({count:1,results:[fixture]})};}});
  assert.equal(captured.origin+captured.pathname,"https://api.adzuna.com/v1/api/jobs/gb/search/1");assert.equal(result.authentication_succeeded,true);assert.equal(JSON.stringify(result).includes("private-key"),false);
});

test("UK Adzuna import reuses one source, credentials and daily provider",()=>{
  const importer=read("api/global-jobs-import.js");
  const routes=read("vercel.json");
  assert.match(importer,/fetchAdzunaJobs\(\{ appId:env\("ADZUNA_APP_ID"\),appKey:env\("ADZUNA_APP_KEY"\),countryCode:"gb"/);
  assert.match(importer,/source_name:"ADZUNA"/);assert.match(importer,/country_code:"GB"/);assert.match(importer,/salary_currency:"GBP"/);assert.match(importer,/syncAdzunaCountries/);
  assert.equal((importer.match(/name:"ADZUNA", run:/g)||[]).length,1);assert.doesNotMatch(importer,/ADZUNA_UK|ADZUNA_GB|ADZUNA_UK_APP/);
  assert.match(routes,/adzuna-jobs-import[^\n]+global-jobs-import\?provider=adzuna/);
});

test("UK display includes Adzuna and cross-source duplicate protection",()=>{
  const importer=read("api/global-jobs-import.js"),ui=read("web/jobs-centre-v148.js");
  assert.match(ui,/\["NHS Jobs","REED","ADZUNA"\]/);assert.match(ui,/Jobs by Adzuna/);assert.match(ui,/View and apply/);
  assert.match(importer,/deduplicateUkJobs/);assert.match(importer,/normalizedUrl/);assert.match(importer,/normalizedIdentity/);assert.match(importer,/"NHS Jobs":0,REED:1,ADZUNA:2/);assert.match(importer,/import_status:"duplicate"/);
});
