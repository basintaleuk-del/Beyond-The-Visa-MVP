import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");

test("v249 is the final client-only Beyond Coins presentation layer",async()=>{
  const [index,css]=await Promise.all([read("web/index.html"),read("web/beyond-coins-v249.css")]);
  assert.match(index,/beyond-coins-v249\.css\?v=249/);
  assert.match(index,/beyond-coins-v178\.js\?v=249/);
  assert.ok(index.indexOf("beyond-coins-v204.css")<index.indexOf("beyond-coins-v249.css"));
  assert.match(css,/#btvCoins178/);
  assert.doesNotMatch(css,/#coinsCentre112|admin-coins|admin\.html/);
});

test("the transaction centre keeps every wallet destination visible and responsive",async()=>{
  const [css,js]=await Promise.all([read("web/beyond-coins-v249.css"),read("web/beyond-coins-v178.js")]);
  assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/overflow-x:auto!important/);
  assert.match(css,/min-height:44px!important/);
  for(const label of ["Overview","Earn coins","Rewards","Challenges","Transactions","Buy coins","How it works"])assert.match(js,new RegExp(label));
});

test("premium safeguards preserve canonical server-authorised transaction calls",async()=>{
  const js=await read("web/beyond-coins-v178.js");
  for(const marker of ["coinLive249","coinTrustRail249","Verified ledger","Owner protected","Atomic checkout"])assert.match(js,new RegExp(marker));
  for(const backend of ["btv_coin_wallet_snapshot","btv_coin_claim_reward","btv_purchase_resource","coin-checkout"])assert.match(js,new RegExp(backend));
  assert.match(js,/wallet\.balance/);
  assert.match(js,/wallet\.lifetime_earned/);
  assert.match(js,/data\.history/);
});
