(()=>{
 'use strict';
 if(window.__btvReleaseV31)return;window.__btvReleaseV31=true;
 const sb=window.btvSupabase;
 const iconPaths={
  countries:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z"/>',
  checklist:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.3 1.3L7 5m-3.5 7 1.3 1.3L7 11m-3.5 7 1.3 1.3L7 17"/>',
  costs:'<path d="M12 2v20M17 6.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 1.8 2.7 5 3.5 5 1.8 5 3.7-2.2 3.3-5 3.3-5-1.3-5-3"/>',
  learn:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21V5.5Z"/>',
  assistant:'<path d="m12 3 1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15ZM5 13l.7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7L5 13Z"/>',
  documents:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/>'
 };
 const svg=path=>`<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
 function beautifyIcons(){
  document.querySelectorAll('#home .quick button,.dashboardShortcuts button').forEach(button=>{
   const tile=button.querySelector('i');if(!tile)return;
   const target=button.dataset.openTarget||button.dataset.open||button.dataset.uniqueShortcut||'';
   const text=button.textContent.toLowerCase();
   const key=text.includes('document')||target==='documents'?'documents':target==='countries'?'countries':target==='checklist'?'checklist':target==='costs'?'costs':target==='learn'?'learn':target==='assistant'?'assistant':null;
   if(key&&tile.dataset.professionalIcon!==key){tile.innerHTML=svg(iconPaths[key]);tile.dataset.professionalIcon=key}
  });
 }
 const dataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
 function setLocalPhoto(photo){const extra=window.profileExtra?.()||{};extra.photo=photo;localStorage.setItem('btv-profile-extra',JSON.stringify(extra));const image=document.getElementById('pfPhoto');if(image)image.src=photo;window.updateProfileButton?.()}
 async function syncAvatarFromCloud(){
  if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;
  const {data,error}=await sb.from('profiles').select('avatar_path').eq('id',user.id).maybeSingle();
  if(error||!data?.avatar_path)return;
  const {data:file,error:downloadError}=await sb.storage.from('btv-user-files').download(data.avatar_path);
  if(!downloadError&&file)setLocalPhoto(await dataUrl(file));
 }
 async function uploadAvatar(file){
  if(!sb)throw new Error('Cloud storage is unavailable.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPG or WebP image.');
  if(file.size>1500000)throw new Error('Choose an image smaller than 1.5 MB.');
  const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error('Please sign in again.');
  const extension=(file.type.split('/')[1]||'jpg').replace('jpeg','jpg');
  const path=`${user.id}/avatar/profile.${extension}`;
  const {error:uploadError}=await sb.storage.from('btv-user-files').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});
  if(uploadError)throw uploadError;
  const {error:profileError}=await sb.from('profiles').update({avatar_path:path,updated_at:new Date().toISOString()}).eq('id',user.id);
  if(profileError)throw profileError;
  setLocalPhoto(await dataUrl(file));return path;
 }
 function wireProfileUpload(){
  const input=document.getElementById('pfFile');if(!input||input.dataset.cloudAvatar==='true')return;input.dataset.cloudAvatar='true';
  const hero=document.querySelector('.profileHero>div');let status=document.getElementById('profileSyncStatus');
  if(!status&&hero){status=document.createElement('small');status.id='profileSyncStatus';status.className='profileSyncStatus';status.textContent='Your photo is securely synced to your account.';hero.append(status)}
  input.onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{if(status)status.textContent='Uploading photo…';await uploadAvatar(file);if(status)status.textContent='Photo saved and available on your other devices.';window.toast?.('Profile photo saved')}catch(error){if(status)status.textContent=error.message||'Photo could not be uploaded.';window.toast?.(error.message||'Photo could not be uploaded.')}finally{input.value=''}};
 }
 function start(){beautifyIcons();wireProfileUpload();syncAvatarFromCloud().catch(()=>{});new MutationObserver(()=>{beautifyIcons();wireProfileUpload()}).observe(document.body,{childList:true,subtree:true})}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
