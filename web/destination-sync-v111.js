(()=>{
  'use strict';
  if(window.__btvDestinationSync111)return;
  window.__btvDestinationSync111=true;

  const valid=new Set(['uk','us','ca','au','nz','ie']);
  const names={uk:'United Kingdom',us:'United States',ca:'Canada',au:'Australia',nz:'New Zealand',ie:'Ireland'};
  let remoteSave=0;

  function read(key,fallback={}){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
  function selected(){
    const journey=read('btv-v1'),profile=read('btv-profile');
    const key=journey.country||profile.destination||'uk';
    return valid.has(key)?key:'uk';
  }
  function saveLocal(key){
    const journey=read('btv-v1');journey.country=key;localStorage.setItem('btv-v1',JSON.stringify(journey));
    const profile=read('btv-profile');profile.destination=key;if(key!=='uk')delete profile.region;localStorage.setItem('btv-profile',JSON.stringify(profile));
    if(typeof window.state==='object'&&window.state)window.state.country=key;
  }
  function refresh(key,source){
    window.dispatchEvent(new CustomEvent('btv:destination-changed',{detail:{country:key,name:names[key],source}}));
    window.renderDashboardInsights?.();
    window.buildLearning?.();
    window.updateExamTabs?.();
    window.renderCulture?.();
  }
  async function saveRemote(key){
    const token=++remoteSave,sb=window.btvSupabase;
    if(!sb?.auth||!sb?.from)return;
    try{
      const {data,error:userError}=await sb.auth.getUser();
      if(userError||!data?.user)return;
      const result=await sb.from('profiles').update({destination:key,updated_at:new Date().toISOString()}).eq('id',data.user.id).select('destination').maybeSingle();
      if(token!==remoteSave)return;
      if(result.error)throw result.error;
      if(result.data?.destination!==key)throw new Error('The destination could not be verified after saving.');
    }catch(error){
      console.error('Destination save failed',error);
      window.toast?.('Your destination changed on this device, but could not be saved to your account. Please try again.');
    }
  }
  function change(key,source='destination-picker'){
    if(!valid.has(key))return;
    saveLocal(key);refresh(key,source);saveRemote(key);
  }

  document.addEventListener('click',event=>{
    if(!event.target.closest('#countryGrid .country'))return;
    setTimeout(()=>change(selected()),0);
  });
  window.addEventListener('storage',event=>{
    if(event.key!=='btv-v1'&&event.key!=='btv-profile')return;
    const key=selected();saveLocal(key);refresh(key,'storage');
  });
  window.BTVDestination={get:selected,set:change};
})();
