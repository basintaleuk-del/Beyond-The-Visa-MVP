(()=>{
  "use strict";
  const VERSION="178";
  const cache={data:null,at:0,promise:null};
  const esc=value=>String(value??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  const coins=value=>`${Number(value||0).toLocaleString("en-GB")} BC`;
  const date=value=>value?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value)):"—";
  const db=()=>window.btvSupabase;
  const toast=message=>window.toast?.(message);

  async function snapshot(force=false,before=null){
    if(!db()) throw new Error("Wallet service is unavailable.");
    if(!force&&!before&&cache.data&&Date.now()-cache.at<30000) return cache.data;
    if(cache.promise&&!before) return cache.promise;
    const request=db().rpc("btv_coin_wallet_snapshot",{p_history_limit:20,p_history_before:before});
    const promise=request.then(({data,error})=>{if(error)throw error;if(!data?.success)throw new Error("Sign in to open your wallet.");if(!before){cache.data=data;cache.at=Date.now()}return data}).finally(()=>{cache.promise=null});
    if(!before)cache.promise=promise;
    return promise;
  }
  function invalidate(){cache.data=null;cache.at=0;document.dispatchEvent(new CustomEvent("btv:wallet-changed"))}

  function icon(type){return {earn:"↗",spend:"↙",pending:"◷",reward:"✦"}[type]||"◆"}
  function transactionType(row){if(row.status==="pending")return"pending";if(Number(row.amount)>0)return"earn";return"spend"}
  function nextAction(data){const available=(data.opportunities||[]).find(x=>x.claim_mode!=="automatic");return available||null}
  function levelProgress(data){const earned=Number(data.wallet?.lifetime_earned||0),start=Number(data.level?.minimum_lifetime_earned||0),end=Number(data.next_level?.minimum_lifetime_earned||start||1);return data.next_level?Math.max(0,Math.min(100,Math.round((earned-start)/(end-start)*100))):100}

  function shell(){
    let dialog=document.getElementById("btvCoins178");
    if(dialog)return dialog;
    dialog=document.createElement("dialog");dialog.id="btvCoins178";dialog.className="btvCoins178";
    dialog.addEventListener("cancel",event=>{event.preventDefault();dialog.close()});
    dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
    document.body.append(dialog);return dialog;
  }
  function loading(dialog){dialog.innerHTML=`<main class="coinApp178 coinLoading178" aria-busy="true"><div class="coinMark178">B</div><h2>Opening your Beyond Coins wallet</h2><p>Checking your secure balance and latest activity…</p></main>`}
  function errorView(dialog,error){dialog.innerHTML=`<main class="coinApp178 coinError178"><button data-close aria-label="Close">×</button><div class="coinMark178">B</div><h2>We could not open your wallet</h2><p>${esc(error?.message||"Please try again.")}</p><button data-retry>Try again</button></main>`;dialog.querySelector("[data-close]").onclick=()=>dialog.close();dialog.querySelector("[data-retry]").onclick=()=>open(true)}

  function render(dialog,data,active="overview"){
    const wallet=data.wallet||{}, progress=data.progress||{}, pct=levelProgress(data), action=nextAction(data), featured=(data.rewards||[]).find(x=>x.featured)||(data.rewards||[])[0];
    const tabs=["overview","earn","rewards","challenges","history","buy","how"], labels={overview:"Overview",earn:"Earn",rewards:"Rewards",challenges:"Challenges",history:"History",buy:"Buy",how:"How it works"};
    dialog.innerHTML=`<main class="coinApp178">
      <header class="coinTop178"><div class="coinBrand178"><span class="coinMark178">B</span><div><small>BEYOND THE VISA</small><b>Beyond Coins</b></div></div><div class="coinTopActions178"><span class="coinLevelPill178">${esc(data.level?.badge||"Explorer")}</span><button data-refresh aria-label="Refresh wallet">↻</button><button data-close aria-label="Close wallet">×</button></div></header>
      ${(data.campaigns||[]).map(c=>`<aside class="coinCampaign178"><b>${esc(c.name)}</b><span>${esc(c.banner_message||`${Number(c.multiplier||1)}× eligible rewards until ${date(c.ends_at)}`)}</span></aside>`).join("")}
      <nav class="coinTabs178" aria-label="Wallet sections">${tabs.map(tab=>`<button data-tab="${tab}" class="${tab===active?"active":""}">${labels[tab]}</button>`).join("")}</nav>
      <div class="coinBody178">${panel(active,data,{wallet,progress,pct,action,featured})}</div>
    </main>`;
    wire(dialog,data,active);
  }

  function panel(active,data,ctx){
    const {wallet,progress,pct,action,featured}=ctx;
    if(active==="overview")return `<section class="coinOverview178">
      <div class="coinHero178"><div><small>AVAILABLE BALANCE</small><strong>${coins(wallet.balance)}</strong><p>Ready to use across eligible Beyond The Visa resources.</p></div><div class="coinHeroStats178"><span><small>Pending</small><b>${coins(wallet.pending_balance)}</b></span><span><small>Earned today</small><b>${coins(data.earned_today)}</b></span><span><small>Expiring in 30 days</small><b>${coins(data.expiring_soon)}</b></span></div></div>
      <div class="coinMetrics178"><article><small>LIFETIME EARNED</small><b>${coins(wallet.lifetime_earned)}</b></article><article><small>LIFETIME SPENT</small><b>${coins(wallet.lifetime_spent)}</b></article><article><small>CURRENT STREAK</small><b>${Number(progress.current_streak||0)} days</b></article></div>
      <div class="coinGrid178"><article class="coinLevel178"><span>YOUR LEVEL</span><h2>${esc(data.level?.name||"Explorer")}</h2><p>${data.next_level?`${coins(Number(data.next_level.minimum_lifetime_earned)-Number(wallet.lifetime_earned))} to ${esc(data.next_level.name)}`:"Highest level reached"}</p><div role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><small>${pct}% progress</small></article>
      <article class="coinNext178"><span>BEST NEXT ACTION</span><h2>${esc(action?.title||"Keep building your journey")}</h2><p>${esc(action?.description||"Explore the latest challenges and rewards.")}</p>${action?`<button data-claim="${esc(action.code)}">Check & claim ${coins(action.coin_reward)}</button>`:`<button data-tab="challenges">View challenges</button>`}</article></div>
      ${featured?`<article class="coinFeatured178"><div><span>FEATURED REWARD</span><h2>${esc(featured.name)}</h2><p>${esc(featured.benefit_summary||featured.description||"")}</p></div><div><b>${coins(featured.coin_cost)}</b><button data-redeem="${esc(featured.code)}" data-cost="${Number(featured.coin_cost||0)}">Redeem</button></div></article>`:""}
      <section class="coinRecent178"><div><h2>Recent activity</h2><button data-tab="history">View all</button></div>${historyRows((data.history||[]).slice(0,5))}</section>
    </section>`;
    if(active==="earn")return `<section class="coinPage178"><div class="coinPageHead178"><span>EARN WITH PURPOSE</span><h1>Useful progress, recognised.</h1><p>Rewards are issued only after the platform verifies the underlying activity. Limits protect the community from abuse.</p></div><div class="coinCardGrid178">${(data.opportunities||[]).map(x=>`<article><span>${esc((x.category||"progress").toUpperCase())}</span><h2>${esc(x.title)}</h2><p>${esc(x.description)}</p><footer><b>+${coins(x.coin_reward)}</b><button data-claim="${esc(x.code)}">${x.claim_mode==="automatic"?"Check status":"Check & claim"}</button></footer></article>`).join("")||empty("No earning activities are available right now.")}</div></section>`;
    if(active==="rewards")return `<section class="coinPage178"><div class="coinPageHead178"><span>REWARD MARKETPLACE</span><h1>Turn progress into practical support.</h1><p>Confirm the benefit, usage terms and cost before every redemption.</p></div><div class="coinCardGrid178 coinRewards178">${(data.rewards||[]).map(x=>`<article class="${x.featured?"featured":""}"><span>${x.featured?"FEATURED":"REWARD"}</span><h2>${esc(x.name)}</h2><p>${esc(x.benefit_summary||x.description||"")}</p><small>${esc(x.usage_terms||"Terms are shown before redemption.")}</small><footer><b>${coins(x.coin_cost)}</b><button data-redeem="${esc(x.code)}" data-cost="${Number(x.coin_cost||0)}" ${Number(wallet.balance)<Number(x.coin_cost)?"disabled":""}>Redeem</button></footer></article>`).join("")||empty("New rewards are being prepared.")}</div><section class="coinPurchases178"><div><h2>Your purchased items</h2><span>${(data.entitlements||[]).length} entitlement${(data.entitlements||[]).length===1?"":"s"}</span></div>${(data.entitlements||[]).length?`<div class="coinHistory178">${data.entitlements.map(e=>{const product=(data.rewards||[]).find(x=>x.id===e.product_id);return`<article><i>✓</i><div><b>${esc(product?.name||"Purchased reward")}</b><small>${esc(e.status)} · ${Number(e.attempts_used||0)} of ${Number(e.attempts_total||0)} used${e.expires_at?` · expires ${date(e.expires_at)}`:""}</small></div></article>`}).join("")}</div>`:empty("Your redeemed resources will appear here.")}</section></section>`;
    if(active==="challenges")return `<section class="coinPage178"><div class="coinPageHead178"><span>ACTIVE CHALLENGES</span><h1>Small milestones. Visible momentum.</h1><p>Challenge progress is calculated from verified activity already saved in your account.</p></div><div class="coinChallengeList178">${(data.challenges||[]).map(x=>{const pc=Math.min(100,Math.round(Number(x.progress||0)/Number(x.target||1)*100));return`<article><div><span>${esc(x.cadence.toUpperCase())}</span><h2>${esc(x.name)}</h2><p>${esc(x.description)}</p></div><div class="coinChallengeProgress178"><b>${Number(x.progress||0)} / ${Number(x.target)}</b><div><i style="width:${pc}%"></i></div><small>Ends ${date(x.ends_at)}</small></div><button data-challenge="${esc(x.id)}" ${!x.completed_at||x.claimed_at?"disabled":""}>${x.claimed_at?"Claimed":x.completed_at?`Claim ${coins(x.coin_reward)}`:"In progress"}</button></article>`}).join("")||empty("There are no active challenges today.")}</div></section>`;
    if(active==="history")return `<section class="coinPage178"><div class="coinPageHead178"><span>TRANSACTION HISTORY</span><h1>Every coin, accounted for.</h1><p>Pending, earned, spent, refunded and expired entries remain visible as an audit trail.</p></div><div class="coinFilters178"><button class="active" data-filter="all">All</button><button data-filter="earn">Earned</button><button data-filter="spend">Spent</button><button data-filter="pending">Pending</button></div><div data-history-list>${historyRows(data.history||[])}</div>${(data.history||[]).length>=20?`<button class="coinLoad178" data-load-more>Load older activity</button>`:""}</section>`;
    if(active==="buy")return `<section class="coinPage178"><div class="coinPageHead178"><span>COIN TOP-UPS</span><h1>Add coins securely.</h1><p>Purchases use the existing verified payment flow. Coins are added only after server-side payment confirmation.</p></div><div id="coinPackages178" class="coinCardGrid178">${empty("Loading available packages…")}</div><aside class="coinSafety178"><b>Protected checkout</b><p>No card details are stored by Beyond The Visa. Failed or duplicate payment callbacks cannot credit the same purchase twice.</p></aside></section>`;
    return `<section class="coinPage178 coinHow178"><div class="coinPageHead178"><span>CLEAR RULES</span><h1>How Beyond Coins work.</h1></div><div class="coinHowGrid178"><article><b>1</b><h2>Earn through verified progress</h2><p>Complete meaningful profile, journey, learning, job or mentor activities. Server-side checks and limits decide eligibility.</p></article><article><b>2</b><h2>Available and pending are separate</h2><p>Available coins can be spent. Pending coins are under review and cannot be used until released.</p></article><article><b>3</b><h2>Redeem with confirmation</h2><p>Every redemption shows its cost and terms, then uses one atomic ledger transaction to prevent double spending.</p></article><article><b>4</b><h2>Expiry is transparent</h2><p>Only rewards with an expiry date can expire. The wallet shows coins approaching expiry and preserves the expiry ledger entry.</p></article></div><div class="coinReferral178"><div><span>INVITE RESPONSIBLY</span><h2>Your referral code</h2><p>Rewards are not instant. A referred member must verify their email, complete onboarding and pass eligibility review.</p></div><code>${esc(data.referral_code||"Unavailable")}</code><button data-copy-referral>Copy code</button></div><p class="coinFine178">Beyond Coins are a closed-loop loyalty credit, not cash, cryptocurrency, stored money or an investment. They are non-transferable and have no cash value.</p></section>`;
  }

  function empty(text){return`<div class="coinEmpty178"><span>◇</span><p>${esc(text)}</p></div>`}
  function historyRows(rows){return `<div class="coinHistory178">${rows.map(row=>{const type=transactionType(row);return`<article data-kind="${type}"><i>${icon(type)}</i><div><b>${esc(row.description||row.transaction_type)}</b><small>${date(row.created_at)} · ${esc(row.status||"completed")}</small></div><strong class="${Number(row.amount)>=0?"plus":"minus"}">${Number(row.amount)>=0?"+":""}${coins(row.amount)}</strong></article>`}).join("")||empty("No wallet activity yet.")}</div>`}

  async function claim(code,relatedId=null,button){
    button&&(button.disabled=true,button.textContent="Checking…");
    try{const {data,error}=await db().rpc("btv_coin_claim_reward",{p_code:code,p_related_id:relatedId});if(error)throw error;if(!data?.success)throw new Error(data?.message||String(data?.code||"Reward unavailable").replaceAll("_"," ").toLowerCase());toast(data.already_claimed?"This reward is already recorded":data.status==="pending"?`${data.coins} BC is pending review`:`${data.coins} BC added`);invalidate();return data}catch(error){toast(error.message||"Reward could not be claimed");return null}finally{if(button){button.disabled=false;button.textContent="Check & claim"}}
  }
  async function redeem(code,cost,button){
    if(!confirm(`Redeem ${coins(cost)} for this reward? This creates a permanent wallet ledger entry.`))return;
    button.disabled=true;button.textContent="Redeeming…";
    try{const key=`wallet-v178:${code}:${crypto.randomUUID()}`;const {data,error}=await db().rpc("btv_purchase_resource",{p_product_code:code,p_idempotency_key:key});if(error)throw error;toast(data?.already_processed?"This redemption was already processed":"Reward redeemed successfully");invalidate();await open(true,"rewards")}catch(error){toast(error.message||"Redemption failed")}finally{button.disabled=false;button.textContent="Redeem"}
  }
  async function loadPackages(dialog){
    const host=dialog.querySelector("#coinPackages178");if(!host)return;
    const {data,error}=await db().from("btv_coin_packages").select("id,code,title,coin_amount,bonus_coins,price_minor,currency,promotional_label").eq("is_active",true).order("sort_order");
    if(error){host.innerHTML=empty("Top-up packages are temporarily unavailable.");return}
    host.innerHTML=(data||[]).map(x=>`<article class="${x.promotional_label?"featured":""}"><span>${esc(x.promotional_label||"TOP-UP")}</span><h2>${coins(Number(x.coin_amount||0)+Number(x.bonus_coins||0))}</h2><p>${esc(x.title)}</p><footer><b>${new Intl.NumberFormat("en-GB",{style:"currency",currency:x.currency||"GBP"}).format(Number(x.price_minor||0)/100)}</b><button data-buy-id="${esc(x.id)}">Buy securely</button></footer></article>`).join("")||empty("No packages are currently available.");
    host.querySelectorAll("[data-buy-id]").forEach(button=>button.onclick=async()=>{button.disabled=true;button.textContent="Opening checkout…";const {data:checkout,error:checkoutError}=await db().functions.invoke("coin-checkout",{body:{package_id:button.dataset.buyId}});if(checkoutError||checkout?.error){toast(checkout?.error||"Secure checkout could not be opened");button.disabled=false;button.textContent="Buy securely";return}location.assign(checkout.url)});
  }
  function wire(dialog,data,active){
    dialog.querySelector("[data-close]").onclick=()=>dialog.close();
    dialog.querySelector("[data-refresh]").onclick=()=>open(true,active);
    dialog.querySelectorAll("[data-tab]").forEach(button=>button.onclick=()=>render(dialog,data,button.dataset.tab));
    dialog.querySelectorAll("[data-claim]").forEach(button=>button.onclick=async()=>{if(await claim(button.dataset.claim,null,button))await open(true,active)});
    dialog.querySelectorAll("[data-redeem]").forEach(button=>button.onclick=()=>redeem(button.dataset.redeem,button.dataset.cost,button));
    dialog.querySelectorAll("[data-challenge]").forEach(button=>button.onclick=async()=>{button.disabled=true;const {data:result,error}=await db().rpc("btv_claim_coin_challenge",{p_challenge:button.dataset.challenge});if(error||!result?.success)toast(error?.message||"Challenge reward is not ready");else{toast(`${result.coins} BC added`);invalidate();await open(true,"challenges")}});
    dialog.querySelectorAll("[data-filter]").forEach(button=>button.onclick=()=>{dialog.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===button));dialog.querySelectorAll("[data-history-list] [data-kind]").forEach(row=>row.hidden=button.dataset.filter!=="all"&&row.dataset.kind!==button.dataset.filter)});
    dialog.querySelector("[data-load-more]")?.addEventListener("click",async event=>{event.currentTarget.disabled=true;const rows=data.history||[],older=await snapshot(true,rows.at(-1)?.created_at);data.history=[...rows,...(older.history||[])];render(dialog,data,"history")});
    dialog.querySelector("[data-copy-referral]")?.addEventListener("click",async()=>{await navigator.clipboard.writeText(data.referral_code||"");toast("Referral code copied")});
    if(active==="buy")loadPackages(dialog);
  }
  async function open(force=false,active="overview"){
    const dialog=shell();loading(dialog);if(!dialog.open)dialog.showModal();
    try{render(dialog,await snapshot(force),active)}catch(error){console.warn("Beyond Coins wallet",error);errorView(dialog,error)}
  }
  async function hydrateDashboard(){
    const host=document.querySelector("[data-coins-widget178]");if(!host)return;
    try{const data=await snapshot(),pct=levelProgress(data),action=nextAction(data);host.innerHTML=`<div><span>BEYOND COINS</span><strong>${coins(data.wallet?.balance)}</strong><small>${coins(data.earned_today)} earned today · ${Number(data.progress?.current_streak||0)} day streak</small></div><div class="coinWidgetLevel178"><b>${esc(data.level?.name||"Explorer")}</b><div><i style="width:${pct}%"></i></div><small>${action?esc(action.title):"View active rewards"}</small></div><button type="button">View wallet</button>`;host.querySelector("button").onclick=()=>open() }catch(error){host.innerHTML=`<div><span>BEYOND COINS</span><strong>Wallet available</strong><small>Open to check your secure balance.</small></div><button type="button">View wallet</button>`;host.querySelector("button").onclick=()=>open()}
  }
  async function activity(event){const {code,relatedId}=event.detail||{};if(!code)return;await claim(code,relatedId,null);}
  window.addEventListener("btv:coin-activity",activity);
  document.addEventListener("btv:wallet-changed",()=>hydrateDashboard());
  new MutationObserver(()=>{if(document.querySelector("[data-coins-widget178] [data-open-wallet178]"))hydrateDashboard()}).observe(document.documentElement,{childList:true,subtree:true});
  window.BTVBeyondCoins178={open,hydrateDashboard,claimActivity:(code,relatedId)=>claim(code,relatedId,null),invalidate,version:VERSION};
})();
