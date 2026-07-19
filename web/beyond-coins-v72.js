(function(){
 const active=new Map();
 const supa=()=>window.btvSupabase;
 async function session(){return (await supa()?.auth?.getSession())?.data?.session||null}
 function modal(title,body,confirm='Continue'){
  return new Promise(resolve=>{const wrap=document.createElement('div');wrap.className='btv-modal-backdrop';wrap.innerHTML=`<div class="btv-modal" role="dialog" aria-modal="true"><span class="btv-coin">◆ Beyond Coins</span><h2>${title}</h2><p>${body}</p><div class="btv-modal-actions"><button class="secondary">Not now</button><button class="primary">${confirm}</button></div></div>`;document.body.append(wrap);const done=v=>{wrap.remove();resolve(v)};wrap.querySelector('.secondary').onclick=()=>done(false);wrap.querySelector('.primary').onclick=()=>done(true);wrap.onclick=e=>{if(e.target===wrap)done(false)}})
 }
 async function wallet(){const s=await session();if(!s)return null;let {data,error}=await supa().from('btv_wallets').select('balance').eq('user_id',s.user.id).maybeSingle();if(error)throw error;if(!data){const boot=await supa().rpc('btv_bootstrap_user',{p_user:s.user.id});if(boot.error)throw boot.error;({data,error}=await supa().from('btv_wallets').select('balance').eq('user_id',s.user.id).single());if(error)throw error}return Number(data.balance||0)}
 async function start(code,onApproved){
  try{const s=await session();if(!s){alert('Please sign in before starting a full mock examination.');return false}
   const {data:catalog,error:ce}=await supa().from('btv_mock_catalog').select('title,coin_cost').eq('code',code).eq('is_active',true).single();if(ce)throw ce;
   const balance=await wallet(),cost=Number(catalog.coin_cost||50);if(!(await modal(catalog.title,`This full mock costs ${cost} Beyond Coins. Your balance is ${balance} BC. If you leave, you can resume the same attempt without paying twice.`,balance>=cost?'Start mock':'View wallet')))return false;
   if(balance<cost){window.BTVPlatform?.open('wallet');return false}
   let key=sessionStorage.getItem('btv-mock-key:'+code);if(!key){key=crypto.randomUUID();sessionStorage.setItem('btv-mock-key:'+code,key)}
   const {data,error}=await supa().functions.invoke('start-mock',{body:{mock_code:code,client_session_key:key}});if(error)throw error;if(data?.error)throw new Error(data.error);const sessionData=data?.session||data,sessionId=sessionData?.id||sessionData?.session_id;if(!sessionId)throw new Error('The mock session could not be created.');active.set(code,sessionId);onApproved?.(sessionData);window.dispatchEvent(new CustomEvent('btv:wallet-changed'));return true
  }catch(e){console.error(e);alert(e?.message||'The mock could not be started. Please try again.');return false}
 }
 async function complete(code,score,total,breakdown={}){try{const id=active.get(code);if(!id)return;const {error,data}=await supa().functions.invoke('complete-mock',{body:{session_id:id,score:Number(score||0),time_used_seconds:Number(breakdown.time_used_seconds||0),answers:breakdown.answers||breakdown,estimated_band:breakdown.estimated_band??null,total:Number(total||0)}});if(error)throw error;if(data?.error)throw new Error(data.error);active.delete(code);sessionStorage.removeItem('btv-mock-key:'+code);window.dispatchEvent(new CustomEvent('btv:wallet-changed'))}catch(e){console.error('Mock completion sync failed',e)}}
 window.BTVCoins={wallet,start,complete,modal};
})();
