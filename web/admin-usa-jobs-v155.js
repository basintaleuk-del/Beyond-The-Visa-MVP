(() => {
  "use strict";
  if (window.__btvAdminUsaJobs155) return;
  window.__btvAdminUsaJobs155 = true;
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const db = () => window.btvSupabase;
  let loading = false, cache = { jobs: [], sources: [], runs: [] };
  const style = document.createElement("style");
  style.textContent = ".usaAdmin155{display:grid;gap:16px}.usaAdminHero155{display:flex;justify-content:space-between;gap:20px;padding:20px;border-radius:18px;background:linear-gradient(135deg,#102f4d,#176b8c);color:#fff}.usaAdminHero155 span{color:#f0cf7d;font-size:10px;font-weight:900;letter-spacing:.13em}.usaAdminHero155 h2{margin:5px 0}.usaAdminHero155 p{color:#dceaf0}.usaAdminHero155 button,.usaAdminActions155 button{border:0;border-radius:10px;padding:10px 12px;font-weight:900}.usaAdminHero155 button{background:#f0cf7d;color:#342b16}.usaAdminKpis155{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.usaAdminKpis155 article,.usaAdminBlock155{border:1px solid #dce4df;border-radius:15px;background:#fff;padding:14px}.usaAdminKpis155 b,.usaAdminKpis155 span{display:block}.usaAdminKpis155 b{font-size:24px}.usaAdminKpis155 span{color:#617270}.usaAdminRows155{display:grid;gap:8px}.usaAdminRows155 article{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #e2e8e5;padding:12px 0}.usaAdminRows155 small{display:block;color:#617270;margin-top:4px}.usaAdminActions155{display:flex;gap:5px;flex-wrap:wrap;align-items:center}.usaAdminActions155 button{background:#e6f1ee;color:#17635f}.usaAdminActions155 button:first-child{background:#164e52;color:#fff}.usaAdminDialog155{width:min(720px,calc(100vw - 30px));border:0;border-radius:18px;padding:20px}.usaAdminDialog155 form>div{display:grid;grid-template-columns:1fr 1fr;gap:10px}.usaAdminDialog155 label{display:grid;gap:4px}.usaAdminDialog155 input,.usaAdminDialog155 select,.usaAdminDialog155 textarea{border:1px solid #dce4df;border-radius:9px;padding:9px}.usaAdminDialog155 .wide{grid-column:1/-1}.usaAdminDialog155 footer{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}@media(max-width:800px){.usaAdminKpis155{grid-template-columns:1fr 1fr}.usaAdminHero155,.usaAdminRows155 article{display:block}.usaAdminActions155{margin-top:10px}.usaAdminDialog155 form>div{grid-template-columns:1fr}.usaAdminDialog155 .wide{grid-column:auto}}";
  document.head.append(style);

  async function fetchData() {
    const [jobs, sources, runs] = await Promise.all([
      db().from("btv_usa_jobs").select("*").order("date_posted", { ascending: false }).limit(500),
      db().from("btv_usa_job_sources").select("*").order("name"),
      db().from("btv_usa_job_import_runs").select("*,btv_usa_job_sources(name)").order("started_at", { ascending: false }).limit(40),
    ]);
    const failed = [jobs, sources, runs].find((result) => result.error); if (failed) throw failed.error;
    cache = { jobs: jobs.data || [], sources: sources.data || [], runs: runs.data || [] };
  }

  function sourceRow(row) {
    return `<article><div><b>${esc(row.name)}</b><small>${esc(row.integration_type)} · ${esc(row.permission_status)} · ${row.enabled ? "enabled" : "disabled"}${row.last_error ? ` · ${esc(row.last_error)}` : ""}</small></div><div class="usaAdminActions155">${row.permission_status !== "approved" ? `<button data-usa-source-approve="${row.id}">Approve source</button>` : ""}<button data-usa-source-toggle="${row.id}" data-enabled="${row.enabled}" ${row.permission_status !== "approved" ? "disabled" : ""}>${row.enabled ? "Disable" : "Enable"}</button></div></article>`;
  }
  function jobRow(row) {
    return `<article><div><b>${esc(row.job_title)}</b><small>${esc(row.employer_name)} · ${esc([row.city, row.state].filter(Boolean).join(", "))} · ${esc(row.status)} · ${esc(row.visa_sponsorship_status)}</small></div><div class="usaAdminActions155"><button data-usa-edit="${row.id}">Edit</button><button data-usa-feature="${row.id}">${row.featured ? "Unfeature" : "Feature"}</button><button data-usa-sponsor="${row.id}">Verify sponsorship</button><button data-usa-status="${row.id}" data-status="${row.status === "expired" || row.status === "hidden" ? "active" : "expired"}">${row.status === "expired" || row.status === "hidden" ? "Restore" : "Expire"}</button></div></article>`;
  }
  function runRow(row) {
    return `<article><div><b>${esc(row.btv_usa_job_sources?.name || "USA jobs import")} · ${esc(row.status)}</b><small>${new Date(row.started_at).toLocaleString("en-GB")} · found ${row.records_found} · created ${row.records_created} · updated ${row.records_updated} · expired ${row.records_expired} · duplicates ${row.duplicates_skipped}${row.error_summary ? ` · ${esc(row.error_summary)}` : ""}</small></div></article>`;
  }

  function render(pane) {
    const active = cache.jobs.filter((row) => row.status === "active"), failed = cache.runs.filter((row) => row.status === "failed");
    pane.innerHTML = `<div class="usaAdmin155"><section class="usaAdminHero155"><div><span>SEPARATE USA JOBS SYSTEM</span><h2>USA Nursing Jobs administration</h2><p>Official USAJOBS imports, destination-separated records, sponsorship review and source governance.</p></div><button data-run-usa-import>Run USAJOBS import</button></section><div class="usaAdminKpis155"><article><span>Active</span><b>${active.length}</b></article><article><span>Featured</span><b>${active.filter((row) => row.featured).length}</b></article><article><span>Sponsorship confirmed</span><b>${active.filter((row) => row.visa_sponsorship_status === "confirmed" && row.visa_sponsorship_verified).length}</b></article><article><span>Expired</span><b>${cache.jobs.filter((row) => row.status === "expired").length}</b></article><article><span>Failed runs</span><b>${failed.length}</b></article></div><section class="usaAdminBlock155"><h3>USA sources</h3><div class="usaAdminRows155">${cache.sources.map(sourceRow).join("") || "<p>No USA sources configured.</p>"}</div></section><section class="usaAdminBlock155"><h3>USA nursing vacancies</h3><div class="usaAdminRows155">${cache.jobs.map(jobRow).join("") || "<p>No USA jobs imported yet. Configure USAJOBS credentials before running the importer.</p>"}</div></section><section class="usaAdminBlock155"><h3>Import logs and failures</h3><div class="usaAdminRows155">${cache.runs.map(runRow).join("") || "<p>No USA import runs yet.</p>"}</div></section></div>`;
    wire(pane);
  }

  async function load(pane) {
    if (loading) return; loading = true; pane.innerHTML = "<p>Loading USA jobs administration…</p>";
    try { await fetchData(); render(pane); } catch (error) { pane.innerHTML = `<p>USA jobs administration could not load: ${esc(error.message)}</p>`; } finally { loading = false; }
  }

  function editDialog(row) {
    const element = document.createElement("dialog"); element.className = "usaAdminDialog155";
    element.innerHTML = `<form><h2>Edit USA vacancy</h2><div><label>Job title<input name="job_title" value="${esc(row.job_title)}" required></label><label>Employer<input name="employer_name" value="${esc(row.employer_name)}" required></label><label>City<input name="city" value="${esc(row.city || "")}"></label><label>State<input name="state" value="${esc(row.state || "")}"></label><label>Specialty<input name="nursing_specialty" value="${esc(row.nursing_specialty || "")}"></label><label>Employment type<input name="employment_type" value="${esc(row.employment_type || "")}"></label><label>Sponsorship<select name="visa_sponsorship_status">${["confirmed","not_offered","unclear","not_applicable"].map((value) => `<option ${row.visa_sponsorship_status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Application URL<input name="canonical_application_url" type="url" value="${esc(row.canonical_application_url)}" required></label><label class="wide">Description<textarea name="description" rows="7">${esc(row.description || "")}</textarea></label></div><footer><button type="button" data-cancel>Cancel</button><button>Save</button></footer></form>`;
    document.body.append(element); element.querySelector("[data-cancel]").onclick = () => element.close(); element.onclose = () => element.remove();
    element.querySelector("form").onsubmit = async (event) => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); body.visa_sponsorship_verified = body.visa_sponsorship_status !== "unclear"; body.updated_at = new Date().toISOString(); const result = await db().from("btv_usa_jobs").update(body).eq("id", row.id); if (result.error) return alert(result.error.message); element.close(); const pane = document.querySelector('[data-admin-pane="usa-jobs"]'); if (pane) load(pane); };
    element.showModal();
  }

  function wire(pane) {
    pane.querySelector("[data-run-usa-import]")?.addEventListener("click", async (event) => { event.currentTarget.disabled = true; event.currentTarget.textContent = "Importing…"; const session = await db().auth.getSession(); const response = await fetch("/api/usa-jobs-import", { method: "POST", headers: { Authorization: `Bearer ${session.data.session?.access_token || ""}` } }); const body = await response.json(); if (!response.ok) alert(body.error || "USAJOBS import failed."); load(pane); });
    pane.querySelectorAll("[data-usa-source-approve]").forEach((button) => button.onclick = async () => { const result = await db().from("btv_usa_job_sources").update({ permission_status: "approved", updated_at: new Date().toISOString() }).eq("id", button.dataset.usaSourceApprove); if (result.error) alert(result.error.message); else load(pane); });
    pane.querySelectorAll("[data-usa-source-toggle]").forEach((button) => button.onclick = async () => { const result = await db().from("btv_usa_job_sources").update({ enabled: button.dataset.enabled !== "true", updated_at: new Date().toISOString() }).eq("id", button.dataset.usaSourceToggle); if (result.error) alert(result.error.message); else load(pane); });
    pane.querySelectorAll("[data-usa-edit]").forEach((button) => button.onclick = () => editDialog(cache.jobs.find((row) => row.id === button.dataset.usaEdit)));
    pane.querySelectorAll("[data-usa-feature]").forEach((button) => button.onclick = async () => { const row = cache.jobs.find((item) => item.id === button.dataset.usaFeature); const result = await db().from("btv_usa_jobs").update({ featured: !row.featured, updated_at: new Date().toISOString() }).eq("id", row.id); if (result.error) alert(result.error.message); else load(pane); });
    pane.querySelectorAll("[data-usa-status]").forEach((button) => button.onclick = async () => { const result = await db().from("btv_usa_jobs").update({ status: button.dataset.status, updated_at: new Date().toISOString() }).eq("id", button.dataset.usaStatus); if (result.error) alert(result.error.message); else load(pane); });
    pane.querySelectorAll("[data-usa-sponsor]").forEach((button) => button.onclick = async () => { const row = cache.jobs.find((item) => item.id === button.dataset.usaSponsor), value = prompt("Sponsorship status: confirmed, not_offered, unclear, or not_applicable", row.visa_sponsorship_status); if (!value || !["confirmed","not_offered","unclear","not_applicable"].includes(value)) return; const evidence = prompt("Paste the exact source evidence. Leave blank only for unclear.", row.sponsorship_evidence || ""); if (value !== "unclear" && !evidence) return alert("Verified sponsorship decisions require source evidence."); const result = await db().from("btv_usa_jobs").update({ visa_sponsorship_status: value, visa_sponsorship_verified: value !== "unclear", sponsorship_evidence: evidence || null, updated_at: new Date().toISOString() }).eq("id", row.id); if (result.error) alert(result.error.message); else load(pane); });
  }

  function install() {
    const root = document.getElementById("opportunityAdmin138"), tabs = root?.querySelector(".opAdminTabs138"); if (!root || !tabs) return;
    if (tabs.querySelector("[data-usa-admin-open]")) return;
    const button = document.createElement("button"); button.dataset.usaAdminOpen = ""; button.textContent = "USA Nursing Jobs"; tabs.append(button);
    const pane = document.createElement("section"); pane.dataset.adminPane = "usa-jobs"; pane.hidden = true; root.append(pane);
    button.onclick = () => { tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button)); root.querySelectorAll("[data-admin-pane]").forEach((item) => { item.hidden = item !== pane; }); load(pane); };
  }
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true }); install();
})();
