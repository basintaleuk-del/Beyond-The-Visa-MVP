(()=>{
  'use strict';
  if(window.__btvOsceV31) return;
  window.__btvOsceV31 = true;

  const db = () => window.btvSupabase;
  const $ = s => document.querySelector(s);
  let currentView = 'practice';
  let userSession = null;

  async function init() {
    try {
      const session = (await db()?.auth?.getSession())?.data?.session;
      if (!session) {
        window.location.href = 'index.html';
        return;
      }
      userSession = session;
      loadResults();
      bindEvents();
      $('#loading').hidden = true;
      $('#app').hidden = false;
    } catch(error) {
      console.error('Init error:', error);
      $('#loading').innerHTML = '<h2>Error loading OSCE</h2>';
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => switchView(btn.dataset.view);
    });
    document.querySelectorAll('[data-station]').forEach(btn => {
      btn.onclick = () => startStation(btn.dataset.station);
    });
    $('#startMock').onclick = () => startMockExam();
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

  function startStation(station) {
    sessionStorage.setItem('btv-osce-station', station);
    sessionStorage.setItem('btv-return-screen', 'learn');
    window.location.href = `osce-station-${station}.html`;
  }

  function startMockExam() {
    sessionStorage.setItem('btv-osce-mock', '1');
    sessionStorage.setItem('btv-return-screen', 'learn');
    window.location.href = 'osce-mock-exam.html';
  }

  async function loadResults() {
    if (!userSession) return;
    try {
      const result = await db().from('osce_attempts').select('score, station_type').eq('user_id', userSession.user.id);
      if (result.error) throw result.error;
      
      const data = result.data || [];
      const completed = data.length;
      const avgScore = data.length > 0 ? Math.round(data.reduce((a,b) => a + b.score, 0) / data.length) : 0;
      
      $('#completed').textContent = Math.min(completed, 10) + '/10';
      $('#accuracy').textContent = avgScore + '%';
      $('#sessions').textContent = completed;
      $('#readiness').textContent = avgScore >= 70 ? 'Ready' : 'Practising';
    } catch(error) {
      console.error('Load results error:', error);
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
