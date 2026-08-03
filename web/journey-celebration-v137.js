let activeCelebration=null;

const STYLE_ID='btvJourneyCelebration137Styles';
const PETAL_COLOURS=['#ef7286','#f3aa45','#e3bf4f','#68aa8d','#8d79c6','#e985b7'];

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .btvCelebration137,.btvCelebration137 *{box-sizing:border-box}
    .btvCelebration137{position:fixed;inset:0;z-index:2147483000;overflow:hidden;pointer-events:none;contain:layout paint style;display:grid;place-items:start center;padding:clamp(24px,8vh,76px) 16px;color:#183034}
    .btvCelebration137::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(19,62,67,.13),rgba(245,243,237,.05) 55%,transparent);animation:btvCelebrationFade137 5.2s ease both}
    .btvCelebrationCard137{position:relative;z-index:2;width:min(480px,calc(100vw - 32px));padding:20px 54px 20px 20px;border:1px solid rgba(19,62,67,.18);border-radius:22px;background:rgba(255,255,255,.96);box-shadow:0 20px 55px rgba(19,62,67,.22);display:flex;align-items:center;gap:14px;pointer-events:auto;animation:btvCelebrationCard137 .45s cubic-bezier(.2,.8,.2,1) both}
    .btvCelebrationLogo137{width:48px;height:48px;flex:0 0 48px;color:#fff;background:#133e43;border-radius:15px;padding:8px;box-shadow:0 7px 18px rgba(19,62,67,.2)}
    .btvCelebrationCopy137{min-width:0}.btvCelebrationCopy137 strong{display:block;font:700 clamp(18px,3.5vw,23px)/1.2 Georgia,serif;color:#133e43}.btvCelebrationCopy137 span{display:block;margin-top:5px;font:500 13px/1.45 Inter,system-ui,sans-serif;color:#536b6d}
    .btvCelebrationClose137{position:absolute;right:12px;top:12px;width:34px;height:34px;border:0;border-radius:50%;background:#e4efed;color:#133e43;font:700 20px/1 system-ui;display:grid;place-items:center;cursor:pointer}.btvCelebrationClose137:hover{background:#d5e7e4}.btvCelebrationClose137:focus-visible{outline:3px solid #d6a64b;outline-offset:2px}
    .btvPetal137{--petal:#ef7286;position:absolute;z-index:1;top:-42px;left:var(--left);width:var(--size);height:calc(var(--size)*1.35);border-radius:75% 20% 70% 30%;background:var(--petal);opacity:.88;box-shadow:inset -2px -3px 3px rgba(19,62,67,.13);animation:btvPetalFall137 var(--duration) var(--delay) cubic-bezier(.22,.55,.45,1) forwards;will-change:transform}
    .btvPetal137:nth-of-type(3n){border-radius:50% 80% 45% 75%}.btvPetal137:nth-of-type(4n){width:calc(var(--size)*1.15);height:var(--size);border-radius:50%}
    .btvCelebration137.is-paused .btvPetal137,.btvCelebration137.is-paused::before{animation-play-state:paused}
    body.dark .btvCelebrationCard137{background:rgba(23,34,36,.97);border-color:#395054}body.dark .btvCelebrationCopy137 strong{color:#f0f5f4}body.dark .btvCelebrationCopy137 span{color:#b8c8c7}body.dark .btvCelebrationClose137{background:#294044;color:#f0f5f4}
    @keyframes btvPetalFall137{0%{transform:translate3d(0,-8vh,0) rotate(0deg)}45%{transform:translate3d(var(--drift),48vh,0) rotate(310deg)}100%{transform:translate3d(calc(var(--drift)*-.4),112vh,0) rotate(690deg)}}
    @keyframes btvCelebrationCard137{from{opacity:0;transform:translateY(-18px) scale(.97)}to{opacity:1;transform:none}}
    @keyframes btvCelebrationFade137{0%,82%{opacity:1}100%{opacity:0}}
    @media(max-width:520px){.btvCelebration137{padding-top:max(36px,calc(env(safe-area-inset-top) + 20px))}.btvCelebrationCard137{padding:16px 48px 16px 15px;border-radius:18px}.btvCelebrationLogo137{width:42px;height:42px;flex-basis:42px}}
    @media(prefers-reduced-motion:reduce){.btvCelebration137::before,.btvCelebrationCard137{animation:none}.btvCelebration137::before{background:rgba(19,62,67,.08)}.btvPetal137{display:none}}
  `;
  document.head.append(style);
}

function brandMark(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('aria-hidden','true');svg.classList.add('btvCelebrationLogo137');
  svg.innerHTML='<path d="M14 13h25c10 0 16 5 16 13 0 5-3 9-8 11 6 2 9 6 9 12 0 10-8 15-20 15H14V13z" fill="currentColor"/><path d="M26 24h11c4 0 6 2 6 5s-2 5-6 5H26V24zm0 20h13c4 0 6 2 6 5s-2 5-7 5H26V44z" fill="#fff"/><path d="M8 8l8 5-8 5z" fill="#e2b44d"/>';
  return svg;
}

export function showJourneyCelebration({duration=5200}={}){
  if(activeCelebration)return activeCelebration.promise;
  installStyles();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root=document.createElement('section');root.className='btvCelebration137';root.setAttribute('aria-label','Journey completion celebration');
  const card=document.createElement('div');card.className='btvCelebrationCard137';card.setAttribute('role','status');card.setAttribute('aria-live','polite');card.setAttribute('aria-atomic','true');
  const copy=document.createElement('div');copy.className='btvCelebrationCopy137';
  const heading=document.createElement('strong');heading.textContent='Amazing. Keep it up.';
  const detail=document.createElement('span');detail.textContent='You completed another step in your Beyond The Visa journey.';
  const close=document.createElement('button');close.type='button';close.className='btvCelebrationClose137';close.setAttribute('aria-label','Dismiss celebration');close.textContent='×';
  copy.append(heading,detail);card.append(brandMark(),copy,close);root.append(card);
  if(!reduced){
    const count=matchMedia('(max-width: 640px), (max-height: 500px)').matches?18:28;
    for(let index=0;index<count;index+=1){
      const petal=document.createElement('i');petal.className='btvPetal137';petal.setAttribute('aria-hidden','true');
      petal.style.setProperty('--left',`${2+Math.random()*96}%`);petal.style.setProperty('--size',`${8+Math.random()*9}px`);petal.style.setProperty('--drift',`${-55+Math.random()*110}px`);petal.style.setProperty('--duration',`${3.7+Math.random()*1.1}s`);petal.style.setProperty('--delay',`${Math.random()*.75}s`);petal.style.setProperty('--petal',PETAL_COLOURS[index%PETAL_COLOURS.length]);root.append(petal);
    }
  }
  document.body.append(root);

  let resolvePromise,remaining=duration,started=performance.now(),timer;
  const promise=new Promise(resolve=>{resolvePromise=resolve});
  const cleanup=()=>{if(!activeCelebration)return;clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);root.remove();activeCelebration=null;resolvePromise()};
  const schedule=()=>{started=performance.now();timer=setTimeout(cleanup,remaining)};
  const visibility=()=>{if(document.hidden){remaining=Math.max(0,remaining-(performance.now()-started));clearTimeout(timer);root.classList.add('is-paused')}else{root.classList.remove('is-paused');if(remaining<=0)cleanup();else schedule()}};
  close.addEventListener('click',cleanup,{once:true});document.addEventListener('visibilitychange',visibility);schedule();
  activeCelebration={promise,cleanup};return promise;
}
