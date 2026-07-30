(() => {
  'use strict';
  if (window.__btvMentorMarketplace205) return;
  window.__btvMentorMarketplace205 = true;

  const categoryTerms = {
    registration: ['registration', 'pathway', 'visa', 'relocation', 'licensure'],
    exam: ['exam', 'cbt', 'nclex', 'osce', 'ielts'],
    career: ['career', 'interview', 'application', 'employment', 'job'],
  };

  function filterVisibleCards(dialog) {
    const results = dialog.querySelector('[data-mentor-results]');
    if (!results) return;
    const cards = [...results.querySelectorAll('[data-mentor-card]')];
    if (!cards.length) return;
    const query = String(dialog.querySelector('[data-mentor-search]')?.value || '').trim().toLowerCase();
    const active = dialog.querySelector('[data-mentor-filter].active')?.dataset.mentorFilter || 'all';
    const terms = categoryTerms[active] || [];
    let visible = 0;
    cards.forEach(card => {
      const haystack = String(card.dataset.search || card.textContent || '').toLowerCase();
      const show = (!query || haystack.includes(query)) && (!terms.length || terms.some(term => haystack.includes(term)));
      card.hidden = !show;
      if (show) visible += 1;
    });
    const count = dialog.querySelector('[data-mentor-count]');
    if (count) count.textContent = `${visible} ${visible === 1 ? 'mentor' : 'mentors'} available`;
    results.classList.toggle('mentorNoMatches205', visible === 0);
    let empty = results.querySelector('[data-mentor-client-empty]');
    if (!visible) {
      if (!empty) {
        empty = document.createElement('section');
        empty.className = 'mentorEmpty177 mentorClientEmpty205';
        empty.dataset.mentorClientEmpty = '1';
        empty.innerHTML = '<span aria-hidden="true">◇</span><h4>No mentors match this view</h4><p>Try another support area or clear your search.</p><button type="button" data-mentor-reset205>Show all mentors</button>';
        results.append(empty);
      }
      empty.hidden = false;
    } else if (empty) empty.hidden = true;
  }

  function addCommandNavigation(dialog) {
    const hero = dialog.querySelector('.mentorHero177');
    const top = hero?.querySelector('.mentorHeroTop177');
    if (!hero || !top || hero.querySelector('.mentorCommandNav205')) return;
    top.insertAdjacentHTML('afterend', `<nav class="mentorCommandNav205" aria-label="Mentor marketplace sections">
      <button type="button" class="active" data-mentor-command205="discover" aria-current="page"><span>01</span>Discover mentors</button>
      <button type="button" data-mentor-command205="match"><span>02</span>Get matched</button>
      <button type="button" data-mentor-command205="sessions"><span>03</span>My sessions</button>
      <button type="button" data-mentor-command205="standards"><span>04</span>Safety & standards</button>
    </nav>`);
    const copy = hero.querySelector('.mentorHeroCopy177');
    copy?.insertAdjacentHTML('afterend', `<div class="mentorNetworkStrip205" aria-label="Mentor network standards">
      <span><i></i><b>Approved network</b><small>Profiles reviewed before publication</small></span>
      <span><i></i><b>Protected sessions</b><small>Communication stays on-platform</small></span>
      <span><i></i><b>Clear pricing</b><small>Beyond Coins shown before booking</small></span>
      <span><i></i><b>Global expertise</b><small>Registration, exams and careers</small></span>
    </div>`);
  }

  function runCommand(dialog, command) {
    dialog.querySelectorAll('[data-mentor-command205]').forEach(button => {
      const active = button.dataset.mentorCommand205 === command;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    if (command === 'discover') dialog.querySelector('.mentorToolbar177')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (command === 'match') dialog.querySelector('[data-mentor-match]')?.click();
    if (command === 'standards') dialog.querySelector('.mentorSafety177')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (command === 'sessions') {
      dialog.close();
      if (window.BTVPlatform?.open) window.BTVPlatform.open('mentors');
      else window.BTVFeatures?.open?.('bookings');
    }
  }

  function enhance(dialog) {
    if (!dialog) return;
    addCommandNavigation(dialog);
    if (!dialog.dataset.mentor205Bound) {
      dialog.dataset.mentor205Bound = 'true';
      dialog.addEventListener('click', event => {
        const command = event.target.closest('[data-mentor-command205]');
        if (command) { event.preventDefault(); runCommand(dialog, command.dataset.mentorCommand205); return; }
        const filter = event.target.closest('[data-mentor-filter]');
        if (filter) {
          dialog.querySelectorAll('[data-mentor-filter]').forEach(button => button.classList.toggle('active', button === filter));
          queueMicrotask(() => filterVisibleCards(dialog));
          return;
        }
        if (event.target.closest('[data-mentor-reset205]')) {
          const search = dialog.querySelector('[data-mentor-search]');
          if (search) search.value = '';
          dialog.querySelectorAll('[data-mentor-filter]').forEach(button => button.classList.toggle('active', button.dataset.mentorFilter === 'all'));
          filterVisibleCards(dialog);
        }
      });
      dialog.addEventListener('input', event => {
        if (event.target.matches('[data-mentor-search]')) queueMicrotask(() => filterVisibleCards(dialog));
      });
    }
    const results = dialog.querySelector('[data-mentor-results]');
    if (results && !results.dataset.mentor205Observed) {
      results.dataset.mentor205Observed = 'true';
      new MutationObserver(() => filterVisibleCards(dialog)).observe(results, { childList: true });
    }
    filterVisibleCards(dialog);
  }

  const attempt = () => enhance(document.getElementById('mentorMarketplaceDialog177'));
  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="mentors"],[data-shortcut83="mentor"],.exploreMentor85')) setTimeout(attempt, 0);
  }, true);
  new MutationObserver(attempt).observe(document.documentElement, { childList: true, subtree: true });
  attempt();
})();
