(()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function mark({module,title,prompt,response,criteria=[],modelAnswer='',notice=''}){
    const answer=String(response||'').trim();
    if(answer.length<20)throw new Error('Write a fuller response before asking Zibur to mark it.');
    const client=window.btvSupabase;if(!client?.functions?.invoke)throw new Error('Zibur is unavailable. Refresh and try again.');
    const question=`Mark this original ${module} practice response for education only.\n\nTask: ${prompt}\n\nLearner response: ${answer}\n\nReturn: (1) a formative score out of 10, (2) evidence met, (3) safety-critical omissions, (4) three precise improvements, and (5) a concise model structure. Do not claim this is an official exam result.`;
    const {data,error}=await client.functions.invoke('zibur-gemini',{body:{question,history:[],context:{feature:'learn-marking',module,title,criteria,modelAnswer,notice}}});
    if(error||!data?.answer)throw new Error(data?.error||error?.message||'Zibur could not mark this response.');
    return data.answer;
  }
  function feedbackHtml(text){return `<div class="ziburFeedback104"><div><b>Zibur formative feedback</b><span>Educational feedback, not an official result</span></div><p>${esc(text).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}</p></div>`}
  window.BTVZiburMarker={mark,feedbackHtml};
})();
