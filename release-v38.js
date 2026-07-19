(()=>{
 'use strict';
 if(window.__btvReleaseV38)return;window.__btvReleaseV38=true;
 const requested=sessionStorage.getItem('btv-return-screen')==='learn';
 if(!requested)return;
 sessionStorage.removeItem('btv-return-screen');
 const restore=()=>{
  if(typeof window.openScreen==='function')window.openScreen('learn');
  else{
   document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('active',screen.id==='learn'));
   document.querySelectorAll('.nav').forEach(button=>button.classList.toggle('active',button.dataset.open==='learn'));
  }
  scrollTo({top:0,left:0,behavior:'auto'});
 };
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',restore):restore();
 setTimeout(restore,500);
 setTimeout(restore,1200);
})();
