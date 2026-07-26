(() => {
  "use strict";
  if (window.__btvJobsCentre148) return;
  window.__btvJobsCentre148 = true;
  const LABELS = { nurse:"Nursing",midwife:"Midwifery",both:"Nursing and midwifery",medical_dental:"Medical and dental",allied_health:"Allied health professionals",pharmacy:"Pharmacy",scientific_technical:"Healthcare science and technical",healthcare_support:"Healthcare support",administrative_clerical:"Administrative and clerical",estates_facilities:"Estates and facilities",ambulance:"Ambulance services",social_care:"Social care",other:"Other NHS professions" };
  const EMPTY_FILTERS = { search:"", profession:"", location:"", employer:"", contract:"", band:"", sponsorship:"" };
  const view = { rows:[], saved:new Set(), visible:24, loaded:false, loading:false, checkedAt:null, filters:{...EMPTY_FILTERS} };
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
  const date = (v) => v ? new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "Not stated";
  const db = () => window.btvSupabase, root = () => document.getElementById("jobsContent");

  function upgradeEntry(){
    const section=document.getElementById("jobs"); if(section)section.classList.add("nhsJobs148");
    const eyebrow=section?.querySelector(".pageTitle span"), heading=section?.querySelector(".pageTitle h1");
    if(eyebrow)eyebrow.textContent="LIVE NHS VACANCIES"; if(heading)heading.textContent="Jobs";
    document.querySelectorAll('[data-open="jobs"]').forEach((button)=>{const label=button.querySelector("span"),small=button.querySelector("small");if(label)label.textContent="NHS jobs";if(small)small.textContent="All professions and employers";});
  }

  async function fetchAll(){
    const rows=[];
    for(let from=0;from<3000;from+=500){
      const result=await db().from("btv_jobs").select("*").eq("status","published").is("expired_at",null).eq("source_name","NHS Jobs").eq("opportunity_type","job").order("published_at",{ascending:false}).range(from,from+499);
      if(result.error)throw result.error; rows.push(...(result.data||[])); if((result.data||[]).length<500)break;
    }
    return rows;
  }

  async function load(force=false){
    upgradeEntry(); if(!root()||view.loading||(view.loaded&&!force))return render(); view.loading=true;
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

  function card(row){
    const url=row.canonical_url||row.source_url||row.application_url,family=LABELS[row.profession]||LABELS.other,sponsorship=row.sponsorship_status==="confirmed"?"Sponsorship confirmed":row.sponsorship_status==="may_be_available"?"Sponsorship may be available":"";
    return `<article class="nhsJob148"><div class="nhsJobTop148"><div><span>${esc(family)} · NHS Jobs</span><h3>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(row.title)}</a>`:esc(row.title)}</h3><p class="nhsJobEmployer148">${esc(row.employer)}</p></div><div class="nhsJobBadges148">${row.band?`<b>${esc(row.band)}</b>`:""}${sponsorship?`<b class="sponsor148">${esc(sponsorship)}</b>`:""}</div></div><p class="nhsJobSummary148">${esc(row.summary||"Open the official advert for the full job description and person specification.")}</p><dl class="nhsJobFacts148"><div><dt>Location</dt><dd>${esc(row.location||row.city||"Not stated")}</dd></div><div><dt>Salary</dt><dd>${esc(row.salary_text||"Not stated")}</dd></div><div><dt>Contract</dt><dd>${esc(row.employment_type||"Not stated")}</dd></div><div><dt>Closing date</dt><dd>${date(row.closing_at)}</dd></div></dl><div class="nhsJobActions148">${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">View job and apply ↗</a>`:""}<button data-save-nhs-job="${row.id}">${view.saved.has(row.id)?"Saved ✓":"Save job"}</button><small>Ref: ${esc(row.external_reference||row.external_id||"Not stated")}</small></div></article>`;
  }

  function render(){
    if(!root()||!view.loaded)return;const matches=filtered(),families=[...new Set(view.rows.map((row)=>row.profession).filter(Boolean))].sort((a,b)=>(LABELS[a]||a).localeCompare(LABELS[b]||b)),employers=new Set(view.rows.map((row)=>row.employer).filter(Boolean)).size,sponsored=view.rows.filter((row)=>row.sponsorship_status==="confirmed"||row.sponsorship_status==="may_be_available").length;
    root().innerHTML=`<section class="nhsJobsHero148"><div><span>UPDATED DIRECTLY FROM NHS JOBS</span><h2>Find your next role across the NHS.</h2><p>Browse every imported NHS profession in one consistent layout. Use the filters to narrow the list to the work, employer and location that suit you.</p></div><div class="nhsJobsHeroStats148"><article><b>${view.rows.length}</b><small>live vacancies</small></article><article><b>${families.length}</b><small>staff families</small></article><article><b>${employers}</b><small>employers</small></article><article><b>${sponsored}</b><small>sponsorship mentioned</small></article></div></section><div class="nhsJobsLayout148"><aside class="nhsJobsFilters148"><span>REFINE RESULTS</span><h2>Job filters</h2><form data-nhs-job-filters><label>Keywords<input name="search" type="search" placeholder="Job title, skill or reference"></label><label>Profession / staff family<select name="profession"><option value="">All professions</option>${families.map((value)=>`<option value="${esc(value)}">${esc(LABELS[value]||value)}</option>`).join("")}</select></label><label>Location<input name="location" placeholder="Town, city or region"></label><label>Employer<input name="employer" placeholder="Employer name"></label><label>Contract type<select name="contract"><option value="">All contracts</option><option>Permanent</option><option>Fixed-Term</option><option>Bank</option><option>Apprenticeship</option><option>Locum</option></select></label><label>NHS band<select name="band"><option value="">All bands</option>${[2,3,4,5,6,7,8,9].map((band)=>`<option value="band ${band}">Band ${band}</option>`).join("")}</select></label><div class="nhsJobsChecks148"><label><input name="sponsorship" type="checkbox"> Sponsorship mentioned</label></div><div class="nhsJobsFilterActions148"><button type="submit">Apply filters</button><button type="reset">Clear</button></div></form></aside><section class="nhsJobsMain148"><div class="nhsJobsToolbar148"><div><span>LIVE VACANCIES</span><h2>${matches.length} matching job${matches.length===1?"":"s"}</h2></div><small>Last refreshed ${view.checkedAt?date(view.checkedAt):"today"}</small></div><div class="nhsJobList148">${matches.slice(0,view.visible).map(card).join("")||'<div class="nhsJobsState148"><b>No matching jobs</b><p>Clear or adjust the filters to see more NHS vacancies.</p></div>'}</div>${view.visible<matches.length?'<button class="nhsJobsMore148" data-more-nhs-jobs>Load more jobs</button>':""}<p class="nhsJobsSource148">Vacancies are updated automatically every day from <a href="https://www.jobs.nhs.uk" target="_blank" rel="noopener noreferrer">NHS Jobs</a>. Always confirm the full advert, closing date, eligibility and sponsorship wording with the recruiting employer before applying.</p></section></div>`;wire();
    const form=root().querySelector("[data-nhs-job-filters]");
    Object.entries(view.filters).forEach(([name,value])=>{const control=form?.elements.namedItem(name);if(!control)return;if(control.type==="checkbox")control.checked=Boolean(value);else control.value=value;});
    wire();
  }

  function wire(){const form=root().querySelector("[data-nhs-job-filters]");form?.addEventListener("submit",(event)=>{event.preventDefault();view.filters={...EMPTY_FILTERS,...values()};view.visible=24;render();});form?.addEventListener("reset",()=>setTimeout(()=>{view.filters={...EMPTY_FILTERS};view.visible=24;render();},0));root().querySelector("[data-more-nhs-jobs]")?.addEventListener("click",()=>{view.visible+=24;render();});root().querySelectorAll("[data-save-nhs-job]").forEach((button)=>button.addEventListener("click",()=>toggleSave(button.dataset.saveNhsJob)));}
  async function toggleSave(jobId){const {data:auth}=await db().auth.getUser();if(!auth?.user)return;if(view.saved.has(jobId)){const result=await db().from("btv_saved_jobs").delete().eq("user_id",auth.user.id).eq("job_id",jobId);if(result.error)return alert(result.error.message);view.saved.delete(jobId);}else{const result=await db().from("btv_saved_jobs").upsert({user_id:auth.user.id,job_id:jobId});if(result.error)return alert(result.error.message);view.saved.add(jobId);}render();}

  window.renderJobs=()=>load(false);const originalOpen=window.openScreen;if(typeof originalOpen==="function")window.openScreen=function(id,...args){const result=originalOpen.call(this,id,...args);if(id==="jobs")load(false);return result;};document.addEventListener("click",(event)=>{if(event.target.closest('[data-open="jobs"]'))setTimeout(()=>load(false),0);});upgradeEntry();if(location.pathname==="/jobs")setTimeout(()=>{window.openScreen?.("jobs");load(false);},0);
})();
