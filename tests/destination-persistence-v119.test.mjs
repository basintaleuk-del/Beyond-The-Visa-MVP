import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function storage(seed={}){
  const values=new Map(Object.entries(seed));
  return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),value:key=>values.get(key)};
}

test('explicit destination survives stale profile hydration and browser Back',()=>{
  const local=storage({
    'btv-account':JSON.stringify({id:'user-1'}),
    'btv-v1':JSON.stringify({country:'au',done:{},costs:{}}),
    'btv-profile':JSON.stringify({destination:'au'})
  });
  const session=storage(),listeners={};
  const on=(type,handler)=>(listeners[type]??=[]).push(handler);
  const context={localStorage:local,sessionStorage:session,console,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},setTimeout:fn=>fn()};
  context.window=context;
  context.document={addEventListener:on};
  context.addEventListener=on;
  context.dispatchEvent=()=>{};
  vm.runInNewContext(fs.readFileSync('web/destination-sync-v111.js','utf8'),context);

  const button={dataset:{country:'us'}};
  listeners.click[0]({target:{closest:selector=>selector==='#countryGrid .country'?button:null}});
  assert.equal(context.BTVDestination.get(),'us');
  assert.equal(JSON.parse(local.value('btv-destination-choice-v119')).country,'us');

  local.setItem('btv-v1',JSON.stringify({country:'au',done:{},costs:{}}));
  local.setItem('btv-profile',JSON.stringify({destination:'au'}));
  listeners.popstate[0]();
  assert.equal(context.BTVDestination.get(),'us');
  assert.equal(JSON.parse(local.value('btv-v1')).country,'us');
  assert.equal(JSON.parse(local.value('btv-profile')).destination,'us');
});

test('authenticated profile cache preserves the account-scoped explicit choice',()=>{
  const index=fs.readFileSync('web/index.html','utf8');
  assert.match(index,/choice\.userId===user\.id&&countries\[choice\.country\]/);
  assert.match(index,/const destination=explicit\|\|profile\.destination\|\|'uk'/);
  assert.match(index,/destination-sync-v111\.js\?v=119/);
});
