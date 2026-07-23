(function(){
  'use strict';
  if(window.__btvJourneyPolish101)return;
  window.__btvJourneyPolish101=true;
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
      if(!row.querySelector('.checkSticker101')){
        const mark=document.createElement('span');
        mark.className='checkSticker101';
        mark.setAttribute('aria-hidden','true');
        mark.textContent=sticker(label.querySelector('b')?.textContent);
        row.prepend(mark);
        row.append(input);
      }
      row.classList.toggle('is-complete',input.checked);
      if(!input.dataset.polishBound){input.dataset.polishBound='1';input.addEventListener('change',()=>row.classList.toggle('is-complete',input.checked))}
    });
  }
  const original=window.renderChecklist;
  if(typeof original==='function')window.renderChecklist=function(){const result=original.apply(this,arguments);decorate();return result};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',decorate):decorate();
  document.addEventListener('click',(event)=>{if(event.target.closest('[data-open="checklist"],[data-open-target="checklist"]'))setTimeout(decorate,0)},true);
})();
