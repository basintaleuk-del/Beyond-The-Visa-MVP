(()=>{
  'use strict';
  if(window.__btvLearnV90) return;
  window.__btvLearnV90 = true;

  const db = () => window.btvSupabase;
  const $ = s => document.querySelector(s);
  const modules = {
    cbt: { url: 'cbt.html', icon: '✓', label: 'CBT Practice' },
    nclex: { url: 'nclex.html', icon: '⚕', label: 'NCLEX-RN' },
    ielts: { url: 'ielts.html', icon: '🎯', label: 'IELTS' },
    osce: { url: 'osce.html', icon: '🔬', label: 'OSCE' },
    'adult-nursing': { url: 'adult-nursing.html', icon: '💉', label: 'Adult Nursing' }
  };

  async function buildLearningHub() {
    const hub = document.getElementById('learn');
    if (!hub) return;
    
    // Build clean grid WITHOUT hero tiles above headings
    const html = `
      <div class="pageTitle">
        <button class="back" data-learn-home>←</button>
        <div><span>LEARNING CENTRE</span><h1>Build your confidence</h1></div>
      </div>
      <div class="learnV90Grid" id="learnModules"></div>
    `;
    
    hub.innerHTML = html;
    
    // Populate module cards
    const grid = document.getElementById('learnModules');
    Object.entries(modules).forEach(([key, mod]) => {
      const card = document.createElement('button');
      card.className = 'learnV90Card';
      card.type = 'button';
      card.dataset.module = key;
      card.innerHTML = `
        <i class="learnV90Icon">${mod.icon}</i>
        <b>${mod.label}</b>
      `;
      card.onclick = () => navigateToModule(key, mod.url);
      grid.appendChild(card);
    });
    
    // Back button
    document.querySelector('[data-learn-home]').onclick = () => {
      if (typeof window.openScreen === 'function') window.openScreen('home');
      else {
        document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'home'));
        document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.open === 'home'));
      }
    };
  }

  function navigateToModule(key, url) {
    // Store the module so it knows which content to display
    sessionStorage.setItem('btv-learn-module', key);
    sessionStorage.setItem('btv-return-screen', 'learn');
    
    // Navigate to the module
    window.location.href = url;
  }

  // Restore floating action button (Zibur)
  function restoreFloatingAction() {
    let fab = document.getElementById('floatingAction');
    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'floatingAction';
      fab.className = 'floatingAction';
      fab.innerHTML = '✦';
      fab.title = 'Ask Zibur';
      fab.onclick = () => {
        if (typeof window.openScreen === 'function') window.openScreen('assistant');
        else {
          document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'assistant'));
          document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.open === 'assistant'));
        }
      };
      document.body.appendChild(fab);
    }
  }

  function start() {
    buildLearningHub();
    restoreFloatingAction();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
