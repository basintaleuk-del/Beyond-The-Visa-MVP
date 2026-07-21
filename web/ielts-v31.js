(()=>{
  'use strict';
  if(window.__btvIeltsV31) return;
  window.__btvIeltsV31 = true;

  const db = () => window.btvSupabase;
  const $ = s => document.querySelector(s);
  let currentView = 'reading';
  let userSession = null;

  async function init() {
    try {
      const session = (await db()?.auth?.getSession())?.data?.session;
      if (!session) {
        window.location.href = 'index.html';
        return;
      }
      userSession = session;
      loadScores();
      bindEvents();
      $('#loading').hidden = true;
      $('#app').hidden = false;
    } catch(error) {
      console.error('Init error:', error);
      $('#loading').innerHTML = '<h2>Error loading IELTS centre</h2>';
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => switchView(btn.dataset.view);
    });
    $('#startReading').onclick = () => startPractice('reading');
    $('#startListening').onclick = () => startPractice('listening');
    $('#startWriting').onclick = () => startPractice('writing');
    $('#startSpeaking').onclick = () => startPractice('speaking');
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

  function startPractice(section) {
    sessionStorage.setItem('btv-ielts-section', section);
    sessionStorage.setItem('btv-return-screen', 'learn');
    window.location.href = `ielts-practice-${section}.html`;
  }

  async function loadScores() {
    if (!userSession) return;
    try {
      const result = await db().from('ielts_attempts').select('section, score').eq('user_id', userSession.user.id);
      if (result.error) throw result.error;
      
      const scores = { reading: [], listening: [], writing: [], speaking: [] };
      (result.data || []).forEach(r => {
        if(scores[r.section]) scores[r.section].push(r.score);
      });

      Object.entries(scores).forEach(([section, scoresArray]) => {
        if (scoresArray.length > 0) {
          const avg = Math.round(scoresArray.reduce((a,b) => a+b,0) / scoresArray.length);
          const el = $(`#${section}Score`);
          if(el) el.textContent = avg + '%';
        }
      });

      // Estimate overall band
      const allScores = Object.values(scores).flat();
      if(allScores.length > 0) {
        const overallAvg = allScores.reduce((a,b) => a+b,0) / allScores.length;
        const band = Math.min(9, Math.max(3, Math.round(overallAvg / 12.5 + 2.5)));
        $('#band').textContent = band;
      }
    } catch(error) {
      console.error('Load scores error:', error);
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
