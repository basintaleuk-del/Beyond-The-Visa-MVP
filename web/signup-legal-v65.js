(() => {
  'use strict';
  if (window.__btvSignupLegalV65) return;
  window.__btvSignupLegalV65 = true;

  const VERSION = '2026-07-15';
  const draftKey = 'btv-combined-legal-consent-v69';
  const $ = selector => document.querySelector(selector);
  let acceptedAt = null;

  try { acceptedAt = sessionStorage.getItem(draftKey) || null; } catch {}

  function state() {
    return {
      version: VERSION,
      combined: acceptedAt,
      terms: acceptedAt,
      privacy: acceptedAt,
      cookies: acceptedAt
    };
  }

  function store(value) {
    acceptedAt = value;
    try {
      if (value) sessionStorage.setItem(draftKey, value);
      else sessionStorage.removeItem(draftKey);
    } catch {}
  }

  function render() {
    const consent = $('#signupConsent');
    if (consent) consent.checked = Boolean(acceptedAt);
    const status = $('#combinedLegalStatus');
    if (status) {
      status.textContent = acceptedAt
        ? `Agreement recorded for this sign-up on ${new Date(acceptedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`
        : 'One agreement records your acceptance of all three policies.';
      status.classList.toggle('accepted', Boolean(acceptedAt));
    }
  }

  function build() {
    const consent = $('#signupConsent');
    const label = consent?.closest('.consent');
    if (!consent || !label) return;

    label.classList.add('combinedLegalConsent');
    const copy = label.querySelector('span');
    if (copy) copy.innerHTML = `I agree to the <a href="terms-and-conditions.html" target="_blank" rel="noopener">Terms &amp; Conditions</a>, <a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a> and <a href="cookie-policy.html" target="_blank" rel="noopener">Cookie Policy</a>.`;

    if (!$('#combinedLegalStatus')) {
      label.insertAdjacentHTML('afterend', '<small id="combinedLegalStatus" class="combinedLegalStatus" aria-live="polite"></small>');
    }

    consent.addEventListener('change', () => {
      store(consent.checked ? new Date().toISOString() : null);
      render();
    });
    render();
  }

  async function hydrate() {
    try {
      const { data } = await window.btvSupabase?.auth.getUser();
      const meta = data?.user?.user_metadata || {};
      if (data?.user) {
        const recorded = meta.combined_legal_accepted_at || meta.terms_accepted_at || meta.privacy_acknowledged_at || meta.cookie_understood_at;
        if (recorded) store(recorded);
      }
    } catch {}
    render();
  }

  window.BTVLegalAcceptanceState = state;
  window.BTVClearSignupLegal = () => { store(null); render(); };
  window.BTVSignupLegal = () => $('#signupConsent')?.focus();

  const start = () => { build(); hydrate(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
