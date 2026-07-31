(() => {
  "use strict";
  if (window.__btvOpportunityImports142) return;
  window.__btvOpportunityImports142 = true;
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const style = document.createElement("style");
  style.textContent = ".opAdminImportHead138{display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid #dce4df;border-radius:16px;background:#f7fbf9;padding:16px;margin-bottom:15px}.opAdminImportHead138 span{color:#247c7c;font-size:10px;font-weight:900;letter-spacing:.12em}.opAdminImportHead138 h3{margin:4px 0}.opAdminImportHead138 p{margin:0;color:#617270}.opAdminImportHead138 button{border:0;border-radius:10px;background:#164e52;color:#fff;padding:10px 14px;font-weight:850}.opAdminRows138 button:disabled{opacity:.45;cursor:not-allowed}";
  document.head.append(style);

  async function enhance() {
    const root = document.querySelector("#opportunityAdmin138");
    if (!root || !window.btvSupabase) return;
    document.querySelectorAll(".opAdminDialog138 form").forEach((form) => {
      const verified = form.querySelector('[name="verified"]');
      if (!verified || form.querySelector('[name="verification_status"]')) return;
      const status = document.createElement("input"); status.type = "hidden"; status.name = "verification_status"; status.value = verified.checked ? "verified" : "pending"; form.append(status);
      verified.addEventListener("change", () => { status.value = verified.checked ? "verified" : "pending"; });
    });
    root.querySelectorAll("[data-edit-employer]").forEach((editButton) => {
      const article = editButton.closest("article");
      if (!article || article.querySelector("[data-spotlight-action]")) return;
      editButton.insertAdjacentHTML("afterend", `<button data-spotlight-action="approved" data-employer-id="${editButton.dataset.editEmployer}">Approve</button><button data-spotlight-action="rejected" data-employer-id="${editButton.dataset.editEmployer}">Reject</button><button data-spotlight-action="hidden" data-employer-id="${editButton.dataset.editEmployer}">Hide</button><button data-spotlight-feature data-employer-id="${editButton.dataset.editEmployer}">Feature / unfeature</button>`);
      article.querySelectorAll("[data-spotlight-action]").forEach((button) => button.addEventListener("click", async () => { const approved = button.dataset.spotlightAction === "approved"; const result = await window.btvSupabase.from("btv_opportunity_employers").update({ spotlight_status: button.dataset.spotlightAction, verified: approved, updated_at: new Date().toISOString() }).eq("id", button.dataset.employerId); if (result.error) alert(result.error.message); else location.reload(); }));
      article.querySelector("[data-spotlight-feature]")?.addEventListener("click", async (event) => { const existing = await window.btvSupabase.from("btv_opportunity_employers").select("featured").eq("id", event.currentTarget.dataset.employerId).single(); if (existing.error) return alert(existing.error.message); const result = await window.btvSupabase.from("btv_opportunity_employers").update({ featured: !existing.data.featured, updated_at: new Date().toISOString() }).eq("id", event.currentTarget.dataset.employerId); if (result.error) alert(result.error.message); else location.reload(); });
    });
    root.querySelectorAll("[data-edit-opportunity]").forEach((editButton) => {
      const article = editButton.closest("article");
      if (!article || article.querySelector("[data-recheck-vacancy]")) return;
      editButton.insertAdjacentHTML("afterend", `<button data-recheck-vacancy="${editButton.dataset.editOpportunity}">Recheck source</button>`);
      article.querySelector("[data-recheck-vacancy]").addEventListener("click", async (event) => { event.currentTarget.disabled = true; event.currentTarget.textContent = "Rechecking…"; const { data } = await window.btvSupabase.auth.getSession(); const response = await fetch("/api/opportunity-import", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token || ""}`, "content-type": "application/json" }, body: JSON.stringify({ action: "recheck", job_id: event.currentTarget.dataset.recheckVacancy }) }); const result = await response.json(); if (!response.ok) alert(result.error || "Recheck failed"); location.reload(); });
    });
    /* The base Opportunity Centre creates the shell before it renders its tabs.
       Do not query or mutate that empty shell: this observer would otherwise
       trigger itself continuously and exhaust every admin data request. */
    const tabs = root.querySelector(".opAdminTabs138");
    if (!tabs || root.querySelector('[data-admin-view="imports"]')) return;
    const [sourceResult, runResult] = await Promise.all([
      window.btvSupabase.from("btv_approved_sources").select("*").order("name"),
      window.btvSupabase.from("btv_opportunity_import_runs").select("*,btv_approved_sources(name)").order("started_at", { ascending: false }).limit(30),
    ]);
    if (sourceResult.error || runResult.error) return;
    const sources = sourceResult.data || [], runs = runResult.data || [];
    tabs.insertAdjacentHTML("beforeend", '<button data-admin-view="imports">Daily imports</button>');
    root.insertAdjacentHTML("beforeend", `<section data-admin-pane="imports" hidden><div class="opAdminImportHead138"><div><span>AUTOMATION</span><h3>Daily import · 03:15 UTC</h3><p>Only approved structured feeds can be enabled. Disabled sources are never fetched.</p></div><button data-run-import>Run now</button></div><h3>Approved-source register</h3><div class="opAdminRows138">${sources.map((item) => { const canEnable = item.permission_status === "approved" && item.integration_type === "json_feed_v1"; return `<article><div><span>${esc(item.source_type)} · permission ${esc(item.permission_status)}</span><h3>${esc(item.name)}</h3><p>${esc(item.integration_type)} · ${item.last_successful_run_at ? `last success ${new Date(item.last_successful_run_at).toLocaleString("en-GB")}` : "never imported"}${item.last_error ? ` · ${esc(item.last_error)}` : ""}</p></div><button data-source-toggle="${item.id}" data-enabled="${item.enabled}" ${!item.enabled && !canEnable ? "disabled" : ""}>${item.enabled ? "Disable" : "Enable"}</button></article>`; }).join("") || "<p>No sources registered.</p>"}</div><h3>Recent runs</h3><div class="opAdminRows138">${runs.map((item) => `<article><div><span>${esc(item.status)} · ${esc(item.triggered_by)}</span><h3>${esc(item.btv_approved_sources?.name || "Daily orchestration")}</h3><p>${new Date(item.started_at).toLocaleString("en-GB")} · found ${item.records_found} · created ${item.records_created} · updated ${item.records_updated} · archived ${item.records_archived}${item.error_summary ? ` · ${esc(item.error_summary)}` : ""}</p></div></article>`).join("") || "<p>No import runs yet.</p>"}</div></section>`);
    const nhsSource = sources.find((item) => item.name === "NHS Jobs");
    const nhsRun = runs.find((item) => item.source_id === nhsSource?.id && item.status !== "running");
    const nhsPane = root.querySelector('[data-admin-pane="imports"]');
    if (nhsPane && nhsSource) {
      nhsPane.insertAdjacentHTML("afterbegin", `<section class="opAdminImportHead138"><div><span>NHS JOBS FEED · ${nhsSource.enabled ? "ENABLED" : "DISABLED"}</span><h3>Official NHS Jobs daily vacancy feed</h3><p>Source health: ${nhsSource.last_error ? `error · ${esc(nhsSource.last_error)}` : nhsSource.last_successful_run_at ? "healthy" : "awaiting first run"} · Last success: ${nhsSource.last_successful_run_at ? new Date(nhsSource.last_successful_run_at).toLocaleString("en-GB") : "never"} · Next scheduled update: 03:15 UTC</p><p>Fetched ${Number(nhsRun?.records_found || 0)} · nursing ${Number(nhsRun?.records_nursing || 0)} · midwifery ${Number(nhsRun?.records_midwifery || 0)} · confirmed sponsorship ${Number(nhsRun?.confirmed_sponsorship_count || 0)} · updated ${Number(nhsRun?.records_updated || 0)} · archived ${Number(nhsRun?.records_archived || 0)}</p></div><div><button data-run-import>Run now</button><button data-admin-view="opportunities">Review sponsorship classification</button><button data-admin-view="employers">Review employer spotlight candidates</button></div></section>`);
      const nhsToggle = root.querySelector(`[data-source-toggle="${nhsSource.id}"]`);
      if (nhsToggle && nhsSource.permission_status === "approved" && nhsSource.integration_type === "nhs_jobs_xml_v1") nhsToggle.disabled = false;
    }
    const reedSource = sources.find((item) => item.name === "REED");
    if (nhsPane && reedSource) {
      nhsPane.insertAdjacentHTML("afterbegin", `<section class="opAdminImportHead138"><div><span>REED JOBSEEKER API · ${reedSource.enabled ? "ENABLED" : "DISABLED"}</span><h3>Reed UK nursing vacancies</h3><p data-reed-status>Server-side API v1.0 · ${reedSource.last_successful_run_at ? `last success ${new Date(reedSource.last_successful_run_at).toLocaleString("en-GB")}` : "awaiting first import"}</p></div><div><button data-test-reed>Test Reed</button><button data-sync-reed>Sync Reed now</button></div></section>`);
      nhsPane.querySelector("[data-test-reed]")?.addEventListener("click", async (event) => { const button=event.currentTarget,output=nhsPane.querySelector("[data-reed-status]");button.disabled=true;button.textContent="Testing…";const {data}=await window.btvSupabase.auth.getSession();const response=await fetch("/api/reed-jobs-connection-test",{headers:{Authorization:`Bearer ${data.session?.access_token||""}`}});const result=await response.json();output.textContent=result.authentication_succeeded?`Connected · HTTP ${result.http_status} · ${Number(result.results_returned||0)} sample results returned`:result.error||"Reed connection test failed";button.disabled=false;button.textContent="Test Reed"; });
      nhsPane.querySelector("[data-sync-reed]")?.addEventListener("click", async (event) => { const button=event.currentTarget;button.disabled=true;button.textContent="Importing…";const {data}=await window.btvSupabase.auth.getSession();const response=await fetch("/api/reed-jobs-import",{method:"POST",headers:{Authorization:`Bearer ${data.session?.access_token||""}`}});const result=await response.json();if(!response.ok)alert(result.error||"Reed import failed");else location.reload(); });
    }
    root.querySelectorAll("[data-run-import]").forEach((button, index) => { if (index > 0) button.remove(); });
    root.querySelectorAll("[data-admin-view]").forEach((button) => button.addEventListener("click", () => { root.querySelectorAll("[data-admin-view]").forEach((item) => item.classList.toggle("active", item === button)); root.querySelectorAll("[data-admin-pane]").forEach((pane) => { pane.hidden = pane.dataset.adminPane !== button.dataset.adminView; }); }));
    root.querySelectorAll("[data-source-toggle]").forEach((button) => button.addEventListener("click", async () => { await window.btvSupabase.from("btv_approved_sources").update({ enabled: button.dataset.enabled !== "true", updated_at: new Date().toISOString() }).eq("id", button.dataset.sourceToggle); location.reload(); }));
    root.querySelector("[data-run-import]")?.addEventListener("click", async (event) => { event.currentTarget.disabled = true; event.currentTarget.textContent = "Running…"; const { data } = await window.btvSupabase.auth.getSession(); const response = await fetch("/api/opportunity-import", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token || ""}` } }); const result = await response.json(); if (!response.ok) alert(result.error || "Import failed"); location.reload(); });
  }
  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();
