(function(){
  'use strict';
  if(!document.querySelector('link[data-storage-styles]')){const link=document.createElement('link');link.rel='stylesheet';link.dataset.storageStyles='v101';link.href='storage-v21.css?v=101';document.head.append(link)}
  const sb=window.btvSupabase,BUCKET='btv-user-files',MAX=10*1024*1024;
  const categories={certificates:['Certificates','▤','Qualifications and registrations'],passports:['Passport','◇','Identity document copies'],visas:['Visa documents','✈','Applications, decisions and permits'],cvs:['CVs','≡','CV and career files'],images:['Images','▧','Other relevant images']};
  let current='certificates',user=null,avatarLoaded=false;
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ext=n=>(n.split('.').pop()||'').toLowerCase(),allowed=new Set(['pdf','png','jpg','jpeg','webp','doc','docx']);
  const safe=n=>n.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(-120)||'file';
  const size=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
  function status(message,tone=''){const el=$('#storageStatus');if(el){el.textContent=message;el.className=`storageStatus show ${tone}`.trim()}}
  async function account(){if(user)return user;if(!sb)throw Error('Storage connection is unavailable.');const {data,error}=await sb.auth.getUser();if(error||!data.user)throw Error('Please sign in again before opening secure documents.');return user=data.user}
  function fallback(id){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id))}
  function show(id){typeof window.openScreen==='function'?window.openScreen(id):fallback(id)}

  function build(){
    if($('#documents'))return;const main=$('main');if(!main)return;
    const screen=document.createElement('section');screen.id='documents';screen.className='screen storageScreen';
    screen.innerHTML=`<div class="pageTitle"><button class="back" aria-label="Back">←</button><div><span>PRIVATE FILE STORAGE</span><h1>My documents</h1></div></div><div class="storageHero"><span>SUPABASE STORAGE</span><h2>Your secure document vault</h2><p>Keep files needed for registration, job applications and relocation organised in one private place.</p></div><div class="storagePrivacy"><i>🔒</i><div><b>Private to your account</b>Only your signed-in account can list, open, upload or delete these files.</div></div><div class="storageCategoryGrid">${Object.entries(categories).map(([key,x])=>`<button class="storageCategory ${key===current?'active':''}" data-storage-category="${key}"><i>${x[1]}</i><span><b>${x[0]}</b><small>${x[2]}</small></span></button>`).join('')}</div><div class="storagePanel"><div class="storagePanelHead"><h3 id="storageHeading">${categories[current][0]}</h3><label class="storageUpload"><span id="storageUploadLabel">＋ Upload file</span><input id="storageFileInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"></label></div><p id="storageStatus" class="storageStatus" role="status"></p><div id="storageFiles" class="storageFiles"><div class="storageEmpty"><i>⌛</i>Checking your files…</div></div><p class="storageFootnote">PDF, PNG, JPG, WEBP, DOC or DOCX up to 10 MB. Only upload documents you are authorised to store. Remove expired or unnecessary identity documents promptly.</p></div>`;
    main.append(screen);screen.querySelector('.back').onclick=()=>show('home');
    screen.querySelectorAll('[data-storage-category]').forEach(b=>b.onclick=()=>select(b.dataset.storageCategory));
    $('#storageFileInput').onchange=e=>upload(e.target.files[0]);
  }
  function entryPoints(){
    const quick=$('.quick');if(quick&&!quick.querySelector('[data-storage-open]')){const b=document.createElement('button');b.className='storageQuick';b.dataset.storageOpen='1';b.innerHTML='<i>▧</i><span>My documents</span><small>Private file vault</small>';b.onclick=openVault;quick.append(b)}
    const shortcuts=$('.dashboardShortcuts');if(shortcuts&&!shortcuts.querySelector('[data-storage-open]')){const b=document.createElement('button');b.dataset.storageOpen='1';b.innerHTML='<i>▧</i><b>My documents</b><small>Certificates, passport, visa and CV files</small>';b.onclick=openVault;shortcuts.append(b)}
  }
  async function openVault(){build();show('documents');await refresh()}
  async function select(key){current=key;document.querySelectorAll('[data-storage-category]').forEach(x=>x.classList.toggle('active',x.dataset.storageCategory===key));$('#storageHeading').textContent=categories[key][0];await refresh()}

  async function upload(file){
    if(!file)return;const input=$('#storageFileInput'),label=$('#storageUploadLabel');
    try{if(file.size>MAX)throw Error('Choose a file smaller than 10 MB.');if(!allowed.has(ext(file.name)))throw Error('Use PDF, PNG, JPG, WEBP, DOC or DOCX.');const u=await account(),path=`${u.id}/${current}/${Date.now()}-${safe(file.name)}`;input.disabled=true;label.textContent='Uploading…';status(`Uploading ${file.name}…`);const {error}=await sb.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',contentType:file.type||undefined});if(error)throw error;status(`${file.name} was uploaded securely.`,'success');input.value='';await refresh()}catch(error){status(error.message||'Upload failed.','error')}finally{input.disabled=false;label.textContent='＋ Upload file'}
  }
  async function refresh(){
    const box=$('#storageFiles');if(!box)return;
    try{const u=await account();box.innerHTML='<div class="storageEmpty"><i>⌛</i>Loading files…</div>';const {data,error}=await sb.storage.from(BUCKET).list(`${u.id}/${current}`,{limit:100,sortBy:{column:'created_at',order:'desc'}});if(error)throw error;const files=(data||[]).filter(x=>x.name!=='.emptyFolderPlaceholder');if(!files.length){box.innerHTML=`<div class="storageEmpty"><i>${categories[current][1]}</i>No ${categories[current][0].toLowerCase()} uploaded yet.</div>`;return}box.innerHTML=files.map(f=>{const original=f.name.replace(/^\d+-/,'');const path=`${u.id}/${current}/${f.name}`;return `<article class="storageFile"><div class="storageFileIcon">${ext(f.name)==='pdf'?'PDF':categories[current][1]}</div><div><b title="${esc(original)}">${esc(original)}</b><small>${size(f.metadata?.size||0)} · ${new Date(f.created_at||f.updated_at).toLocaleDateString('en-GB')}</small></div><div class="storageFileActions"><button data-file-open="${esc(path)}">Open</button><button class="delete" data-file-delete="${esc(path)}">Delete</button></div></article>`}).join('');box.querySelectorAll('[data-file-open]').forEach(b=>b.onclick=()=>openFile(b.dataset.fileOpen));box.querySelectorAll('[data-file-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.fileDelete))}catch(error){box.innerHTML='<div class="storageEmpty"><i>!</i>Files unavailable.</div>';status(error.message||'Could not load files.','error')}
  }
  async function openFile(path){const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(path,60);if(error)return status(error.message,'error');window.open(data.signedUrl,'_blank','noopener')}
  async function remove(path){if(!confirm('Delete this file permanently? This cannot be undone.'))return;const {error}=await sb.storage.from(BUCKET).remove([path]);if(error)return status(error.message,'error');status('File deleted.','success');await refresh()}

  function applyAvatar(url){if($('#pfPhoto'))$('#pfPhoto').src=url;if($('#headerProfile img'))$('#headerProfile img').src=url}
  async function loadAvatar(force=false){if(avatarLoaded&&!force)return;try{const u=await account(),folder=`${u.id}/avatar`,{data,error}=await sb.storage.from(BUCKET).list(folder,{limit:10,sortBy:{column:'updated_at',order:'desc'}});if(error)throw error;const file=(data||[])[0];if(!file)return;const signed=await sb.storage.from(BUCKET).createSignedUrl(`${folder}/${file.name}`,3600);if(signed.error)throw signed.error;applyAvatar(signed.data.signedUrl);avatarLoaded=true}catch(error){console.warn('Avatar storage:',error.message)}}
  async function uploadAvatar(file){
    if(!file)return;try{if(!file.type.startsWith('image/'))throw Error('Choose an image file.');if(file.size>5*1024*1024)throw Error('Choose an image smaller than 5 MB.');const u=await account(),folder=`${u.id}/avatar`,old=await sb.storage.from(BUCKET).list(folder,{limit:20});if(old.error)throw old.error;const paths=(old.data||[]).map(x=>`${folder}/${x.name}`);if(paths.length){const result=await sb.storage.from(BUCKET).remove(paths);if(result.error)throw result.error}const path=`${folder}/profile-${Date.now()}.${ext(file.name)||'jpg'}`,result=await sb.storage.from(BUCKET).upload(path,file,{contentType:file.type,cacheControl:'3600'});if(result.error)throw result.error;avatarLoaded=false;await loadAvatar(true);if(typeof window.toast==='function')window.toast('Profile photo saved securely')}catch(error){if(typeof window.toast==='function')window.toast(error.message);else alert(error.message)}
  }
  function updatePrivacyNotice(){
    if(typeof window.showPolicy!=='function'||window.showPolicy.storageAware)return;
    const original=window.showPolicy;window.showPolicy=function(type,button){original(type,button);if(type==='privacy'){const body=$('#policyBody');if(body&&!body.querySelector('.storagePolicyUpdate'))body.insertAdjacentHTML('afterbegin','<div class="notice storagePolicyUpdate"><b>Storage update · 12 July 2026</b><br>Optional profile photos and documents now use a private Supabase bucket. Files stay in the user’s private folder until deleted in My documents or removed through a verified cloud-account request. <a href="privacy-policy.html">Read the updated full policy</a>.</div>') }};window.showPolicy.storageAware=true
  }
  function start(){build();entryPoints();updatePrivacyNotice();setTimeout(entryPoints,500);setTimeout(entryPoints,1800);setTimeout(loadAvatar,900);document.addEventListener('change',e=>{if(e.target?.id==='pfFile')uploadAvatar(e.target.files?.[0])},true);document.addEventListener('click',e=>{if(e.target.closest('#headerProfile,[data-edit-profile]'))setTimeout(()=>loadAvatar(true),150)},true);new MutationObserver(entryPoints).observe(document.body,{childList:true,subtree:true})}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
