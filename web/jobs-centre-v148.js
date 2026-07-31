(() => {
  "use strict";
  if (window.__btvJobsCentre148) return;
  window.__btvJobsCentre148 = true;
  const LABELS = { nurse:"Nursing",midwife:"Midwifery",both:"Nursing and midwifery",medical_dental:"Medical and dental",allied_health:"Allied health professionals",pharmacy:"Pharmacy",scientific_technical:"Healthcare science and technical",healthcare_support:"Healthcare support",administrative_clerical:"Administrative and clerical",estates_facilities:"Estates and facilities",ambulance:"Ambulance services",social_care:"Social care",other:"Other NHS professions" };
  const EMPTY_FILTERS = { search:"", profession:"", location:"", employer:"", contract:"", band:"", sponsorship:"" };
  const ACTIVE_JOB_STATUSES = ["published", "closing_soon"];
  const view = { rows:[], saved:new Set(), visible:24, loaded:false, loading:false, checkedAt:null, filters:{...EMPTY_FILTERS} };
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
  const date = (v) => v ? new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "Not stated";
  const db = () => window.btvSupabase, root = () => document.getElementById("jobsContent");
  const destinationKey = () => { try { const profile=JSON.parse(localStorage.getItem("btv-profile")||"null"); return String(profile?.destination_country||profile?.destination||"").toLowerCase(); } catch { return ""; } };
  const heroStatIcons = {
    vacancies:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7M4 8h16v11H4zM4 12h16M10 12v2h4v-2"/></svg>',
    families:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5M3.5 19v-2.2A3.8 3.8 0 0 1 7.3 13h3.4a3.8 3.8 0 0 1 3.8 3.8V19m1.5-6h.7a3.8 3.8 0 0 1 3.8 3.8V19"/></svg>',
    employers:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V8h14v12M9 8V4h6v4M8 12h2m4 0h2m-8 4h2m4 0h2m-5 4v-4h2v4"/></svg>',
    sponsorship:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16m3-6 4-3m0 0-1-2m1 2-2 .5"/></svg>'
  };
  const heroStatLabels = { vacancies:"Show all live vacancies", families:"Choose a staff family", employers:"Filter by employer", sponsorship:"Show jobs where sponsorship is mentioned" };
  const heroStat = (kind,value,label,path,pressed=false) => `<button type="button" class="nhsJobsHeroStat148 ${kind}148" data-jobs-stat="${kind}" aria-label="${heroStatLabels[kind]}" aria-haspopup="dialog"${kind==="sponsorship"?` aria-pressed="${pressed}"`:""}><span class="nhsJobsHeroStatIcon148" aria-hidden="true">${heroStatIcons[kind]}</span><b>${value}</b><small>${label}</small><svg class="nhsJobsHeroTrend148" viewBox="0 0 160 24" preserveAspectRatio="none" aria-hidden="true"><path d="${path}"/></svg></button>`;

  function upgradeEntry(){
    const section=document.getElementById("jobs"); if(section)section.classList.add("nhsJobs148");
    const destination=destinationKey();
    document.querySelectorAll('[data-open="jobs"]').forEach((button)=>{button.hidden=Boolean(destination&&!['uk','us'].includes(destination));});
    if(destination&&destination!=="uk")return;
    const eyebrow=section?.querySelector(".pageTitle span"), heading=section?.querySelector(".pageTitle h1");
    if(eyebrow)eyebrow.textContent="LIVE NHS VACANCIES"; if(heading)heading.textContent="Jobs";
    document.querySelectorAll('[data-open="jobs"]').forEach((button)=>{const label=button.querySelector("span"),small=button.querySelector("small");if(label)label.textContent="NHS jobs";if(small)small.textContent="All professions and employers";});
  }

  async function fetchAll(){
    const rows=[];
    for(let from=0;from<3000;from+=500){
      const result=await db().from("btv_jobs").select("*").in("status",ACTIVE_JOB_STATUSES).is("expired_at",null).in("source_name",["NHS Jobs","REED","ADZUNA"]).eq("country_code","GB").eq("opportunity_type","job").order("published_at",{ascending:false}).range(from,from+499);
      if(result.error)throw result.error; rows.push(...(result.data||[])); if((result.data||[]).length<500)break;
    }
    return rows;
  }

  async function load(force=false){
    if(destinationKey()&&destinationKey()!=="uk")return; upgradeEntry(); if(!root()||view.loading||(view.loaded&&!force))return render(); view.loading=true;
    root().innerHTML='<div class="nhsJobsState148"><b>Loading NHS vacancies…</b><p>Checking the latest published jobs.</p></div>';
    try{
      const {data:auth}=await db().auth.getUser(); if(!auth?.user)throw new Error("Sign in to browse and save NHS jobs.");
      const [rows,saved]=await Promise.all([fetchAll(),db().from("btv_saved_jobs").select("job_id").eq("user_id",auth.user.id)]); if(saved.error)throw saved.error;
      view.rows=rows; view.saved=new Set((saved.data||[]).map((item)=>item.job_id)); view.checkedAt=rows.map((row)=>row.last_checked_at).filter(Boolean).sort().at(-1)||null; view.visible=24; view.loaded=true; render();
    }catch(error){root().innerHTML=`<div class="nhsJobsState148"><b>Jobs could not be loaded</b><p>${esc(error.message)}</p><button class="nhsJobsMore148" data-jobs-retry>Try again</button></div>`;root().querySelector("[data-jobs-retry]")?.addEventListener("click",()=>load(true));}
    finally{view.loading=false;}
  }

  function values(){const form=root()?.querySelector("[data-nhs-job-filters]");if(!form)return{};return Object.fromEntries([...new FormData(form).entries()].map(([key,value])=>[key,String(value).trim().toLowerCase()]));}
  function filtered(){const f=view.filters;return view.rows.filter((row)=>{const text=`${row.title} ${row.employer} ${row.summary||""} ${row.location||""} ${row.external_reference||""}`.toLowerCase();return(!f.search||text.includes(f.search))&&(!f.profession||row.profession===f.profession)&&(!f.location||`${row.location||""} ${row.city||""} ${row.region||""}`.toLowerCase().includes(f.location))&&(!f.employer||String(row.employer||"").toLowerCase().includes(f.employer))&&(!f.contract||String(row.employment_type||"").toLowerCase().includes(f.contract))&&(!f.band||String(row.band||"").toLowerCase()===f.band)&&(!f.sponsorship||row.sponsorship_status==="confirmed"||row.sponsorship_status==="may_be_available");});}

  const detailText=(value)=>esc(value||"").replace(/\n/g,"<br>");
  const detailSection=(title,value)=>value?`<section><h2>${esc(title)}</h2><p>${detailText(value)}</p></section>`:"";
  const applicationUrl=(row,fallback="")=>fallback||row.application_url||row.canonical_url||row.source_url||"";
  const sourceApplyLink=(url,isExternal)=>isExternal?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">View and apply</a>`:`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Apply</a>`;
  const sourceLabel=(row)=>row.source_name==="ADZUNA"?"Jobs by Adzuna":row.source_name==="REED"?"REED":"NHS JOBS";
  const salaryText=(row)=>row.salary_text||((row.salary_min!=null||row.salary_max!=null)?`£${Number(row.salary_min??row.salary_max).toLocaleString("en-GB")}${row.salary_max!=null&&row.salary_max!==row.salary_min?` – £${Number(row.salary_max).toLocaleString("en-GB")}`:""}`:"Not stated");
  function detailDialog(){
    let dialog=document.querySelector("[data-nhs-job-detail]");
    if(!dialog){dialog=document.createElement("dialog");dialog.className="nhsJobDetail150";dialog.dataset.nhsJobDetail="";document.body.append(dialog);dialog.addEventListener("click",(event)=>{if(event.target===dialog)closeDetail(true);});}
    return dialog;
  }
  function closeDetail(restoreRoute=false){const dialog=detailDialog();if(dialog.open)dialog.close();if(restoreRoute&&location.pathname.startsWith("/jobs/"))history.replaceState({},"",view.detailReturn||"/jobs");}

  function statDialog(){
    let dialog=document.querySelector("[data-nhs-jobs-stat-dialog]");
    if(!dialog){
      dialog=document.createElement("dialog");
      dialog.className="nhsJobsStatDialog176";
      dialog.dataset.nhsJobsStatDialog="";
      document.body.append(dialog);
      dialog.addEventListener("click",(event)=>{if(event.target===dialog)dialog.close();});
    }
    return dialog;
  }

  function openStatDialog(kind){
    const dialog=statDialog(),families=new Map(),employers=new Map();
    view.rows.forEach((row)=>{
      families.set(row.profession,(families.get(row.profession)||0)+1);
      const employer=String(row.employer||"Not stated");
      employers.set(employer,(employers.get(employer)||0)+1);
    });
    const recent=[...view.rows].sort((a,b)=>String(b.published_at||"").localeCompare(String(a.published_at||""))).slice(0,18);
    const sponsored=view.rows.filter((row)=>["confirmed","may_be_available"].includes(row.sponsorship_status)).slice(0,18);
    const definitions={
      vacancies:["Live NHS vacancies","The latest jobs from today’s synchronized NHS Jobs feed."],
      families:["Staff families","Choose a profession to filter the live vacancy list."],
      employers:["Employers currently recruiting","Choose an employer to see its current vacancies."],
      sponsorship:["Visa sponsorship mentioned","Current adverts where sponsorship is confirmed or may be available."],
    };
    const [title,description]=definitions[kind]||definitions.vacancies;
    let content="";
    if(kind==="families") content=[...families].sort((a,b)=>(LABELS[a[0]]||a[0]).localeCompare(LABELS[b[0]]||b[0])).map(([value,count])=>`<button data-stat-filter="profession" data-stat-value="${esc(value)}"><span>${esc(LABELS[value]||LABELS.other)}</span><b>${count}</b></button>`).join("");
    else if(kind==="employers") content=[...employers].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,30).map(([value,count])=>`<button data-stat-filter="employer" data-stat-value="${esc(value)}"><span>${esc(value)}</span><b>${count}</b></button>`).join("");
    else content=(kind==="sponsorship"?sponsored:recent).map((row)=>`<button class="job176" data-stat-job="${row.id}"><span><b>${esc(row.title)}</b><small>${esc(row.employer)} · ${esc(row.location||row.city||"Location not stated")}</small></span><em>${kind==="sponsorship"?(row.sponsorship_status==="confirmed"?"Confirmed":"Mentioned"):date(row.published_at)}</em></button>`).join("");
    dialog.innerHTML=`<section><header><div><small>UPDATED WITH THE DAILY NHS JOBS IMPORT</small><h2>${esc(title)}</h2><p>${esc(description)}</p></div><button data-stat-close aria-label="Close ${esc(title)}">×</button></header><div class="nhsJobsStatResults176">${content||"<p>No current jobs are available in this category.</p>"}</div></section>`;
    dialog.querySelector("[data-stat-close]").onclick=()=>dialog.close();
    dialog.querySelectorAll("[data-stat-job]").forEach((button)=>button.onclick=()=>{const row=view.rows.find((item)=>item.id===button.dataset.statJob);dialog.close();if(row)openDetail(row);});
    dialog.querySelectorAll("[data-stat-filter]").forEach((button)=>button.onclick=()=>{view.filters={...EMPTY_FILTERS,[button.dataset.statFilter]:button.dataset.statValue};view.visible=24;dialog.close();render();root().querySelector(".nhsJobsMain148")?.scrollIntoView({behavior:"smooth",block:"start"});});
    dialog.showModal();
  }
  async function openDetail(row,{pushRoute=true,returnUrl}={}){
    const dialog=detailDialog(),source=row.canonical_url||row.source_url||row.application_url,applyFallback=row.application_url||source,isAdzuna=row.source_name==="ADZUNA",isReed=row.source_name==="REED"||isAdzuna,isExternal=isReed;
    view.detailReturn=returnUrl||`${location.pathname}${location.search}`;
    if(pushRoute&&location.pathname!==`/jobs/${row.id}`)history.pushState({btvJobDetail:row.id},"",`/jobs/${row.id}`);
    dialog.innerHTML=`<article><button class="nhsJobDetailClose150" data-close-job-detail aria-label="Close job details">×</button><div class="nhsJobDetailLoading150"><b>Loading the full job advert...</b><p>Retrieving duties, requirements and employer details.</p></div></article>`;
    if(!dialog.open)dialog.showModal();
    dialog.querySelector("[data-close-job-detail]").onclick=()=>closeDetail(true);
    let details={};
    try{if(isReed)details={title:row.title,employer:row.employer,overview:row.summary,jobDescription:row.description,contract:row.contract_type||row.employment_type,closingDate:date(row.closing_at),datePosted:date(row.published_at),salary:salaryText(row),applyUrl:applyFallback,sourceUrl:source};else{let advertId="";try{advertId=new URL(source,location.origin).pathname.match(/\/jobadvert\/([^/]+)/i)?.[1]||"";}catch{}advertId=advertId||row.external_reference||row.external_id||"";const response=await fetch(`/api/job-details?id=${encodeURIComponent(advertId)}`);const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Details could not be loaded.");details=payload;}}catch(error){details={overview:row.summary,mainDuties:"The full duties and person specification could not be retrieved at this moment.",error:error.message,applyUrl:applyFallback,sourceUrl:source};}
    const apply=applicationUrl(row,details.applyUrl||applyFallback),locationText=details.address||row.location||row.city||"Not stated",sponsorship=row.sponsorship_status==="confirmed"?"Confirmed in the source wording":row.sponsorship_status==="may_be_available"?"May be available — confirm in the advert":"Not stated — confirm with the employer";
    dialog.innerHTML=`<article><button class="nhsJobDetailClose150" data-close-job-detail aria-label="Close job details">×</button><header><span>${esc(LABELS[row.profession]||LABELS.other)} · ${isReed?"REED":"NHS JOBS"}</span><h1>${esc(details.title||row.title)}</h1><p>${esc(details.employer||row.employer)}</p><div>${row.band?`<b>${esc(row.band)}</b>`:""}<b>${esc(row.employment_type||details.contract||"Contract not stated")}</b>${isReed?`<b>${esc(row.work_pattern||row.working_pattern||"Working pattern not stated")}</b>`:""}</div></header><div class="nhsJobDetailActions150"><button data-close-job-detail>← Back to listings</button>${apply?sourceApplyLink(apply,isReed):""}</div><dl class="nhsJobDetailFacts150"><div><dt>Salary</dt><dd>${esc(details.salary||salaryText(row))}</dd></div><div><dt>Location</dt><dd>${esc(locationText)}</dd></div><div><dt>${isReed?"Expiration date":"Closing date"}</dt><dd>${esc(details.closingDate||date(row.closing_at))}</dd></div><div><dt>Reference</dt><dd>${esc(details.reference||row.external_reference||row.external_id||"Not stated")}</dd></div><div><dt>Published</dt><dd>${esc(details.datePosted||date(row.published_at))}</dd></div><div><dt>Sponsorship</dt><dd>${esc(sponsorship)}</dd></div></dl>${details.error?`<p class="nhsJobDetailNotice150">${esc(details.error)} You can still continue to the official advert.</p>`:""}${detailSection("Job summary",details.overview||row.summary)}${detailSection("Main duties of the job",details.mainDuties)}${detailSection("Job description and responsibilities",details.jobDescription)}${detailSection("About the employer",details.aboutEmployer)}${detailSection("Person specification",details.personSpecification)}${detailSection("Additional information",details.additionalInformation)}${isReed?"":`<section><h2>Employer contact</h2><p>${detailText([details.contactRole,details.contactName,details.contactEmail,details.contactPhone].filter(Boolean).join("\n")||"See the official advert for employer contact details.")}</p></section>`}<footer><p>Your application continues on the original ${isReed?"Reed":"NHS Jobs"} page, where the recruiting employer receives it.</p>${apply?sourceApplyLink(apply,isReed):""}${details.sourceUrl?`<a href="${esc(details.sourceUrl)}" target="_blank" rel="noopener noreferrer">View original advert</a>`:""}</footer></article>`;
    if(isAdzuna)dialog.innerHTML=dialog.innerHTML.replace(/REED/g,"Jobs by Adzuna").replace(/Reed/g,"Adzuna");
    dialog.querySelectorAll("[data-close-job-detail]").forEach((button)=>button.onclick=()=>closeDetail(true));
  }

  function card(row){
    const apply=row.application_url||row.canonical_url||row.source_url,family=LABELS[row.profession]||LABELS.other,sponsorship=row.sponsorship_status==="confirmed"?"Sponsorship confirmed":row.sponsorship_status==="may_be_available"?"Sponsorship may be available":"",detailUrl=`/jobs/${encodeURIComponent(row.id)}`,isAdzuna=row.source_name==="ADZUNA",isReed=row.source_name==="REED"||isAdzuna,isExternal=isReed;
    return `<article class="nhsJob148" data-select-nhs-job="${row.id}" tabindex="0" role="link" aria-label="View ${esc(row.title)}"><div class="nhsJobTop148"><div><span>${esc(family)} · ${isReed?"REED":"NHS Jobs"}</span><h3><a href="${detailUrl}" data-view-nhs-job="${row.id}">${esc(row.title)}</a></h3><p class="nhsJobEmployer148">${esc(row.employer)}</p></div><div class="nhsJobBadges148">${isReed?"<b>Reed</b>":row.band?`<b>${esc(row.band)}</b>`:""}${sponsorship?`<b class="sponsor148">${esc(sponsorship)}</b>`:""}</div></div><p class="nhsJobSummary148">${esc(row.summary||"Open the vacancy details for the job description and person specification.")}</p><dl class="nhsJobFacts148"><div><dt>Location</dt><dd>${esc(row.location||row.city||"Not stated")}</dd></div><div><dt>Salary</dt><dd>${esc(salaryText(row))}</dd></div><div><dt>Contract</dt><dd>${esc(row.contract_type||row.employment_type||"Not stated")}${isReed?` · ${esc(row.work_pattern||row.working_pattern||"Working pattern not stated")}`:""}</dd></div><div><dt>${isReed?"Expiration date":"Closing date"}</dt><dd>${date(row.closing_at)}</dd></div></dl><div class="nhsJobActions148"><a href="${detailUrl}" data-view-nhs-job="${row.id}">View details</a>${apply?`<a class="secondary150" href="${esc(apply)}" target="_blank" rel="noopener noreferrer">${isReed?"View and apply":"Apply"}</a>`:""}<button data-save-nhs-job="${row.id}">${view.saved.has(row.id)?"Saved ✓":"Save job"}</button><small>${isReed?"Source: Reed":`Ref: ${esc(row.external_reference||row.external_id||"Not stated")}`}</small></div></article>`;
  }

  function render(){
    if(!root()||!view.loaded)return;const matches=filtered(),families=[...new Set(view.rows.map((row)=>row.profession).filter(Boolean))].sort((a,b)=>(LABELS[a]||a).localeCompare(LABELS[b]||b)),employers=new Set(view.rows.map((row)=>row.employer).filter(Boolean)).size,sponsored=view.rows.filter((row)=>row.sponsorship_status==="confirmed"||row.sponsorship_status==="may_be_available").length;
    root().innerHTML=`<section class="nhsJobsHero148"><picture class="nhsJobsHeroMedia148" aria-hidden="true"><source media="(max-width: 640px)" srcset="assets/jobs/nhs-jobs-hero-mobile.webp"><img src="assets/jobs/nhs-jobs-hero.webp" alt="" width="1600" height="730" decoding="async" fetchpriority="high"></picture><div class="nhsJobsHeroCopy148"><span class="nhsJobsHeroBadge148">UPDATED DIRECTLY FROM NHS JOBS</span><h2>Find your next role across the NHS.</h2><p>Browse every imported NHS profession in one consistent layout. Use the filters to narrow the list to the work, employer and location that suit you.</p></div><div class="nhsJobsHeroStats148">${heroStat("vacancies",view.rows.length,"live vacancies","M1 19 C18 19 22 15 31 17 S43 8 55 13 66 16 74 7 87 10 99 16 108 5 121 8 135 17 144 9 159 11")}${heroStat("families",families.length,"staff families","M1 18 C20 18 28 17 39 18 51 19 59 12 71 14 83 17 91 8 104 10 116 15 125 4 138 7 148 17 159 15")}${heroStat("employers",employers,"employers","M1 18 C8 18 10 8 17 14 25 22 31 5 42 10 55 19 61 7 72 11 84 15 93 3 104 5 116 21 123 14 137 14 146 8 159 11")}${heroStat("sponsorship",sponsored,"sponsorship mentioned","M1 19 C21 19 30 18 42 18 55 17 65 13 77 15 89 18 98 17 108 18 118 8 131 10 143 15 151 15 159 12",Boolean(view.filters.sponsorship))}</div></section><div class="nhsJobsLayout148"><aside class="nhsJobsFilters148"><span>REFINE RESULTS</span><h2>Job filters</h2><form data-nhs-job-filters><label>Keywords<input name="search" type="search" placeholder="Job title, skill or reference"></label><label>Profession / staff family<select name="profession"><option value="">All professions</option>${families.map((value)=>`<option value="${esc(value)}">${esc(LABELS[value]||value)}</option>`).join("")}</select></label><label>Location<input name="location" placeholder="Town, city or region"></label><label>Employer<input name="employer" placeholder="Employer name"></label><label>Contract type<select name="contract"><option value="">All contracts</option><option>Permanent</option><option>Fixed-Term</option><option>Bank</option><option>Apprenticeship</option><option>Locum</option></select></label><label>NHS band<select name="band"><option value="">All bands</option>${[2,3,4,5,6,7,8,9].map((band)=>`<option value="band ${band}">Band ${band}</option>`).join("")}</select></label><div class="nhsJobsChecks148"><label><input name="sponsorship" type="checkbox"> Sponsorship mentioned</label></div><div class="nhsJobsFilterActions148"><button type="submit">Apply filters</button><button type="reset">Clear</button></div></form></aside><section class="nhsJobsMain148"><div class="nhsJobsToolbar148"><div><span>LIVE VACANCIES</span><h2>${matches.length} matching job${matches.length===1?"":"s"}</h2></div><small>Last refreshed ${view.checkedAt?date(view.checkedAt):"today"}</small></div><div class="nhsJobList148">${matches.slice(0,view.visible).map(card).join("")||'<div class="nhsJobsState148"><b>No matching jobs</b><p>Clear or adjust the filters to see more NHS vacancies.</p></div>'}</div>${view.visible<matches.length?'<button class="nhsJobsMore148" data-more-nhs-jobs>Load more jobs</button>':""}<p class="nhsJobsSource148">Vacancies are updated automatically every day from <a href="https://www.jobs.nhs.uk" target="_blank" rel="noopener noreferrer">NHS Jobs</a>. Always confirm the full advert, closing date, eligibility and sponsorship wording with the recruiting employer before applying.</p></section></div>`;
    view.rows.filter((row)=>row.source_name==="ADZUNA").forEach((row)=>{const card=root().querySelector(`[data-select-nhs-job="${row.id}"]`);if(!card)return;const source=card.querySelector(".nhsJobTop148 span");if(source)source.textContent=source.textContent.replace(/REED/g,"Jobs by Adzuna");const badge=card.querySelector(".nhsJobBadges148 b");if(badge&&!badge.classList.contains("sponsor148"))badge.textContent="Jobs by Adzuna";const note=card.querySelector(".nhsJobActions148 small");if(note)note.textContent="Jobs by Adzuna";});
    const attribution=root().querySelector(".nhsJobsSource148");if(attribution)attribution.innerHTML='Vacancies are updated automatically every day from NHS Jobs, Reed and <a href="https://www.adzuna.co.uk" target="_blank" rel="noopener noreferrer">Jobs by Adzuna</a>. Always confirm the full advert, closing date, eligibility and sponsorship wording with the recruiting employer before applying.';
    const form=root().querySelector("[data-nhs-job-filters]");
    Object.entries(view.filters).forEach(([name,value])=>{const control=form?.elements.namedItem(name);if(!control)return;if(control.type==="checkbox")control.checked=Boolean(value);else control.value=value;});
    wire();
  }

  function wire(){const form=root().querySelector("[data-nhs-job-filters]");form?.addEventListener("submit",(event)=>{event.preventDefault();view.filters={...EMPTY_FILTERS,...values()};view.visible=24;render();});form?.addEventListener("reset",()=>setTimeout(()=>{view.filters={...EMPTY_FILTERS};view.visible=24;render();},0));root().querySelectorAll("[data-jobs-stat]").forEach((button)=>button.addEventListener("click",()=>openStatDialog(button.dataset.jobsStat)));root().querySelector("[data-more-nhs-jobs]")?.addEventListener("click",()=>{view.visible+=24;render();});root().querySelectorAll("[data-save-nhs-job]").forEach((button)=>button.addEventListener("click",()=>toggleSave(button.dataset.saveNhsJob)));root().querySelectorAll("[data-view-nhs-job]").forEach((link)=>link.addEventListener("click",(event)=>{event.preventDefault();const row=view.rows.find((item)=>item.id===link.dataset.viewNhsJob);if(row)openDetail(row);}));root().querySelectorAll("[data-select-nhs-job]").forEach((tile)=>{const open=(event)=>{if(event.target.closest("a,button,input,select,textarea,label"))return;const row=view.rows.find((item)=>item.id===tile.dataset.selectNhsJob);if(row)openDetail(row);};tile.addEventListener("click",open);tile.addEventListener("keydown",(event)=>{if((event.key==="Enter"||event.key===" ")&&!event.target.closest("a,button,input,select,textarea,label")){event.preventDefault();open(event);}});});}
  async function toggleSave(jobId){const {data:auth}=await db().auth.getUser();if(!auth?.user)return;if(view.saved.has(jobId)){const result=await db().from("btv_saved_jobs").delete().eq("user_id",auth.user.id).eq("job_id",jobId);if(result.error)return alert(result.error.message);view.saved.delete(jobId);}else{const result=await db().from("btv_saved_jobs").upsert({user_id:auth.user.id,job_id:jobId});if(result.error)return alert(result.error.message);view.saved.add(jobId);}render();}

  window.btvOpenJobDetail=(row,options)=>openDetail(row,options);window.renderJobs=()=>load(false);const originalOpen=window.openScreen;if(typeof originalOpen==="function")window.openScreen=function(id,...args){const result=originalOpen.call(this,id,...args);if(id==="jobs")load(false);return result;};document.addEventListener("click",(event)=>{if(event.target.closest('[data-open="jobs"]'))setTimeout(()=>load(false),0);});window.addEventListener("btv:destination-changed",(event)=>{const key=String(event.detail?.country||destinationKey()).toLowerCase();if(key!=="uk"){view.rows=[];view.loaded=false;if(root())root().innerHTML=key==="us"?"":'<div class="nhsJobsState148"><b>UK jobs are not shown for this destination.</b><p>Change your preferred destination to the United Kingdom to browse NHS vacancies.</p></div>';}upgradeEntry();});window.addEventListener("popstate",()=>{if(!location.pathname.startsWith("/jobs/"))closeDetail(false);});upgradeEntry();const directJob=location.pathname.match(/^\/jobs\/([0-9a-f-]{36})$/i)?.[1];if(location.pathname==="/jobs")setTimeout(()=>{window.openScreen?.("jobs");load(false);},0);else if(directJob)setTimeout(async()=>{window.openScreen?.("jobs");try{const result=await db().from("btv_jobs").select("*").eq("id",directJob).single();if(result.error)throw result.error;openDetail(result.data,{pushRoute:false,returnUrl:"/jobs"});}catch{location.replace("/jobs");}},0);
})();
