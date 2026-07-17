(()=>{
 if(window.__btvWelcomeVideo82)return;window.__btvWelcomeVideo82=true;
 function render(){const panel=document.getElementById('guideLesson');if(!panel)return;panel.innerHTML=`<article class="welcomeVideo82"><video controls playsinline preload="metadata"><source src="welcome-video-v82.mp4" type="video/mp4">Your browser cannot play this video. You can open it directly from the learning resources.</video><h2>Welcome to Beyond The Visa</h2><p>A practical introduction to your international nursing or midwifery journey and the tools available throughout the app.</p><small class="videoPrivacy82">Playback stays inside Beyond The Visa. Use the video controls to pause, mute, resize or replay.</small></article>`}
 window.renderGuide=render;
 const oldBuild=window.buildLearning;if(typeof oldBuild==='function')window.buildLearning=function(){const result=oldBuild.apply(this,arguments);render();return result};
 document.addEventListener('click',e=>{if(e.target.closest('[data-learn-tab="guide"],#startLearning'))setTimeout(render,0)});
 setTimeout(render,100);setTimeout(render,700);
})();
