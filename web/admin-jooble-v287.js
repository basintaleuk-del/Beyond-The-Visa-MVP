(() => {
  "use strict";
  if (window.__btvAdminJooble287) return;
  window.__btvAdminJooble287 = true;

  const nextSync = () => {
    const now = new Date(), next = new Date(now);
    next.setUTCHours(3, 15, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return `${next.toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC`;
  };
  const sessionToken = async () => {
    const { data } = await window.btvSupabase.auth.getSession();
    return data.session?.access_token || "";
  };

  async function call(path, button, status) {
    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Working…";
    try {
      const response = await fetch(path, {
        method: path.includes("connection-test") ? "GET" : "POST",
        headers: { Authorization: `Bearer ${await sessionToken()}` },
      });
      const result = await response.json();
      if (!response.ok || result.authentication_succeeded === false) throw Error(result.error || "Jooble request failed.");
      status.textContent = result.authentication_succeeded
        ? `Connected · HTTP ${result.http_status} · ${Number(result.results_returned || 0)} sample result returned`
        : `Complete · ${Number(result.requests_made || 0)} API calls · ${Number(result.jobs_created || 0)} imported · ${Number(result.jobs_updated || 0)} updated · ${Number(result.duplicates_skipped || 0)} duplicates · ${Number(result.jobs_marked_inactive || 0)} inactive`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  async function render() {
    const root = document.querySelector("#opportunityAdmin138");
    if (!root || !window.btvSupabase || root.querySelector("[data-admin-jooble287]")) return;
    const [sourceResult, runResult] = await Promise.all([
      window.btvSupabase.from("btv_approved_sources").select("*").eq("name", "jooble").maybeSingle(),
      window.btvSupabase.from("btv_opportunity_import_runs").select("*").order("started_at", { ascending: false }).limit(30),
    ]);
    if (sourceResult.error || !sourceResult.data) return;
    const source = sourceResult.data;
    const run = (runResult.data || []).find((item) => item.source_id === source.id && item.status !== "running");
    const metrics = run?.provider_summary || {};
    const card = `<section class="opAdminImportHead138" data-admin-jooble287><div><span>JOOBLE API · ${source.enabled ? "ENABLED" : "DISABLED"}</span><h3>Jooble healthcare vacancies</h3><p data-jooble-standalone-status>Last sync ${source.last_successful_run_at ? new Date(source.last_successful_run_at).toLocaleString("en-GB") : "never"} · next ${nextSync()}</p><p>API calls ${Number(metrics.requests_made || run?.requests_made || 0)} · imported ${Number(metrics.jobs_created || run?.records_created || 0)} · updated ${Number(metrics.jobs_updated || run?.records_updated || 0)} · duplicates ${Number(metrics.duplicates_skipped || run?.duplicates_skipped || 0)} · inactive ${Number(metrics.jobs_marked_inactive || run?.records_expired || 0)} · failures ${Number(run?.records_failed || 0)}</p></div><div><button data-jooble-action="test">Test Jooble</button><button data-jooble-action="sample">Sample UK · 3 jobs</button><button data-jooble-action="sync">Sync Jooble Now</button><button data-jooble-enable>${source.enabled ? "Disable Jooble" : "Enable Jooble"}</button></div></section>`;
    const imports = root.querySelector('[data-admin-pane="imports"]');
    const careerjet = root.querySelector("[data-admin-careerjet286]");
    if (imports) imports.insertAdjacentHTML("afterbegin", card);
    else if (careerjet) careerjet.insertAdjacentHTML("beforebegin", card);
    else {
      root.classList.add("active");
      root.innerHTML = `<div class="opAdminHero138"><span>CONTENT & SOURCE GOVERNANCE</span><h2>Opportunity Centre</h2><p>Secure server-side vacancy imports.</p></div>${card}`;
      const pageTitle = document.querySelector("#pageTitle");
      if (pageTitle) pageTitle.textContent = "Opportunity Centre";
    }
    const status = root.querySelector("[data-jooble-standalone-status]");
    root.querySelectorAll("[data-jooble-action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.joobleAction;
      const path = action === "test" ? "/api/jooble-jobs-connection-test" : action === "sample" ? "/api/jooble-jobs-sample" : "/api/jooble-jobs-import";
      call(path, button, status);
    }));
    root.querySelector("[data-jooble-enable]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const result = await window.btvSupabase.from("btv_approved_sources").update({ enabled: !source.enabled, import_status: !source.enabled ? "active" : "inactive", updated_at: new Date().toISOString() }).eq("id", source.id);
      if (result.error) {
        status.textContent = result.error.message;
        button.disabled = false;
      } else location.reload();
    });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest?.('[data-tab="opportunityAdmin138"],[data-admin-view="imports"]')) setTimeout(render, 180);
  });
  if (document.readyState !== "loading") setTimeout(render, 250);
  else document.addEventListener("DOMContentLoaded", () => setTimeout(render, 250), { once: true });
})();
