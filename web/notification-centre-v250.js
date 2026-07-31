(()=>{
  "use strict";
  if(window.__btvNotifications250)return;window.__btvNotifications250=true;
  const db=()=>window.btvSupabase,$=(s,r=document)=>r.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const categories={all:"All",jobs:"Jobs",visa:"Visa",mentor_message:"Mentors",booking:"Bookings",learning:"Learning",course:"Courses",mock:"Mocks",application:"Applications",account:"Account",billing:"Billing",coins:"Beyond Coins",announcement:"Announcements",administrative:"Admin"};
  const state={user:null,notes:[],prefs:{},filter:"all",tab:"inbox",loading:false};
  const safe=value=>{try{const u=new URL(value||"/",location.origin);return u.origin===location.origin&&u.pathname.startsWith("/")?`${u.pathname}${u.search}${u.hash}`:"/"}catch{return"/"}};
  const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent),standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const supported=()=>("serviceWorker"in navigator)&&("PushManager"in window)&&("Notification"in window);
  function shell(){
    let root=$("#btvNotifications250");if(root)return root;
    root=document.createElement("section");root.id="btvNotifications250";root.className="btvNotifications250";root.hidden=true;
    root.innerHTML=`<div class="notifyShell250" role="dialog" aria-modal="true" aria-labelledby="notifyTitle250"><aside class="notifyRail250"><div class="notifyBrand250"><b>BV</b><div><small>BEYOND THE VISA</small><strong>Notification Centre</strong></div></div><nav aria-label="Notification centre"><button data-notify-tab="inbox" class="active"><i>◉</i><span>My notifications</span></button><button data-notify-tab="preferences"><i>⌁</i><span>Preferences</span></button><button data-notify-tab="devices"><i>◇</i><span>Devices & push</span></button></nav><div class="notifyTrust250"><b>Private by design</b><span>Sensitive details are never shown in lock-screen alerts.</span></div></aside><main class="notifyMain250"><header><div><small>PERSONAL UPDATE CENTRE</small><h1 id="notifyTitle250">Notifications</h1></div><button type="button" data-notify-close aria-label="Close notification centre">×</button></header><div class="notifyBody250" aria-live="polite"></div></main></div>`;
    document.body.append(root);root.onclick=e=>{if(e.target===root)close()};$("[data-notify-close]",root).onclick=close;
    root.querySelectorAll("[data-notify-tab]").forEach(button=>button.onclick=()=>{state.tab=button.dataset.notifyTab;render()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!root.hidden)close()});return root;
  }
  function close(){const root=$("#btvNotifications250");if(root)root.hidden=true;document.body.classList.remove("notifyOpen250")}
  async function session(){const result=await db()?.auth?.getSession();state.user=result?.data?.session?.user||null;return result?.data?.session||null}
  async function open(tab="inbox"){state.tab=["inbox","preferences","devices"].includes(tab)?tab:"inbox";const current=await session();if(!current){window.toast?.("Please sign in to manage notifications.");return}const root=shell();root.hidden=false;document.body.classList.add("notifyOpen250");await load();$("[data-notify-close]",root).focus()}
  async function load(){
    if(state.loading)return;state.loading=true;renderLoading();
    const [notes,prefs]=await Promise.all([
      db().from("notifications").select("id,title,body,category,priority,action_url,image_url,read_at,opened_at,dismissed_at,expires_at,created_at").is("dismissed_at",null).order("created_at",{ascending:false}).limit(100),
      db().from("notification_preferences").select("*").eq("user_id",state.user.id).maybeSingle()
    ]);
    state.notes=(notes.data||[]).filter(item=>!item.expires_at||new Date(item.expires_at)>new Date());state.prefs=prefs.data||{};state.loading=false;render();badge();
  }
  function renderLoading(){const root=shell();$(".notifyBody250",root).innerHTML='<div class="notifyLoading250"><i></i><b>Loading your private updates…</b></div>'}
  function render(){
    const root=shell();root.querySelectorAll("[data-notify-tab]").forEach(b=>b.classList.toggle("active",b.dataset.notifyTab===state.tab));
    const titles={inbox:"Notifications",preferences:"Notification preferences",devices:"Devices & browser push"};$("#notifyTitle250",root).textContent=titles[state.tab];
    $(".notifyBody250",root).innerHTML=state.tab==="inbox"?inbox():state.tab==="preferences"?preferences():devices();wire(root);
  }
  function inbox(){
    const unread=state.notes.filter(n=>!n.read_at).length,list=state.notes.filter(n=>state.filter==="all"||n.category===state.filter);
    return `<section class="notifyHero250"><div><span>YOUR LIVE UPDATE LEDGER</span><h2>Stay informed, without the noise.</h2><p>Job matches, pathway updates, learning reminders and private account activity—controlled by you.</p></div><div><strong>${unread}</strong><span>unread</span><button type="button" data-read-all ${unread?"":"disabled"}>Mark all read</button></div></section><div class="notifyToolbar250"><div class="notifyFilters250">${Object.entries(categories).map(([key,label])=>`<button type="button" data-filter="${key}" class="${state.filter===key?"active":""}">${label}</button>`).join("")}</div><button type="button" data-refresh-notes aria-label="Refresh notifications">↻ Refresh</button></div><div class="notifyList250">${list.map(note=>card(note)).join("")||'<div class="notifyEmpty250"><i>✓</i><h3>You are all caught up.</h3><p>Relevant updates will appear here when there is something useful to act on.</p></div>'}</div>`;
  }
  function card(note){return `<article class="notifyCard250 ${note.read_at?"":"unread"}" data-note="${note.id}"><i aria-hidden="true">${({jobs:"▣",visa:"⌁",mentor_message:"◎",booking:"◷",learning:"↗",account:"◇",coins:"B"})[note.category]||"◉"}</i><div><small>${esc(categories[note.category]||note.category)} · ${new Date(note.created_at).toLocaleString("en-GB")}</small><h3>${esc(note.title)}</h3><p>${esc(note.body)}</p><footer>${note.action_url?'<button type="button" data-open-note>Open update <span>→</span></button>':""}<button type="button" class="quiet" data-dismiss-note>Dismiss</button></footer></div>${note.priority==="urgent"?'<b class="notifyPriority250">Urgent</b>':""}</article>`}
  function preferences(){
    const p=state.prefs,check=(key,fallback=true)=>p[key]??fallback;
    const toggle=(key,label,help,mandatory=false)=>`<label class="notifyToggle250"><span><b>${label}</b><small>${help}</small></span><input type="checkbox" name="${key}" ${check(key)?'checked':""} ${mandatory?"checked disabled":""}><i aria-hidden="true"></i></label>`;
    return `<section class="notifyPageLead250"><span>YOUR CONSENT, YOUR CONTROL</span><h2>Choose what reaches you.</h2><p>Essential account and security notices remain enabled. Every other category can be adjusted at any time.</p></section><form class="notifyPrefs250" data-notify-prefs><div class="notifyPrefGroup250"><h3>Delivery channels</h3>${toggle("push_enabled","Browser push","Receive supported alerts when the site is not open.",false)}${toggle("in_app_enabled","In-site notifications","Keep a private notification history inside your account.")}${toggle("email_enabled","Email notifications","Use the existing email channel when available.",false)}</div><div class="notifyPrefGroup250"><h3>Categories</h3>${toggle("job_alerts_enabled","Matching job alerts","Roles aligned with your destination and profile.")}${toggle("visa_updates_enabled","Visa and immigration updates","Relevant changes for your selected pathway.")}${toggle("mentor_messages_enabled","Mentor messages","Generic private-message alerts without message content.")}${toggle("booking_updates_enabled","Booking updates","Confirmations, changes and reminders.")}${toggle("learning_reminders_enabled","Learning and mock reminders","Study prompts, course releases and mock activity.")}${toggle("marketing_enabled","Platform announcements","Optional product news and promotional announcements.",false)}${toggle("account_alerts_enabled","Account and security alerts","Essential protection and billing notices.",true)}</div><div class="notifySchedule250"><label><span>Frequency</span><select name="frequency"><option value="immediate">Immediate</option><option value="daily">Daily summary</option><option value="weekly">Weekly summary</option><option value="none">No non-essential notifications</option></select></label><label class="notifyQuietCheck250"><input type="checkbox" name="quiet_hours_enabled" ${check("quiet_hours_enabled",false)?"checked":""}> Use quiet hours</label><label><span>From</span><input type="time" name="quiet_start" value="${esc(String(p.quiet_start||"22:00").slice(0,5))}"></label><label><span>Until</span><input type="time" name="quiet_end" value="${esc(String(p.quiet_end||"07:00").slice(0,5))}"></label></div><div class="notifySave250"><p role="status" data-pref-status>Your changes stay linked to this account.</p><button type="submit">Save preferences</button></div></form>`;
  }
  function permissionState(){if(!supported())return"unsupported";if(Notification.permission==="denied")return"denied";if(Notification.permission==="default")return"default";return"granted"}
  function devices(){
    const status=permissionState(),isIos=ios(),installed=standalone(),dismissed=localStorage.getItem("btv-ios-push-guide-dismissed")==="1";
    const guide=isIos&&!installed&&!dismissed?`<aside class="notifyIos250"><div><span>iPHONE & iPAD</span><h3>Install Beyond The Visa before enabling notifications</h3><ol><li>Open this website in Safari.</li><li>Tap Share, then <b>Add to Home Screen</b>.</li><li>Open the installed app and return here to enable notifications.</li></ol></div><button type="button" data-dismiss-ios>Not now</button></aside>`:"";
    const copy={unsupported:["Push is not supported here","In-site notifications remain available on this browser."],denied:["Notifications are blocked","Use your browser or device settings to allow notifications for Beyond The Visa."],default:["Stay updated without constantly checking the site","Receive matching jobs, visa updates, mentor messages and important account activity."],granted:["Browser permission is active","This device can receive notifications when a valid subscription is connected."]}[status];
    return `${guide}<section class="notifyPermission250 ${status}"><div class="notifyPermissionIcon250">◉</div><div><span>${status.toUpperCase()}</span><h2>${copy[0]}</h2><p>${copy[1]}</p><small>We never request permission automatically and never include private message text or sensitive account details on a lock screen.</small></div><div class="notifyPermissionActions250">${status==="default"||status==="granted"?`<button type="button" data-enable-push ${isIos&&!installed?"disabled":""}>${status==="granted"?"Connect this device":"Enable notifications"}</button>`:""}${status==="granted"?'<button type="button" class="secondary" data-disable-push>Disable on this device</button>':""}<button type="button" class="secondary" data-open-prefs>Manage preferences</button></div></section><section class="notifyDeviceFacts250"><article><small>BROWSER SUPPORT</small><b>${supported()?"Available":"Not supported"}</b></article><article><small>PERMISSION</small><b>${status}</b></article><article><small>APP MODE</small><b>${installed()?"Installed":"Browser tab"}</b></article></section><p class="notifyDeviceStatus250" data-device-status role="status"></p>`;
  }
  function wire(root){
    root.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;render()});
    $("[data-refresh-notes]",root)?.addEventListener("click",load);
    $("[data-read-all]",root)?.addEventListener("click",async()=>{await db().rpc("mark_all_notifications_read");await load()});
    root.querySelectorAll("[data-note]").forEach(card=>{const id=card.dataset.note,note=state.notes.find(n=>n.id===id);$("[data-open-note]",card)?.addEventListener("click",async()=>{await db().rpc("btv_notification_mark_opened",{p_notification:id});location.assign(safe(note?.action_url))});$("[data-dismiss-note]",card)?.addEventListener("click",async()=>{await db().rpc("btv_notification_dismiss",{p_notification:id});await load()})});
    const form=$("[data-notify-prefs]",root);if(form){form.frequency.value=state.prefs.frequency||"immediate";form.onsubmit=savePreferences}
    $("[data-enable-push]",root)?.addEventListener("click",enablePush);$("[data-disable-push]",root)?.addEventListener("click",disablePush);
    $("[data-open-prefs]",root)?.addEventListener("click",()=>{state.tab="preferences";render()});
    $("[data-dismiss-ios]",root)?.addEventListener("click",()=>{localStorage.setItem("btv-ios-push-guide-dismissed","1");render()});
  }
  async function savePreferences(event){
    event.preventDefault();const form=event.currentTarget,message=$("[data-pref-status]",form),values=Object.fromEntries(new FormData(form));
    const booleans=["push_enabled","email_enabled","in_app_enabled","job_alerts_enabled","visa_updates_enabled","mentor_messages_enabled","booking_updates_enabled","learning_reminders_enabled","marketing_enabled","quiet_hours_enabled"];
    booleans.forEach(key=>values[key]=Boolean(form.elements[key]?.checked));values.account_alerts_enabled=true;values.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    message.textContent="Saving securely…";const result=await db().rpc("btv_notification_save_preferences",{p_preferences:values});
    message.textContent=result.error?"Your preferences could not be saved. Please try again.":"Preferences saved.";if(!result.error)state.prefs=result.data||values;
  }
  function vapidKey(){return document.querySelector('meta[name="btv-vapid-key"]')?.content||window.BTV_VAPID_PUBLIC_KEY||""}
  function keyBytes(value){const pad="=".repeat((4-value.length%4)%4),raw=atob((value+pad).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
  function device(){const ua=navigator.userAgent;return{browser:/Edg/.test(ua)?"Edge":/Chrome/.test(ua)?"Chrome":/Safari/.test(ua)?"Safari":"Other",deviceType:/Mobile|Android|iPhone|iPad/.test(ua)?"mobile":"desktop",operatingSystem:/iPhone|iPad/.test(ua)?"iOS":/Android/.test(ua)?"Android":/Windows/.test(ua)?"Windows":/Mac/.test(ua)?"macOS":"Other"}}
  async function enablePush(){
    const message=$("[data-device-status]");try{
      if(!supported())throw Error("Push notifications are not supported on this browser.");
      if(ios()&&!standalone())throw Error("Install Beyond The Visa to your Home Screen before enabling notifications.");
      if(Notification.permission==="default"){const permission=await Notification.requestPermission();if(permission!=="granted")throw Error("Permission was not granted. You can change this later in browser settings.")}
      if(Notification.permission!=="granted")throw Error("Notifications are blocked in browser settings.");
      const key=vapidKey();if(!key)throw Error("Push notifications are not configured by the site administrator yet.");
      const registration=await navigator.serviceWorker.ready;let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(key)});
      const current=await session(),details=device(),json=subscription.toJSON();const response=await fetch("/api/push-subscription",{method:"POST",headers:{"content-type":"application/json",Authorization:`Bearer ${current.access_token}`},body:JSON.stringify({subscription:{endpoint:json.endpoint,keys:json.keys},...details})});
      if(!response.ok)throw Error("We could not enable notifications on this device. Please try again.");
      await db().rpc("btv_notification_save_preferences",{p_preferences:{...state.prefs,push_enabled:true,in_app_enabled:true,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}});
      message.textContent="Notifications are active on this device.";await load();state.tab="devices";render();
    }catch(error){message.textContent=error.message||"We could not enable notifications on this device."}
  }
  async function disablePush(){
    const message=$("[data-device-status]");try{const current=await session(),registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();if(subscription){await fetch("/api/push-subscription",{method:"DELETE",headers:{"content-type":"application/json",Authorization:`Bearer ${current.access_token}`},body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe()}await db().rpc("btv_notification_save_preferences",{p_preferences:{...state.prefs,push_enabled:false,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}});message.textContent="Push notifications are disabled on this device.";await load();state.tab="devices";render()}catch{message.textContent="We could not disable notifications. Please review your browser settings."}
  }
  async function badge(){const count=state.notes.filter(n=>!n.read_at).length;let bell=$("#btvNotifyBell250");if(!bell){bell=document.createElement("button");bell.id="btvNotifyBell250";bell.className="btvNotifyBell250";bell.type="button";bell.setAttribute("aria-label","Open notifications");bell.innerHTML='<span aria-hidden="true">◉</span><b hidden>0</b>';document.body.append(bell);bell.onclick=()=>open("inbox")}const mark=$("b",bell);mark.hidden=!count;mark.textContent=count>99?"99+":String(count)}
  function replaceLegacyEntries(){
    document.querySelectorAll('[data-btv-pane="notify"]').forEach(button=>{button.textContent="Notification Centre"});
    document.querySelectorAll('[data-btv-pane="prefs"]').forEach(button=>{button.hidden=true});
  }
  document.addEventListener("click",event=>{
    const entry=event.target.closest('[data-open="notifications"],[data-go="notifications"],[data-hub="notifications"],[data-btv-pane="notify"],[data-btv-pane="prefs"]');
    if(!entry)return;
    event.preventDefault();event.stopImmediatePropagation();
    open(entry.matches('[data-btv-pane="prefs"]')?"preferences":"inbox");
  },true);
  document.addEventListener("btv:auth-ready",async()=>{if(await session())load()});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&state.user)load()});
  addEventListener("DOMContentLoaded",async()=>{replaceLegacyEntries();if(await session()){const clicked=new URLSearchParams(location.search).get("btv_notification");if(clicked){await db().rpc("btv_notification_mark_opened",{p_notification:clicked});const url=new URL(location.href);url.searchParams.delete("btv_notification");history.replaceState(history.state,"",url)}if(new URLSearchParams(location.search).get("open")==="notifications")open("inbox");else load()}},{once:true});
  window.BTVNotifications={open,close,refresh:load,supported};
})();
