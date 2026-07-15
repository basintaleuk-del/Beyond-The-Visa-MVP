(function(){
  function switchTab(login){
    if(typeof window.authTab==='function') window.authTab(login);
    else {
      const signup=document.getElementById('signupForm'), signin=document.getElementById('loginForm');
      if(signup) signup.hidden=login;
      if(signin) signin.hidden=!login;
      document.getElementById('showSignup')?.classList.toggle('active',!login);
      document.getElementById('showLogin')?.classList.toggle('active',login);
    }
  }
  document.getElementById('createAccountPrompt')?.addEventListener('click',()=>{switchTab(false);document.querySelector('.authCard')?.scrollIntoView({behavior:'smooth',block:'center'})});
  document.getElementById('forgotPasswordV69')?.addEventListener('click',()=>document.getElementById('forgotPassword')?.click());
  document.querySelectorAll('[data-oauth]').forEach(button=>button.addEventListener('click',async()=>{
    const provider=button.dataset.oauth;
    try{
      if(!window.btvSupabase?.auth) throw new Error('Sign-in service is still loading. Please refresh and try again.');
      button.disabled=true;
      const redirectTo=location.origin+location.pathname;
      const options={redirectTo};
      if(provider==='azure') options.scopes='email';
      const {error}=await window.btvSupabase.auth.signInWithOAuth({provider,options});
      if(error) throw error;
    }catch(error){
      button.disabled=false;
      const text=error?.message||'Unable to start social sign-in.';
      if(typeof window.toast==='function') window.toast(text); else alert(text);
    }
  }));
  // Match the supplied design: open on sign-in by default unless the URL explicitly requests signup.
  if(new URLSearchParams(location.search).get('mode')!=='signup') setTimeout(()=>switchTab(true),0);
})();
