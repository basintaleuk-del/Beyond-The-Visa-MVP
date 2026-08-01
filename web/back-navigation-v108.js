(()=>{
  'use strict';
  const STACKKEY='btv-screen-history-v169',PREVKEY='btv-previous-screen-v169',HISTORYKEY='btvScreenV267';
  const blocked=new Set(['auth']);
  const readStack=()=>{try{const value=JSON.parse(sessionStorage.getItem(STACKKEY)||'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'&&!blocked.has(id)).slice(-20):[]}catch{return[]}};
  const stack=readStack();let goingBack=false,historyReady=false;
  const persist=()=>{try{sessionStorage.setItem(STACKKEY,JSON.stringify(stack.slice(-20)))}catch{}};
  function activeScreen(){return document.querySelector('.screen.active')?.id||''}
  function validScreen(id){return Boolean(id&&!blocked.has(id)&&document.getElementById(id)?.classList.contains('screen'))}
  function screenUrl(id){const url=new URL(location.href);if(id==='home')url.searchParams.delete('screen');else url.searchParams.set('screen',id);return `${url.pathname}${url.search}${url.hash}`}
  function browserState(){const value=history.state;return value&&value[HISTORYKEY]===true?value:null}
  function requestedScreen(){const path=location.pathname;if(path==='/opportunities')return'opportunities';if(path==='/journey/tools/cost-estimator')return'cost-estimator';if(/^\/jobs(?:\/|$)/.test(path))return'jobs';const query=new URLSearchParams(location.search).get('screen')||'';return validScreen(query)?query:''}
  function replaceBrowserState(id,depth=0){history.replaceState({...history.state,[HISTORYKEY]:true,screen:id,depth},'',screenUrl(id))}
  function pushBrowserState(id){const current=browserState(),depth=Math.max(0,Number(current?.depth)||0)+1;history.pushState({[HISTORYKEY]:true,screen:id,depth},'',screenUrl(id))}
  function fallback(){if(location.pathname.endsWith('/index.html')||location.pathname.endsWith('/')){window.openScreen?.('home');return}location.href='index.html'}
  function rememberDestination(){window.BTVDestination?.remember?.()}
  function previousScreen(){try{const id=sessionStorage.getItem(PREVKEY)||'';return !blocked.has(id)&&document.getElementById(id)?.classList.contains('screen')?id:''}catch{return''}}
  function openPrevious(id){if(!validScreen(id)||!window.openScreen)return false;goingBack=true;try{window.openScreen(id)}finally{goingBack=false}window.BTVDestination?.restore?.();return true}
  function home(){rememberDestination();stack.length=0;persist();const current=browserState();if(current&&Number(current.depth)>0){history.go(-Number(current.depth));return}if(openPrevious('home')){replaceBrowserState('home',0);try{sessionStorage.setItem(PREVKEY,'home')}catch{};return}fallback()}
  function back(){rememberDestination();const app=document.getElementById('appShell');if(app&&!app.hidden){const current=browserState();if(current&&Number(current.depth)>0){history.back();return}let target='';while(stack.length&&!target){const candidate=stack.pop();if(candidate!==activeScreen()&&validScreen(candidate))target=candidate}persist();if(openPrevious(target||previousScreen()||'home')){replaceBrowserState(target||previousScreen()||'home',0);return}}let same=false;try{same=Boolean(document.referrer)&&new URL(document.referrer).origin===location.origin}catch{}if(same&&history.length>1){history.back();return}fallback()}
  function wrap(){if(typeof window.openScreen!=='function'||window.__btvHistoryWrapped108)return;window.__btvHistoryWrapped108=true;const original=window.openScreen;window.openScreen=function(id){const current=activeScreen(),isInternal=validScreen(id);if(!goingBack&&current&&current!==id&&!blocked.has(current)){if(stack.at(-1)!==current)stack.push(current);persist()}const result=original.apply(this,arguments);if(historyReady&&!goingBack&&isInternal&&current!==id)pushBrowserState(id);return result}}
  function initialiseBrowserHistory(){if(historyReady)return;const requested=requestedScreen();if(requested&&requested!==activeScreen())openPrevious(requested);const current=activeScreen();if(!validScreen(current))return;const existing=browserState();if(existing&&validScreen(existing.screen)){historyReady=true;if(requested&&requested!==existing.screen){replaceBrowserState(requested,Math.max(1,Number(existing.depth)||1));if(requested!==current)openPrevious(requested);return}if(existing.screen!==current)openPrevious(existing.screen);return}if(current==='home')replaceBrowserState('home',0);else{const requestedUrl=screenUrl(current);replaceBrowserState('home',0);history.pushState({[HISTORYKEY]:true,screen:current,depth:1},'',requestedUrl)}historyReady=true}
  function restoreBrowserState(event){const state=event.state;if(!state||state[HISTORYKEY]!==true||!validScreen(state.screen))return;const target=state.screen;while(stack.length&&stack.at(-1)!==target)stack.pop();if(stack.at(-1)===target)stack.pop();persist();openPrevious(target)}
  function ensure(){
    wrap();
    const app=document.getElementById('appShell');
    if(app&&app.hidden)return;
    const current=document.querySelector('.screen.active');
    if(!current)return;
    initialiseBrowserHistory();
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
  window.addEventListener('popstate',restoreBrowserState);
  const style=document.createElement('style');style.textContent='.btvInjectedBack108{flex:none;width:42px;height:42px;border:1px solid #cfddd4;border-radius:13px;background:#fff;color:#285440;display:grid;place-items:center;font-size:20px;font-weight:900;cursor:pointer}.btvInjectedBack108:focus-visible{outline:3px solid #d5b24f;outline-offset:2px}.mainHeader73>.btvInjectedBack108{margin-right:4px}@media(max-width:640px){.mainHeader73>.btvInjectedBack108{width:38px;height:38px}}';document.head.append(style);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',ensure,{once:true}):ensure();new MutationObserver(ensure).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  window.BTVGoBack=back;window.BTVGoHome=home;window.BTVBrowserHistory267={initialise:initialiseBrowserHistory,restore:restoreBrowserState};
})();
