(() => {
  'use strict';
  if (window.__btvMentorMarketplace205) return;
  window.__btvMentorMarketplace205 = true;

  const categoryTerms = {
    registration: ['registration', 'pathway', 'visa', 'relocation', 'licensure'],
    exam: ['exam', 'cbt', 'nclex', 'osce', 'ielts'],
    career: ['career', 'interview', 'application', 'employment', 'job'],
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  function closeOverlay(dialog) {
    const overlay = dialog.querySelector('[data-mentor-overlay205]:not([hidden])');
    if (!overlay) return;
    overlay.hidden = true;
    overlay.querySelector('[data-mentor-overlay-panel205]')?.setAttribute('aria-hidden', 'true');
    dialog._mentorOverlayTrigger205?.focus?.();
    dialog._mentorOverlayTrigger205 = null;
  }

  function overlayShell(dialog, type, trigger) {
    dialog.querySelectorAll('[data-mentor-overlay205]').forEach(item => item.remove());
    dialog._mentorOverlayTrigger205 = trigger || document.activeElement;
    const overlay = document.createElement('section');
    overlay.className = 'mentorOverlay205';
    overlay.dataset.mentorOverlay205 = type;
    overlay.innerHTML = `<button type="button" class="mentorOverlayBackdrop205" data-mentor-overlay-close205 aria-label="Close"></button><article class="mentorOverlayPanel205" data-mentor-overlay-panel205 role="dialog" aria-modal="true" aria-hidden="false" tabindex="-1"></article>`;
    dialog.querySelector('.mentorMarketplace177')?.append(overlay);
    overlay.querySelectorAll('[data-mentor-overlay-close205]').forEach(button => button.addEventListener('click', () => closeOverlay(dialog)));
    overlay.querySelector('[data-mentor-overlay-panel205]')?.focus();
    return overlay.querySelector('[data-mentor-overlay-panel205]');
  }

  function mentorInitials(mentor, index) {
    return String(mentor.specialty || `Mentor ${index + 1}`).split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }

  async function openMatchOverlay(dialog, trigger) {
    const panel = overlayShell(dialog, 'matches', trigger);
    if (!panel) return;
    panel.setAttribute('aria-labelledby', 'mentorMatchesTitle205');
    panel.innerHTML = `<header><div><small>SUPABASE-VERIFIED NETWORK</small><h2 id="mentorMatchesTitle205">Choose from every approved mentor.</h2><p>These profiles have passed marketplace review and are currently approved to appear on Beyond The Visa.</p></div><button type="button" data-mentor-overlay-close205 aria-label="Close approved mentors">&times;</button></header><div class="mentorOverlayLoading205" aria-live="polite"><i></i><b>Loading approved mentors securely…</b></div>`;
    panel.querySelector('[data-mentor-overlay-close205]')?.addEventListener('click', () => closeOverlay(dialog));
    try {
      const client = window.btvSupabase;
      if (!client) throw new Error('Mentor service is not ready.');
      let response = await client.rpc('btv_list_approved_mentors', { p_category: 'all', p_search: null });
      if (response.error) response = await client.from('btv_mentors').select('id,biography,experience_years,specialty,languages,areas_of_support,coin_price,rating,review_count').eq('status', 'approved').order('rating', { ascending: false });
      if (response.error) throw response.error;
      const mentors = response.data || [];
      panel.querySelector('.mentorOverlayLoading205')?.remove();
      panel.insertAdjacentHTML('beforeend', mentors.length ? `<div class="mentorApprovedGrid205" data-approved-mentor-list205>${mentors.map((mentor, index) => {
        const support = Array.isArray(mentor.areas_of_support) ? mentor.areas_of_support : [];
        const languages = Array.isArray(mentor.languages) ? mentor.languages : [];
        return `<article data-approved-mentor205="${esc(mentor.id)}"><div class="mentorApprovedAvatar205">${esc(mentorInitials(mentor, index))}</div><div class="mentorApprovedCopy205"><span><b>✓ Approved</b>${Number(mentor.rating || 0) > 0 ? `★ ${Number(mentor.rating).toFixed(1)}` : 'New mentor'}</span><h3>${esc(mentor.specialty || 'Healthcare career mentor')}</h3><p>${esc(mentor.biography || 'Practical guidance for registration, relocation and international healthcare careers.')}</p><small>${esc(languages.join(' · ') || 'English')} · ${Number(mentor.experience_years || 0)}+ years</small><div>${support.slice(0, 3).map(item => `<em>${esc(item)}</em>`).join('') || '<em>Career guidance</em>'}</div></div><button type="button" data-view-approved-mentor205="${esc(mentor.id)}">View mentor</button></article>`;
      }).join('')}</div>` : `<div class="mentorOverlayEmpty205"><b>No approved mentors are available today.</b><p>New profiles remain hidden until marketplace review is complete.</p></div>`);
      panel.querySelectorAll('[data-view-approved-mentor205]').forEach(button => button.addEventListener('click', () => {
        closeOverlay(dialog);
        const search = dialog.querySelector('[data-mentor-search]');
        if (search) search.value = '';
        dialog.querySelectorAll('[data-mentor-filter]').forEach(item => item.classList.toggle('active', item.dataset.mentorFilter === 'all'));
        filterVisibleCards(dialog);
        const card = [...dialog.querySelectorAll('[data-mentor-card]')].find(item => item.dataset.mentorId === button.dataset.viewApprovedMentor205);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card?.querySelector('[data-mentor-profile]')?.click();
      }));
    } catch (error) {
      panel.querySelector('.mentorOverlayLoading205')?.remove();
      panel.insertAdjacentHTML('beforeend', '<div class="mentorOverlayEmpty205"><b>Approved mentors could not be loaded.</b><p>Please close this window and try again. No account or booking information was changed.</p></div>');
    }
  }

  function openStandardsOverlay(dialog, trigger) {
    const panel = overlayShell(dialog, 'standards', trigger);
    if (!panel) return;
    panel.setAttribute('aria-labelledby', 'mentorStandardsTitle205');
    panel.innerHTML = `<header><div><small>SAFETY &amp; STANDARDS</small><h2 id="mentorStandardsTitle205">Professional guidance, protected boundaries.</h2><p>Rules for every mentor session and interaction on Beyond The Visa.</p></div><button type="button" data-mentor-overlay-close205 aria-label="Close safety and standards">&times;</button></header><div class="mentorStandardsGrid205"><section><i>01</i><div><h3>Stay on the platform</h3><p>Keep messages, session arrangements and payments inside Beyond The Visa. Never send money or private contact details directly.</p></div></section><section><i>02</i><div><h3>Protect private information</h3><p>Do not share passwords, identity documents, patient information, banking details or confidential employer records.</p></div></section><section><i>03</i><div><h3>No guaranteed outcomes</h3><p>Mentors cannot guarantee a visa, professional registration, exam result, interview, job offer or immigration decision.</p></div></section><section><i>04</i><div><h3>Use official guidance</h3><p>Mentoring is practical peer support, not legal, medical or regulatory advice. Confirm requirements with the relevant official authority.</p></div></section><section><i>05</i><div><h3>Respect professional boundaries</h3><p>Communication must remain respectful, inclusive and focused on the agreed session. Harassment, pressure and discrimination are prohibited.</p></div></section><section><i>06</i><div><h3>Report concerns promptly</h3><p>Report requests for off-platform payment, misleading claims, unsafe conduct or unwanted contact through the platform support channel.</p></div></section></div><footer><span>✓</span><p><b>Every published profile is approved.</b> Approval can be suspended or removed when these standards are breached.</p><button type="button" data-mentor-overlay-close205>I understand</button></footer>`;
    panel.querySelectorAll('[data-mentor-overlay-close205]').forEach(button => button.addEventListener('click', () => closeOverlay(dialog)));
  }

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
    if (command === 'match') openMatchOverlay(dialog, dialog.querySelector('[data-mentor-command205="match"]'));
    if (command === 'standards') openStandardsOverlay(dialog, dialog.querySelector('[data-mentor-command205="standards"]'));
    if (command === 'sessions') {
      dialog.close();
      if (window.BTVPlatform?.open) window.BTVPlatform.open('mentors');
      else if (window.BTVBookingsCentre?.open) window.BTVBookingsCentre.open();
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
          dialog.querySelectorAll('[data-mentor-filter]').forEach(button => {
            const active = button === filter;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
          });
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
      dialog.addEventListener('click', event => {
        const match = event.target.closest('[data-mentor-match]');
        if (!match) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openMatchOverlay(dialog, match);
      }, true);
      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape' && dialog.querySelector('[data-mentor-overlay205]:not([hidden])')) {
          event.preventDefault();
          event.stopPropagation();
          closeOverlay(dialog);
        }
      }, true);
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
