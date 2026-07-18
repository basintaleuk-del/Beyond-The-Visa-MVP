(function(){
 const CODES={cbt_short:'cbt_short',cbt_full:'cbt_full',nclex_short:'nclex_short',nclex_full:'nclex_full',ielts_short:'ielts_short',ielts_full:'ielts_full'};
 function code(){const tier=new URLSearchParams(location.search).get('tier')==='short'?'short':'full';if(/cbt\.html/i.test(location.pathname))return CODES['cbt_'+tier];if(/nclex\.html/i.test(location.pathname))return CODES['nclex_'+tier];return null}
 function bindStandalone(){const c=code(),b=document.getElementById('startMock');document.querySelector('[data-view="mock"]')?.click();if(!c||!b||b.dataset.coinsBound)return;b.dataset.coinsBound='1';b.addEventListener('click',async e=>{if(b.dataset.approved==='1'){b.dataset.approved='0';return}e.preventDefault();e.stopImmediatePropagation();await window.BTVCoins.start(c,()=>{b.dataset.approved='1';b.click()})},true)}
 function bindMain(){document.addEventListener('click',async e=>{const b=e.target.closest('[data-mock]');if(!b||b.dataset.approved==='1')return;e.preventDefault();e.stopImmediatePropagation();const requested=String(b.dataset.mock||'').toLowerCase(),tier=String(b.dataset.tier||'full').toLowerCase()==='short'?'short':'full',mockCode=requested.includes('cbt')?'cbt_'+tier:requested.includes('ielts')?'ielts_'+tier:requested.includes('osce')?'osce_full':requested.includes('calculation')?'calculations_full':'nclex_'+tier;await window.BTVCoins.start(mockCode,()=>{b.dataset.approved='1';b.click();setTimeout(()=>delete b.dataset.approved)})},true)}
 if(code())setTimeout(bindStandalone,300);else bindMain();
})();

