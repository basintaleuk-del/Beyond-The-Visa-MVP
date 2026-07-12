(()=>{
 'use strict';
 const params=new URLSearchParams(location.search);
 const returning=params.get('premium')==='return';
 const pending=localStorage.getItem('btv-premium-pending');
 const recovery=!localStorage.getItem('btv-premium-recovery-v305');
 if(!returning&&!pending&&!recovery)return;
 const reference=params.get('reference')||params.get('trxref')||(pending&&pending!=='pending'?pending:'');
 const sb=window.btvSupabase;if(!sb)return;
 async function verify(){
  localStorage.setItem('btv-premium-recovery-v305','attempted');
  const {data,error}=await sb.functions.invoke('verify-premium-payment',{body:{reference:reference||null}});
  if(error){
   let message=error.message;
   try{if(error.context&&typeof error.context.json==='function'){const detail=await error.context.json();message=detail?.error||message}}catch{}
   if(returning||pending)alert(message||'Your payment is still awaiting verification.');
   return;
  }
  if(data?.active){
   localStorage.removeItem('btv-premium-pending');
   localStorage.setItem('btv-premium','yes');
   window.dispatchEvent(new CustomEvent('btv:membership',{detail:{active:true,plan:'premium',subscription:{current_period_end:data.current_period_end}}}));
   history.replaceState({},'',`${location.pathname}?premium=confirmed`);
   alert('Payment verified. Premium features are now unlocked.');
   location.reload();
  }
 }
 setTimeout(verify,700);
})();
