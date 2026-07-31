import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root=path.resolve(import.meta.dirname,".."),read=(file)=>fs.readFileSync(path.join(root,file),"utf8"),require=createRequire(import.meta.url);
const core=require(path.join(root,"api/_lib/reed-core.cjs"));
const fixture={jobId:12345,jobTitle:"Registered Nurse - ICU",employerName:"Example Care Group",locationName:"Manchester",minimumSalary:35000,maximumSalary:42000,currency:"GBP",expirationDate:"2026-08-31T23:59:59Z",date:"2026-07-31T09:00:00Z",jobUrl:"https://www.reed.co.uk/jobs/registered-nurse/12345",contractType:"Permanent",fullTime:true,partTime:false,jobDescription:"<b>Provide safe nursing care.</b><script>alert(1)</script>"};

test("Reed records use the existing UK jobs contract",()=>{
  const row=core.normalizeItem(fixture,fixture,new Date("2026-07-31T12:00:00Z"));
  assert.equal(row.external_id,"12345");assert.equal(row.source_name,"REED");assert.equal(row.country,"uk");assert.equal(row.country_name,"United Kingdom");assert.equal(row.salary_currency,"GBP");
  assert.equal(row.employer,"Example Care Group");assert.equal(row.location,"Manchester");assert.equal(row.work_pattern,"Full-time");assert.equal(row.status,"published");
  assert.equal(row.description.includes("<"),false);assert.equal(row.visa_sponsorship,false);assert.equal(row.canonical_url,"https://www.reed.co.uk/jobs/registered-nurse/12345");
});

test("Reed uses Basic authentication with the API key as username and an empty password",async()=>{
  let captured;
  const result=await core.testConnection({apiKey:"private-reed-key",fetchImpl:async(url,options)=>{captured={url:new URL(String(url)),authorization:options.headers.Authorization};return{ok:true,status:200,json:async()=>({totalResults:20,results:[fixture]})};}});
  assert.equal(captured.url.origin+captured.url.pathname,"https://www.reed.co.uk/api/1.0/search");assert.equal(captured.url.searchParams.get("keywords"),"Registered Nurse");assert.equal(captured.url.searchParams.has("locationName"),false);assert.equal(captured.url.searchParams.get("resultsToTake"),"5");
  assert.equal(Buffer.from(captured.authorization.slice(6),"base64").toString(),"private-reed-key:");assert.equal(result.authentication_succeeded,true);assert.equal(JSON.stringify(result).includes("private-reed-key"),false);
});

test("Reed trims the environment value before constructing Basic authentication",()=>{
  const header=core.basicAuthorization("  private-reed-key\r\n");
  assert.equal(Buffer.from(header.slice(6),"base64").toString(),"private-reed-key:");
  assert.equal(header.startsWith("Basic "),true);assert.equal(header.includes("Bearer"),false);
});

test("Reed connection handles missing credentials, rejection, timeout and empty results",async()=>{
  assert.match((await core.testConnection({apiKey:""})).error,/required/);
  const rejected=await core.testConnection({apiKey:"bad",fetchImpl:async()=>({ok:false,status:401,json:async()=>({})})});assert.match(rejected.error,/rejected/);assert.equal(rejected.http_status,401);
  const timeout=await core.testConnection({apiKey:"key",fetchImpl:async()=>{const error=new Error("late");error.name="TimeoutError";throw error;}});assert.match(timeout.error,/timed out/);
  const empty=await core.testConnection({apiKey:"key",fetchImpl:async()=>({ok:true,status:200,json:async()=>({totalResults:0,results:[]})})});assert.equal(empty.authentication_succeeded,true);assert.equal(empty.jobs_found,0);
});

test("Reed importer searches requested nursing roles and loads job details",async()=>{
  const searches=[],details=[];
  const result=await core.fetchReedJobs({apiKey:"key",fetchImpl:async(url)=>{const parsed=new URL(String(url));if(parsed.pathname==="/api/1.0/search"){searches.push(parsed.searchParams.get("keywords"));return{ok:true,status:200,json:async()=>({results:[{...fixture,jobId:1000+searches.length,jobUrl:`https://www.reed.co.uk/jobs/nurse/${1000+searches.length}`} ]})};}details.push(parsed.pathname);return{ok:true,status:200,json:async()=>({...fixture,jobId:Number(parsed.pathname.split("/").at(-1)),jobUrl:`https://www.reed.co.uk/jobs/nurse/${parsed.pathname.split("/").at(-1)}`})};}});
  for(const term of ["Registered Nurse","Staff Nurse","Theatre Nurse","ICU Nurse","Mental Health Nurse","Practice Nurse","Care Home Nurse","Nursing Home Nurse","Healthcare Assistant"])assert.ok(searches.includes(term));
  assert.equal(searches.length,9);assert.equal(details.length,9);assert.equal(result.records.length,9);
});

test("Reed sample import is limited to ten Registered Nurse search results",async()=>{
  let search;
  const result=await core.fetchReedJobs({apiKey:"key",sample:true,fetchImpl:async(url)=>{const parsed=new URL(String(url));if(parsed.pathname==="/api/1.0/search"){search=parsed;return{ok:true,status:200,json:async()=>({results:[fixture]})};}return{ok:true,status:200,json:async()=>fixture};}});
  assert.equal(search.searchParams.get("keywords"),"Registered Nurse");assert.equal(search.searchParams.get("resultsToTake"),"10");assert.equal(result.searchesRun,1);assert.equal(result.records.length,1);
});

test("Reed routes, database upsert and UI preserve established sources",()=>{
  const importer=read("api/global-jobs-import.js"),routes=read("vercel.json"),ui=read("web/jobs-centre-v272.js"),admin=read("web/admin-opportunity-imports-v142.js"),sql=read("supabase/migrations/20260731150000_reed_uk_nursing_v271.sql");
  assert.match(importer,/REED_API_KEY/);assert.doesNotMatch(importer,/NEXT_PUBLIC_REED/);assert.match(importer,/on_conflict=source_name,external_id/);assert.match(importer,/name:"REED"/);
  assert.match(routes,/reed-jobs-connection-test/);assert.match(routes,/provider=reed/);assert.match(routes,/reed-jobs-sample/);
  assert.match(admin,/data-test-reed/);assert.match(admin,/data-sync-reed/);
  assert.match(ui,/\["NHS Jobs","REED","ADZUNA"\]/);assert.match(ui,/isReed\?"REED":"NHS JOBS"/);assert.match(ui,/"View and apply"/);assert.match(ui,/Source: Reed/);
  assert.match(sql,/btv_jobs_source_external_id_full_uq/);assert.match(sql,/'REED','job'/);assert.doesNotMatch(sql,/update public\.btv_jobs|delete from public\.btv_jobs/);
});
