(()=>{
  'use strict';
  if(window.__btvIeltsListeningAudioV125)return;window.__btvIeltsListeningAudioV125=true;
  const INSTRUCTION_RECORDING='ielts-listening-test-instructions';
  let testActive=false,gateOpen=false,currentSet='',audio;
  async function playbackUrl(recordingCode){
    const client=window.btvSupabase;
    if(!client)throw Error('The secure audio service is unavailable.');
    const {data,error}=await client.functions.invoke('get-ielts-listening-audio',{body:{recording_code:recordingCode}});
    if(error||!data?.playback_url)throw Error(data?.error||'Approved audio is not available yet.');
    return data.playback_url;
  }
  async function play(recordingCode,onEnded){
    if(audio){audio.pause();audio.remove();}
    audio=new Audio(await playbackUrl(recordingCode));
    audio.preload='auto';
    audio.onended=()=>{audio=null;onEnded?.();};
    await audio.play();
  }
  function overlay(show){
    let node=document.getElementById('ieltsAudioOnlyOverlay');
    if(show&&!node){node=document.createElement('div');node.id='ieltsAudioOnlyOverlay';node.setAttribute('aria-hidden','true');document.body.append(node);}
    if(!show)node?.remove();
  }
  function questionForScreen(){
    const prompt=document.querySelector('[data-question] .questionPrompt')?.textContent||'';
    return window.BTVIELTSAcademic?.bank('listening').find(item=>item.prompt===prompt);
  }
  function playTestRecording(){
    if(!testActive)return;
    const question=questionForScreen();
    if(!question||question.setId===currentSet)return;
    currentSet=question.setId;overlay(true);
    play(question.setId,()=>overlay(false)).catch(()=>overlay(false));
  }
  function closeGate(){document.getElementById('ieltsListeningReadyGate')?.remove();gateOpen=false;}
  function startTest(button){
    closeGate();testActive=true;currentSet='';overlay(true);button.onclick?.();setTimeout(playTestRecording,0);
  }
  function showGate(button){
    if(gateOpen)return;gateOpen=true;
    const gate=document.createElement('section');gate.id='ieltsListeningReadyGate';gate.className='ieltsListeningReadyGate';
    gate.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="ieltsListeningReadyTitle"><h2 id="ieltsListeningReadyTitle">Are you ready for your IELTS Listening test?</h2><p>Once you begin, each recording plays once without pause or replay controls.</p><div class="ieltsListeningGateActions"><button type="button" data-ready>Yes, I am ready</button><button type="button" data-not-ready>Not yet</button></div><p data-message role="status"></p></div>';
    document.body.append(gate);
    const message=gate.querySelector('[data-message]');
    gate.querySelector('[data-not-ready]').onclick=closeGate;
    gate.querySelector('[data-ready]').onclick=async event=>{
      event.currentTarget.disabled=true;message.textContent='Playing your test instructions…';
      try{await play(INSTRUCTION_RECORDING,()=>{message.textContent='';const start=document.createElement('button');start.type='button';start.className='ieltsListeningStart';start.textContent='Start my listening test';start.onclick=()=>startTest(button);gate.querySelector('.ieltsListeningGateActions').replaceChildren(start);});}
      catch(error){event.currentTarget.disabled=false;message.textContent=error.message;}
    };
  }
  function captureListeningOpen(event){
    const button=event.target.closest?.('[data-ielts-section="listening"]');
    if(!button||testActive)return;
    event.preventDefault();event.stopImmediatePropagation();showGate(button);
  }
  document.addEventListener('click',captureListeningOpen,true);
  new MutationObserver(playTestRecording).observe(document.documentElement,{childList:true,subtree:true});
  window.BTVIELTSListeningAudio={playbackUrl};
})();
