(()=>{
 'use strict';
 if(window.__btvReleaseV42)return;window.__btvReleaseV42=true;
 const STORAGE_KEY='btv-start-guide-complete';
 function formatTime(seconds){if(!Number.isFinite(seconds))return'0:00';const minutes=Math.floor(seconds/60),remainder=String(Math.floor(seconds%60)).padStart(2,'0');return`${minutes}:${remainder}`}
 function renderVideoGuide(){
  const panel=document.getElementById('guideLesson');if(!panel)return;
  const completed=localStorage.getItem(STORAGE_KEY)==='yes';
  panel.innerHTML=`<article class="startGuidePlayer"><div class="startGuideHeading"><span>START HERE</span><h2>Preparing for nursing and midwifery work abroad</h2><p>Watch this introductory guide at your own pace. Pause, replay or use fullscreen whenever you need to.</p></div><div class="startGuideFrame"><video id="startGuideVideo" controls playsinline preload="metadata" aria-label="Preparing for nursing and midwifery work abroad"><source src="assets/start-guide.mp4?v=42" type="video/mp4">Your browser does not support HTML5 video.</video></div><div class="startGuideStatus"><span id="startGuideTime">Ready to play</span><button type="button" id="startGuideComplete" class="${completed?'complete':''}">${completed?'✓ Guide completed':'Mark guide complete'}</button></div><p class="startGuideCaptionNote">If this video contains spoken teaching, an accurate caption transcript should be supplied before public launch. The player supports caption tracks without replacing the video.</p></article>`;
  const video=panel.querySelector('#startGuideVideo'),time=panel.querySelector('#startGuideTime'),complete=panel.querySelector('#startGuideComplete');
  const update=()=>{time.textContent=`${formatTime(video.currentTime)} / ${formatTime(video.duration)}`};
  video.addEventListener('loadedmetadata',update);video.addEventListener('timeupdate',update);video.addEventListener('ended',()=>{localStorage.setItem(STORAGE_KEY,'yes');complete.textContent='✓ Guide completed';complete.classList.add('complete')});
  complete.onclick=()=>{const done=localStorage.getItem(STORAGE_KEY)!=='yes';localStorage.setItem(STORAGE_KEY,done?'yes':'no');complete.textContent=done?'✓ Guide completed':'Mark guide complete';complete.classList.toggle('complete',done)};
 }
 window.renderGuide=renderVideoGuide;
 if(document.getElementById('guideLesson'))renderVideoGuide();
 document.addEventListener('click',event=>{if(event.target.closest('[data-learn-tab="guide"]'))setTimeout(renderVideoGuide,20)},true);
})();
