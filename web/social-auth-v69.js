(() => {
  'use strict';
  if (window.__btvAuthV69) return;
  window.__btvAuthV69 = true;

  const $ = (selector, root = document) => root.querySelector(selector);

  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else {
      const error = $('#loginError');
      if (error) error.textContent = message;
    }
  }

  function updateAuthCopy(login) {
    const title = $('.authWelcome h2');
    const copy = $('.authWelcome p');
    const prompt = $('#createAccountPrompt');
    const divider = $('.socialDivider span');
    if (title) title.textContent = login ? 'Welcome back!' : 'Create your account';
    if (copy) copy.textContent = login
      ? 'Sign in to continue your journey towards your goals.'
      : 'Build your personalised nursing or midwifery journey in a few minutes.';
    if (prompt) prompt.hidden = !login;
    if (divider) divider.textContent = login ? 'or continue with' : 'or create an account with';
  }

  function showTab(login) {
    if (typeof window.authTab === 'function') window.authTab(login);
    else {
      const signup = $('#signupForm');
      const signin = $('#loginForm');
      const signupButton = $('#showSignup');
      const loginButton = $('#showLogin');
      if (signup) signup.hidden = login;
      if (signin) signin.hidden = !login;
      signupButton?.classList.toggle('active', !login);
      loginButton?.classList.toggle('active', login);
    }
    updateAuthCopy(login);
    $('.authCard')?.scrollIntoView({ block: 'center' });
  }

  const oauthReturnKey = 'btv-oauth-return-v274';
  const oauthMessageKey = 'btv-oauth-message-v274';

  function oauthReturnPath() {
    const path = `${location.pathname}${location.search}${location.hash}`;
    return path.startsWith('/auth/callback') ? '/?mode=login' : path;
  }

  async function socialSignIn(provider, button) {
    try {
      if (!window.btvSupabase?.auth) throw new Error('The secure sign-in service is still loading. Please try again.');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      const isFacebook = provider === 'facebook';
      if (isFacebook) {
        sessionStorage.setItem(oauthReturnKey, oauthReturnPath());
        sessionStorage.removeItem(oauthMessageKey);
      }
      const redirectTo = isFacebook
        ? `${window.location.origin}/auth/callback`
        : `${location.origin}${location.pathname}${location.search}`;
      const { error } = await window.btvSupabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === 'google' ? { queryParams: { access_type: 'offline', prompt: 'consent' } } : {})
        }
      });
      if (error) throw error;
    } catch (error) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      toast(error?.message || `${provider === 'facebook' ? 'Facebook' : 'Google'} sign-in could not be started.`);
    }
  }

  function showOauthMessage() {
    let message = '';
    try {
      message = sessionStorage.getItem(oauthMessageKey) || '';
      sessionStorage.removeItem(oauthMessageKey);
    } catch {}
    if (!message) return;
    const error = $('#loginError');
    if (error) {
      error.setAttribute('role', 'alert');
      error.textContent = message;
    } else toast(message);
  }

  function waitForSupabase(timeout = 20000) {
    if (window.btvSupabase?.auth) return Promise.resolve(window.btvSupabase);
    return new Promise((resolve, reject) => {
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener('btv:supabase-ready', ready);
        window.removeEventListener('btv:supabase-error', failed);
      };
      const ready = () => {
        cleanup();
        window.btvSupabase?.auth
          ? resolve(window.btvSupabase)
          : reject(new Error('The secure sign-in service could not be started.'));
      };
      const failed = event => {
        cleanup();
        reject(new Error(event?.detail?.message || 'The secure sign-in service could not be loaded.'));
      };
      window.addEventListener('btv:supabase-ready', ready, { once: true });
      window.addEventListener('btv:supabase-error', failed, { once: true });
      timer = setTimeout(() => {
        cleanup();
        reject(new Error('The secure sign-in service took too long to load. Refresh and try again.'));
      }, timeout);
    });
  }

  function installEarlyPasswordSignIn(login) {
    login?.addEventListener('submit', async event => {
      /* The canonical handler takes over once the full document has parsed. */
      if (typeof login.onsubmit === 'function') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const button = login.querySelector('.authSubmit');
      const errorBox = $('#loginError', login);
      button.disabled = true;
      button.textContent = 'Signing in…';
      if (errorBox) errorBox.textContent = '';
      try {
        const client = await waitForSupabase();
        const email = $('#loginEmail', login)?.value.trim().toLowerCase();
        const password = $('#loginPassword', login)?.value || '';
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data?.session) throw new Error('Sign-in was not completed. Please try again.');
        location.reload();
      } catch (error) {
        if (errorBox) errorBox.textContent = error?.message || 'Email or password not recognised.';
        button.disabled = false;
        button.textContent = 'Sign in';
      }
    });
  }

  async function resetPassword(button) {
    const email = $('#loginEmail')?.value.trim().toLowerCase();
    if (!email) {
      $('#loginEmail')?.focus();
      toast('Enter your email address first, then choose Forgot password.');
      return;
    }
    try {
      button.disabled = true;
      const redirectTo = `${location.origin}${location.pathname}?mode=login`;
      const { error } = await window.btvSupabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast('Password reset instructions have been sent to your email.');
    } catch (error) {
      toast(error?.message || 'Password reset could not be started.');
    } finally {
      button.disabled = false;
    }
  }

  function enhance() {
    const auth = $('#auth');
    const card = auth?.querySelector('.authCard');
    if (!auth || !card || auth.classList.contains('btvAuthV69')) return;

    /* Keep the legacy static auth markup hidden until the current UI is complete. */
    const story = document.createElement('aside');
    story.className = 'authStory';
    story.setAttribute('aria-label', 'Beyond The Visa introduction');
    story.innerHTML = `
      <div class="storyInner">
        <img class="storyLogo" src="favicon-192-v281.png?v=281" width="192" height="192" alt="Beyond The Visa">
        <h1>Your Nursing <em>Journey.</em><br>Our Guidance.<br><em>Your Future.</em></h1>
        <div class="goldRule"></div>
        <p>Your all-in-one platform for international registration, exam preparation, career readiness and confident relocation.</p>
        <div class="benefitList">
          <div><i>▤</i><span><b>Expert guidance</b><small>Step-by-step support shaped around your destination.</small></span></div>
          <div><i>◎</i><span><b>Exam preparation</b><small>CBT, NCLEX and IELTS Academic learning where eligible.</small></span></div>
          <div><i>▣</i><span><b>Career opportunities</b><small>Practical CV, interview and job-search support.</small></span></div>
          <div><i>↗</i><span><b>Track progress</b><small>A personalised dashboard for your complete journey.</small></span></div>
        </div>
        <small class="storyFoot">Guidance for internationally educated nurses and midwives.</small>
      </div>`;

    const workspace = document.createElement('section');
    workspace.className = 'authWorkspace';
    workspace.innerHTML = `
      <div class="authTopbar">
        <label class="languageSelect"><span aria-hidden="true">◎</span><span class="sr">Language</span><select aria-label="Language"><option>English</option></select></label>
      </div>
      <div class="authMain">
        <img class="authBrandLogoV69" src="favicon-512-v281.webp?v=302" width="512" height="512" alt="Beyond The Visa">
        <div class="authWelcome"><h2>Welcome back!</h2><p>Sign in to continue your journey towards your goals.</p></div>
      </div>`;

    const main = $('.authMain', workspace);
    main.append(card);

    /* Account creation lives in the single prompt below the sign-in card. */
    const signupTab = $('#showSignup', card);
    if (signupTab) {
      signupTab.hidden = true;
      signupTab.setAttribute('aria-hidden', 'true');
      signupTab.tabIndex = -1;
    }

    const login = $('#loginForm', card);
    const loginError = $('#loginError', login);
    installEarlyPasswordSignIn(login);
    if (login && loginError) {
      /* Replace the legacy recovery link with the aligned v69 control. */
      $('#forgotPassword', login)?.remove();
      const options = document.createElement('div');
      options.className = 'loginOptions';
      options.innerHTML = `
        <label class="rememberRow"><input type="checkbox" id="rememberMe"><span>Remember me</span></label>
        <button class="forgotButton" id="forgotPasswordV69" type="button">Forgot password?</button>`;
      login.insertBefore(options, loginError);
    }

    const social = document.createElement('div');
    social.className = 'authSocialV69';
    social.innerHTML = `
      <div class="socialDivider"><span>or continue with</span></div>
      <div class="socialButtonsV274">
        <button class="googleAuth" type="button" id="googleAuthV69"><span class="googleMark" aria-hidden="true">G</span><span>Continue with Google</span></button>
        <button class="facebookAuth" type="button" id="facebookAuthV274"><span class="facebookMark" aria-hidden="true">f</span><span>Continue with Facebook</span></button>
      </div>`;
    card.append(social);

    const prompt = document.createElement('button');
    prompt.className = 'createPrompt';
    prompt.type = 'button';
    prompt.id = 'createAccountPrompt';
    prompt.innerHTML = '<span aria-hidden="true">✦</span><span><b>New to Beyond The Visa?</b><small>Create an account and start your personalised journey.</small><em>Create account →</em></span>';
    main.append(prompt);

    const trust = document.createElement('div');
    trust.className = 'trustStrip';
    trust.innerHTML = '<div>♢<span>Trusted by<br>Nurses</span></div><div>▣<span>Secure &amp;<br>Private</span></div><div>✹<span>Career<br>Focused</span></div><div>◉<span>Guidance<br>On demand</span></div>';
    main.append(trust);
    const footer = document.createElement('footer');
    footer.className = 'authFooter';
    footer.textContent = `© ${new Date().getFullYear()} Beyond The Visa. All rights reserved.`;
    main.append(footer);

    auth.replaceChildren(story, workspace);
    auth.classList.add('btvAuthV69', 'btvAuthReady');
    window.dispatchEvent(new CustomEvent('btv:auth-ready'));
    window.__btvRevealCurrentUI?.();

    $('#showLogin')?.addEventListener('click', () => updateAuthCopy(true));
    prompt.addEventListener('click', () => showTab(false));
    $('#googleAuthV69')?.addEventListener('click', event => socialSignIn('google', event.currentTarget));
    $('#facebookAuthV274')?.addEventListener('click', event => socialSignIn('facebook', event.currentTarget));
    $('#forgotPasswordV69')?.addEventListener('click', event => resetPassword(event.currentTarget));

    /* Always enter through sign-in. Account creation is revealed only by the prompt above. */
    showTab(true);
    showOauthMessage();
  }

  if ($('#auth')) enhance();
  else document.addEventListener('DOMContentLoaded', enhance, { once: true });
})();
