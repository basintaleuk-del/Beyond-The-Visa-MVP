(()=>{
 'use strict';
 if(window.__btvNavigationStateV63)return;window.__btvNavigationStateV63=true;
 const KEY='btv-current-screen-v63',SUBKEY='btv-current-subview-v63';
 const blocked=new Set(['auth']);
 let desired='';let ready=false;let restoring=false;let announced=false;let startupRestored=false;let startupObserver=null;let started=false;
 const announceReady=()=>{if(announced)return;announced=true;document.documentElement.classList.add('btv-navigation-ready');window.dispatchEvent(new CustomEvent('btv:navigation-ready',{detail:{screen:active()||'home'}}));};
 const read=()=>{try{return sessionStorage.getItem(KEY)||''}catch{return''}};
 const save=id=>{if(!id||blocked.has(id))return;try{sessionStorage.setItem(KEY,id)}catch{}}
 const active=()=>document.querySelector('#appShell .screen.active')?.id||'';
 const saveSubview=value=>{if(value)try{sessionStorage.setItem(SUBKEY,value)}catch{}};
 desired=read();

 const original=window.openScreen;
 if(typeof original==='function')window.openScreen=function(id,...args){
  const result=original.call(this,id,...args);
  if(!restoring)save(id);
  return result;
 };

 function prepare(id){
  const builders={coaching:'buildCoaching',contact:'buildContact',profile:'buildProfile',jobs:'buildJobs',community:'buildCommunity',lifeHub:'buildLifeHub',legal:'buildLegalCentre',feedback:'buildFeedback'};
  const builder=builders[id];
  if(builder&&typeof window[builder]==='function')try{window[builder]()}catch{}
 }
 function restore(){
  const shell=document.getElementById('appShell');
  if(!shell||shell.hidden)return false;
  if(!desired){ready=true;save(active()||'home');announceReady();return true}
  prepare(desired);
  const screen=document.getElementById(desired);
  if(!screen?.classList.contains('screen')){desired='home';try{sessionStorage.setItem(KEY,'home')}catch{};const home=document.getElementById('home');if(home?.classList.contains('screen')){restoring=true;window.openScreen?.('home');restoring=false;ready=true;announceReady();return true}return false;}
  restoring=true;
  if(typeof window.openScreen==='function')window.openScreen(desired);
  else document.querySelectorAll('.screen').forEach(item=>item.classList.toggle('active',item.id===desired));
  if(desired==='learn')try{
   const subview=sessionStorage.getItem(SUBKEY);
   const tab=subview&&document.querySelector(`[data-learn-tab="${CSS.escape(subview)}"]`);
   if(tab&&!tab.classList.contains('active'))tab.click();
  }catch{}
  save(desired);ready=true;restoring=false;announceReady();
  return true;
 }

 document.addEventListener('click',event=>{
  const learnTab=event.target.closest('[data-learn-tab]');if(learnTab)saveSubview(learnTab.dataset.learnTab);
  const target=event.target.closest('#appShell .brand,[data-open],[data-stable-open]');
  if(!target)return;
  const id=target.matches('.brand')?'home':target.dataset.open||target.dataset.stableOpen;
  if(id)save(id);
 },true);
 addEventListener('pagehide',()=>save(active()),{capture:true});

 function runStartupRestore(){
  if(startupRestored)return true;
  if(!restore())return false;
  startupRestored=true;
  if(startupObserver){startupObserver.disconnect();startupObserver=null;}
  return true;
 }

 function start(){
  if(!startupRestored&&!startupObserver){
   startupObserver=new MutationObserver(()=>runStartupRestore());
   startupObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
  }
  runStartupRestore();
  if(started)return;
  started=true;

  const main=document.querySelector('#appShell main');
  if(main)new MutationObserver(()=>{
   if(!ready){restore();return}
   const id=active();if(id&&!restoring)save(id);
  }).observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 }
 window.BTVNavigationState={restoreNow:()=>runStartupRestore(),active};
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
 window.addEventListener('btv:session-restored',start);
})();
