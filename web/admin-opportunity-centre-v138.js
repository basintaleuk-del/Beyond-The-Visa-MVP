(() => {
  "use strict";
  if (window.__btvAdminOpportunity138) return;
  window.__btvAdminOpportunity138 = true;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const db = () => window.btvSupabase;
  let root, rows = [], employers = [], filter = { query: "", country: "", type: "", status: "" };
  const types = ["job", "scholarship", "event", "registration_update", "immigration_update", "employer_campaign", "learning", "journey_action"];

  function install() {
    if (!$("#app") || $("#opportunityAdmin138")) return;
    const button = document.createElement("button");
    button.dataset.tab = "opportunityAdmin138";
    button.textContent = "Opportunity Centre";
    $(".sidebar nav")?.append(button);
    root = document.createElement("section");
    root.id = "opportunityAdmin138";
    root.className = "tab";
    $("#app main")?.append(root);
    button.onclick = () => {
      $$('[data-tab]').forEach((item) => item.classList.toggle("active", item === button));
      $$(".tab").forEach((item) => item.classList.toggle("active", item === root));
      $("#pageTitle").textContent = "Opportunity Centre";
      load();
    };
  }

  async function load() {
    root.innerHTML = '<div class="opAdminLoading138">Loading Opportunity Centre data…</div>';
    const [opportunities, employerRows] = await Promise.all([
      db().from("btv_jobs").select("*,btv_opportunity_source_reviews(verification_notes,verified_by,checked_at)").order("created_at", { ascending: false }).limit(300),
      db().from("btv_opportunity_employers").select("*").order("name").limit(200),
    ]);
    if (opportunities.error || employerRows.error) return error(opportunities.error || employerRows.error);
    rows = opportunities.data || []; employers = employerRows.data || []; render();
  }

  function render() {
    const visible = rows.filter((row) => (!filter.query || JSON.stringify(row).toLowerCase().includes(filter.query.toLowerCase())) && (!filter.country || row.country === filter.country) && (!filter.type || row.opportunity_type === filter.type) && (!filter.status || row.status === filter.status));
    const count = (predicate) => rows.filter(predicate).length;
    root.innerHTML = `<div class="opAdminHero138"><span>CONTENT & SOURCE GOVERNANCE</span><h2>Opportunity Centre</h2><p>Create, verify, feature, publish and archive opportunities without changing existing job saves.</p></div><div class="opAdminStats138">${[["Active", count((x) => x.status === "published")],["Jobs", count((x) => x.opportunity_type === "job")],["Sponsored", count((x) => x.sponsorship_status === "confirmed")],["Scholarships", count((x) => x.opportunity_type === "scholarship")],["Events", count((x) => x.opportunity_type === "event")],["Official updates", count((x) => /_update$/.test(x.opportunity_type))],["Employers", employers.length],["Unverified", count((x) => !x.verified)],["Archived", count((x) => x.status === "archived")]].map(([label, value]) => `<article><span>${label}</span><b>${value}</b></article>`).join("")}</div><div class="opAdminTabs138"><button data-admin-view="opportunities" class="active">Opportunities</button><button data-admin-view="employers">Employers</button></div><section data-admin-pane="opportunities"><div class="opAdminToolbar138"><input type="search" data-admin-search placeholder="Search title, employer or source" value="${esc(filter.query)}"><select data-admin-filter="country"><option value="">All countries</option>${[...new Set(rows.map((x) => x.country).filter(Boolean))].sort().map((value) => `<option ${filter.country === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select><select data-admin-filter="type"><option value="">All types</option>${types.map((value) => `<option ${filter.type === value ? "selected" : ""}>${value}</option>`).join("")}</select><select data-admin-filter="status"><option value="">All statuses</option>${["draft","review","published","expired","archived"].map((value) => `<option ${filter.status === value ? "selected" : ""}>${value}</option>`).join("")}</select><button data-create-opportunity>+ Create opportunity</button></div><div class="opAdminRows138">${visible.map(row).join("") || "<p>No opportunities match these filters.</p>"}</div></section><section data-admin-pane="employers" hidden><button data-create-employer>+ Create employer</button><div class="opAdminRows138">${employers.map(employer).join("") || "<p>No employers recorded.</p>"}</div></section>`;
    wire();
  }

  function row(item) {
    return `<article><div><span>${esc(item.opportunity_type)} · ${esc(item.country)}</span><h3>${esc(item.title)}</h3><p>${esc(item.employer)} · ${esc(item.status)} · ${item.verified ? "verified" : "unverified"}${item.closing_at ? ` · closes ${new Date(item.closing_at).toLocaleDateString("en-GB")}` : ""}</p></div><div><button data-edit-opportunity="${item.id}">Edit</button><button data-duplicate-opportunity="${item.id}">Duplicate</button><button data-state-opportunity="${item.id}" data-status="${item.status === "published" ? "archived" : "published"}">${item.status === "published" ? "Archive" : "Publish"}</button>${item.status !== "expired" ? `<button data-state-opportunity="${item.id}" data-status="expired">Expire</button>` : ""}</div></article>`;
  }
  function employer(item) {
    return `<article><div><span>${esc(item.country_code)} · ${item.verified ? "verified" : "unverified"}</span><h3>${esc(item.name)}</h3><p>${esc(item.website_url || "No website recorded")}</p></div><button data-edit-employer="${item.id}">Edit</button></article>`;
  }

  function wire() {
    $$('[data-admin-view]', root).forEach((button) => button.onclick = () => { $$('[data-admin-view]', root).forEach((item) => item.classList.toggle("active", item === button)); $$('[data-admin-pane]', root).forEach((pane) => pane.hidden = pane.dataset.adminPane !== button.dataset.adminView); });
    $("[data-admin-search]", root)?.addEventListener("input", (event) => { filter.query = event.target.value; clearTimeout(wire.timer); wire.timer = setTimeout(render, 180); });
    $$('[data-admin-filter]', root).forEach((input) => input.onchange = () => { filter[input.dataset.adminFilter] = input.value; render(); });
    $("[data-create-opportunity]", root)?.addEventListener("click", () => opportunityForm());
    $("[data-create-employer]", root)?.addEventListener("click", () => employerForm());
    $$('[data-edit-opportunity]', root).forEach((button) => button.onclick = () => opportunityForm(rows.find((item) => item.id === button.dataset.editOpportunity)));
    $$('[data-edit-employer]', root).forEach((button) => button.onclick = () => employerForm(employers.find((item) => item.id === button.dataset.editEmployer)));
    $$('[data-duplicate-opportunity]', root).forEach((button) => button.onclick = () => { const item = rows.find((x) => x.id === button.dataset.duplicateOpportunity); opportunityForm({ ...item, id: null, title: `${item.title} (copy)`, status: "draft", source_identifier: "", source_url: "" }); });
    $$('[data-state-opportunity]', root).forEach((button) => button.onclick = async () => { const patch = { status: button.dataset.status, updated_at: new Date().toISOString() }; if (button.dataset.status === "published") patch.published_at = new Date().toISOString(); if (button.dataset.status === "expired") patch.expired_at = new Date().toISOString(); const result = await db().from("btv_jobs").update(patch).eq("id", button.dataset.stateOpportunity); if (result.error) alert(result.error.message); else load(); });
  }

  const field = (name, label, value = "", type = "text", required = false) => `<label><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""}></label>`;
  const select = (name, label, value, options) => `<label><span>${label}</span><select name="${name}">${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option.replaceAll("_", " ")}</option>`).join("")}</select></label>`;
  const check = (name, label, value) => `<label class="opAdminCheck138"><input name="${name}" type="checkbox" ${value ? "checked" : ""}> ${label}</label>`;

  function dialog(title, content, submit) {
    const element = document.createElement("dialog"); element.className = "opAdminDialog138";
    element.innerHTML = `<form><header><h2>${esc(title)}</h2><button type="button" data-close aria-label="Close">×</button></header><div>${content}</div><p data-dialog-status></p><footer><button type="button" data-close>Cancel</button><button>Save</button></footer></form>`;
    document.body.append(element); $$('[data-close]', element).forEach((button) => button.onclick = () => element.close());
    element.addEventListener("close", () => element.remove());
    $("form", element).onsubmit = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); try { await submit(data, event.currentTarget); element.close(); await load(); } catch (error) { $("[data-dialog-status]", element).textContent = error.message; } };
    element.showModal();
  }

  function opportunityForm(item = {}) {
    dialog(item.id ? "Edit opportunity" : "Create opportunity", `${field("title","Title",item.title,"text",true)}${select("opportunity_type","Type",item.opportunity_type || "job",types)}${field("employer","Employer / provider",item.employer || item.provider_name,"text",true)}${field("country","Country code",item.country || "uk","text",true)}${select("profession","Profession",item.profession || "both",["both","nurse","midwife"])}${field("specialty","Specialty",item.specialty)}${field("summary","Summary",item.summary)}${field("description","Description",item.description)}${field("source_name","Source name",item.source_name,"text",true)}${field("source_url","Original source URL",item.source_url,"url",true)}${field("source_identifier","Source record ID",item.source_identifier)}${field("verification_notes","Private source verification notes",item.btv_opportunity_source_reviews?.[0]?.verification_notes)}${field("application_url","Application URL",item.application_url,"url")}${field("registration_url","Registration URL",item.registration_url,"url")}${select("sponsorship_status","Sponsorship",item.sponsorship_status || "not_stated",["confirmed","may_be_available","not_stated"])}${field("salary_min","Salary / funding minimum",item.salary_min,"number")}${field("salary_max","Salary / funding maximum",item.salary_max,"number")}${field("currency","Currency",item.currency)}${field("published_at","Published at",item.published_at?.slice(0,16),"datetime-local")}${field("closing_at","Closing at",item.closing_at?.slice(0,16),"datetime-local")}${field("event_start_at","Event starts",item.event_start_at?.slice(0,16),"datetime-local")}${field("event_end_at","Event ends",item.event_end_at?.slice(0,16),"datetime-local")}${field("event_timezone","Event timezone",item.event_timezone || "Europe/London")}${field("last_checked_at","Last checked",item.last_checked_at?.slice(0,16),"datetime-local")}${select("status","Status",item.status || "draft",["draft","review","published","expired","archived"])}${check("verified","Source verified",item.verified)}${check("featured","Featured",item.featured)}${check("remote_interview","Remote interview",item.remote_interview)}${check("graduate_friendly","Graduate friendly",item.graduate_friendly)}${check("internationally_educated_friendly","Internationally educated applicant friendly",item.internationally_educated_friendly)}`, async (data, form) => {
      const verificationNotes = data.verification_notes || null;
      delete data.verification_notes;
      for (const name of ["verified","featured","remote_interview","graduate_friendly","internationally_educated_friendly"]) data[name] = new FormData(form).has(name);
      for (const name of ["salary_min","salary_max"]) data[name] = data[name] ? Number(data[name]) : null;
      for (const name of ["published_at","closing_at","event_start_at","event_end_at","last_checked_at","application_url","registration_url","source_identifier","specialty"]) data[name] = data[name] || null;
      data.visa_sponsorship = data.sponsorship_status === "confirmed"; data.updated_at = new Date().toISOString();
      if (data.status === "published" && !data.published_at) data.published_at = new Date().toISOString();
      const result = item.id ? await db().from("btv_jobs").update(data).eq("id", item.id).select("id").single() : await db().from("btv_jobs").insert(data).select("id").single();
      if (result.error) throw result.error;
      if (data.verified || verificationNotes) {
        const { data: auth } = await db().auth.getUser();
        if (!auth?.user?.id) throw new Error("Your admin session could not be verified.");
        const review = await db().from("btv_opportunity_source_reviews").upsert({ opportunity_id: result.data.id, verified_by: auth.user.id, verification_notes: verificationNotes, checked_at: data.last_checked_at || new Date().toISOString(), updated_at: new Date().toISOString() });
        if (review.error) throw review.error;
      }
    });
  }

  function employerForm(item = {}) {
    dialog(item.id ? "Edit employer" : "Create employer", `${field("name","Employer name",item.name,"text",true)}${field("country_code","Country code",item.country_code || "uk","text",true)}${field("website_url","Official website",item.website_url,"url")}${field("logo_url","Logo URL",item.logo_url,"url")}${field("description","Description",item.description)}${select("sponsorship_status","Sponsorship",item.sponsorship_status || "not_stated",["confirmed","may_be_available","not_stated"])}${field("development_opportunities","Development opportunities",item.development_opportunities)}${field("last_checked_at","Last checked",item.last_checked_at?.slice(0,16),"datetime-local")}${check("verified","Verified employer",item.verified)}${check("relocation_support","Relocation support",item.relocation_support)}${check("accommodation_support","Accommodation support",item.accommodation_support)}`, async (data, form) => {
      for (const name of ["verified","relocation_support","accommodation_support"]) data[name] = new FormData(form).has(name);
      data.last_checked_at = data.last_checked_at || null; data.updated_at = new Date().toISOString();
      const result = item.id ? await db().from("btv_opportunity_employers").update(data).eq("id", item.id) : await db().from("btv_opportunity_employers").insert(data);
      if (result.error) throw result.error;
    });
  }
  function error(value) { root.innerHTML = `<div class="opAdminError138"><b>Opportunity Centre could not load.</b><p>${esc(value.message)}</p><button data-retry>Try again</button></div>`; $("[data-retry]", root).onclick = load; }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => setTimeout(install, 0), { once: true }) : setTimeout(install, 0);
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
})();
