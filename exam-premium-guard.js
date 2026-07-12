(()=>{
 'use strict';
 const current=document.currentScript,exam=current?.dataset.exam||'Exam',script=current?.dataset.script;
 const loading=document.getElementById('loading'),app=document.getElementById('app'),sb=window.btvSupabase;
 const lock=message=>{if(app)app.hidden=true;if(loading){loading.innerHTML=`<div style="max-width:560px;margin:auto"><span style="font-size:11px;letter-spacing:.12em;font-weight:900;color:#b17b1f">◆ PREMIUM LEARNING</span><h1>${exam} preparation is a Premium feature</h1><p>${message}</p><a href="index.html?premium=open" style="display:inline-block;margin-top:12px;border-radius:12px;background:#123f45;color:#fff;padding:12px 16px;text-decoration:none;font-weight:850">View Premium membership</a></div>`;loading.hidden=false}};
 async function start(){if(!sb)return lock('The secure account connection is unavailable. Return to the app and try again.');const {data:{user}}=await sb.auth.getUser();if(!user)return lock('Sign in to Beyond The Visa before opening the learning centre.');const {data:profile,error}=await sb.from('profiles').select('account_type').eq('id',user.id).maybeSingle();if(error)return lock('Your membership could not be verified. Please try again.');if(profile?.account_type!=='premium')return lock('Upgrade to unlock the complete question bank, timed mock examinations, explanations, performance insights and readiness reports.');const element=document.createElement('script');element.src=script+'?v=30.4';document.body.append(element)}
 start();
})();

