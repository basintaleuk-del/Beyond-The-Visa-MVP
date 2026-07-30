(()=>{
  if(window.BTVBookingsCentre?.version>=224)return;
  const state={user:null,profile:null,services:[],rules:[],serviceBookings:[],mentorBookings:[],filter:'upcoming',loading:false};
  const db=()=>window.btvSupabase;
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const icon=(name)=>({back:'←',calendar:'▦',clock:'◷',shield:'◇',arrow:'→',video:'▶',close:'×',refresh:'↻'}[name]||'•');
  const money=(minor,currency='GBP')=>Number(minor||0)>0?new Intl.NumberFormat('en-GB',{style:'currency',currency:currency||'GBP'}).format(Number(minor)/100):'Complimentary';
  const dateTime=value=>new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  const shortDate=value=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short'}).format(new Date(value));
  const statusLabel=value=>String(value||'scheduled').replaceAll('_',' ');
  const isFuture=item=>new Date(item.starts_at).getTime()>Date.now()&&!['cancelled','completed','refunded'].includes(item.status);
  const clientReady=()=>db()&&typeof db().from==='function';
  function shell(){
    let page=document.getElementById('bookingsCentre224');
    if(page)return page;
    page=document.createElement('section');
    page.id='bookingsCentre224';
    page.className='bookingsCentre224';
    page.hidden=true;
    page.setAttribute('aria-label','My bookings');
    page.innerHTML=`<div class="bookingsShell224">
      <header class="bookingsTop224">
        <button type="button" class="bookingsBack224" data-bookings-close>${icon('back')}<span>Back</span></button>
        <a class="bookingsBrand224" href="./" aria-label="Beyond The Visa home"><span>BV</span><b>Beyond The Visa</b><small>Booking concierge</small></a>
        <button type="button" class="bookingsRefresh224" data-bookings-refresh aria-label="Refresh bookings">${icon('refresh')}</button>
      </header>
      <main class="bookingsMain224" id="bookingsMain224" tabindex="-1"></main>
    </div>
    <dialog class="bookingsDialog224" id="bookingsDialog224"><div data-booking-dialog-body></div></dialog>`;
    document.body.append(page);
    page.querySelector('[data-bookings-close]').onclick=close;
    page.querySelector('[data-bookings-refresh]').onclick=()=>load(true);
    page.addEventListener('click',handleClick);
    page.addEventListener('keydown',event=>{if(event.key==='Escape'&&!page.querySelector('dialog[open]'))close()});
    return page;
  }
  function showMessage(title,message,action='Try again'){
    const main=shell().querySelector('#bookingsMain224');
    main.innerHTML=`<section class="bookingsState224" role="status"><span aria-hidden="true">${icon('calendar')}</span><h1>${esc(title)}</h1><p>${esc(message)}</p>${action?`<button type="button" data-bookings-refresh>${esc(action)}</button>`:''}</section>`;
    main.querySelector('[data-bookings-refresh]')?.addEventListener('click',()=>load(true));
  }
  function loading(){
    shell().querySelector('#bookingsMain224').innerHTML=`<section class="bookingsLoading224" aria-live="polite"><div></div><div></div><div></div><p>Opening your secure booking ledger…</p></section>`;
  }
  async function session(){
    if(!clientReady())return null;
    const {data,error}=await db().auth.getSession();
    if(error)throw error;
    return data?.session||null;
  }
  async function open(){
    const page=shell();
    page.hidden=false;
    page.dataset.previousOverflow=document.body.style.overflow||'';
    document.body.style.overflow='hidden';
    loading();
    page.querySelector('[data-bookings-close]').focus({preventScroll:true});
    try{
      const active=await session();
      if(!active){
        showMessage('Sign in to manage bookings','Your appointments are private and can only be loaded after you sign in.','Sign in');
        shell().querySelector('[data-bookings-refresh]').onclick=()=>{close();window.openScreen?.('login')};
        return;
      }
      state.user=active.user;
      await load();
    }catch(error){showMessage('Bookings could not be loaded',error?.message||'Please check your connection and try again. No data was changed.')}
  }
  function close(){
    const page=document.getElementById('bookingsCentre224');
    if(!page)return;
    page.querySelector('dialog[open]')?.close();
    page.hidden=true;
    document.body.style.overflow=page.dataset.previousOverflow||'';
  }
  async function load(force=false){
    if(state.loading&&!force)return;
    state.loading=true;
    loading();
    try{
      const active=await session();
      if(!active)throw new Error('Your session has ended. Please sign in again.');
      state.user=active.user;
      const calls=await Promise.all([
        db().from('profiles').select('full_name').eq('id',state.user.id).maybeSingle(),
        db().from('booking_services').select('id,name,slug,description,duration_minutes,price_minor,currency,cancellation_hours,reschedule_hours,is_active').eq('is_active',true).order('created_at'),
        db().from('availability_rules').select('service_id,weekday,start_time,end_time,timezone,valid_from,valid_until,is_active').eq('is_active',true),
        db().from('bookings').select('id,user_id,service_id,starts_at,ends_at,status,payment_status,meeting_url,created_at,booking_services(name,duration_minutes,currency,price_minor,cancellation_hours,reschedule_hours)').eq('user_id',state.user.id).order('starts_at',{ascending:false}),
        db().from('btv_mentor_bookings').select('id,user_id,mentor_id,starts_at,status,coin_cost,topic,created_at,btv_mentors(id,specialty,biography)').eq('user_id',state.user.id).order('starts_at',{ascending:false})
      ]);
      const coreErrors=calls.slice(0,4).map(x=>x.error).filter(Boolean);
      if(coreErrors.length)throw coreErrors[0];
      state.profile=calls[0].data||{};
      state.services=calls[1].data||[];
      state.rules=calls[2].data||[];
      state.serviceBookings=calls[3].data||[];
      state.mentorBookings=calls[4].error?[]:(calls[4].data||[]);
      render();
    }catch(error){showMessage('The booking ledger is unavailable',error?.message||'Your authorised booking records could not be loaded. No data was changed.')}
    finally{state.loading=false}
  }
  function allBookings(){
    const service=state.serviceBookings.map(b=>({...b,kind:'service',title:b.booking_services?.name||'Professional consultation',detail:'Beyond The Visa service',cost:money(b.booking_services?.price_minor,b.booking_services?.currency)}));
    const mentor=state.mentorBookings.map(b=>({...b,kind:'mentor',title:b.btv_mentors?.specialty||'Mentor session',detail:b.topic||'Approved mentor guidance',cost:`${Number(b.coin_cost||0)} BC`}));
    return [...service,...mentor].sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));
  }
  function appointmentCard(item){
    const future=isFuture(item),join=future&&/^https?:\/\//i.test(item.meeting_url||'');
    const canManage=item.kind==='service'&&future&&['pending_payment','confirmed'].includes(item.status);
    return `<article class="bookingCard224">
      <time datetime="${esc(item.starts_at)}"><strong>${shortDate(item.starts_at).split(' ')[0]}</strong><span>${shortDate(item.starts_at).split(' ')[1]}</span></time>
      <div class="bookingCardBody224"><div class="bookingCardMeta224"><span>${esc(item.kind==='mentor'?'Mentor session':'Expert service')}</span><i data-status="${esc(item.status)}">${esc(statusLabel(item.status))}</i></div><h3>${esc(item.title)}</h3><p>${esc(dateTime(item.starts_at))} · ${esc(item.detail)}</p><small>${esc(item.cost)}${item.payment_status?` · ${esc(statusLabel(item.payment_status))}`:''}</small></div>
      <div class="bookingCardActions224">${join?`<a href="${esc(item.meeting_url)}" target="_blank" rel="noopener">Join ${icon('video')}</a>`:''}${canManage?`<button type="button" data-reschedule="${esc(item.id)}">Reschedule</button><button type="button" class="danger" data-cancel="${esc(item.id)}">Cancel</button>`:''}${item.kind==='service'&&item.status==='pending_payment'&&item.payment_status!=='paid'?`<button type="button" class="primary" data-pay="${esc(item.id)}">Complete payment</button>`:''}</div>
    </article>`;
  }
  function serviceCard(service){
    const rules=state.rules.filter(r=>!r.service_id||r.service_id===service.id);
    const days=[...new Set(rules.map(r=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][r.weekday]))].join(', ');
    return `<article class="serviceCard224"><div class="serviceIcon224" aria-hidden="true">${icon('shield')}</div><span>${esc(service.duration_minutes)} minutes</span><h3>${esc(service.name)}</h3><p>${esc(service.description||'Focused professional support, securely booked and managed in one place.')}</p><div class="serviceTerms224"><b>${esc(money(service.price_minor,service.currency))}</b><small>${days?`Live calendar · ${esc(days)}`:'Availability checked at confirmation'}</small></div><button type="button" data-book-service="${esc(service.id)}">View times ${icon('arrow')}</button></article>`;
  }
  function render(){
    const bookings=allBookings(),upcoming=bookings.filter(isFuture),past=bookings.filter(x=>!isFuture(x));
    const visible=state.filter==='all'?bookings:state.filter==='past'?past:upcoming;
    const name=String(state.profile?.full_name||state.user?.user_metadata?.full_name||'').trim().split(/\s+/)[0];
    shell().querySelector('#bookingsMain224').innerHTML=`
      <section class="bookingsHero224"><div><span>PRIVATE MEMBER CONCIERGE</span><h1>Your time,<br><em>professionally managed.</em></h1><p>${name?`Welcome back, ${esc(name)}. `:''}Book verified support, manage upcoming appointments and keep every session in one secure ledger.</p><div class="bookingsHeroActions224"><button type="button" data-scroll-services>Book a service ${icon('arrow')}</button><button type="button" data-open-mentors>Browse mentors</button></div></div><aside><span>LIVE BOOKING LEDGER</span><strong>${upcoming.length}</strong><p>upcoming appointment${upcoming.length===1?'':'s'}</p><small>${icon('shield')} Protected by your signed-in Supabase account</small></aside></section>
      <section class="bookingMetrics224" aria-label="Booking summary"><article><span>Upcoming</span><strong>${upcoming.length}</strong><small>Scheduled across all services</small></article><article><span>Completed & past</span><strong>${past.length}</strong><small>Your appointment history</small></article><article><span>Live services</span><strong>${state.services.length}</strong><small>From the booking catalogue</small></article><article><span>Local time</span><strong>${esc(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date()))}</strong><small>${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}</small></article></section>
      <section class="bookingsLedger224"><div class="bookingsSectionHead224"><div><span>APPOINTMENT PORTFOLIO</span><h2>My bookings</h2></div><div class="bookingFilters224" role="group" aria-label="Filter bookings">${[['upcoming','Upcoming'],['past','Past'],['all','All']].map(([id,label])=>`<button type="button" data-booking-filter="${id}" aria-pressed="${state.filter===id}">${label}</button>`).join('')}</div></div><div class="bookingList224">${visible.map(appointmentCard).join('')||`<div class="bookingEmpty224"><span>${icon('calendar')}</span><h3>${state.filter==='past'?'No past appointments':'Your calendar is clear'}</h3><p>${state.filter==='past'?'Completed and previous bookings will appear here.':'Choose a live service or book an approved mentor when you are ready.'}</p><button type="button" data-scroll-services>Explore services</button></div>`}</div></section>
      <section class="bookingServices224" id="bookingServices224"><div class="bookingsSectionHead224"><div><span>VERIFIED SUPPORT</span><h2>Book with confidence</h2><p>Prices, duration and available hours are read directly from the live service catalogue.</p></div></div><div class="serviceGrid224">${state.services.map(serviceCard).join('')||'<div class="bookingEmpty224"><h3>No services are open right now</h3><p>The service catalogue will update here as soon as the team publishes availability.</p></div>'}</div></section>
      <section class="bookingTrust224"><div><span>${icon('shield')}</span><h2>Secure from request to appointment</h2></div><p>Bookings are owner-restricted, validated against published availability and protected cancellation windows. Paid appointments continue through the existing secure checkout.</p><button type="button" data-open-support>Get booking support ${icon('arrow')}</button></section>`;
    shell().querySelector('#bookingsMain224').focus({preventScroll:true});
  }
  function dialog(content){
    const el=shell().querySelector('#bookingsDialog224');
    el.querySelector('[data-booking-dialog-body]').innerHTML=content;
    el.querySelectorAll('[data-dialog-close]').forEach(button=>button.onclick=()=>el.close());
    if(!el.open)el.showModal();
    el.querySelector('input,button')?.focus();
    return el;
  }
  function minLocal(){const d=new Date(Date.now()+36e5);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
  function availability(service){
    const rules=state.rules.filter(r=>!r.service_id||r.service_id===service.id);
    if(!rules.length)return 'Your selected time will be checked against the live calendar.';
    const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return rules.slice(0,5).map(r=>`${days[r.weekday]} ${String(r.start_time).slice(0,5)}–${String(r.end_time).slice(0,5)} (${r.timezone})`).join(' · ');
  }
  function bookingForm(service){
    const el=dialog(`<header><div><span>SECURE BOOKING REQUEST</span><h2>${esc(service.name)}</h2><p>${esc(service.duration_minutes)} minutes · ${esc(money(service.price_minor,service.currency))}</p></div><button type="button" data-dialog-close aria-label="Close">${icon('close')}</button></header><form data-create-booking><div class="bookingAvailability224"><b>Published availability</b><p>${esc(availability(service))}</p></div><div class="bookingFormGrid224"><label>Full name<input name="name" autocomplete="name" required maxlength="120" value="${esc(state.profile?.full_name||state.user?.user_metadata?.full_name||'')}"></label><label>Email address<input name="email" type="email" autocomplete="email" required value="${esc(state.user?.email||'')}"></label><label class="wide">Preferred start time<input name="start" type="datetime-local" min="${minLocal()}" required><small>Shown in your local timezone. Supabase validates this against the live calendar.</small></label><label>Role or band<input name="role" maxlength="80" placeholder="For example, Registered Nurse"></label><label class="wide">What would you like help with?<textarea name="notes" maxlength="1200" rows="4" placeholder="Share the outcome you want from this session"></textarea></label></div><div class="bookingDialogFoot224"><p data-booking-status role="status"></p><button type="button" data-dialog-close>Cancel</button><button type="submit" class="primary">${service.price_minor?'Continue to payment':'Confirm booking'}</button></div></form>`);
    el.querySelector('[data-create-booking]').onsubmit=event=>createBooking(event,service);
  }
  async function createBooking(event,service){
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-booking-status]'),data=new FormData(form);
    button.disabled=true;status.textContent='Checking the live calendar…';status.dataset.error='false';
    try{
      const starts=new Date(data.get('start'));
      if(Number.isNaN(starts.getTime()))throw new Error('Choose a valid future time.');
      const result=await db().rpc('create_booking',{p_service:service.id,p_starts:starts.toISOString(),p_name:String(data.get('name')).trim(),p_email:String(data.get('email')).trim(),p_role:String(data.get('role')||'').trim()||null,p_notes:String(data.get('notes')||'').trim()||null});
      if(result.error)throw result.error;
      if(service.price_minor){status.textContent='Opening secure payment…';await startCheckout(result.data)}
      else{status.textContent='Booking confirmed.';setTimeout(async()=>{shell().querySelector('#bookingsDialog224').close();await load(true)},650)}
    }catch(error){status.textContent=error?.message||'The booking could not be created. No payment was taken.';status.dataset.error='true';button.disabled=false}
  }
  async function startCheckout(bookingId){
    const active=await session();
    if(!active)throw new Error('Your session ended. Please sign in and try again.');
    const response=await fetch(`${window.BTV_SUPABASE_URL||'https://wuvgktmzkzrdvbpqfmek.supabase.co'}/functions/v1/booking-checkout`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${active.access_token}`},body:JSON.stringify({bookingId})});
    const out=await response.json().catch(()=>({}));
    if(!response.ok||!out.authorization_url)throw new Error(out.error||'Secure payment could not be opened. Your booking remains in the ledger.');
    location.assign(out.authorization_url);
  }
  function rescheduleForm(id){
    const item=state.serviceBookings.find(x=>x.id===id);if(!item)return;
    const service=item.booking_services||{};
    const el=dialog(`<header><div><span>MANAGE APPOINTMENT</span><h2>Choose a new time</h2><p>${esc(service.name||'Professional consultation')}</p></div><button type="button" data-dialog-close aria-label="Close">${icon('close')}</button></header><form data-reschedule-booking><div class="bookingAvailability224"><b>Current appointment</b><p>${esc(dateTime(item.starts_at))}</p></div><label>New start time<input name="start" type="datetime-local" min="${minLocal()}" required><small>The published reschedule window and live availability are checked securely.</small></label><div class="bookingDialogFoot224"><p data-booking-status role="status"></p><button type="button" data-dialog-close>Keep current time</button><button type="submit" class="primary">Save new time</button></div></form>`);
    el.querySelector('[data-reschedule-booking]').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,status=form.querySelector('[data-booking-status]'),button=form.querySelector('[type="submit"]'),value=new FormData(form).get('start');button.disabled=true;status.textContent='Checking availability…';try{const result=await db().rpc('manage_own_booking',{p_booking:id,p_action:'reschedule',p_new_start:new Date(value).toISOString()});if(result.error)throw result.error;el.close();await load(true)}catch(error){status.textContent=error?.message||'The booking could not be rescheduled.';status.dataset.error='true';button.disabled=false}};
  }
  async function cancelBooking(id){
    if(!window.confirm('Cancel this booking? The published cancellation deadline applies.'))return;
    const result=await db().rpc('manage_own_booking',{p_booking:id,p_action:'cancel',p_new_start:null});
    if(result.error){window.alert(result.error.message);return}
    await load(true);
  }
  function handleClick(event){
    const target=event.target.closest('button,a');if(!target)return;
    if(target.dataset.bookingFilter){state.filter=target.dataset.bookingFilter;render();return}
    if(target.hasAttribute('data-scroll-services')){shell().querySelector('#bookingServices224')?.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(target.hasAttribute('data-open-mentors')){close();if(window.BTVMentorMarketplace?.open)return window.BTVMentorMarketplace.open();return window.BTVFeatures?.open?.('mentors')}
    if(target.hasAttribute('data-open-support')){close();return window.BTVHelpSupport?.open?.()}
    if(target.dataset.bookService){const service=state.services.find(x=>x.id===target.dataset.bookService);if(service)bookingForm(service);return}
    if(target.dataset.reschedule)return rescheduleForm(target.dataset.reschedule);
    if(target.dataset.cancel)return cancelBooking(target.dataset.cancel);
    if(target.dataset.pay)return startCheckout(target.dataset.pay).catch(error=>window.alert(error.message));
  }
  window.BTVBookingsCentre={version:224,open,close,refresh:()=>load(true)};
})();
