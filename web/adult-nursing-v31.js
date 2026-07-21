(()=>{
  'use strict';
  if(window.__btvAdultNursingV31) return;
  window.__btvAdultNursingV31 = true;

  const db = () => window.btvSupabase;
  const $ = s => document.querySelector(s);
  let currentView = 'fundamentals';
  let userSession = null;

  async function init() {
    try {
      const session = (await db()?.auth?.getSession())?.data?.session;
      if (!session) {
        window.location.href = 'index.html';
        return;
      }
      userSession = session;
      loadProgress();
      bindEvents();
      $('#loading').hidden = true;
      $('#app').hidden = false;
    } catch(error) {
      console.error('Init error:', error);
      $('#loading').innerHTML = '<h2>Error loading Adult Nursing</h2>';
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => switchView(btn.dataset.view);
    });
    $('#startFundamentals').onclick = () => startModule('fundamentals');
    $('#startAssessment').onclick = () => startModule('assessment');
    $('#startConditions').onclick = () => startModule('conditions');
    $('#startSkills').onclick = () => startModule('skills');
    $('#logout').onclick = async () => {
      await db().auth.signOut();
      window.location.href = 'index.html';
    };
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === view + 'View'));
  }

  function startModule(module) {
    sessionStorage.setItem('btv-adult-module', module);
    sessionStorage.setItem('btv-return-screen', 'learn');
    window.location.href = `adult-nursing-${module}.html`;
  }

  async function loadProgress() {
    if (!userSession) return;
    try {
      const result = await db().from('adult_nursing_attempts').select('is_correct, content_type').eq('user_id', userSession.user.id);
      if (result.error) throw result.error;
      
      const data = result.data || [];
      const correct = data.filter(r => r.is_correct).length;
      const accuracy = data.length > 0 ? Math.round(correct / data.length * 100) : 0;
      
      $('#completed').textContent = data.length;
      $('#accuracy').textContent = accuracy + '%';
      $('#readiness').textContent = accuracy >= 75 ? 'Ready' : 'In Progress';
    } catch(error) {
      console.error('Load progress error:', error);
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
