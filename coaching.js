const authAccount=()=>JSON.parse(localStorage.getItem('btv-account')||'null');
const authSession=()=>sessionStorage.getItem('btv-session')==='yes';
const userProfile=()=>JSON.parse(localStorage.getItem('btv-profile')||'null');

function setVisible(element,visible,display='block'){
  element.hidden=!visible;
  element.style.display=visible?display:'none';
}

function personalise(){
  const account=authAccount(),profile=userProfile();
  const heading=document.querySelector('.welcome h1');
  if(heading&&account)heading.textContent='Welcome back, '+account.name.split(' ')[0];
  if(profile){
    const stored=JSON.parse(localStorage.getItem('btv-v1')||'{}');
    stored.country=profile.destination;
    localStorage.setItem('btv-v1',JSON.stringify(stored));
    if(typeof state!=='undefined'){state.country=profile.destination;render()}
    let card=document.getElementById('profileSummary');
    if(!card){card=document.createElement('button');card.id='profileSummary';card.type='button';card.style.cssText='width:100%;margin:14px 0 0;padding:13px 15px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--ink);text-align:left;box-shadow:var(--shadow)';document.querySelector('.welcome').after(card)}
    card.innerHTML=`<b>${profile.profession} · ${country().name}</b><small style="display:block;color:var(--muted);margin-top:4px">${profile.stage} · Edit profile →</small>`;
    card.onclick=showOnboarding;
  }
}

function showApp(){
  setVisible(document.getElementById('auth'),false);
  const onboarding=document.getElementById('onboarding');
  if(onboarding)setVisible(onboarding,false);
  setVisible(document.getElementById('appShell'),true);
  personalise();
}

function showAuth(){
  setVisible(document.getElementById('appShell'),false);
  const onboarding=document.getElementById('onboarding');
  if(onboarding)setVisible(onboarding,false);
  setVisible(document.getElementById('auth'),true,'grid');
}

function authTab(login){
  const signup=document.getElementById('signupForm'),signin=document.getElementById('loginForm');
  setVisible(signup,!login,'grid');
  setVisible(signin,login,'grid');
  document.getElementById('showSignup').classList.toggle('active',!login);
  document.getElementById('showLogin').classList.toggle('active',login);
  document.getElementById('loginError').textContent='';
}

function buildOnboarding(){
  if(document.getElementById('onboarding'))return;
  const style=document.createElement('style');
  style.textContent='.onboard{min-height:100vh;background:linear-gradient(155deg,#0e3338,#1f6869);padding:35px 18px;color:#fff;display:grid;place-items:center}.onboardCard{width:min(100%,520px);background:#fff;color:#183034;border-radius:24px;padding:22px;box-shadow:0 22px 50px #061b1e55}.onboardStep{font-size:11px;letter-spacing:.14em;color:#247c7c;font-weight:900}.onboardCard h1{font:30px Georgia,serif;margin:7px 0}.onboardCard>p{color:#6e7d7e;line-height:1.45}.onboardGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.onboardGrid label{font-size:12px;font-weight:800;display:grid;gap:6px}.onboardGrid select,.onboardGrid input{width:100%;border:1px solid #dce3e0;border-radius:12px;padding:12px;background:#fafbf9;color:#183034}.onboardWide{grid-column:1/-1}.onboardSubmit{grid-column:1/-1;border:0;border-radius:13px;padding:14px;background:#133e43;color:#fff;font-weight:900}.onboardPrivacy{display:block;text-align:center;color:#788686;margin-top:13px;font-size:11px}@media(max-width:500px){.onboardGrid{grid-template-columns:1fr}.onboardWide,.onboardSubmit{grid-column:auto}}';
  document.head.append(style);
  const section=document.createElement('section');
  section.id='onboarding';section.className='onboard';section.hidden=true;
  section.innerHTML='<div class="onboardCard"><span class="onboardStep">PERSONALISE YOUR JOURNEY</span><h1>Tell us where you are heading</h1><p>Zibur will use these answers to tailor your checklist and next steps.</p><form id="onboardForm" class="onboardGrid"><label>Destination<select id="obDestination"><option value="uk">United Kingdom</option><option value="au">Australia</option><option value="ca">Canada</option><option value="nz">New Zealand</option><option value="ie">Ireland</option><option value="us">United States</option></select></label><label>Profession<select id="obProfession"><option>Nurse</option><option>Doctor</option><option>Midwife</option><option>Pharmacist</option><option>Physiotherapist</option><option>Radiographer</option><option>Biomedical scientist</option><option>Healthcare assistant</option><option>Other healthcare professional</option></select></label><label>Country of qualification<input id="obQualification" required placeholder="e.g. Nigeria"></label><label>Registration stage<select id="obStage"><option>Just researching</option><option>Preparing documents</option><option>Application started</option><option>Tests in progress</option><option>Registration completed</option></select></label><label>Job-offer status<select id="obJob"><option>No job offer yet</option><option>Currently applying</option><option>Interview arranged</option><option>Job offer received</option></select></label><label>Travelling with dependants?<select id="obDependants"><option value="no">No</option><option value="yes">Yes</option><option value="unsure">Not sure yet</option></select></label><button class="onboardSubmit">Build my journey</button></form><small class="onboardPrivacy">You can change these answers later. This preview saves them on this device.</small></div>';
  document.body.prepend(section);
  section.querySelector('#onboardForm').onsubmit=e=>{
    e.preventDefault();
    const profile={destination:section.querySelector('#obDestination').value,profession:section.querySelector('#obProfession').value,qualificationCountry:section.querySelector('#obQualification').value.trim(),stage:section.querySelector('#obStage').value,jobStatus:section.querySelector('#obJob').value,dependants:section.querySelector('#obDependants').value};
    localStorage.setItem('btv-profile',JSON.stringify(profile));
    showApp();
  };
}

function showOnboarding(){
  buildOnboarding();
  const profile=userProfile();
  if(profile){
    document.getElementById('obDestination').value=profile.destination;
    document.getElementById('obProfession').value=profile.profession;
    document.getElementById('obQualification').value=profile.qualificationCountry;
    document.getElementById('obStage').value=profile.stage;
    document.getElementById('obJob').value=profile.jobStatus;
    document.getElementById('obDependants').value=profile.dependants;
    document.querySelector('#onboarding h1').textContent='Update your journey';
    document.querySelector('.onboardSubmit').textContent='Save changes';
  }
  setVisible(document.getElementById('auth'),false);
  setVisible(document.getElementById('appShell'),false);
  setVisible(document.getElementById('onboarding'),true,'grid');
}

document.getElementById('showSignup').onclick=()=>authTab(false);
document.getElementById('showLogin').onclick=()=>authTab(true);
document.getElementById('signupForm').onsubmit=e=>{
  e.preventDefault();
  const account={name:document.getElementById('signupName').value.trim(),email:document.getElementById('signupEmail').value.trim().toLowerCase(),password:document.getElementById('signupPassword').value};
  localStorage.setItem('btv-account',JSON.stringify(account));
  sessionStorage.setItem('btv-session','yes');
  showOnboarding();
};
document.getElementById('loginForm').onsubmit=e=>{
  e.preventDefault();
  const account=authAccount(),email=document.getElementById('loginEmail').value.trim().toLowerCase(),password=document.getElementById('loginPassword').value;
  if(account&&account.email===email&&account.password===password){
    sessionStorage.setItem('btv-session','yes');
    userProfile()?showApp():showOnboarding();
  }else document.getElementById('loginError').textContent='Email or password not recognised on this device.';
};
document.getElementById('logout').onclick=()=>{sessionStorage.removeItem('btv-session');showAuth();authTab(true)};
buildOnboarding();
authTab(false);
authAccount()&&authSession()?(userProfile()?showApp():showOnboarding()):showAuth();
