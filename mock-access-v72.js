(function(){
 function code(){if(/cbt\.html/i.test(location.pathname))return 'cbt_full';if(/nclex\.html/i.test(location.pathname))return 'nclex_full';return null}
 function bindStandalone(){const c=code(),b=document.getElementById('startMock');if(!c||!b||b.dataset.coinsBound)return;b.dataset.coinsBound='1';b.addEventListener('click',async e=>{if(b.dataset.approved==='1'){b.dataset.approved='0';return}e.preventDefault();e.stopImmediatePropagation();await window.BTVCoins.start(c,()=>{b.dataset.approved='1';b.click()})},true)}
 function bindMain(){document.addEventListener('click',async e=>{const b=e.target.closest('[data-mock]');if(!b||b.dataset.approved==='1')return;e.preventDefault();e.stopImmediatePropagation();await window.BTVCoins.start('nclex_full',()=>{b.dataset.approved='1';b.click();setTimeout(()=>delete b.dataset.approved)})},true)}
 if(code())setTimeout(bindStandalone,300);else bindMain();
})();
