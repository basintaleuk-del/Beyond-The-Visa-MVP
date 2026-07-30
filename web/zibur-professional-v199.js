(()=>{'use strict';if(window.__btvZiburProfessional199)return;window.__btvZiburProfessional199=true;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clean=value=>String(value??'').trim();
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:''}catch{return''}};
let sending=false,history=[];
try{const stored=JSON.parse(localStorage.getItem('btv-zibur-history')||'[]');if(Array.isArray(stored))history=stored.slice(-20)}catch{}

function inline(value){return esc(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')}
function richText(value){
  const lines=clean(value).split(/\r?\n/),parts=[];let list=[];
  const flush=()=>{if(list.length){parts.push(`<ul>${list.map(item=>`<li>${inline(item)}</li>`).join('')}</ul>`);list=[]}};
  for(const raw of lines){const line=raw.trim();if(!line){flush();continue}const heading=line.match(/^#{1,3}\s+(.+)/);if(heading){flush();parts.push(`<h3>${inline(heading[1])}</h3>`);continue}const bullet=line.match(/^(?:[-*•]|\d+[.)])\s+(.+)/);if(bullet){list.push(bullet[1]);continue}flush();parts.push(`<p>${inline(line)}</p>`)}flush();return parts.join('')
}
function icon(name){const icons={spark:'<path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',send:'<path d="m3 3 18 9-18 9 3-9-3-9Z"/><path d="M6 12h15"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',clear:'<path d="M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15M10 11v5m4-5v5"/>',copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.spark}</svg>`}
function context(){let value={};try{value=typeof window.ziburContext==='function'?window.ziburContext():{}}catch{}return{...value,feature:'professional-assistant'}}
function firstName(){try{return clean(JSON.parse(localStorage.getItem('btv-profile')||'{}')?.preferredName||window.authAccount?.()?.name).split(/\s+/)[0]}catch{return''}}
function accountSummary(){const data=context(),profile=data.profile||{},country=data.country||profile.destination||'Your selected destination',stage=profile.stage||'Journey in progress';return{country,stage,profession:profile.profession||'Healthcare professional'}}
function save(){try{localStorage.setItem('btv-zibur-history',JSON.stringify(history.slice(-20)))}catch{}}

function message(role,content,options={}){
  const stream=document.querySelector('[data-zibur-stream]');if(!stream)return null;
  const article=document.createElement('article');article.className=`ziburMsg199 is-${role}${options.thinking?' is-thinking':''}`;
  if(role==='assistant')article.innerHTML=`<div class="ziburMsgMark199">Z</div><div class="ziburMsgBody199">${options.thinking?'<div class="ziburThinking199"><i></i><i></i><i></i><span>Zibur is analysing your question</span></div>':`<div class="ziburRich199">${richText(content)}</div>${sources(options.sources)}<footer><span>Zibur · Professional guidance</span><button type="button" data-copy-answer aria-label="Copy answer">${icon('copy')} Copy</button></footer>`}</div>`;
  else article.innerHTML=`<div class="ziburMsgBody199"><div class="ziburRich199"><p>${inline(content)}</p></div></div>`;
  stream.append(article);article.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  article.querySelector('[data-copy-answer]')?.addEventListener('click',async event=>{try{await navigator.clipboard.writeText(content);event.currentTarget.textContent='Copied ✓'}catch{event.currentTarget.textContent='Copy unavailable'}});
  return article
}
function sources(items){if(!Array.isArray(items)||!items.length)return'';const safe=items.map(item=>({title:clean(item?.title)||'Supporting source',url:safeUrl(item?.url)})).filter(item=>item.url).slice(0,6);if(!safe.length)return'';return `<aside class="ziburSources199"><b>Sources used</b><div>${safe.map((item,index)=>`<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span>${index+1}</span>${esc(item.title)}<b aria-hidden="true">↗</b></a>`).join('')}</div><small>Open the source and confirm it applies to your profession and circumstances.</small></aside>`}
function renderHistory(){const stream=document.querySelector('[data-zibur-stream]');if(!stream)return;stream.innerHTML='';const recent=history.slice(-12);if(!recent.length){const name=firstName();message('assistant',`${name?`Hello ${name}. `:''}I’m Zibur, your professional healthcare career and relocation assistant. I can use your saved journey to help you prioritise registration, learning, applications, interviews and relocation planning.\n\nWhat would you like to accomplish today?`);return}recent.forEach(entry=>message(entry.role==='assistant'?'assistant':'user',entry.content))}
function setStatus(value,state='ready'){const node=document.querySelector('[data-zibur-status]');if(!node)return;node.textContent=value;node.dataset.state=state}
function resize(textarea){textarea.style.height='auto';textarea.style.height=`${Math.min(180,Math.max(52,textarea.scrollHeight))}px`}
const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
async function failureDetails(result){
  if(result?.data?.error)return result.data;
  try{if(result?.error?.context?.json)return await result.error.context.json()}catch{}
  return{error:clean(result?.error?.message)||'The secure reasoning service did not respond.',code:'PROVIDER_UNAVAILABLE',retryable:true}
}
async function invokeZibur(payload){
  let last;
  for(let attempt=0;attempt<2;attempt++){
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(Error('Zibur took too long to respond. Please try again.')),52000));
    last=await Promise.race([window.btvSupabase.functions.invoke('zibur-gemini',{body:payload}),timeout]);
    if(!last?.error)return last;
    const details=await failureDetails(last);
    if(!details.retryable||details.code==='RATE_LIMITED'||attempt===1)throw Object.assign(Error(details.error),details);
    await pause(650);
  }
  return last
}
async function ask(question){
  if(sending||!question)return;sending=true;const form=document.getElementById('chatForm'),input=document.getElementById('question'),button=form?.querySelector('[type="submit"]');
  message('user',question);const requestHistory=history.filter(entry=>entry.quality!=='limited').slice(-16);history.push({role:'user',content:question});save();
  const waiting=message('assistant','',{thinking:true});if(input){input.disabled=true;input.value='';resize(input)}if(button)button.disabled=true;setStatus('Analysing your question…','working');
  let answer='',sourceList=[],quality='professional';
  try{
    if(!window.btvSupabase?.functions?.invoke)throw Error('The secure assistant service is unavailable.');
    const result=await invokeZibur({question,history:requestHistory,context:context()});
    answer=clean(result.data?.answer);sourceList=result.data?.sources||[];if(!answer)throw Error('Zibur did not return an answer.');setStatus(result.data?.grounded?'Answer prepared with current supporting sources':'Answer prepared from your journey context','ready');
  }catch(error){console.warn('Zibur professional request failed',error);quality='limited';answer=`I couldn’t reach Zibur’s reasoning service, so I won’t replace your question with a generic answer. ${clean(error?.message)||'Please try again in a moment.'}\n\nYour saved journey has not been changed.`;setStatus('Reasoning service unavailable · retry your question','limited')}
  waiting?.remove();message('assistant',answer,{sources:sourceList,limited:quality==='limited'});history.push({role:'assistant',content:answer,quality});save();sending=false;if(input){input.disabled=false;input.focus()}if(button)button.disabled=false;
}
function install(){
  const root=document.getElementById('assistant');if(!root)return;root.classList.add('ziburPro199');const summary=accountSummary();
  root.innerHTML=`<header class="ziburTop199"><button type="button" data-zibur-back aria-label="Back to home">←</button><div class="ziburBrand199"><span>${icon('spark')}</span><div><small>BEYOND THE VISA INTELLIGENCE</small><h1>Ask Zibur</h1></div></div><div class="ziburLive199"><i></i><span data-zibur-status data-state="ready">Professional assistant ready</span></div></header><section class="ziburHero199"><div><span>YOUR CAREER. YOUR JOURNEY. CLEARER DECISIONS.</span><h2>Professional guidance that understands where you’re going.</h2><p>Work through registration, exams, applications, interviews and relocation planning with a secure assistant informed by your saved progress.</p></div><aside><small>CURRENT CONTEXT</small><dl><div><dt>Destination</dt><dd>${esc(summary.country)}</dd></div><div><dt>Profession</dt><dd>${esc(summary.profession)}</dd></div><div><dt>Journey stage</dt><dd>${esc(summary.stage)}</dd></div></dl></aside></section><div class="ziburWorkspace199"><aside class="ziburBrief199"><div class="ziburBriefHead199"><span>Z</span><div><b>Zibur</b><small>Healthcare career intelligence</small></div></div><section><small>START WITH A GOAL</small><button type="button" data-zibur-prompt="Build a prioritised action plan from my saved journey. Tell me what to do first, why it matters and what I need to verify."><i>01</i><span><b>Plan my next steps</b><small>Turn saved progress into priorities</small></span></button><button type="button" data-zibur-prompt="Review my current professional registration and relocation position. Identify likely gaps, dependencies and official checks for my destination."><i>02</i><span><b>Review my pathway</b><small>Find gaps and dependencies</small></span></button><button type="button" data-zibur-prompt="Help me prepare a strong, truthful job application and interview strategy for my profession and destination."><i>03</i><span><b>Strengthen my career plan</b><small>CV, applications and interviews</small></span></button><button type="button" data-zibur-prompt="Create a focused study plan for my next healthcare exam using my progress and destination context."><i>04</i><span><b>Build a study strategy</b><small>Focused exam preparation</small></span></button></section><div class="ziburTrust199">${icon('shield')}<div><b>Private by design</b><span>Do not share patient details, passwords, passport or payment information.</span></div></div></aside><main class="ziburConversation199"><header><div><span class="ziburAvatar199">Z</span><div><b>Professional consultation</b><small>Context-aware · source-conscious · confidential</small></div></div><button type="button" data-zibur-clear>${icon('clear')} Clear</button></header><div class="ziburStream199" data-zibur-stream aria-live="polite"></div><div class="ziburPromptRow199"><button type="button" data-zibur-prompt="What should I do next based on my saved journey?">Next best action</button><button type="button" data-zibur-prompt="Which facts in my plan need checking against an official source?">What must I verify?</button><button type="button" data-zibur-prompt="Turn my goal into a realistic four-week plan.">Build a four-week plan</button></div><form id="chatForm" class="ziburComposer199"><label class="sr" for="question">Ask Zibur</label><textarea id="question" rows="1" maxlength="12000" placeholder="Ask a detailed question about your healthcare career or journey…" autocomplete="off"></textarea><button type="submit" aria-label="Send question">${icon('send')}</button><div><span>Enter to send · Shift + Enter for a new line</span><span>Verify legal, regulatory and clinical decisions with the responsible authority.</span></div></form></main></div>`;
  root.querySelector('[data-zibur-back]').onclick=()=>window.openScreen?.('home');root.querySelectorAll('[data-zibur-prompt]').forEach(button=>button.onclick=()=>ask(button.dataset.ziburPrompt));
  const form=document.getElementById('chatForm'),input=document.getElementById('question');input.addEventListener('input',()=>resize(input));input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit()}});form.onsubmit=event=>{event.preventDefault();const question=clean(input.value);if(question)ask(question)};
  root.querySelector('[data-zibur-clear]').onclick=()=>{if(!history.length||confirm('Clear this Zibur conversation from this device?')){history=[];save();renderHistory();setStatus('New conversation ready','ready')}};renderHistory();
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
