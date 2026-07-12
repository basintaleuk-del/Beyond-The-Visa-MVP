(()=>{
 const EXAM_COUNTRIES=['us','ca'];
 const normalize=v=>{v=String(v||'').trim().toLowerCase();if(['uk','gb','united kingdom'].includes(v))return'uk';if(['us','usa','united states','united states of america'].includes(v))return'us';if(['ca','canada'].includes(v))return'ca';return v};
 function savedCountry(){try{const s=JSON.parse(localStorage.getItem('btv-v1')||'{}');return normalize(s.country||s.destination)}catch{return''}}
 async function context(){
  let country=savedCountry(),accountType='free',role='user';
  try{
   const sb=window.btvSupabase;if(!sb)return{country,accountType,role};
   const {data:{session}}=await sb.auth.getSession();if(!session)return{country,accountType,role};
   const {data}=await sb.from('profiles').select('destination,account_type,role').eq('id',session.user.id).maybeSingle();
   if(data){country=normalize(data.destination)||country;accountType=String(data.account_type||'free').toLowerCase();role=String(data.role||'user').toLowerCase()}
  }catch(e){console.warn('NCLEX access check failed',e)}
  return{country,accountType,role};
 }
 function clear(){document.querySelectorAll('[data-nclex-centre]').forEach(x=>x.remove())}
 async function enforce(){
  clear();
  const panel=document.getElementById('nclexLesson');const tab=document.querySelector('[data-learn-tab="nclex"]');if(!panel||!tab)return;
  const {country,accountType,role}=await context();const eligible=EXAM_COUNTRIES.includes(country);tab.hidden=!eligible;
  if(!eligible){if(tab.classList.contains('active'))document.querySelector('[data-learn-tab="guide"]')?.click();return}
  const premium=accountType==='premium'||role==='admin';const location=country==='ca'?'CANADA':'USA';
  const card=document.createElement('article');card.className='examLaunchCard nclex';card.setAttribute('data-nclex-centre','');
  if(!premium){
   panel.innerHTML='';
   card.innerHTML=`<div><span>PREMIUM · ${location} NCLEX-RN</span><h2>Unlock NCLEX practice and mock exams</h2><p>NCLEX questions, rationales, adaptive practice, progress tracking and timed mock exams are included with Premium.</p><div class="lock">🔒 Premium access required</div></div><button type="button" data-premium-request>Buy Premium access →</button>`;
   panel.append(card);return;
  }
  card.innerHTML=`<div><span>PREMIUM · ${location} NCLEX-RN</span><h2>NCLEX practice and mock exams</h2><p>Your NCLEX question bank, rationales and timed mock exams are unlocked. Continue below or open the full learning centre.</p></div><a href="nclex.html">Open full NCLEX Learning Centre →</a>`;
  panel.prepend(card);
 }
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(enforce,80);setTimeout(enforce,950)});
 document.addEventListener('click',e=>{if(e.target.closest('[data-open="learn"],[data-learn-tab="nclex"],#countryGrid .country'))setTimeout(enforce,120)});
 window.addEventListener('storage',e=>{if(e.key==='btv-v1')enforce()});
 window.BTVRefreshNclexAccess=enforce;
 const previous=window.BTVRefreshExamLaunchers;window.BTVRefreshExamLaunchers=()=>{if(typeof previous==='function')previous();enforce()};
})();
