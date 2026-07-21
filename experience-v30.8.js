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
 function keepLearnVisible(){const learn=document.querySelector('#learn');if(!learn)return;learn.querySelectorAll('.learnPanel').forEach(panel=>panel.toggleAttribute('hidden',!panel.classList.contains('active')))}
 let timer=0;
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>{restoreAdmin();keepLearnVisible()},80)}
 function start(){restoreAdmin();keepLearnVisible()}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
 document.addEventListener('click',event=>{if(event.target.closest('[data-open="learn"],#theme,[data-learn-tab]'))schedule()},true);
 window.addEventListener('btv:profile-changed',schedule);
 window.addEventListener('pagehide',()=>clearTimeout(timer),{once:true});
})();
