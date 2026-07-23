(()=>{
  'use strict';
  const stack=[];let goingBack=false;
  function activeScreen(){return document.querySelector('.screen.active')?.id||''}
  function fallback(){if(location.pathname.endsWith('/index.html')||location.pathname.endsWith('/')){window.openScreen?.('home');return}location.href='index.html'}
  function back(){if(stack.length&&window.openScreen){goingBack=true;window.openScreen(stack.pop());goingBack=false;return}let same=false;try{same=Boolean(document.referrer)&&new URL(document.referrer).origin===location.origin}catch{}if(same&&history.length>1){history.back();return}fallback()}
  function wrap(){if(typeof window.openScreen!=='function'||window.__btvHistoryWrapped108)return;window.__btvHistoryWrapped108=true;const original=window.openScreen;window.openScreen=function(id){const current=activeScreen();if(!goingBack&&current&&current!==id)stack.push(current);return original.apply(this,arguments)}}
  function ensure(){wrap();const app=document.getElementById('appShell');if(app&&app.hidden)return;const current=document.querySelector('.screen.active');if(current){const title=current.querySelector('.pageTitle,.communityTop108,.learnV90Header,.mainHeader73');if(title&&!title.querySelector('.back,[data-history-back]')){const button=document.createElement('button');button.type='button';button.className='btvInjectedBack108';button.dataset.historyBack='1';button.setAttribute('aria-label','Go back to previous page');button.textContent='←';title.prepend(button)}}}
  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-history-back],a.back,button.back,.sidefoot a[href*="index.html"],a.legalBack108');if(!trigger)return;event.preventDefault();event.stopPropagation();back()},true);
  const style=document.createElement('style');style.textContent='.btvInjectedBack108{flex:none;width:42px;height:42px;border:1px solid #cfddd4;border-radius:13px;background:#fff;color:#285440;display:grid;place-items:center;font-size:20px;font-weight:900;cursor:pointer}.btvInjectedBack108:focus-visible{outline:3px solid #d5b24f;outline-offset:2px}.mainHeader73>.btvInjectedBack108{margin-right:4px}@media(max-width:640px){.mainHeader73>.btvInjectedBack108{width:38px;height:38px}}';document.head.append(style);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',ensure,{once:true}):ensure();new MutationObserver(ensure).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  window.BTVGoBack=back;
})();
