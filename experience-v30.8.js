(()=>{
 'use strict';
 if(window.__btvExperienceV308)return;window.__btvExperienceV308=true;
 if(!document.querySelector('link[href^="experience-v30.8.css"]'))document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="experience-v30.8.css?v=30.8">');
 const sb=window.btvSupabase;
 async function restoreAdmin(){
  if(!sb)return;
  try{
   const {data:{user}}=await sb.auth.getUser();if(!user)return;
   const {data:profile}=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();if(profile?.role!=='admin')return;
   let tile=document.querySelector('[data-admin-launch]');
   if(!tile){tile=document.createElement('button');tile.dataset.adminLaunch='1';tile.innerHTML='<i>⚙</i><span>Admin portal</span><small>Manage users, content and services</small>';tile.onclick=()=>location.href='admin.html?v=30.8';document.querySelector('#home .quick')?.append(tile)}
   if(tile){tile.hidden=false;tile.removeAttribute('data-duplicate-navigation');tile.removeAttribute('data-moved-to-menu')}
   const menu=document.querySelector('.appMenu');
   if(menu&&!menu.querySelector('[data-menu-admin]')){const group=document.createElement('div');group.className='appMenuGroup adminMenuGroup';group.innerHTML='<span>ADMINISTRATION</span><a class="appMenuItem" data-menu-admin href="admin.html?v=30.8"><i>⚙</i>Open admin portal</a>';menu.append(group)}
  }catch(error){console.warn('Admin access:',error.message)}
 }
 function keepLearnVisible(){const learn=document.querySelector('#learn');if(!learn)return;learn.querySelectorAll('.learnPanel').forEach(panel=>{if(panel.classList.contains('active'))panel.removeAttribute('hidden')})}
 function start(){restoreAdmin();keepLearnVisible();setTimeout(restoreAdmin,900);setTimeout(keepLearnVisible,250)}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
 document.addEventListener('click',event=>{if(event.target.closest('[data-open="learn"],#theme'))setTimeout(keepLearnVisible,80)},true);
 new MutationObserver(()=>{keepLearnVisible();if(document.querySelector('.appMenu')&&!document.querySelector('[data-menu-admin]'))restoreAdmin()}).observe(document.documentElement,{childList:true,subtree:true});
})();
