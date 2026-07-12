(()=>{
 const EXAM_COUNTRIES=['uk'];
 const normalize=v=>{v=String(v||'').trim().toLowerCase();if(['uk','gb','united kingdom','england','scotland','wales','northern ireland'].includes(v))return'uk';if(['us','usa','united states','united states of america'].includes(v))return'us';if(['ca','canada'].includes(v))return'ca';return v};
 function savedCountry(){try{const s=JSON.parse(localStorage.getItem('btv-v1')||'{}');return normalize(s.country||s.destination)}catch{return''}}
 async function context(){
  let country=savedCountry(),accountType='free',role='user';
  try{
   const sb=window.btvSupabase;if(!sb)return{country,accountType,role};
   const {data:{session}}=await sb.auth.getSession();if(!session)return{country,accountType,role};
   const {data}=await sb.from('profiles').select('destination,account_type,role').eq('id',session.user.id).maybeSingle();
   if(data){country=normalize(data.destination)||country;accountType=String(data.account_type||'free').toLowerCase();role=String(data.role||'user').toLowerCase()}
  }catch(e){console.warn('CBT access check failed',e)}
  return{country,accountType,role};
 }
 function styles(){if(document.getElementById('examLaunchStyleV30'))return;const s=document.createElement('style');s.id='examLaunchStyleV30';s.textContent=`
 .examLaunchCard{margin:0 0 16px;padding:20px;border-radius:20px;color:#fff;box-shadow:0 14px 34px rgba(18,63,67,.2)}
 .examLaunchCard.cbt{background:linear-gradient(140deg,#123f43,#1d6c6c)}
 .examLaunchCard.nclex{background:linear-gradient(140deg,#173f5f,#20639b)}
 .examLaunchCard span{font-size:10px;letter-spacing:.13em;color:#f1d477;font-weight:900}.examLaunchCard h2{font-family:Georgia,serif;margin:8px 0}.examLaunchCard p{color:#d8e7e5;line-height:1.5}.examLaunchCard a,.examLaunchCard button{display:inline-block;margin-top:8px;padding:12px 15px;border:0;border-radius:12px;background:#dfbc62;color:#2f2a1c;text-decoration:none;font-weight:900}.examLaunchCard .lock{display:inline-flex;align-items:center;gap:7px;margin-top:8px;font-size:12px;color:#fff}.examLaunchCard[hidden]{display:none!important}`;document.head.append(s)}
 function clear(){document.querySelectorAll('[data-cbt-centre]').forEach(x=>x.remove())}
 async function enforce(){
  clear();
  const panel=document.getElementById('cbtLesson');const tab=document.querySelector('[data-learn-tab="cbt"]');if(!panel||!tab)return;
  const {country,accountType,role}=await context();const eligible=EXAM_COUNTRIES.includes(country);tab.hidden=!eligible;
  if(!eligible){if(tab.classList.contains('active'))document.querySelector('[data-learn-tab="guide"]')?.click();return}
  styles();const premium=accountType==='premium'||role==='admin';
  const card=document.createElement('article');card.className='examLaunchCard cbt';card.setAttribute('data-cbt-centre','');
  if(!premium){
   panel.innerHTML='';
   card.innerHTML=`<div><span>PREMIUM · UNITED KINGDOM CBT</span><h2>Unlock CBT practice and mock exams</h2><p>CBT questions, detailed explanations, bookmarks, progress tracking and timed mock tests are included with Premium.</p><div class="lock">🔒 Premium access required</div></div><button type="button" data-premium-request>Buy Premium access →</button>`;
   panel.append(card);return;
  }
  card.innerHTML=`<div><span>PREMIUM · UNITED KINGDOM CBT</span><h2>CBT practice and mock exams</h2><p>Your CBT question bank and timed mock exams are unlocked. Continue below or open the full learning centre.</p></div><a href="cbt.html">Open full CBT Learning Centre →</a>`;
  panel.prepend(card);
 }
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(enforce,50);setTimeout(enforce,900)});
 document.addEventListener('click',e=>{if(e.target.closest('[data-open="learn"],[data-learn-tab="cbt"],#countryGrid .country'))setTimeout(enforce,100)});
 window.addEventListener('storage',e=>{if(e.key==='btv-v1')enforce()});
 window.BTVRefreshCbtAccess=enforce;
 const previous=window.BTVRefreshExamLaunchers;window.BTVRefreshExamLaunchers=()=>{if(typeof previous==='function')previous();enforce()};
})();
