(()=>{
 const EXAM_COUNTRIES=['us','ca'];
 const normalize=v=>{v=String(v||'').trim().toLowerCase();if(['uk','gb','united kingdom'].includes(v))return'uk';if(['us','usa','united states','united states of america'].includes(v))return'us';if(['ca','canada'].includes(v))return'ca';return v};
 function savedCountry(){try{return normalize(JSON.parse(localStorage.getItem('btv-v1')||'{}').country)}catch{return''}}
 async function context(){
  let country=savedCountry(),accountType='free',role='user';
  try{
   const sb=window.btvSupabase;if(!sb)return{country,accountType,role};
   const {data:{session}}=await sb.auth.getSession();if(!session)return{country,accountType,role};
   const {data}=await sb.from('profiles').select('destination,account_type,role').eq('id',session.user.id).maybeSingle();
   if(data){country=normalize(data.destination)||country;accountType=String(data.account_type||'free').toLowerCase();role=String(data.role||'user').toLowerCase()}
  }catch(e){console.warn('NCLEX launcher profile check failed',e)}
  return{country,accountType,role};
 }
 function styles(){if(document.getElementById('examLaunchStyle'))return;const s=document.createElement('style');s.id='examLaunchStyle';s.textContent=`
 .examLaunchCard{margin:16px 0 80px;padding:20px;border-radius:20px;color:#fff;box-shadow:0 14px 34px rgba(18,63,67,.2)}.examLaunchCard.nclex{background:linear-gradient(140deg,#173f5f,#20639b)}.examLaunchCard span{font-size:10px;letter-spacing:.13em;color:#f6d55c;font-weight:900}.examLaunchCard h2{font-family:Georgia,serif;margin:8px 0}.examLaunchCard p{color:#dcecf8;line-height:1.5}.examLaunchCard a,.examLaunchCard button{display:inline-block;margin-top:8px;padding:12px 15px;border:0;border-radius:12px;background:#f6d55c;color:#29323b;text-decoration:none;font-weight:900}.examLaunchCard .lock{display:inline-flex;align-items:center;gap:7px;margin-top:8px;font-size:12px;color:#fff}`;document.head.append(s)}
 async function add(){
  const learn=document.getElementById('learn');if(!learn)return;
  const old=learn.querySelector('[data-nclex-centre]');if(old)old.remove();
  const {country,accountType,role}=await context();if(!EXAM_COUNTRIES.includes(country))return;
  styles();const premium=accountType==='premium'||role==='admin';const location=country==='ca'?'CANADA':'USA';
  const card=document.createElement('article');card.className='examLaunchCard nclex';card.setAttribute('data-nclex-centre','');
  card.innerHTML=premium?`<div><span>${location} · NCLEX-RN</span><h2>Build clinical judgement with NCLEX practice</h2><p>Original NCLEX-style questions, select-all items, rationales, adaptive practice, timed mocks and saved progress.</p></div><a href="nclex.html">Open NCLEX Learning Centre →</a>`:`<div><span>PREMIUM · ${location} NCLEX-RN</span><h2>Unlock NCLEX practice and mock exams</h2><p>NCLEX questions, rationales, adaptive practice, progress tracking and timed mock exams are included with Premium.</p><div class="lock">🔒 Premium access required</div></div><button type="button" data-premium-request>Buy Premium access →</button>`;
  learn.append(card);
 }
 document.addEventListener('DOMContentLoaded',()=>{add();setTimeout(add,800)});
 document.addEventListener('click',e=>{if(e.target.closest('[data-open="learn"]'))setTimeout(add,80)});
 window.addEventListener('storage',e=>{if(e.key==='btv-v1')add()});
 const previous=window.BTVRefreshExamLaunchers;window.BTVRefreshExamLaunchers=()=>{if(typeof previous==='function')previous();add()};
})();
