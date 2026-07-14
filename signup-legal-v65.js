(()=>{
 'use strict';
 if(window.__btvSignupLegalV65)return;window.__btvSignupLegalV65=true;
 const VERSION='2026-07-13',draftKey='btv-signup-legal-draft-v65';
 const labels={terms:'Terms & Conditions',privacy:'Privacy Policy',cookies:'Cookie & Local Storage Policy'};
 const files={terms:'terms-and-conditions.html',privacy:'privacy-policy.html',cookies:'cookie-policy.html'};
 const $=selector=>document.querySelector(selector);
 function readDraft(){try{return JSON.parse(sessionStorage.getItem(draftKey)||'{}')}catch{return{}}}
 const state={terms:null,privacy:null,cookies:null,...readDraft()};
 const store=()=>{try{sessionStorage.setItem(draftKey,JSON.stringify(state))}catch{}};
 const date=value=>value?new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'';
 window.BTVLegalAcceptanceState=()=>({...state,version:VERSION});
 window.BTVClearSignupLegal=()=>{state.terms=state.privacy=state.cookies=null;try{sessionStorage.removeItem(draftKey)}catch{}render()};

 function dialog(){
  let d=$('#signupLegalDialog');if(d)return d;
  d=document.createElement('dialog');d.id='signupLegalDialog';d.className='signupLegalDialog';
  d.innerHTML='<div class="signupLegalHead"><div><small>BEYOND THE VISA · PRIVACY & LEGAL</small><h2 id="signupLegalTitle"></h2></div><button type="button" class="signupLegalClose" aria-label="Close">×</button></div><div class="signupLegalDocument" id="signupLegalDocument"></div><div class="signupLegalFooter"><p class="signupLegalReadStatus" id="signupLegalReadStatus">Read the document and scroll to the end to continue.</p><label class="signupLegalConfirm"><input type="checkbox" id="signupLegalConfirm" disabled><span id="signupLegalConfirmText"></span></label><button type="button" class="signupLegalAction" id="signupLegalAction" disabled></button></div>';
  document.body.append(d);d.querySelector('.signupLegalClose').onclick=()=>d.close();return d;
 }
 async function open(type){
  const d=dialog(),body=$('#signupLegalDocument'),confirm=$('#signupLegalConfirm'),action=$('#signupLegalAction'),status=$('#signupLegalReadStatus'),accepted=state[type];
  d.dataset.type=type;$('#signupLegalTitle').textContent=labels[type];
  $('#signupLegalConfirmText').textContent=type==='terms'?'I have read and agree to these Terms & Conditions.':type==='privacy'?'I have read and acknowledge this Privacy Policy.':'I have read and understand how cookies and local storage are used.';
  action.textContent=accepted?`Accepted on ${date(accepted)}`:type==='terms'?'Accept Terms & Conditions':type==='privacy'?'Acknowledge Privacy Policy':'I understand';
  confirm.checked=Boolean(accepted);confirm.disabled=true;action.disabled=true;
  status.textContent=accepted?`Your status: accepted on ${date(accepted)}. You may read the document again below.`:'Read the document and scroll to the end to continue.';
  body.innerHTML='<p>Loading document…</p>';d.showModal();
  try{
   const html=await fetch(`${files[type]}?v=65`,{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Document could not be loaded');return response.text()});
   const doc=new DOMParser().parseFromString(html,'text/html'),main=doc.querySelector('main');body.innerHTML=main?main.innerHTML:'<p>Document unavailable.</p>';body.querySelectorAll('a').forEach(link=>link.remove());
   if(type==='terms')body.insertAdjacentHTML('afterbegin','<p class="legalAcceptanceNotice">Your acceptance is recorded with your account, including the policy version, date and time. An account cannot be created without accepting these Terms.</p>');
   const unlock=()=>{if(body.scrollHeight-body.scrollTop<=body.clientHeight+35){confirm.disabled=false;action.disabled=!confirm.checked;status.textContent=accepted?`Accepted on ${date(accepted)}. Tick the box again only if you want to renew the recorded acceptance.`:'You have reached the end. Confirm below to continue.'}};
   body.onscroll=unlock;setTimeout(unlock,50);
  }catch(error){body.innerHTML=`<p>${error.message}. Check your connection and try again.</p>`}
  confirm.onchange=()=>action.disabled=!confirm.checked;action.onclick=()=>accept(type);
 }
 function accept(type){state[type]=new Date().toISOString();store();dialog().close();render()}
 async function hydrate(){
  try{const {data}=await window.btvSupabase?.auth.getUser(),meta=data?.user?.user_metadata||{};if(data?.user){state.terms=meta.terms_accepted_at||state.terms;state.privacy=meta.privacy_acknowledged_at||state.privacy;state.cookies=meta.cookie_understood_at||state.cookies;store()}}catch{}
  render();
 }
 function render(){
  const consent=$('#signupConsent');if(consent)consent.checked=Boolean(state.terms&&state.privacy);
  ['terms','privacy','cookies'].forEach(type=>{const button=$(`[data-signup-legal="${type}"]`);if(!button)return;const accepted=state[type];button.classList.toggle('accepted',Boolean(accepted));button.innerHTML=accepted?`<b>✓ ${type==='cookies'?'Understood':type==='privacy'?'Acknowledged':'Accepted'}</b><small>${date(accepted)}</small>`:`<b>${type==='cookies'?'Read policy':'Review & accept'}</b>`});
  const error=$('#signupLegalError');if(error&&state.terms&&state.privacy)error.textContent='';
 }
 function build(){
  const form=$('#signupForm'),original=form?.querySelector('.consent');if(!form||!original||form.querySelector('.signupLegalChoices'))return;
  original.classList.add('btvOriginalConsent');original.querySelector('input').tabIndex=-1;
  original.insertAdjacentHTML('afterend','<fieldset class="signupLegalChoices"><legend>Legal agreements</legend><div class="signupLegalRow"><div><b>Terms & Conditions <span class="signupLegalRequired">Required</span></b><small>Read and accept before creating an account.</small></div><button type="button" data-signup-legal="terms"><b>Review & accept</b></button></div><div class="signupLegalRow"><div><b>Privacy Policy <span class="signupLegalRequired">Required</span></b><small>How your account and personal information are handled.</small></div><button type="button" data-signup-legal="privacy"><b>Review & accept</b></button></div><div class="signupLegalRow"><div><b>Cookie Policy <span class="signupLegalOptional">Optional</span></b><small>How this device stores preferences and progress.</small></div><button type="button" data-signup-legal="cookies"><b>Read policy</b></button></div><p class="signupLegalHint">Terms and Privacy are required. Cookies are optional.</p><p class="signupLegalError" id="signupLegalError" role="alert"></p></fieldset>');
  form.querySelectorAll('[data-signup-legal]').forEach(button=>button.onclick=()=>open(button.dataset.signupLegal));
  form.querySelector('.authSubmit').addEventListener('click',event=>{if(state.terms&&state.privacy)return;event.preventDefault();$('#signupLegalError').textContent=!state.terms?'Accept the Terms & Conditions to continue.':'Acknowledge the Privacy Policy to continue.';open(!state.terms?'terms':'privacy')});render();
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{build();hydrate()},{once:true}):(build(),hydrate());
 window.BTVSignupLegal=open;
})();
