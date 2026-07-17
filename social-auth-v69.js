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
    updateAuthCopy(login);
    $('.authCard')?.scrollIntoView({ block: 'center' });
  }

  async function googleSignIn(button) {
    try {
      if (!window.btvSupabase?.auth) throw new Error('The secure sign-in service is still loading. Please try again.');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await window.btvSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } }
      });
      if (error) throw error;
    } catch (error) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      toast(error?.message || 'Google sign-in could not be started.');
    }
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

    auth.classList.add('btvAuthV69');

    const story = document.createElement('aside');
    story.className = 'authStory';
    story.setAttribute('aria-label', 'Beyond The Visa introduction');
    story.innerHTML = `
      <div class="storyInner">
        <img class="storyLogo" src="login-logo-v72.png?v=72.1" alt="Beyond The Visa">
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
        <img class="authBrandLogoV69" src="login-logo-v72.png?v=72.1" alt="Beyond The Visa">
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
      <button class="googleAuth" type="button" id="googleAuthV69" aria-label="Continue with Google"><span class="googleMark" aria-hidden="true">G</span><span>Continue with Google</span></button>`;
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

    $('#showLogin')?.addEventListener('click', () => updateAuthCopy(true));
    prompt.addEventListener('click', () => showTab(false));
    $('#googleAuthV69')?.addEventListener('click', event => googleSignIn(event.currentTarget));
    $('#forgotPasswordV69')?.addEventListener('click', event => resetPassword(event.currentTarget));

    const requestedSignup = new URLSearchParams(location.search).get('mode') === 'signup';
    setTimeout(() => showTab(!requestedSignup), 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
})();
