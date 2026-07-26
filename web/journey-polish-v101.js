(function(){
  'use strict';
  if(window.__btvJourneyPolish134)return;
  window.__btvJourneyPolish134=true;
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
  function installPremiumShell(){
    const checklist=document.getElementById('checklist');
    const source=document.querySelector('#dashboardV3 .sidebar73');
    if(!checklist||!source)return false;
    if(checklist.closest('.journeyLayout101'))return true;

    const layout=document.createElement('div');
    layout.className='journeyLayout101';
    const sidebar=source.cloneNode(true);
    sidebar.classList.add('journeySidebar101');
    sidebar.setAttribute('aria-label','My Journey navigation');
    sidebar.querySelectorAll('[id]').forEach((node)=>node.removeAttribute('id'));
    sidebar.querySelectorAll('[aria-labelledby],[aria-controls]').forEach((node)=>{
      node.removeAttribute('aria-labelledby');
      node.removeAttribute('aria-controls');
    });
    sidebar.querySelector('.sideNavItem73')?.classList.remove('active');
    sidebar.querySelector('[data-go="journey"]')?.classList.add('active');

    const content=document.createElement('div');
    content.className='journeyMain101';
    checklist.parentNode.insertBefore(layout,checklist);
    layout.append(sidebar,content);
    content.append(checklist);

    sidebar.addEventListener('click',(event)=>{
      const routeButton=event.target.closest('[data-go]');
      const signoutButton=event.target.closest('[data-signout]');
      const selector=routeButton?'[data-go="'+routeButton.dataset.go+'"]':signoutButton?'[data-signout]':'';
      if(!selector)return;
      event.preventDefault();
      const original=[...document.querySelectorAll('#dashboardV3 .sidebar73 '+selector)].find((node)=>node!==routeButton);
      original?.click();
    });
    return true;
  }
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
  function sync(){decorate();installPremiumShell()}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',sync):sync();
  const shellObserver=new MutationObserver(()=>{decorate();if(installPremiumShell())shellObserver.disconnect()});
  shellObserver.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',(event)=>{if(event.target.closest('[data-open="checklist"],[data-open-target="checklist"]'))setTimeout(sync,0)},true);
})();
