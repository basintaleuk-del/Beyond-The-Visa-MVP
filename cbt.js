(() => {
  'use strict';
  const sb = window.btvSupabase;
  const $ = id => document.getElementById(id);
  const state = {
    user:null, profile:null, questions:[], filtered:[], mode:'practice', index:0,
    answers:{}, flagged:new Set(), bookmarks:new Set(), startedAt:null,
    timerId:null, secondsLeft:0, reviewed:false, lastResult:null
  };
  const views=['hubView','setupView','questionView','resultsView','historyView'];
  const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  function show(id){views.forEach(v=>$(v).classList.toggle('active',v===id));window.scrollTo({top:0,behavior:'smooth'})}
  function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2200)}
  function localProgress(){try{return JSON.parse(localStorage.getItem('btv-cbt-progress')||'{"right":0,"total":0,"topics":{}}')}catch{return{right:0,total:0,topics:{}}}}
  function saveLocalAttempt(q,correct){const p=localProgress();p.total++;if(correct)p.right++;p.topics[q.category] ||= {right:0,total:0};p.topics[q.category].total++;if(correct)p.topics[q.category].right++;localStorage.setItem('btv-cbt-progress',JSON.stringify(p));updateLocalStreak()}
  function updateLocalStreak(){const key='btv-cbt-streak', today=new Date().toISOString().slice(0,10);let s={last:'',count:0};try{s=JSON.parse(localStorage.getItem(key)||JSON.stringify(s))}catch{}if(s.last===today)return s.count;const y=new Date();y.setDate(y.getDate()-1);const yesterday=y.toISOString().slice(0,10);s.count=s.last===yesterday?s.count+1:1;s.last=today;localStorage.setItem(key,JSON.stringify(s));return s.count}
  function getStreak(){try{return JSON.parse(localStorage.getItem('btv-cbt-streak')||'{}').count||0}catch{return 0}}
  async function init(){
    if(!sb){document.body.innerHTML='<p style="padding:30px">Supabase could not be loaded.</p>';return}
    const {data:{session}}=await sb.auth.getSession();
    if(!session){location.href='index.html';return}
    state.user=session.user;
    const {data:profile}=await sb.from('profiles').select('profession,account_type,full_name').eq('id',state.user.id).maybeSingle();
    state.profile=profile||{};
    $('planBadge').textContent=(profile?.account_type||'free').toUpperCase();
    if(profile?.profession)$('professionSelect').value=String(profile.profession).toLowerCase().includes('mid')?'midwife':'nurse';
    await Promise.all([loadQuestions(),loadBookmarks()]);
    await renderHub();
    $('loading').hidden=true;$('app').hidden=false;
  }
  async function loadQuestions(){
    const {data,error}=await sb.from('cbt_questions').select('id,profession,category,difficulty,question,option_a,option_b,option_c,option_d,correct_answer,explanation,is_premium').eq('is_active',true).order('id');
    if(error){console.error(error);toast('Could not load questions. Run the CBT SQL setup first.');state.questions=[];return}
    state.questions=data||[];
    const cats=[...new Set(state.questions.map(q=>q.category))].sort();
    $('categorySelect').innerHTML='<option value="all">All subjects</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }
  async function loadBookmarks(){const {data}=await sb.from('cbt_bookmarks').select('question_id').eq('user_id',state.user.id);state.bookmarks=new Set((data||[]).map(x=>x.question_id))}
  async function getSummary(){
    const {data:attempts}=await sb.from('cbt_attempts').select('is_correct,category,created_at').eq('user_id',state.user.id);
    const {data:exams}=await sb.from('cbt_exam_sessions').select('id,score,total_questions,percentage,completed_at,duration_seconds').eq('user_id',state.user.id).eq('status','completed').order('completed_at',{ascending:false});
    return {attempts:attempts||[],exams:exams||[]};
  }
  async function renderHub(){
    const {attempts,exams}=await getSummary();
    const total=attempts.length, correct=attempts.filter(a=>a.is_correct).length, pct=total?Math.round(correct/total*100):0;
    $('accuracyValue').textContent=pct+'%';$('scoreRing').style.setProperty('--score',pct);
    $('answeredStat').textContent=total;$('correctStat').textContent=correct;$('mockStat').textContent=exams.length;$('streakStat').textContent=getStreak()+' days';
    const topicMap={};attempts.forEach(a=>{topicMap[a.category]||={right:0,total:0};topicMap[a.category].total++;if(a.is_correct)topicMap[a.category].right++});
    $('topicPerformance').innerHTML=Object.keys(topicMap).length?Object.entries(topicMap).sort((a,b)=>(a[1].right/a[1].total)-(b[1].right/b[1].total)).map(([name,x])=>{const p=Math.round(x.right/x.total*100);return `<div class="topicRow"><span>${esc(name)}<small> · ${x.total} answered</small></span><b>${p}%</b><div class="topicBar"><i style="width:${p}%"></i></div></div>`}).join(''):'<div class="empty">Complete some practice questions to see your subject performance.</div>';
    $('recentResults').innerHTML=exams.length?exams.slice(0,4).map(x=>`<div class="resultItem"><span><b>${new Date(x.completed_at).toLocaleDateString('en-GB')}</b><small>${x.score}/${x.total_questions} correct</small></span><b>${Math.round(x.percentage)}%</b></div>`).join(''):'<div class="empty">No mock exams completed yet.</div>';
    window.__btvExamHistory=exams;
  }
  function openSetup(mode){
    state.mode=mode;
    const isMock=mode==='mock';
    $('setupEyebrow').textContent=isMock?'TIMED MOCK EXAM':mode==='incorrect'?'REVIEW MODE':mode==='bookmarks'?'SAVED QUESTIONS':'PRACTICE MODE';
    $('setupTitle').textContent=isMock?'Set up your mock exam':mode==='incorrect'?'Review incorrect answers':mode==='bookmarks'?'Study your bookmarks':'Choose your practice';
    $('setupIntro').textContent=isMock?'Choose a subject mix and exam length.':mode==='incorrect'?'We will load questions you previously answered incorrectly.':mode==='bookmarks'?'Return to questions you saved for later.':'Select a subject and number of questions.';
    $('timerNote').hidden=!isMock;
    $('questionCountLabel').hidden=mode==='incorrect'||mode==='bookmarks';
    show('setupView');
  }
  function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
  async function beginSession(){
    const profession=$('professionSelect').value, category=$('categorySelect').value;
    let pool=state.questions.filter(q=>q.profession===profession&&(category==='all'||q.category===category));
    if(state.mode==='incorrect'){
      const {data}=await sb.from('cbt_attempts').select('question_id').eq('user_id',state.user.id).eq('is_correct',false).limit(500);
      const ids=new Set((data||[]).map(x=>x.question_id));pool=pool.filter(q=>ids.has(q.id));
    }
    if(state.mode==='bookmarks')pool=pool.filter(q=>state.bookmarks.has(q.id));
    if(!pool.length){toast(state.mode==='incorrect'?'No incorrect answers available yet.':state.mode==='bookmarks'?'You have not bookmarked any questions yet.':'No questions found for this selection.');return}
    const requested=Number($('questionCount').value)||10;
    state.filtered=shuffle(pool).slice(0,state.mode==='mock'?Math.min(requested,pool.length):Math.min(requested||10,pool.length));
    state.index=0;state.answers={};state.flagged=new Set();state.startedAt=Date.now();state.reviewed=false;
    if(state.mode==='mock'){state.secondsLeft=state.filtered.length*60;startTimer()}else{stopTimer();$('timer').textContent='Untimed'}
    $('modeLabel').textContent=state.mode==='mock'?'Timed mock exam':'Practice';show('questionView');renderQuestion();
  }
  function optionsFor(q){return [['A',q.option_a],['B',q.option_b],['C',q.option_c],['D',q.option_d]]}
  function renderQuestion(){
    const q=state.filtered[state.index], ans=state.answers[q.id];
    $('questionNumber').textContent=`Question ${state.index+1} of ${state.filtered.length}`;$('questionCategory').textContent=`${q.category} · ${q.difficulty}`;$('questionText').textContent=q.question;
    $('sessionProgress').style.width=`${((state.index+1)/state.filtered.length)*100}%`;
    $('bookmarkBtn').classList.toggle('active',state.bookmarks.has(q.id));$('bookmarkBtn').textContent=state.bookmarks.has(q.id)?'★':'☆';
    $('flagBtn').textContent=state.flagged.has(q.id)?'⚑ Flagged':'⚑ Flag for review';
    $('options').innerHTML=optionsFor(q).map(([key,text])=>{let c='option';if(ans?.selected===key)c+=' selected';if(ans?.checked){if(key===q.correct_answer)c+=' correct';else if(ans.selected===key)c+=' wrong'}return `<button class="${c}" data-option="${key}" ${ans?.checked?'disabled':''}><i>${key}</i><span>${esc(text)}</span></button>`}).join('');
    $('options').querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>selectOption(b.dataset.option));
    $('explanation').hidden=!(ans?.checked&&state.mode!=='mock')&&!state.reviewed;
    if(!$('explanation').hidden)$('explanation').innerHTML=`<b>${ans?.selected===q.correct_answer?'Correct':'Correct answer: '+q.correct_answer}</b>${esc(q.explanation)}`;
    if(state.reviewed){$('nextBtn').textContent=state.index===state.filtered.length-1?'Back to results':'Next question';$('nextBtn').disabled=false}
    else if(state.mode==='mock'){$('nextBtn').textContent=state.index===state.filtered.length-1?'Submit exam':'Next question';$('nextBtn').disabled=false}
    else if(!ans?.checked){$('nextBtn').textContent='Check answer';$('nextBtn').disabled=!ans?.selected}
    else{$('nextBtn').textContent=state.index===state.filtered.length-1?'Finish practice':'Next question';$('nextBtn').disabled=false}
    renderNavigator();
  }
  function selectOption(key){const q=state.filtered[state.index];if(state.answers[q.id]?.checked||state.reviewed)return;state.answers[q.id]={selected:key,checked:false};renderQuestion()}
  async function nextAction(){
    const q=state.filtered[state.index],ans=state.answers[q.id];
    if(state.reviewed){if(state.index===state.filtered.length-1){renderResults(state.lastResult);show('resultsView')}else{state.index++;renderQuestion()}return}
    if(state.mode==='mock'){
      if(state.index===state.filtered.length-1){await finishSession()}else{state.index++;renderQuestion()}return
    }
    if(!ans?.checked){
      if(!ans?.selected)return;ans.checked=true;const correct=ans.selected===q.correct_answer;saveLocalAttempt(q,correct);await saveAttempt(q,ans.selected,correct,false);renderQuestion();return
    }
    if(state.index===state.filtered.length-1)await finishSession();else{state.index++;renderQuestion()}
  }
  async function saveAttempt(q,selected,correct,isMock,sessionId=null){
    const {error}=await sb.from('cbt_attempts').insert({user_id:state.user.id,question_id:q.id,selected_answer:selected,is_correct:correct,category:q.category,mode:isMock?'mock':'practice',exam_session_id:sessionId});if(error)console.error(error)
  }
  async function finishSession(){
    stopTimer();const duration=Math.max(1,Math.round((Date.now()-state.startedAt)/1000));
    let sessionId=null;
    if(state.mode==='mock'){
      const score=state.filtered.filter(q=>state.answers[q.id]?.selected===q.correct_answer).length,total=state.filtered.length,pct=Math.round(score/total*100);
      const {data}=await sb.from('cbt_exam_sessions').insert({user_id:state.user.id,profession:$('professionSelect').value,question_count:total,total_questions:total,score,percentage:pct,duration_seconds:duration,status:'completed',completed_at:new Date().toISOString()}).select('id').single();sessionId=data?.id||null;
      for(const q of state.filtered){const selected=state.answers[q.id]?.selected||null,correct=selected===q.correct_answer;if(selected){saveLocalAttempt(q,correct);await saveAttempt(q,selected,correct,true,sessionId)}}
    }
    const result=calculateResult(duration);state.lastResult=result;renderResults(result);show('resultsView');await renderHub();
  }
  function calculateResult(duration){const total=state.filtered.length,correct=state.filtered.filter(q=>state.answers[q.id]?.selected===q.correct_answer).length,answered=state.filtered.filter(q=>state.answers[q.id]?.selected).length,pct=total?Math.round(correct/total*100):0;const topics={};state.filtered.forEach(q=>{topics[q.category]||={total:0,right:0};topics[q.category].total++;if(state.answers[q.id]?.selected===q.correct_answer)topics[q.category].right++});return{total,correct,incorrect:answered-correct,unanswered:total-answered,pct,duration,topics}}
  function renderResults(r){
    $('resultLabel').textContent=state.mode==='mock'?'MOCK EXAM COMPLETE':'PRACTICE COMPLETE';$('resultPercent').textContent=r.pct+'%';$('resultCircle').style.setProperty('--score',r.pct);
    $('resultTitle').textContent=r.pct>=80?'Excellent work':r.pct>=65?'Good progress':'Keep building your confidence';$('resultSummary').textContent=`You answered ${r.correct} of ${r.total} questions correctly.`;
    $('resultCorrect').textContent=r.correct;$('resultIncorrect').textContent=r.incorrect;$('resultUnanswered').textContent=r.unanswered;$('resultTime').textContent=Math.ceil(r.duration/60)+'m';
    $('resultTopics').innerHTML=Object.entries(r.topics).map(([name,x])=>{const p=Math.round(x.right/x.total*100);return `<div class="topicRow"><span>${esc(name)}<small> · ${x.right}/${x.total} correct</small></span><b>${p}%</b><div class="topicBar"><i style="width:${p}%"></i></div></div>`}).join('');
  }
  function reviewExam(){state.reviewed=true;state.index=0;show('questionView');renderQuestion()}
  function renderNavigator(){$('questionNav').innerHTML=state.filtered.map((q,i)=>{const a=state.answers[q.id];return `<button class="${i===state.index?'current ':''}${a?.selected?'answered ':''}${state.flagged.has(q.id)?'flagged':''}" data-index="${i}">${i+1}</button>`}).join('');$('questionNav').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.index=Number(b.dataset.index);renderQuestion()})}
  async function toggleBookmark(){const q=state.filtered[state.index];if(state.bookmarks.has(q.id)){await sb.from('cbt_bookmarks').delete().eq('user_id',state.user.id).eq('question_id',q.id);state.bookmarks.delete(q.id);toast('Bookmark removed')}else{await sb.from('cbt_bookmarks').upsert({user_id:state.user.id,question_id:q.id},{onConflict:'user_id,question_id'});state.bookmarks.add(q.id);toast('Question bookmarked')}renderQuestion()}
  function toggleFlag(){const id=state.filtered[state.index].id;state.flagged.has(id)?state.flagged.delete(id):state.flagged.add(id);renderQuestion()}
  function startTimer(){stopTimer();const tick=()=>{const m=Math.floor(state.secondsLeft/60),s=state.secondsLeft%60;$('timer').textContent=`${m}:${String(s).padStart(2,'0')}`;if(state.secondsLeft<=0){stopTimer();finishSession();return}state.secondsLeft--};tick();state.timerId=setInterval(tick,1000)}
  function stopTimer(){if(state.timerId)clearInterval(state.timerId);state.timerId=null}
  function renderHistory(){const exams=window.__btvExamHistory||[];$('fullHistory').innerHTML=exams.length?exams.map(x=>`<article class="historyCard"><span>${new Date(x.completed_at).toLocaleDateString('en-GB',{dateStyle:'medium'})}</span><b>${Math.round(x.percentage)}%</b><small>${x.score}/${x.total_questions} correct · ${Math.ceil((x.duration_seconds||0)/60)} minutes</small></article>`).join(''):'<div class="empty">No completed mock exams yet.</div>';show('historyView')}
  document.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(!a)return;const x=a.dataset.action;if(['practice','mock','incorrect','bookmarks'].includes(x))openSetup(x);if(x==='hub'){stopTimer();renderHub();show('hubView')}if(x==='history')renderHistory()});
  $('setupForm').addEventListener('submit',e=>{e.preventDefault();beginSession()});$('nextBtn').onclick=nextAction;$('bookmarkBtn').onclick=toggleBookmark;$('flagBtn').onclick=toggleFlag;$('reviewExamBtn').onclick=reviewExam;$('refreshBtn').onclick=renderHub;$('exitSession').onclick=()=>{if(confirm('Exit this session? Your current unanswered session will not be saved.')){stopTimer();renderHub();show('hubView')}};$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.href='index.html'};
  init();
})();
