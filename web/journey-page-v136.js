(function(){
  'use strict';
  if(window.__btvJourneyPage136)return;
  window.__btvJourneyPage136=true;

  const sticker=(title)=>{
    const value=String(title||'').toLowerCase();
    if(/passport|identity/.test(value))return '🛂';
    if(/english|ielts|language/.test(value))return '🗣️';
    if(/cbt|nclex|exam|test/.test(value))return '📝';
    if(/registration|nmc|pin|board/.test(value))return '🏅';
    if(/job|employment|offer/.test(value))return '💼';
    if(/visa|immigration|sponsor/.test(value))return '🛫';
    if(/travel|arrival|relocation/.test(value))return '🧳';
    if(/document|certificate|evidence/.test(value))return '📂';
    return '✓';
  };

  function decorate(){
    document.querySelectorAll('#checklistItems .checkItem').forEach((row)=>{
      const input=row.querySelector('input[type="checkbox"]');
      const label=row.querySelector('label');
      if(!input||!label)return;
      if(!row.querySelector('.checkSticker136')){
        const mark=document.createElement('span');
        mark.className='checkSticker136';
        mark.setAttribute('aria-hidden','true');
        mark.textContent=sticker(label.querySelector('b')?.textContent);
        row.prepend(mark);
        row.append(input);
      }
      row.classList.toggle('is-complete',input.checked);
      if(!input.dataset.journeyPageBound){
        input.dataset.journeyPageBound='1';
        input.addEventListener('change',()=>row.classList.toggle('is-complete',input.checked));
      }
    });
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',decorate):decorate();
  new MutationObserver(decorate).observe(document.documentElement,{childList:true,subtree:true});
})();
