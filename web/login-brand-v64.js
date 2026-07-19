(()=>{
 'use strict';
 if(window.__btvLoginBrandV64)return;window.__btvLoginBrandV64=true;
 function install(){
  const brand=document.querySelector('#auth .authBrand');if(!brand)return false;
  let logo=brand.querySelector('.authLogoV64');
  if(!logo){logo=document.createElement('span');logo.className='authLogoV64';logo.setAttribute('role','img');logo.setAttribute('aria-label','Beyond The Visa — Guidance, Preparation, Your Future');brand.querySelector('.authMark')?.replaceWith(logo)}
  return true;
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();

