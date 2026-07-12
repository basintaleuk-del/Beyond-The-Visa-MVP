(function(){
  'use strict';
  if(window.__btvManagerInboxV26)return;window.__btvManagerInboxV26=true;
  const sb=window.btvSupabase,$=s=>document.querySelector(s);

  function account(){
    const saved=JSON.parse(localStorage.getItem('btv-account')||'null');
    const profile=JSON.parse(localStorage.getItem('btv-profile')||'null');
    return {name:saved?.name||profile?.full_name||profile?.name||'',email:saved?.email||profile?.email||''};
  }
  async function user(){const result=await sb?.auth.getUser();return result?.data?.user||null}
  async function record(requestType,subject,message,details={},priority='normal'){
    const current=await user();if(!current)throw Error('Please sign in before sending this request.');
    const person=account(),payload={user_id:current.id,request_type:requestType,subject:String(subject||'Request').slice(0,180),message:String(message||'').slice(0,5000),details:{...details,user_name:details.user_name||person.name,user_email:details.user_email||current.email||person.email,app_version:'26'},priority,source:'web_app'};
    const {data,error}=await sb.from('manager_requests').insert(payload).select('id').single();
    if(error)throw Error(error.code==='42P01'?'The manager inbox needs its one-time database setup.':error.message);return data
  }
  window.BTVManagerInbox={record};

  function statusCard(){
    const old=$('#ziburConnection');if(old)old.remove();
    const intro=$('#assistant .ayoIntro');if(!intro||$('#ziburLiveStatus'))return;
    const card=document.createElement('div');card.id='ziburLiveStatus';card.className='ziburLiveStatus';card.innerHTML='<span>✦</span><div><b>Secure Zibur AI is connected</b><small>Questions and answers may be stored in the protected support inbox so the team can assist you. Never enter private patient-identifiable information.</small></div>';intro.after(card);
    if(!$('#ziburInboxStyle')){const style=document.createElement('style');style.id='ziburInboxStyle';style.textContent='.ziburLiveStatus{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,var(--mint),var(--card));border:1px solid var(--line);border-radius:17px;padding:14px;margin:12px 0}.ziburLiveStatus>span{width:42px;height:42px;border-radius:14px;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:20px}.ziburLiveStatus b,.ziburLiveStatus small{display:block}.ziburLiveStatus small{color:var(--muted);margin-top:4px;line-height:1.4}';document.head.append(style)}
  }
  function bubble(text,user=false,thinking=false){const box=$('#chat');if(!box)return null;const item=document.createElement('article');item.className=(user?'user ':'')+(thinking?'ziburThinking':'');item.textContent=text;box.append(item);item.scrollIntoView({behavior:'smooth',block:'nearest'});return item}
  function context(){const profile=JSON.parse(localStorage.getItem('btv-profile')||'null'),journey=JSON.parse(localStorage.getItem('btv-v1')||'{}'),tracked=JSON.parse(localStorage.getItem('btv-stage-tracker')||'{}');return{profile,country:profile?.destination||journey.country,tracked,costs:journey.costs||{}}}
  async function ask(question){
    const history=JSON.parse(localStorage.getItem('btv-zibur-history')||'[]');bubble(question,true);const wait=bubble('Zibur is thinking…',false,true);
    try{
      const {data,error}=await sb.functions.invoke('zibur-chat',{body:{question,history:history.slice(-10),context:context()}});if(error)throw error;
      const answer=data?.answer||'I could not prepare an answer just now.';wait.textContent=answer;wait.classList.remove('ziburThinking');history.push({role:'user',content:question},{role:'assistant',content:answer});localStorage.setItem('btv-zibur-history',JSON.stringify(history.slice(-20)));record('zibur_question','Zibur conversation',question,{assistant_answer:answer,recent_history:history.slice(-8),destination:context().country},'normal').then(request=>localStorage.setItem('btv-last-zibur-request',request.id)).catch(error=>console.warn('Conversation log:',error.message))
    }catch(error){wait.textContent=error.message||'I could not reach the secure AI service. Please try again.';wait.classList.remove('ziburThinking')}
  }
  document.addEventListener('submit',event=>{
    if(event.target?.id==='chatForm'){
      event.preventDefault();event.stopImmediatePropagation();const input=$('#question'),question=input?.value.trim();if(!question)return;if(input)input.value='';ask(question);return
    }
    if(event.target?.id==='contactForm'){
      event.preventDefault();event.stopImmediatePropagation();const button=event.target.querySelector('button');if(button){button.disabled=true;button.textContent='Sending…'};
      record('contact',$('#contactReason')?.value||'Contact request',$('#contactMessage')?.value,{user_name:$('#contactName')?.value,user_email:$('#contactEmail')?.value},$('#contactReason')?.value==='Technical support'?'high':'normal').then(data=>{const box=$('#contactSuccess');if(box){box.hidden=false;box.className='bookingSuccess';box.innerHTML=`<b>Message sent to the support team.</b><br>Reference ${data.id.slice(0,8).toUpperCase()}.`}event.target.reset()}).catch(error=>alert(error.message)).finally(()=>{if(button){button.disabled=false;button.textContent='Send contact request'}});return
    }
    if(event.target?.id==='feedbackForm'){
      event.preventDefault();event.stopImmediatePropagation();const kind=$('#feedbackType')?.value||'Send feedback',type=kind==='Report a bug'?'bug_report':kind==='Request a feature'?'feature_request':'feedback',button=event.target.querySelector('button[type="submit"],button:not([type])');if(button){button.disabled=true;button.textContent='Sending…'};
      record(type,$('#feedbackTitle')?.value,$('#feedbackDetails')?.value,{rating:Number($('#feedbackRating')?.value||0),feedback_type:kind,user_email:$('#feedbackEmail')?.value,browser:navigator.userAgent},type==='bug_report'?'high':'normal').then(data=>{const box=$('#feedbackSuccess');if(box){box.hidden=false;box.className='feedbackSuccess';box.innerHTML=`<b>Thank you—sent to the support team.</b><small>Reference ${data.id.slice(0,8).toUpperCase()}</small>`}event.target.reset();if(typeof window.setRating==='function')window.setRating(0)}).catch(error=>alert(error.message)).finally(()=>{if(button){button.disabled=false;button.textContent='Submit feedback'}})
    }
  },true);
  document.addEventListener('click',event=>{const prompt=event.target.closest('#assistant [data-q]');if(!prompt)return;event.preventDefault();event.stopImmediatePropagation();ask(prompt.dataset.q)},true);

  function refresh(){statusCard();document.querySelectorAll('#ziburConnection').forEach(x=>x.remove());const note=$('#contact .notice');if(note&&note.dataset.inboxV26!=='yes'){note.dataset.inboxV26='yes';note.textContent='Your message is sent securely to the Beyond The Visa support inbox.'}const feedback=$('#feedback .notice');if(feedback&&feedback.dataset.inboxV26!=='yes'){feedback.dataset.inboxV26='yes';feedback.textContent='Your feedback is sent securely to the Beyond The Visa support inbox.'}}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',refresh):refresh();setTimeout(refresh,500);setTimeout(refresh,1500);new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true})
})();
