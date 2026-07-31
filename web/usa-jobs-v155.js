(() => {
  "use strict";
  if (window.__btvUsaJobs155) return;
  window.__btvUsaJobs155 = true;
  const state = { destination: null, rows: [], total: 0, recent: 0, saved: new Set(), page: 1, filters: {}, loading: false, dashboardLoaded: false };
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const money = (row) => row.salary_min || row.salary_max ? `${row.salary_currency || "USD"} ${Number(row.salary_min || row.salary_max).toLocaleString("en-US")}${row.salary_max && row.salary_max !== row.salary_min ? ` – ${Number(row.salary_max).toLocaleString("en-US")}` : ""}${row.salary_period ? ` / ${row.salary_period.toLowerCase()}` : ""}` : "Not stated";
  const date = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not stated";
  const sponsorship = (value) => ({ confirmed: "Sponsorship confirmed", not_offered: "Sponsorship not offered", not_applicable: "Citizenship requirement applies", unclear: "Sponsorship status not confirmed" })[value] || "Sponsorship status not confirmed";
  const db = () => window.btvSupabase;
  const sourceLabel = (row) => row.source_name === "ADZUNA" ? "Jobs by Adzuna" : "USAJOBS";
  const applyLabel = (row) => row.source_name === "ADZUNA" ? "View and apply" : "View and apply on USAJOBS";

  async function destination(force = false) {
    if (state.destination && !force) return state.destination;
    const auth = await db()?.auth.getUser();
    if (!auth?.data?.user) return null;
    const result = await db().from("profiles").select("destination_country").eq("id", auth.data.user.id).maybeSingle();
    state.destination = result.data?.destination_country || null;
    return state.destination;
  }

  async function api(params = {}) {
    const session = await db().auth.getSession(), token = session.data.session?.access_token || "";
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined));
    const response = await fetch(`/api/usa-jobs?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error || "USA jobs could not be loaded."), { code: body.code, status: response.status });
    return body;
  }

  function card(row, compact = false) {
    return `<article class="usaJob155"><span>${esc(row.nursing_specialty || "Nursing")} · ${esc(sourceLabel(row))}</span><h3><a href="/jobs/usa/${row.id}" data-usa-detail="${row.id}">${esc(row.job_title)}</a></h3><strong>${esc(row.agency || row.employer_name)}</strong>${row.department ? `<small>${esc(row.department)}</small>` : ""}<div class="usaBadges155"><b>${esc(row.remote_status === "not_stated" ? "Workplace arrangement not stated" : row.remote_status)}</b><b>${esc(row.schedule || row.employment_type || "Schedule not stated")}</b></div>${compact ? "" : `<p>${esc(row.description || "Open the vacancy for the complete job description and qualifications.")}</p>`}<dl class="usaFacts155"><div><dt>Location</dt><dd>${esc(row.location_display || [row.city, row.state].filter(Boolean).join(", ") || "United States")}</dd></div><div><dt>Salary</dt><dd>${esc(money(row))}</dd></div><div><dt>Date posted</dt><dd>${esc(date(row.opening_date || row.date_posted))}</dd></div><div><dt>Closing date</dt><dd>${esc(date(row.closing_date))}</dd></div><div class="wide"><dt>Who may apply</dt><dd>${esc(row.who_may_apply || "Review the original announcement")}</dd></div></dl><div class="usaActions155"><button data-usa-detail="${row.id}">View details</button><a href="${esc(row.canonical_application_url)}" target="_blank" rel="noopener noreferrer">${esc(applyLabel(row))} ↗</a><button data-save-usa="${row.id}">${state.saved.has(row.id) ? "Saved ✓" : "Save job"}</button></div></article>`;
  }

  async function loadSaved() {
    const auth = await db().auth.getUser();
    if (!auth.data.user) return;
    const result = await db().from("btv_usa_saved_jobs").select("job_id").eq("user_id", auth.data.user.id);
    if (!result.error) state.saved = new Set((result.data || []).map((row) => row.job_id));
  }

  function filterValues(root) {
    const form = root.querySelector("[data-usa-filters]");
    return form ? Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value).trim()])) : {};
  }

  async function loadListings(root, filters = state.filters) {
    if (state.loading) return;
    state.loading = true;
    const list = root.querySelector("[data-usa-results]");
    if (list) list.innerHTML = '<div class="usaState155"><b>Loading official USA nursing vacancies…</b></div>';
    try {
      const result = await api({ ...filters, page: state.page, limit: 40 });
      state.rows = result.jobs || []; state.total = result.total || 0; state.recent = result.recently_added || 0;
      drawListings(root);
    } catch (error) {
      if (list) list.innerHTML = `<div class="usaState155"><b>USA jobs could not be loaded</b><p>${esc(error.message)}</p></div>`;
    } finally { state.loading = false; }
  }

  function drawListings(root) {
    const list = root.querySelector("[data-usa-results]"), count = root.querySelector("[data-usa-count]"), recent = root.querySelector("[data-usa-recent]");
    if (count) count.textContent = state.total; if (recent) recent.textContent = state.recent;
    if (list) list.innerHTML = state.rows.length ? state.rows.map((row) => card(row)).join("") : '<div class="usaState155"><b>No matching USA nursing jobs</b><p>Clear or adjust the filters. Vacancies appear after the authorised USAJOBS importer completes successfully.</p></div>';
    wire(root);
  }

  function officialSearch() {
    return `<aside class="globalOfficialJobs170 usaOfficialJobs240" aria-label="Official United States job search"><div class="globalOfficialJobsIcon170" aria-hidden="true">&#10003;</div><div><span>LIVE OFFICIAL VACANCIES</span><h3>USAJOBS Nursing</h3><p>Browse current federal nursing and healthcare vacancies directly from the official United States government job service while the authorised feed synchronises.</p></div><a href="https://nurse.usajobs.gov/search/results/" target="_blank" rel="noopener noreferrer">Search current USA vacancies <span aria-hidden="true">&#8599;</span></a></aside>`;
  }

  function pageMarkup() {
    return `<div class="usaJobs155"><section class="usaHero155"><div><span>OFFICIAL FEDERAL VACANCIES · UNITED STATES</span><h2>USA Nursing Jobs</h2><p>A separate nursing vacancy service for members whose preferred destination is the United States. Vacancies are synchronised daily from the official USAJOBS API.</p></div><div class="usaStats155"><article><b data-usa-count>—</b><small>matching vacancies</small></article><article><b data-usa-recent>—</b><small>added in 7 days</small></article><article><b>Daily</b><small>official synchronisation</small></article><article><b>USD</b><small>salary currency</small></article></div></section><aside class="usaEligibility155"><strong>Check applicant eligibility before applying</strong><p>USAJOBS primarily lists United States federal vacancies. Eligibility varies and many positions are restricted to US citizens, permanent residents, veterans or other specified applicant groups. Always review the ‘Who may apply’ section before applying.</p></aside>${officialSearch()}<div class="usaLayout155"><aside class="usaFilters155"><div class="usaToolbar155"><div><span>REFINE RESULTS</span><h2>Filters</h2></div></div><form data-usa-filters><label>Keyword<input name="q" type="search" placeholder="ICU, practitioner, mental health"></label><label>State<input name="state" placeholder="e.g. Texas"></label><label>City<input name="city" placeholder="City"></label><label>Agency<input name="agency" placeholder="Agency or department"></label><label>Nursing specialty<input name="specialty" placeholder="Specialty"></label><label>Full-time or part-time<select name="schedule"><option value="">Any schedule</option><option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Intermittent">Intermittent</option><option value="Shift work">Shift work</option></select></label><label>Minimum salary<input name="salary_min" type="number" min="0" step="1000" placeholder="USD"></label><label>Remote or on-site<select name="remote"><option value="">Any arrangement</option><option value="remote">Remote</option><option value="hybrid">Hybrid / telework</option><option value="onsite">On-site</option></select></label><label>Closing date<select name="closing_days"><option value="">Any closing date</option><option value="7">Within 7 days</option><option value="14">Within 14 days</option><option value="30">Within 30 days</option></select></label><label>Applicant eligibility<input name="eligibility" placeholder="Public, veterans, citizens"></label><label>Date posted<select name="posted_days"><option value="">Any date</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label><div class="usaFilterActions155"><button>Apply filters</button><button type="reset">Clear</button></div></form></aside><main class="usaMain155"><div class="usaToolbar155"><div><span>USA NURSING VACANCIES</span><h2><span data-usa-count>0</span> matching jobs</h2></div><label><input type="checkbox" data-usa-alerts> Alert me to USA matches</label></div><div class="usaGrid155" data-usa-results></div><p class="usaSource155">Official source: USAJOBS.gov. Beyond the Visa is an independent information service, not the employer, recruiter or a United States federal agency. Visa sponsorship is shown only when explicitly stated by the source.</p></main></div></div>`;
  }

  async function renderJobs() {
    if (await destination() !== "us") return false;
    const root = document.getElementById("jobsContent"); if (!root) return true;
    document.querySelector("#jobs .pageTitle span")?.replaceChildren(document.createTextNode("UNITED STATES CAREER CENTRE"));
    document.querySelector("#jobs .pageTitle h1")?.replaceChildren(document.createTextNode("USA Nursing Jobs"));
    root.innerHTML = pageMarkup();
    await Promise.all([loadSaved(), loadAlertPreference(root)]);
    await loadListings(root);
    return true;
  }

  async function loadAlertPreference(root) {
    const auth = await db().auth.getUser(); if (!auth.data.user) return;
    const result = await db().from("btv_usa_job_alert_preferences").select("enabled").eq("user_id", auth.data.user.id).maybeSingle();
    const input = root.querySelector("[data-usa-alerts]"); if (input) input.checked = result.data?.enabled !== false;
  }

  async function toggleAlert(input) {
    const auth = await db().auth.getUser(); if (!auth.data.user) return;
    const result = await db().from("btv_usa_job_alert_preferences").upsert({ user_id: auth.data.user.id, enabled: input.checked, updated_at: new Date().toISOString() });
    if (result.error) { input.checked = !input.checked; alert(result.error.message); }
  }

  async function toggleSave(id, root) {
    const auth = await db().auth.getUser(); if (!auth.data.user) return;
    const result = state.saved.has(id) ? await db().from("btv_usa_saved_jobs").delete().eq("user_id", auth.data.user.id).eq("job_id", id) : await db().from("btv_usa_saved_jobs").insert({ user_id: auth.data.user.id, job_id: id });
    if (result.error) return alert(result.error.message);
    state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id); drawListings(root);
  }

  function dialog() {
    let element = document.querySelector("[data-usa-job-detail]");
    if (!element) { element = document.createElement("dialog"); element.className = "usaJobDetail155"; element.dataset.usaJobDetail = ""; document.body.append(element); element.addEventListener("click", (event) => { if (event.target === element) closeDetail(); }); }
    return element;
  }

  function closeDetail() { const element = dialog(); if (element.open) element.close(); if (location.pathname.startsWith("/jobs/usa/")) history.replaceState({}, "", "/jobs/usa"); }
  const section = (title, value) => value ? `<section><h2>${esc(title)}</h2><p>${esc(value)}</p></section>` : "";
  async function openDetail(id, push = true) {
    const element = dialog(); element.innerHTML = '<article><div class="usaState155"><b>Loading the full USA vacancy…</b></div></article>'; if (!element.open) element.showModal();
    try {
      const { job } = await api({ id }); if (push && location.pathname !== `/jobs/usa/${id}`) history.pushState({ usaJob: id }, "", `/jobs/usa/${id}`);
      element.innerHTML = `<article><button class="usaJobDetailClose155" data-close-usa aria-label="Close">×</button><header><span>${esc(job.nursing_specialty || "NURSING")} · ${esc(job.attribution_text || sourceLabel(job))}</span><h1>${esc(job.job_title)}</h1><p>${esc(job.agency || job.employer_name)}${job.department ? ` · ${esc(job.department)}` : ""} · ${esc(job.location_display || [job.city, job.state].filter(Boolean).join(", ") || "United States")}</p></header><div class="usaDetailActions155"><button data-close-usa>← Back to USA jobs</button><a href="${esc(job.canonical_application_url)}" target="_blank" rel="noopener noreferrer">${esc(applyLabel(job))} ↗</a></div><dl class="usaDetailFacts155"><div><dt>Salary</dt><dd>${esc(money(job))}</dd></div><div><dt>Schedule</dt><dd>${esc(job.schedule || job.employment_type || "Not stated")}</dd></div><div><dt>Grade</dt><dd>${esc(job.grade || "Not stated")}</dd></div><div><dt>Date posted</dt><dd>${esc(date(job.opening_date || job.date_posted))}</dd></div><div><dt>Closing date</dt><dd>${esc(date(job.closing_date))}</dd></div><div><dt>Remote status</dt><dd>${esc(job.remote_status || "Not stated")}</dd></div></dl>${section("Who may apply", job.who_may_apply)}${section("Job description", job.description)}${section("Qualifications", job.qualifications)}${section("Requirements", job.requirements)}${section("Licence requirements", job.licence_requirements)}${section("Sponsorship evidence", job.sponsorship_evidence || (job.visa_sponsorship_status === "unclear" ? "Sponsorship status not confirmed. Check the original vacancy before applying." : ""))}<footer><p>${esc(job.attribution_text || sourceLabel(job))}. Beyond the Visa is not the employer or recruiter.</p><a href="${esc(job.canonical_application_url)}" target="_blank" rel="noopener noreferrer">${esc(applyLabel(job))} ↗</a><a href="${esc(job.source_job_url)}" target="_blank" rel="noopener noreferrer">View original vacancy</a></footer></article>`;
      element.querySelectorAll("[data-close-usa]").forEach((button) => button.onclick = closeDetail);
    } catch (error) { element.innerHTML = `<article><button data-close-usa>Close</button><div class="usaState155"><b>Vacancy unavailable</b><p>${esc(error.message)}</p></div></article>`; element.querySelector("[data-close-usa]").onclick = closeDetail; }
  }

  function wire(root) {
    const form = root.querySelector("[data-usa-filters]");
    if (form && !form.dataset.wired) { form.dataset.wired = "1"; form.onsubmit = (event) => { event.preventDefault(); state.filters = filterValues(root); state.page = 1; loadListings(root); }; form.onreset = () => setTimeout(() => { state.filters = {}; state.page = 1; loadListings(root); }, 0); }
    root.querySelectorAll("[data-usa-detail]").forEach((target) => target.onclick = (event) => { event.preventDefault(); openDetail(target.dataset.usaDetail); });
    root.querySelectorAll("[data-save-usa]").forEach((target) => target.onclick = () => toggleSave(target.dataset.saveUsa, root));
    const alerts = root.querySelector("[data-usa-alerts]"); if (alerts && !alerts.dataset.wired) { alerts.dataset.wired = "1"; alerts.onchange = () => toggleAlert(alerts); }
  }

  async function renderOpportunity() {
    if (await destination() !== "us") return false;
    const root = document.getElementById("opportunities"); if (!root) return true;
    root.innerHTML = `<div class="pageTitle"><button class="back" data-usa-opportunity-back>←</button><div><span>UNITED STATES OPPORTUNITY CENTRE</span><h1>Recommended USA Nursing Jobs</h1></div></div><div class="usaJobs155 usaOpportunity155"><section class="usaHero155"><div><span>PERSONALISED FOR YOUR DESTINATION</span><h2>Federal nursing opportunities selected for the USA.</h2><p>Recently published and featured vacancies appear first. Use the full USA Jobs Centre for detailed filters.</p><button class="usaLoad155" data-open-usa-jobs>Search all USA jobs</button></div><div class="usaStats155"><article><b data-usa-count>—</b><small>recommended jobs</small></article><article><b data-usa-recent>—</b><small>recently added</small></article></div></section><section class="usaMain155"><div class="usaToolbar155"><div><span>RECOMMENDED FOR YOU</span><h2>USA nursing vacancies</h2></div></div><div class="usaGrid155" data-usa-results></div><p class="usaSource155">Official source: USAJOBS.gov. Applying continues on the original authorised website.</p></section></div>`;
    root.querySelector("[data-usa-opportunity-back]").onclick = () => window.openScreen?.("home"); root.querySelector("[data-open-usa-jobs]").onclick = () => { window.openScreen?.("jobs"); renderJobs(); };
    await loadSaved(); const result = await api({ limit: 12 }); state.rows = result.jobs || []; state.total = result.total || 0; state.recent = result.recently_added || 0; drawListings(root); return true;
  }

  async function dashboardRecommendations() {
    if (state.dashboardLoaded || await destination() !== "us") return;
    const dashboard = document.getElementById("dashboardV3"); if (!dashboard) return;
    state.dashboardLoaded = true;
    try {
      const result = await api({ limit: 3 }); const rows = result.jobs || [];
      let section = document.getElementById("usaDashboardJobs155"); if (!section) { section = document.createElement("section"); section.id = "usaDashboardJobs155"; section.className = "usaDashboard155"; dashboard.append(section); }
      section.innerHTML = `<span>USA JOB RECOMMENDATIONS</span><h2>Recently added for your destination</h2><div class="usaDashboardGrid155">${rows.map((row) => `<button data-dashboard-usa="${row.id}"><b>${esc(row.job_title)}</b><small>${esc(row.employer_name)} · ${esc([row.city, row.state].filter(Boolean).join(", "))}</small></button>`).join("") || '<p>No USA vacancies have been imported yet.</p>'}</div>`;
      section.querySelectorAll("[data-dashboard-usa]").forEach((button) => button.onclick = () => { window.openScreen?.("jobs"); renderJobs().then(() => openDetail(button.dataset.dashboardUsa)); });
    } catch { state.dashboardLoaded = false; }
  }

  function updateEntry() {
    if (state.destination !== "us") return;
    document.querySelectorAll('[data-open="jobs"]').forEach((button) => { const label = button.querySelector("span"), small = button.querySelector("small"); if (label) label.textContent = "USA nursing jobs"; if (small) small.textContent = "Official federal nursing vacancies"; });
  }

  const originalRenderJobs = window.renderJobs;
  window.renderJobs = async function usaAwareRenderJobs(...args) { return await destination() === "us" ? renderJobs() : originalRenderJobs?.apply(this, args); };
  const originalOpen = window.openScreen;
  if (typeof originalOpen === "function") window.openScreen = function usaAwareOpen(id, ...args) { const result = originalOpen.call(this, id, ...args); setTimeout(async () => { if (await destination() !== "us") return; updateEntry(); if (id === "jobs") renderJobs(); if (id === "opportunities") renderOpportunity(); if (id === "home") dashboardRecommendations(); }, 0); return result; };
  document.addEventListener("click", (event) => { const target = event.target.closest("[data-open]"); if (!target) return; setTimeout(async () => { if (await destination() !== "us") return; if (target.dataset.open === "jobs") renderJobs(); if (target.dataset.open === "opportunities") renderOpportunity(); }, 40); });
  window.addEventListener("btv:destination-changed", async () => { state.destination = null; state.dashboardLoaded = false; await destination(true); updateEntry(); });
  window.addEventListener("popstate", () => { if (!location.pathname.startsWith("/jobs/usa/")) { const element = document.querySelector("[data-usa-job-detail]"); if (element?.open) element.close(); } });
  const refreshUsEntry = () => { if (state.destination === "us") { updateEntry(); dashboardRecommendations(); } };
  window.addEventListener("btv:app-content-ready", refreshUsEntry);
  window.addEventListener("btv:home-rendered", refreshUsEntry);
  setTimeout(async () => {
    if (await destination() !== "us") {
      if (location.pathname.startsWith("/jobs/usa")) location.replace("/jobs");
      return;
    }
    updateEntry(); dashboardRecommendations();
    const detailId = location.pathname.match(/^\/jobs\/usa\/([0-9a-f-]{36})$/i)?.[1];
    if (location.pathname.startsWith("/jobs/usa")) { window.openScreen?.("jobs"); await renderJobs(); if (detailId) openDetail(detailId, false); }
  }, 0);
})();
