(()=>{
  'use strict';
  const STACKKEY='btv-screen-history-v169',PREVKEY='btv-previous-screen-v169';
  const blocked=new Set(['auth']);
  const readStack=()=>{try{const value=JSON.parse(sessionStorage.getItem(STACKKEY)||'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'&&!blocked.has(id)).slice(-20):[]}catch{return[]}};
  const stack=readStack();let goingBack=false;
  const persist=()=>{try{sessionStorage.setItem(STACKKEY,JSON.stringify(stack.slice(-20)))}catch{}};
  function activeScreen(){return document.querySelector('.screen.active')?.id||''}
  function fallback(){if(location.pathname.endsWith('/index.html')||location.pathname.endsWith('/')){window.openScreen?.('home');return}location.href='index.html'}
  function rememberDestination(){window.BTVDestination?.remember?.()}
  function previousScreen(){try{const id=sessionStorage.getItem(PREVKEY)||'';return !blocked.has(id)&&document.getElementById(id)?.classList.contains('screen')?id:''}catch{return''}}
  function openPrevious(id){if(!id||!window.openScreen)return false;goingBack=true;window.openScreen(id);goingBack=false;window.BTVDestination?.restore?.();return true}
  function home(){rememberDestination();stack.length=0;persist();if(openPrevious('home')){try{sessionStorage.setItem(PREVKEY,'home')}catch{};return}fallback()}
  function back(){rememberDestination();const app=document.getElementById('appShell');if(app&&!app.hidden){let target='';while(stack.length&&!target){const candidate=stack.pop();if(candidate!==activeScreen()&&document.getElementById(candidate)?.classList.contains('screen'))target=candidate}persist();if(openPrevious(target||previousScreen()||'home'))return}let same=false;try{same=Boolean(document.referrer)&&new URL(document.referrer).origin===location.origin}catch{}if(same&&history.length>1){history.back();return}fallback()}
  function wrap(){if(typeof window.openScreen!=='function'||window.__btvHistoryWrapped108)return;window.__btvHistoryWrapped108=true;const original=window.openScreen;window.openScreen=function(id){const current=activeScreen();if(!goingBack&&current&&current!==id&&!blocked.has(current)){if(stack.at(-1)!==current)stack.push(current);persist()}return original.apply(this,arguments)}}
  function ensure(){
    wrap();
    const app=document.getElementById('appShell');
    if(app&&app.hidden)return;
    const current=document.querySelector('.screen.active');
    if(!current)return;
    if(current.id==='home'){
      current.querySelectorAll('.btvInjectedBack108').forEach(button=>button.remove());
      return;
    }
    const title=current.querySelector('.pageTitle,.communityTop108,.learnV90Header,.mainHeader73');
    if(title&&!title.querySelector('.back,[data-history-back]')){
      const button=document.createElement('button');
      button.type='button';
      button.className='btvInjectedBack108';
      button.dataset.historyBack='1';
      button.setAttribute('aria-label','Go back to previous page');
      button.textContent='\u2190';
      title.prepend(button);
    }
  }
  document.addEventListener('click',event=>{const homeTrigger=event.target.closest('[data-history-home]');if(homeTrigger){event.preventDefault();event.stopPropagation();home();return}const trigger=event.target.closest('[data-history-back],a.back,button.back,.sidefoot a[href*="index.html"],a.legalBack108');if(!trigger)return;event.preventDefault();event.stopPropagation();back()},true);
  const style=document.createElement('style');style.textContent='.btvInjectedBack108{flex:none;width:42px;height:42px;border:1px solid #cfddd4;border-radius:13px;background:#fff;color:#285440;display:grid;place-items:center;font-size:20px;font-weight:900;cursor:pointer}.btvInjectedBack108:focus-visible{outline:3px solid #d5b24f;outline-offset:2px}.mainHeader73>.btvInjectedBack108{margin-right:4px}@media(max-width:640px){.mainHeader73>.btvInjectedBack108{width:38px;height:38px}}';document.head.append(style);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',ensure,{once:true}):ensure();new MutationObserver(ensure).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  window.BTVGoBack=back;window.BTVGoHome=home;
})();
