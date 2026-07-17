(()=>{
 if(window.__btvHeader84)return;window.__btvHeader84=true;
 const db=()=>window.btvSupabase;
 async function balance(){
  const button=document.getElementById('headerCoins81');if(!button)return;
  if(!button.querySelector('[data-coin-icon-v84]'))button.innerHTML='<img data-coin-icon-v84 src="beyond-coin-v84.png" alt=""><b data-coin-balance-v84>0 BC</b>';
  try{const session=(await db()?.auth?.getSession())?.data?.session;if(!session)return;const result=await db().from('btv_wallets').select('balance').eq('user_id',session.user.id).maybeSingle();const amount=Number(result.data?.balance)||0;button.querySelector('[data-coin-balance-v84]').textContent=amount.toLocaleString()+' BC'}catch(error){console.warn('Coin balance unavailable',error)}
 }
 function logo(){const image=document.querySelector('.brandV83 img');if(image&&image.getAttribute('src')!=='brand-logo-v84.png')image.src='brand-logo-v84.png'}
 function install(){logo();balance()}
 install();setTimeout(install,500);setTimeout(install,1600);
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})}).observe(document.documentElement,{childList:true,subtree:true});
 window.addEventListener('btv:wallet-changed',()=>setTimeout(balance,80));
})();
