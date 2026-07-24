(()=>{'use strict';if(window.__btvBookLibraryV120)return;window.__btvBookLibraryV120=true;
function removeLegacyBookLink(){const learn=document.getElementById('learn');if(!learn?.querySelector('[data-module="books"]'))return;learn.querySelectorAll('[data-btv-books]').forEach(button=>button.remove())}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',removeLegacyBookLink,{once:true}):removeLegacyBookLink();
new MutationObserver(()=>requestAnimationFrame(removeLegacyBookLink)).observe(document.documentElement,{childList:true,subtree:true});
})();
