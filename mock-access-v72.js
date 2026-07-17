(function(){
 function code(){if(/cbt\.html/i.test(location.pathname))return 'cbt_full';if(/nclex\.html/i.test(location.pathname))return 'nclex_full';return null}
 function bindStandalone(){const c=code(),b=document.getElementById('startMock');if(!c||!b||b.dataset.coinsBound)return;b.dataset.coinsBound='1';b.addEventListener('click',async e=>{if(b.dataset.approved==='1'){b.dataset.approved='0';return}e.preventDefault();e.stopImmediatePropagation();await window.BTVCoins.start(c,()=>{b.dataset.approved='1';b.click()})},true)}
 function bindMain(){document.addEventListener('click',async e=>{const b=e.target.closest('[data-mock]');if(!b||b.dataset.approved==='1')return;e.preventDefault();e.stopImmediatePropagation();const requested=String(b.dataset.mock||'').toLowerCase(),mockCode=requested.includes('cbt')?'cbt_full':requested.includes('ielts')?'ielts_full':requested.includes('osce')?'osce_full':requested.includes('calculation')?'calculations_full':'nclex_full';await window.BTVCoins.start(mockCode,()=>{b.dataset.approved='1';b.click();setTimeout(()=>delete b.dataset.approved)})},true)}
 if(code())setTimeout(bindStandalone,300);else bindMain();
})();
