(() => {
  'use strict';
  if (window.__btvLegalCentre196) return;
  window.__btvLegalCentre196 = true;

  const VERSION = '2026-07-30';
  const LABELS = { privacy: 'Privacy Policy', terms: 'Terms & Conditions', cookies: 'Cookies & storage', controls: 'Your data & choices' };
  const SUMMARIES = {
    privacy: ['What we collect', 'Why we use it', 'Who supports the service', 'How long it is kept', 'Your privacy rights'],
    terms: ['Your account responsibilities', 'Education and AI limits', 'Paid services and Beyond Coins', 'Community and acceptable use', 'Ending or restricting access'],
    cookies: ['Necessary storage only', 'No advertising cookies', 'No behavioural tracking', 'How to clear site data', 'Future choices require opt-in'],
    controls: ['Review your record', 'Export local app data', 'Manage storage choices', 'Request correction or deletion', 'Contact privacy support']
  };
  let baseShowPolicy = null;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function policyIntro(type) {
    const descriptions = {
      privacy: 'Understand what information Beyond The Visa uses, why it is needed and the choices available to you.',
      terms: 'The rules that protect members, professional content and the services provided through Beyond The Visa.',
      cookies: 'A clear record of device storage used for sign-in, security, preferences and requested features.',
      controls: 'Review your agreement record and use available privacy, storage and account controls.'
    };
    return `<header class="legalDocumentHead196"><div><span>${escapeHtml(type === 'controls' ? 'ACCOUNT CONTROL' : 'POLICY DOCUMENT')}</span><h2>${escapeHtml(LABELS[type])}</h2><p>${escapeHtml(descriptions[type])}</p></div><dl><div><dt>Policy version</dt><dd>${VERSION}</dd></div><div><dt>Effective</dt><dd>30 July 2026</dd></div></dl></header><div class="legalPlainSummary196"><b>At a glance</b><div>${SUMMARIES[type].map(item => `<span><i>✓</i>${escapeHtml(item)}</span>`).join('')}</div></div>`;
  }

  function structureDocument(type, body) {
    body.querySelectorAll('.legalAcceptance86').forEach(node => node.remove());
    if (type === 'controls') {
      body.insertAdjacentHTML('afterbegin', `${policyIntro(type)}<section class="legalPreferences196"><div><span>STORAGE PREFERENCES</span><h3>Your current choice</h3><p>Beyond The Visa currently uses necessary account and security storage only. Advertising and cross-site tracking are not enabled.</p></div><div><label><input type="checkbox" checked disabled> Necessary account storage <small>Required for sign-in, security and requested features</small></label><label><input type="checkbox" disabled> Analytics storage <small>Not currently used</small></label><label><input type="checkbox" disabled> Advertising storage <small>Not currently used</small></label></div></section>`);
      return;
    }
    const source = document.createElement('div');
    source.className = 'legalCopy196';
    while (body.firstChild) source.append(body.firstChild);
    const headings = [...source.querySelectorAll('h3')];
    headings.forEach((heading, index) => { if (!heading.id) heading.id = `legal-${type}-${index + 1}`; });
    const toc = headings.map(heading => `<a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.textContent)}</a>`).join('');
    body.innerHTML = `${policyIntro(type)}<div class="legalDocumentLayout196"><aside><b>In this policy</b><nav>${toc || '<span>Policy overview</span>'}</nav><div><span>Full documents</span><a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy ↗</a><a href="terms-and-conditions.html" target="_blank" rel="noopener">Terms & Conditions ↗</a><a href="cookie-policy.html" target="_blank" rel="noopener">Cookie Policy ↗</a></div></aside><div data-legal-copy></div></div>`;
    body.querySelector('[data-legal-copy]').append(source);
  }

  function renderPolicy(type = 'privacy', button) {
    const legal = document.getElementById('legal');
    const body = document.getElementById('policyBody');
    if (!legal || !body || !baseShowPolicy) return;
    const selected = button || legal.querySelector(`[data-policy="${type}"]`);
    legal.querySelectorAll('[data-policy]').forEach(item => {
      const active = item === selected;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    baseShowPolicy(type, selected);
    structureDocument(type, body);
    legal.dataset.activePolicy = type;
  }

  async function renderAgreement() {
    const host = document.querySelector('[data-legal-agreement]');
    if (!host) return;
    let user = null;
    try { user = (await window.btvSupabase?.auth?.getUser())?.data?.user || null; } catch {}
    const metadata = user?.user_metadata || {};
    const current = metadata.combined_legal_version === VERSION || (metadata.terms_version === VERSION && metadata.privacy_version === VERSION);
    const stamp = metadata.combined_legal_accepted_at || metadata.terms_accepted_at || metadata.privacy_acknowledged_at || null;
    const date = stamp && !Number.isNaN(new Date(stamp).getTime()) ? new Date(stamp).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) : null;
    host.innerHTML = `<div class="legalAgreementStatus196"><span>${current ? 'CURRENT AGREEMENT' : 'REVIEW STATUS'}</span><h2>${current ? 'Your policy record is current.' : stamp ? 'A policy update is available.' : 'Review and record your agreement.'}</h2><p>${current && date ? `Recorded on ${escapeHtml(date)} for version ${VERSION}.` : stamp ? `Your earlier record${date ? ` from ${escapeHtml(date)}` : ''} remains available. Review the current version below.` : 'Read the current documents before recording your choice.'}</p></div><form data-legal-accept-form><label><input type="checkbox" data-accept-terms ${current ? 'checked' : ''}> <span><b>I agree to the Terms & Conditions</b><small>This is required to continue using an account.</small></span></label><label><input type="checkbox" data-ack-privacy ${current ? 'checked' : ''}> <span><b>I acknowledge that I have read the Privacy Policy</b><small>This acknowledgement is not consent to optional marketing or advertising.</small></span></label><div><button type="submit">${current ? 'Record review again' : 'Record review and acceptance'}</button><small role="status" data-legal-status>${user ? 'Your account, policy version and time will be recorded.' : 'Sign in to record an account agreement.'}</small></div></form>`;
    const form = host.querySelector('[data-legal-accept-form]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const status = form.querySelector('[data-legal-status]'), submit = form.querySelector('button[type="submit"]');
      if (!user) { status.textContent = 'Sign in before recording an agreement.'; return; }
      if (!form.querySelector('[data-accept-terms]').checked || !form.querySelector('[data-ack-privacy]').checked) { status.textContent = 'Confirm both statements before continuing.'; return; }
      submit.disabled = true;
      status.textContent = 'Recording securely…';
      const acceptedAt = new Date().toISOString();
      try {
        const { error } = await window.btvSupabase.auth.updateUser({ data: { ...metadata, combined_legal_version: VERSION, combined_legal_accepted_at: acceptedAt, terms_version: VERSION, terms_status: 'accepted', terms_accepted_at: acceptedAt, privacy_version: VERSION, privacy_status: 'acknowledged', privacy_acknowledged_at: acceptedAt, cookie_policy_version: VERSION, cookie_status: 'necessary_only', cookie_understood_at: acceptedAt } });
        if (error) throw error;
        try { localStorage.setItem('btv-cookie-preferences', JSON.stringify({ version: VERSION, necessary: true, analytics: false, advertising: false, updatedAt: acceptedAt })); } catch {}
        await renderAgreement();
      } catch (error) {
        submit.disabled = false;
        status.textContent = error?.message || 'The agreement could not be recorded. No preference was changed.';
      }
    });
  }

  function install() {
    const legal = document.getElementById('legal');
    if (!legal || legal.dataset.legal196 || typeof window.showPolicy !== 'function') return false;
    legal.dataset.legal196 = 'true';
    legal.classList.add('legalCentre196');
    baseShowPolicy = window.showPolicy;
    legal.innerHTML = `<button type="button" class="legalBack196" data-legal-back aria-label="Back to previous page">← <span>Back</span></button><section class="legalHero196"><div><span>BEYOND THE VISA · TRUST CENTRE</span><h1>Privacy, terms and your choices.</h1><p>Clear policies, plain-language summaries and account controls in one place.</p><div><b>Versioned policies</b><b>No advertising cookies</b><b>Account-level record</b></div></div><aside><span>OUR COMMITMENT</span><b>Built for clarity, control and responsible handling of your information.</b><small>Policy documents remain available before sign-up and from your account at any time.</small></aside></section><div class="legalShell196"><aside class="legalNavigation196"><div><span>POLICY CENTRE</span><h2>Documents</h2></div><nav class="legalTabs" role="tablist" aria-label="Legal documents"><button type="button" class="active" role="tab" data-policy="privacy"><i>01</i><span><b>Privacy Policy</b><small>Information and rights</small></span></button><button type="button" role="tab" data-policy="terms"><i>02</i><span><b>Terms & Conditions</b><small>Rules for using the service</small></span></button><button type="button" role="tab" data-policy="cookies"><i>03</i><span><b>Cookies & storage</b><small>Device technology choices</small></span></button><button type="button" role="tab" data-policy="controls"><i>04</i><span><b>Your data & choices</b><small>Exports and account controls</small></span></button></nav><section><span>POLICY HELP</span><b>Need to make a privacy request?</b><p>Use Contact Us and choose “Privacy or data request”. Identity verification may be required.</p><button type="button" data-legal-contact>Open Contact Us</button></section></aside><main><article id="policyBody" class="policyBody" role="tabpanel"></article><section class="legalAgreement196" data-legal-agreement aria-live="polite"></section><p class="legalAdvice196">These documents explain the service and do not replace independent legal advice. Mandatory rights remain unaffected.</p></main></div>`;
    legal.querySelector('[data-legal-back]').addEventListener('click', () => { if (history.length > 1) history.back(); else window.openScreen?.('home'); });
    legal.querySelector('[data-legal-contact]').addEventListener('click', () => window.openScreen?.('contact'));
    legal.querySelectorAll('[data-policy]').forEach(button => button.addEventListener('click', () => renderPolicy(button.dataset.policy, button)));
    window.showPolicy = renderPolicy;
    renderPolicy('privacy', legal.querySelector('[data-policy="privacy"]'));
    renderAgreement();
    return true;
  }

  let observer;
  const attempt = () => {
    const installed = install();
    if (installed && observer) observer.disconnect();
    return installed;
  };
  window.addEventListener('btv:app-content-ready', attempt);
  document.addEventListener('DOMContentLoaded', attempt, { once: true });
  if (!attempt()) {
    observer = new MutationObserver(attempt);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
