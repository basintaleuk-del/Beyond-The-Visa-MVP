(()=>{
 'use strict';
 if(window.__btvAdminExperienceV307)return;window.__btvAdminExperienceV307=true;
 function start(){const side=document.querySelector('.sidebar');if(!side)return;if(!document.querySelector('.adminMobileMenu')){const b=document.createElement('button');b.className='adminMobileMenu';b.setAttribute('aria-label','Open admin navigation');b.textContent='☰';b.onclick=()=>side.classList.toggle('mobileOpen');document.body.append(b)}side.addEventListener('click',event=>{if(event.target.closest('[data-tab]')&&innerWidth<=850)side.classList.remove('mobileOpen')});document.querySelectorAll('input[type="search"],.toolbar input,.cmsToolbar input').forEach(x=>x.setAttribute('autocomplete','off'))}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();new MutationObserver(start).observe(document.documentElement,{childList:true,subtree:true});
})();
