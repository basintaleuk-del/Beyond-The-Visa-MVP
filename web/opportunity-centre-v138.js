(() => {
  "use strict";
  if (window.__btvOpportunityCentre138) return;
  window.__btvOpportunityCentre138 = true;

  const COUNTRY_NAMES = {
    uk: "United Kingdom",
    au: "Australia",
    us: "United States",
    ca: "Canada",
    nz: "New Zealand",
  };
  const COUNTRY_ALIASES = Object.fromEntries(
    Object.entries(COUNTRY_NAMES).flatMap(([code, name]) => [
      [code, code],
      [name.toLowerCase(), code],
    ])
  );
  const TYPE_LABELS = {
    job: "Job",
    scholarship: "Scholarship",
    event: "Event",
    registration_update: "Registration update",
    immigration_update: "Immigration update",
    employer_campaign: "Employer campaign",
    learning: "Learning",
    journey_action: "Journey action",
  };
  const SPONSOR_LABELS = {
    confirmed: "Visa sponsorship confirmed",
    may_be_available: "Sponsorship may be available",
    not_stated: "Sponsorship not stated",
  };
  const ACTIVE_OPPORTUNITY_STATUSES = ["published", "closing_soon"];
  const state = {
    rows: [],
    sponsorshipRows: [],
    fundingRows: [],
    eventRows: [],
    summaryRows: [],
    employers: [],
    saved: new Set(),
    dismissed: new Set(),
    profile: null,
    counts: {},
    total: 0,
    page: 0,
    loading: false,
    loaded: false,
    lastUpdated: null,
    includePossibleSponsorship: false,
    filters: {
      search: "",
      country: "",
      profession: "",
      type: "",
      specialty: "",
      employer: "",
      band: "",
      region: "",
      city: "",
      contract: "",
      workingPattern: "",
      salaryMin: "",
      sponsorship: false,
      sponsorshipPossible: false,
      newToday: false,
      newWeek: false,
      remote: false,
      graduate: false,
      saved: false,
      closing: false,
    },
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) =>
    String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character]);
  const codeFor = (value) => COUNTRY_ALIASES[String(value || "").toLowerCase()] || String(value || "").toLowerCase();
  const today = () => new Date().toISOString().slice(0, 10);
  const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not stated";
  const notify = (message) => typeof window.toast === "function" ? window.toast(message) : alert(message);
  const db = () => window.btvSupabase;
  const OPPORTUNITY_ICONS = {
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m15 9 5-5m0 0v4m0-4h-4"/>',
    shield: '<path d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    verified: '<path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
    bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
    briefcase: '<path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h18M10 12v2h4v-2"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.4-6 6-6s6 2 6 6M15 14c3.5 0 5.5 2 5.5 5"/>',
    clinical: '<path d="M7 3v7a5 5 0 0 0 10 0V3M5 3h4M15 3h4"/><circle cx="17" cy="17" r="3"/><path d="M14 17h-2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    building: '<path d="M4 21V7l8-4v18M12 9h8v12M7 9h2m-2 4h2m-2 4h2m8-4h1m-1 4h1M2 21h20"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-5 3.4-7 8-7s7.2 2 8 7"/>',
    checklist: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12 5 13.5 7.5 11M3.5 18 5 19.5 7.5 17"/>',
    message: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  };
  const opportunityIcon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${OPPORTUNITY_ICONS[name] || OPPORTUNITY_ICONS.briefcase}</svg>`;

  function install() {
    upgradeEntryPoints();
    let section = $("#opportunities");
    if (!section) {
      section = document.createElement("section");
      section.id = "opportunities";
      section.className = "screen opportunityCentre138";
      section.innerHTML = shell();
      $("#appShell main")?.insertBefore(section, $("#cost-estimator"));
    }
    if (!section.dataset.opportunityWired138) {
      section.dataset.opportunityWired138 = "true";
      wireStatic(section);
    }
    wrapNavigation();
    openInitialRoute();
  }

  function upgradeEntryPoints() {
    const oldNav = $('#appShell nav .nav[data-open="costs"]');
    if (oldNav) {
      oldNav.dataset.open = "opportunities";
      oldNav.querySelector(".menuIconV72")?.remove();
      const label = $("small", oldNav);
      if (label) label.textContent = "Opportunities";
      Array.from(oldNav.childNodes).filter((node) => node.nodeType === 3).forEach((node) => node.remove());
    }
    $$('[data-open-target="costs"]').forEach((button) => {
      button.dataset.openTarget = "opportunities";
      const title = $("b", button), description = $("small", button);
      if (title) title.textContent = "Opportunity Centre";
      if (description) description.textContent = "Jobs, sponsorship, funding and events";
    });
    const navigation = $("#appShell nav");
    if (navigation && !navigation.dataset.opportunityRoute138) {
      navigation.dataset.opportunityRoute138 = "true";
      navigation.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open]");
        if (button) setTimeout(() => { syncRoute(button.dataset.open); if (button.dataset.open === "opportunities") load(); }, 0);
      });
    }
    const estimatorBack = $('#cost-estimator [data-open="opportunities"]');
    if (estimatorBack && !estimatorBack.dataset.opportunityRoute138) {
      estimatorBack.dataset.opportunityRoute138 = "true";
      estimatorBack.addEventListener("click", () => setTimeout(() => { syncRoute("opportunities"); load(); }, 0));
    }
  }

  function syncRoute(target) {
    if (target === "opportunities" || target === "costs") history.replaceState(history.state, "", "/opportunities");
    else if (target === "cost-estimator") history.replaceState(history.state, "", "/journey/tools/cost-estimator");
    else if (location.pathname === "/opportunities" || location.pathname === "/journey/tools/cost-estimator") history.replaceState(history.state, "", "/");
  }

  function showScreen(id) {
    const target = id === "costs" ? "opportunities" : id;
    $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === target));
    $$(".nav").forEach((button) => button.classList.toggle("active", button.dataset.open === target));
    window.scrollTo({ top: 0, behavior: "smooth" });
    syncRoute(target);
    if (target === "opportunities") load();
  }

  function wrapNavigation() {
    if (window.__btvOpportunityNavigation138 || typeof window.openScreen !== "function") return;
    window.__btvOpportunityNavigation138 = true;
    const original = window.openScreen;
    window.openScreen = function (id, ...args) {
      const target = id === "costs" ? "opportunities" : id;
      const result = original.call(this, target, ...args);
      syncRoute(target);
      if (target === "opportunities") load();
      return result;
    };
  }

  function openInitialRoute() {
    const requested = new URLSearchParams(location.search).get("screen");
    if (location.pathname === "/opportunities" || requested === "opportunities" || requested === "costs") {
      if (requested === "costs") history.replaceState(history.state, "", "/opportunities");
      setTimeout(() => showScreen("opportunities"), 0);
    }
    if (location.pathname === "/journey/tools/cost-estimator" || requested === "cost-estimator") {
      setTimeout(() => showScreen("cost-estimator"), 0);
    }
  }

  function shell() {
    return `<div data-opportunity-body aria-live="polite">${skeleton()}</div>
      <dialog class="opportunityFilters138" data-opportunity-filters aria-label="Opportunity filters"></dialog>
      <dialog class="opportunitySummaryDialog138" data-opportunity-summary-dialog aria-label="Jobs matching the selected opportunity category"></dialog>
      <dialog class="opportunityDetail138" data-opportunity-detail aria-label="Opportunity details"></dialog>`;
  }

  function skeleton() {
    return `<div class="opportunitySkeleton138"><i></i><i></i><i></i><i></i></div>`;
  }

  function wireStatic(root) {
    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("change", handleInput);
  }

  async function countRows(configure) {
    let query = db().from("btv_jobs").select("id", { count: "exact", head: true }).in("status", ACTIVE_OPPORTUNITY_STATUSES).is("expired_at", null);
    query = configure(query);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  async function countNhsEmployers() {
    const { count, error } = await db().from("btv_opportunity_employers").select("id", { count: "exact", head: true }).eq("verified", true).eq("source_name", "NHS Jobs").gt("active_job_count", 0);
    if (error) throw error;
    return count || 0;
  }

  async function load(reset = true) {
    if (state.loading || !db()) return;
    state.loading = true;
    const body = $("[data-opportunity-body]");
    if (body && !state.loaded) body.innerHTML = skeleton();
    try {
      const { data: auth } = await db().auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error("Sign in to view personalised opportunities.");
      if (reset) { state.page = 0; state.rows = []; }
      const from = state.page * 24;
      const weekEnd = new Date(); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      const [feed, sponsorshipFeed, fundingFeed, eventFeed, profile, saved, dismissed, employers, newJobs, nhsNursing, nhsMidwifery, sponsors, possibleSponsors, closingWeek, employerCount] = await Promise.all([
        db().from("btv_jobs").select("*", { count: "exact" }).in("status", ACTIVE_OPPORTUNITY_STATUSES).is("expired_at", null).order("featured", { ascending: false }).order("published_at", { ascending: false }).range(from, from + 23),
        db().from("btv_jobs").select("*").in("status", ACTIVE_OPPORTUNITY_STATUSES).is("expired_at", null).eq("source_name", "NHS Jobs").eq("opportunity_type", "job").eq("verified", true).in("sponsorship_status", ["confirmed", "may_be_available"]).order("sponsorship_status", { ascending: true }).order("published_at", { ascending: false }).limit(12),
        db().from("btv_jobs").select("*").in("status", ACTIVE_OPPORTUNITY_STATUSES).is("expired_at", null).eq("opportunity_type", "scholarship").eq("verified", true).order("featured", { ascending: false }).order("published_at", { ascending: false }).limit(6),
        db().from("btv_jobs").select("*").in("status", ACTIVE_OPPORTUNITY_STATUSES).is("expired_at", null).eq("opportunity_type", "event").eq("verified", true).gte("event_end_at", new Date().toISOString()).order("event_start_at", { ascending: true }).limit(6),
        db().from("profiles").select("profession,qualification_country,destination,destination_country,registration_stage,job_status").eq("id", user.id).maybeSingle(),
        db().from("btv_saved_jobs").select("job_id").eq("user_id", user.id),
        db().from("btv_opportunity_dismissals").select("opportunity_id").eq("user_id", user.id),
        db().from("btv_opportunity_employers").select("*").eq("verified", true).eq("source_name", "NHS Jobs").gt("active_job_count", 0).order("featured", { ascending: false }).order("active_job_count", { ascending: false }).limit(20),
        countRows((query) => query.eq("source_name", "NHS Jobs").eq("opportunity_type", "job").gte("published_at", `${today()}T00:00:00Z`)),
        countRows((query) => query.eq("source_name", "NHS Jobs").eq("profession", "nurse")),
        countRows((query) => query.eq("source_name", "NHS Jobs").eq("profession", "midwife")),
        countRows((query) => query.eq("source_name", "NHS Jobs").eq("sponsorship_status", "confirmed")),
        countRows((query) => query.eq("source_name", "NHS Jobs").eq("sponsorship_status", "may_be_available")),
        countRows((query) => query.eq("source_name", "NHS Jobs").gte("closing_at", new Date().toISOString()).lte("closing_at", weekEnd.toISOString())),
        countNhsEmployers(),
      ]);
      for (const result of [feed, sponsorshipFeed, fundingFeed, eventFeed, profile, saved, dismissed, employers]) if (result.error) throw result.error;
      state.rows = reset ? (feed.data || []) : [...state.rows, ...(feed.data || [])];
      state.sponsorshipRows = sponsorshipFeed.data || [];
      state.fundingRows = fundingFeed.data || [];
      state.eventRows = eventFeed.data || [];
      state.lastUpdated = [...state.rows, ...state.sponsorshipRows].filter((row) => row.source_name === "NHS Jobs").map((row) => row.last_checked_at).filter(Boolean).sort().at(-1) || null;
      state.total = feed.count || 0;
      state.profile = profile.data || {};
      state.saved = new Set((saved.data || []).map((row) => row.job_id));
      state.dismissed = new Set((dismissed.data || []).map((row) => row.opportunity_id));
      state.employers = employers.data || [];
      const destination = codeFor(state.profile?.destination_country || state.profile?.destination);
      const profession = String(state.profile?.profession || "").toLowerCase().includes("midwi") ? "midwife" : "nurse";
      const recommended = destination ? await countRows((query) => query.eq("source_name", "NHS Jobs").or(`country.eq.${destination},country.eq.${COUNTRY_NAMES[destination]}`).or(`profession.eq.both,profession.eq.${profession}`)) : 0;
      state.counts = { newJobs, nhsNursing, nhsMidwifery, sponsors, possibleSponsors, closingWeek, recommended, employers: employerCount };
      state.loaded = true;
      render();
      const sharedId = new URLSearchParams(location.search).get("opportunity");
      if (sharedId) { const shared = state.rows.find((row) => row.id === sharedId); if (shared) showDetail(shared); }
    } catch (error) {
      console.error("Opportunity Centre load failed", error);
      if (body) body.innerHTML = `<div class="opportunityState138"><b>Opportunities could not be loaded.</b><p>${esc(error.message)}</p><button data-opportunity-retry>Try again</button></div>`;
    } finally { state.loading = false; }
  }

  function score(row) {
    const profile = state.profile || {};
    const destination = codeFor(profile.destination_country || profile.destination || window.state?.country);
    const profession = String(profile.profession || "").toLowerCase();
    let points = row.featured ? 2 : 0;
    if (codeFor(row.country) === destination) points += 8;
    if (row.profession === "both" || profession.includes(row.profession)) points += 5;
    if (row.sponsorship_status === "confirmed") points += 3;
    if (row.internationally_educated_friendly) points += 2;
    if (row.published_at && Date.now() - new Date(row.published_at).getTime() < 7 * 86400000) points += 2;
    return points;
  }

  function reason(row) {
    const destination = codeFor(state.profile?.destination_country || state.profile?.destination || window.state?.country);
    if (codeFor(row.country) === destination) return `Recommended because ${COUNTRY_NAMES[destination] || row.country} is your selected destination.`;
    if (row.sponsorship_status === "confirmed") return "Visa sponsorship is confirmed by the recorded source.";
    if (row.internationally_educated_friendly) return "Suitable for internationally educated applicants.";
    return "Matches your profession or current journey preferences.";
  }

  function filteredRows() {
    const f = state.filters, now = Date.now(), fortnight = now + 14 * 86400000;
    return state.rows.filter((row) => {
      if (state.dismissed.has(row.id)) return false;
      const haystack = `${row.title} ${row.employer} ${row.summary || ""} ${row.specialty || ""} ${row.country}`.toLowerCase();
      const publishedAt = row.published_at ? new Date(row.published_at).getTime() : 0;
      return (!f.search || haystack.includes(f.search.toLowerCase())) &&
        (!f.country || codeFor(row.country) === f.country) &&
        (!f.profession || row.profession === "both" || row.profession === f.profession) &&
        (!f.type || row.opportunity_type === f.type) &&
        (!f.specialty || String(row.specialty || "").toLowerCase().includes(f.specialty.toLowerCase())) &&
        (!f.employer || String(row.employer || row.provider_name || "").toLowerCase().includes(f.employer.toLowerCase())) &&
        (!f.band || String(row.band || "").toLowerCase() === f.band.toLowerCase()) &&
        (!f.region || String(row.region || "").toLowerCase().includes(f.region.toLowerCase())) &&
        (!f.city || String(row.city || row.location || "").toLowerCase().includes(f.city.toLowerCase())) &&
        (!f.contract || String(row.employment_type || "").toLowerCase().includes(f.contract.toLowerCase())) &&
        (!f.workingPattern || String(row.working_pattern || "").toLowerCase().includes(f.workingPattern.toLowerCase())) &&
        (!f.salaryMin || Number(row.salary_max || row.salary_min || 0) >= Number(f.salaryMin)) &&
        (!f.sponsorship || row.sponsorship_status === "confirmed") &&
        (!f.sponsorshipPossible || row.sponsorship_status === "confirmed" || row.sponsorship_status === "may_be_available") &&
        (!f.newToday || String(row.published_at || "").startsWith(today())) &&
        (!f.newWeek || publishedAt >= now - 7 * 86400000) &&
        (!f.remote || row.remote_interview) && (!f.graduate || row.graduate_friendly) &&
        (!f.saved || state.saved.has(row.id)) &&
        (!f.closing || (row.closing_at && new Date(row.closing_at).getTime() <= fortnight));
    });
  }

  function render() {
    const body = $("[data-opportunity-body]");
    if (!body) return;
    const rows = filteredRows();
    const recommended = [...state.rows].filter((row) => !state.dismissed.has(row.id)).sort((a, b) => score(b) - score(a) || String(b.published_at).localeCompare(String(a.published_at))).slice(0, 5);
    const activeFilters = Object.entries(state.filters).filter(([key, value]) => key !== "search" && Boolean(value)).length;
    const profileEnough = Boolean(state.profile?.profession && (state.profile?.destination_country || state.profile?.destination));
    body.innerHTML = `${intro()}
      <section class="opportunitySummary138" data-opportunity-summary aria-label="Live NHS Jobs opportunity summary">${summaryCard("New jobs today", state.counts.newJobs, "briefcase")}${summaryCard("NHS nursing jobs", state.counts.nhsNursing, "users")}${summaryCard("NHS midwifery jobs", state.counts.nhsMidwifery, "clinical")}${summaryCard("Visa sponsorship confirmed", state.counts.sponsors, "shield")}${summaryCard("Sponsorship may be available", state.counts.possibleSponsors, "target")}${summaryCard("Closing this week", state.counts.closingWeek, "calendar")}${summaryCard("Recommended for you", state.counts.recommended, "star")}${summaryCard("Employers currently recruiting", state.counts.employers, "building")}</section>
      ${nhsSourceNote()}
      <section class="ziburOpportunity138" data-opportunity-advisor><img class="ziburOpportunityArt138" src="assets/opportunities/zibur-advisor.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async"><span>ZIBUR OPPORTUNITY ADVISOR</span><h2>Your next move, made clearer.</h2><p>${profileEnough ? "Based on your saved destination and profession, the strongest matches appear first." : "Complete your profile and journey preferences to improve your recommendations."}</p><div><button data-show-recommended>${opportunityIcon("briefcase")}<span>View recommended jobs</span></button><button data-improve-profile>${opportunityIcon("user")}<span>Improve profile</span></button><button data-next-journey>${opportunityIcon("checklist")}<span>Review next journey step</span></button><button data-ask-zibur>${opportunityIcon("message")}<span>Ask Zibur</span></button></div></section>
      ${nhsSponsorshipSection(state.sponsorshipRows)}
      ${nhsCategories(rows)}
      <section class="opportunitySection138" data-recommended-section><div class="opportunityHeading138"><div><span>PERSONALISED</span><h2>Recommended for you</h2></div></div>${recommended.length ? `<div class="opportunityGrid138">${recommended.map((row) => card(row, reason(row))).join("")}</div>` : empty("No personalised opportunities are published yet.")}</section>
      <section class="opportunitySection138" data-opportunity-discover><div class="opportunityToolbar138"><label><span class="sr">Search opportunities</span><input data-opportunity-search type="search" value="${esc(state.filters.search)}" placeholder="Search jobs, events and updates"></label><button data-open-filters>Filters${activeFilters ? ` (${activeFilters})` : ""}</button></div><div class="opportunityHeading138"><div><span>DISCOVER</span><h2>${rows.length} matching result${rows.length === 1 ? "" : "s"}</h2></div><button data-clear-filters ${activeFilters || state.filters.search ? "" : "hidden"}>Clear filters</button></div>${rows.length ? countrySections(rows) : empty("No matching opportunities are currently available. Try clearing filters or update your preferences.")}${state.rows.length < state.total ? '<button class="opportunityMore138" data-load-more>Load more opportunities</button>' : ""}</section>
      ${typeSection("Scholarships & funding", "scholarship", state.fundingRows)}
      ${typeSection("Recruitment events & webinars", "event", state.eventRows)}
      ${nhsEmployerSection()}
      <section class="opportunityTools138"><div><span>JOURNEY TOOL</span><h2>Planning your relocation budget?</h2><p>Your existing estimates and calculations are still available.</p></div><button data-open-estimator>Relocation Cost Estimator</button></section>`;
    animateSummaryCounts(body);
    renderFilterDialog();
    addNhsFilterControls($("[data-opportunity-filters]"), state.filters);
  }

  function intro() {
    return `<section class="opportunityIntro138 opportunityHero138" aria-labelledby="opportunityHeroTitle138"><div class="opportunityHeroCopy138"><div class="opportunityHeroEyebrow138"><button class="back" data-open="home" aria-label="Back to home">←</button><span>NEXT STEP</span></div><h1 id="opportunityHeroTitle138">Opportunity <em>Centre</em></h1><p>Jobs, sponsorship, registration updates, partnerships and events selected for your journey.</p></div><div class="opportunityHeroVisual138" aria-hidden="true"><img class="opportunityHeroArt138" src="assets/opportunities/opportunity-centre-hero-v165.webp" alt="" decoding="async" fetchpriority="high"></div></section>`;
  }
  function nhsSourceNote() {
    const stale = state.lastUpdated && Date.now() - new Date(state.lastUpdated).getTime() > 48 * 60 * 60 * 1000;
    return `<section class="opportunityIntro138 opportunitySource138"><span class="opportunitySourceIcon138">${opportunityIcon("bell")}</span><div><p class="opportunityFreshness138 ${stale ? "stale" : ""}"><b>Updated daily from NHS Jobs.</b><small>${state.lastUpdated ? `Last updated: ${new Date(state.lastUpdated).toLocaleString("en-GB")}.${stale ? " Some vacancy information may be out of date. Confirm the latest details on NHS Jobs." : ""}` : "No NHS Jobs import has completed yet."}</small></p><p class="opportunityDisclaimer138">NHS vacancy information is sourced from <a href="https://www.jobs.nhs.uk" target="_blank" rel="noopener noreferrer">NHS Jobs</a>. Vacancy details, availability and application decisions remain with the recruiting employer and NHS Jobs. Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer">Open Government Licence v3.0</a>.</p></div></section>`;
  }
  const summaryCard = (label, count, icon) => {
    const key = { "New jobs today": "new-today", "NHS nursing jobs": "nursing", "NHS midwifery jobs": "midwifery", "Visa sponsorship confirmed": "sponsorship-confirmed", "Sponsorship may be available": "sponsorship-possible", "Closing this week": "closing-week", "Recommended for you": "recommended", "Employers currently recruiting": "employers" }[label];
    return `<button type="button" data-summary-filter="${key}" aria-label="View ${Number(count || 0)} ${esc(label)}"><span class="opportunitySummaryIcon138">${opportunityIcon(icon)}</span><span class="opportunitySummaryCopy138"><b data-stat-value="${Number(count || 0)}" aria-hidden="true">${Number(count || 0)}</b><span>${esc(label)}</span></span></button>`;
  };
  const empty = (text) => `<div class="opportunityState138"><b>Nothing to show yet</b><p>${esc(text)}</p></div>`;

  function animateSummaryCounts(root) {
    if (!root || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    $$('[data-opportunity-summary] [data-stat-value]', root).forEach((number) => {
      const target = Number(number.dataset.statValue || 0);
      if (!Number.isFinite(target) || target <= 0) return;
      const duration = 620, startedAt = performance.now();
      number.textContent = "0";
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        number.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1 && number.isConnected) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function countrySections(rows) {
    return Object.entries(COUNTRY_NAMES).map(([code, name]) => {
      const matches = rows.filter((row) => codeFor(row.country) === code);
      return `<details class="opportunityCountry138" ${code === codeFor(state.profile?.destination_country || state.profile?.destination || window.state?.country) ? "open" : ""}><summary><span>${esc(name)}</span><b>${matches.length}</b></summary>${matches.length ? `<div class="opportunityGrid138">${matches.map((row) => card(row)).join("")}</div>` : `<p>No published opportunities for ${esc(name)} match these filters.</p>`}</details>`;
    }).join("");
  }

  function typeSection(title, type, rows) {
    const matches = rows.filter((row) => row.opportunity_type === type);
    return `<section class="opportunitySection138"><div class="opportunityHeading138"><div><span>${type === "event" ? "CONNECT" : "FUND YOUR PROGRESS"}</span><h2>${title}</h2></div></div>${matches.length ? `<div class="opportunityGrid138">${matches.slice(0, 6).map((row) => card(row)).join("")}</div>` : empty(`No verified ${title.toLowerCase()} are currently published.`)}</section>`;
  }

  function employerSection() {
    return `<section class="opportunitySection138"><div class="opportunityHeading138"><div><span>CQC-RATED EMPLOYERS WITH LIVE VACANCIES</span><h2>Employer spotlight</h2></div></div>${state.employers.length ? `<div class="opportunityGrid138">${state.employers.map((employer) => { const vacancies = Number(employer.active_job_count || state.rows.filter((row) => row.employer_id === employer.id && row.opportunity_type === "job").length); const cqc = /^CQC overall rating:\s*([^.]*)/i.exec(employer.description || ""); return `<article class="employerCard138">${employer.logo_url ? `<img src="${esc(employer.logo_url)}" alt="${esc(employer.name)} logo" loading="lazy">` : ""}<span>${cqc ? `CQC ${esc(cqc[1])}` : "Verified employer"}</span><h3>${esc(employer.name)}</h3><p>${esc(employer.description || COUNTRY_NAMES[codeFor(employer.country_code)] || employer.country_code)}</p><small>${vacancies} active vacanc${vacancies === 1 ? "y" : "ies"} · Rating checked: ${dateLabel(employer.last_checked_at)}</small><div class="opportunityActions138">${employer.source_url ? `<a href="${esc(employer.source_url)}" target="_blank" rel="noopener">View CQC rating</a>` : ""}${employer.website_url ? `<a href="${esc(employer.website_url)}" target="_blank" rel="noopener">Employer website</a>` : ""}</div></article>`; }).join("")}</div><p class="opportunityDisclaimer138">CQC ratings apply to the named provider and may not represent every individual service or location. Open the CQC record before applying.</p>` : empty("No CQC-verified employer spotlights with active vacancies are currently published.")}</section>`;
  }

  function sponsorshipSection(rows) {
    const rank = { confirmed: 0, may_be_available: 1 };
    const matches = rows.filter((row) => row.opportunity_type === "job" && row.verified && row.sponsorship_status in rank).sort((a, b) => rank[a.sponsorship_status] - rank[b.sponsorship_status] || new Date(b.published_at || 0) - new Date(a.published_at || 0) || new Date(a.closing_at || "9999-12-31") - new Date(b.closing_at || "9999-12-31"));
    return `<section class="opportunitySection138 opportunitySponsor138"><div class="opportunityHeading138"><div><span>SPONSORSHIP FIRST</span><h2>Visa sponsorship opportunities</h2></div></div><p class="opportunityDisclaimer138">Sponsorship wording is classified conservatively from the recorded source. Confirm eligibility and availability with the employer before applying.</p>${matches.length ? `<div class="opportunityGrid138">${matches.slice(0, 6).map((row) => card(row)).join("")}</div>` : empty("No verified sponsorship roles are currently published.")}</section>`;
  }

  function nhsEmployerSection() {
    return `<section class="opportunitySection138"><div class="opportunityHeading138"><div><span>CQC-RATED EMPLOYERS WITH LIVE VACANCIES</span><h2>Employer spotlight</h2></div></div>${state.employers.length ? `<div class="opportunityGrid138">${state.employers.map((employer) => { const cqc = /^CQC overall rating:\s*([^.]*)/i.exec(employer.description || ""); const vacancies = Number(employer.active_job_count || 0); return `<article class="employerCard138"><span>${cqc ? `CQC ${esc(cqc[1])}` : "Verified employer"}</span><h3>${esc(employer.name)}</h3><p>${esc(employer.description || COUNTRY_NAMES[codeFor(employer.country_code)] || employer.country_code)}</p><small>${vacancies} active vacanc${vacancies === 1 ? "y" : "ies"} · ${Number(employer.active_nursing_count || 0)} nursing · ${Number(employer.active_midwifery_count || 0)} midwifery · Rating checked: ${dateLabel(employer.last_checked_at)}</small>${employer.source_url ? `<a href="${esc(employer.source_url)}" target="_blank" rel="noopener noreferrer">View official CQC rating ↗</a>` : ""}</article>`; }).join("")}</div><p class="opportunityDisclaimer138">CQC ratings apply to the named provider and may not represent every individual service or location. Open the official CQC record before applying.</p>` : empty("No CQC-verified employer spotlights with active vacancies are currently published.")}</section>`;
  }

  function nhsSponsorshipSection(rows) {
    const rank = { confirmed: 0, may_be_available: 1 };
    const matches = rows.filter((row) => row.source_name === "NHS Jobs" && row.opportunity_type === "job" && row.verified && row.sponsorship_status in rank && (state.includePossibleSponsorship || row.sponsorship_status === "confirmed")).sort((a, b) => rank[a.sponsorship_status] - rank[b.sponsorship_status] || new Date(b.published_at || 0) - new Date(a.closing_at || "9999-12-31"));
    return `<section class="opportunitySection138 opportunitySponsor138"><div class="opportunityHeading138"><div><span>SPONSORSHIP FIRST</span><h2>Visa Sponsorship Jobs</h2></div><button data-toggle-possible-sponsorship aria-pressed="${state.includePossibleSponsorship}">${state.includePossibleSponsorship ? "Confirmed sponsorship only" : "Include sponsorship that may be available"}</button></div><p class="opportunityDisclaimer138">Always confirm sponsorship eligibility in the full NHS Jobs advert and with the recruiting employer before applying.</p>${matches.length ? `<div class="opportunityGrid138">${matches.slice(0, 6).map((row) => card(row)).join("")}</div>` : empty("No NHS Jobs vacancies with confirmed sponsorship are currently published.")}</section>`;
  }

  function nhsCategories(rows) {
    const nhsRows = rows.filter((row) => row.source_name === "NHS Jobs" && row.opportunity_type === "job");
    const categories = [
      ["All NHS nursing jobs", (row) => row.profession === "nurse" || row.profession === "both"], ["All NHS midwifery jobs", (row) => row.profession === "midwife" || row.profession === "both"],
      ["Visa sponsorship confirmed", (row) => row.sponsorship_status === "confirmed"], ["Sponsorship may be available", (row) => row.sponsorship_status === "may_be_available"],
      ["Newly added today", (row) => String(row.published_at || "").startsWith(today())], ["Closing soon", (row) => row.closing_at && new Date(row.closing_at).getTime() <= Date.now() + 7 * 86400000],
      ["Newly qualified roles", (row) => /newly qualified|preceptorship/i.test(`${row.title} ${row.summary || ""}`)], ["Band 5 roles", (row) => row.band === "Band 5"], ["Band 6 roles", (row) => row.band === "Band 6"],
      ["Band 7 and above", (row) => /^Band (7|8|9)/.test(row.band || "")], ["Theatre and recovery", (row) => row.specialty === "theatre and recovery"], ["Critical care", (row) => row.specialty === "critical care"],
      ["Emergency nursing", (row) => row.specialty === "emergency nursing"], ["Mental health nursing", (row) => row.specialty === "mental health nursing"], ["Community nursing", (row) => row.specialty === "community nursing"],
      ["Paediatric and neonatal nursing", (row) => row.specialty === "paediatric and neonatal nursing"], ["Learning disability nursing", (row) => row.specialty === "learning disability nursing"], ["Maternity and midwifery", (row) => row.specialty === "maternity and midwifery"],
      ["Practice development and education", (row) => row.specialty === "practice development and education"], ["Research nursing", (row) => row.specialty === "research nursing"], ["Management and leadership", (row) => row.specialty === "management and leadership"],
    ].map(([label, matches]) => [label, nhsRows.filter(matches)]).filter(([, matches]) => matches.length);
    return categories.length ? `<section class="opportunitySection138"><div class="opportunityHeading138"><div><span>UNITED KINGDOM · NHS JOBS</span><h2>NHS vacancy categories</h2></div></div>${categories.map(([label, matches]) => `<details class="opportunityCountry138"><summary><span>${label}</span><b>${matches.length}</b></summary><div class="opportunityGrid138">${matches.slice(0, 3).map((row) => card(row)).join("")}</div></details>`).join("")}</section>` : "";
  }

  function card(row, explanation = "") {
    if (row.source_name === "NHS Jobs") return nhsCard(row, explanation);
    const original = row.canonical_url || row.source_url;
    const external = original ? `<a href="${esc(original)}" target="_blank" rel="noopener noreferrer" data-apply-opportunity="${row.id}">View original source ↗</a>` : "";
    return baseCard(row, explanation).replace('<div class="opportunityActions138">', `<p class="opportunityDisclaimer138">Verify eligibility, sponsorship, deadlines, salary, registration requirements and funding terms on the original source.</p><div class="opportunityActions138">${external}`).replaceAll('rel="noopener"', 'rel="noopener noreferrer"');
  }

  function nhsCard(row, explanation = "") {
    const extra = `${row.band ? `<div><dt>NHS band</dt><dd>${esc(row.band)}</dd></div>` : ""}<div><dt>Published</dt><dd>${dateLabel(row.published_at)}</dd></div>${row.specialty ? `<div><dt>Category</dt><dd>${esc(row.profession === "midwife" ? "Midwife" : "Nurse")} · ${esc(row.specialty)}</dd></div>` : ""}`;
    return baseCard(row, explanation).replace('<div class="opportunityCardTop138">', '<div class="opportunityCardTop138"><span>Source: NHS Jobs</span>').replace("</dl>", `${extra}</dl>`).replace('<div class="opportunityActions138">', '<p class="opportunityDisclaimer138">View the full vacancy details here. Applying continues securely on the original NHS Jobs website.</p><div class="opportunityActions138">').replaceAll('rel="noopener"', 'rel="noopener noreferrer"').replace('>Apply</a>', '>Apply on NHS Jobs ↗</a>');
  }

  function baseCard(row, explanation = "") {
    const type = TYPE_LABELS[row.opportunity_type] || "Opportunity";
    const salary = row.salary_text || (row.salary_min || row.salary_max ? `${esc(row.currency || "")} ${Number(row.salary_min || row.salary_max).toLocaleString()}${row.salary_max && row.salary_min ? `–${Number(row.salary_max).toLocaleString()}` : ""}` : "");
    const source = row.source_name || row.provider_name || row.employer;
    return `<article class="opportunityCard138" data-opportunity-card="${row.id}"><div class="opportunityCardTop138"><span>${esc(type)}</span>${row.verified ? "<b>Verified</b>" : "<b>Source not verified</b>"}</div><h3>${esc(row.title)}</h3><p>${esc(row.summary || row.description || "Open the source for full details.")}</p>${explanation ? `<div class="opportunityReason138">${esc(explanation)}</div>` : ""}<dl><div><dt>Provider</dt><dd>${esc(row.employer || row.provider_name || "Not stated")}</dd></div><div><dt>Location</dt><dd>${esc([row.city || row.location, COUNTRY_NAMES[codeFor(row.country)] || row.country].filter(Boolean).join(", "))}</dd></div>${salary ? `<div><dt>Salary / funding</dt><dd>${salary}</dd></div>` : ""}<div><dt>Sponsorship</dt><dd>${esc(SPONSOR_LABELS[row.sponsorship_status] || SPONSOR_LABELS.not_stated)}</dd></div><div><dt>Closing date</dt><dd>${dateLabel(row.closing_at || row.closing_date)}</dd></div><div><dt>Source</dt><dd>${esc(source || "Not stated")} · checked ${dateLabel(row.last_checked_at)}</dd></div></dl><div class="opportunityActions138"><button data-view-opportunity="${row.id}">View details</button><button data-save-opportunity="${row.id}" aria-pressed="${state.saved.has(row.id)}">${state.saved.has(row.id) ? "Saved" : "Save"}</button><button data-share-opportunity="${row.id}">Share</button>${row.opportunity_type === "event" && row.event_start_at ? `<button data-calendar-opportunity="${row.id}">Add to calendar</button>` : ""}${row.application_url || row.registration_url || row.source_url ? `<a href="${esc(row.application_url || row.registration_url || row.source_url)}" target="_blank" rel="noopener" data-apply-opportunity="${row.id}">${row.opportunity_type === "event" ? "Register" : row.opportunity_type === "job" ? "Apply" : "Official source"}</a>` : ""}<button class="quiet138" data-dismiss-opportunity="${row.id}">Hide</button></div></article>`;
  }

  function renderFilterDialog() {
    const dialog = $("[data-opportunity-filters]");
    if (!dialog) return;
    const f = state.filters;
    dialog.innerHTML = `<form method="dialog"><div class="opportunityDialogHead138"><h2>Filter opportunities</h2><button value="cancel" aria-label="Close filters">×</button></div><label>Country<select name="country"><option value="">All countries</option>${Object.entries(COUNTRY_NAMES).map(([code, name]) => `<option value="${code}" ${f.country === code ? "selected" : ""}>${name}</option>`).join("")}</select></label><label>Profession<select name="profession"><option value="">All professions</option><option value="nurse" ${f.profession === "nurse" ? "selected" : ""}>Nurse</option><option value="midwife" ${f.profession === "midwife" ? "selected" : ""}>Midwife</option></select></label><label>Opportunity type<select name="type"><option value="">All types</option>${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}" ${f.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label>Specialty<input name="specialty" value="${esc(f.specialty)}" placeholder="e.g. theatre"></label><label>Employer<input name="employer" value="${esc(f.employer)}" placeholder="Employer or provider"></label><label>Minimum salary or funding<input name="salaryMin" type="number" min="0" value="${esc(f.salaryMin)}"></label><div class="opportunityChecks138">${[["sponsorship","Visa sponsorship only"],["newToday","New today"],["remote","Remote interview"],["graduate","Graduate friendly"],["saved","Saved only"],["closing","Closing soon"]].map(([name, label]) => `<label><input type="checkbox" name="${name}" ${f[name] ? "checked" : ""}> ${label}</label>`).join("")}</div><div class="opportunityDialogActions138"><button type="button" data-filter-reset>Clear filters</button><button value="apply" data-filter-apply>Apply filters</button></div></form>`;
  }

  function addNhsFilterControls(dialog, f) {
    const checks = $(".opportunityChecks138", dialog);
    if (!checks) return;
    checks.insertAdjacentHTML("beforebegin", `<label>NHS band<input name="band" value="${esc(f.band)}" placeholder="e.g. Band 5"></label><label>Region<input name="region" value="${esc(f.region)}"></label><label>Town or city<input name="city" value="${esc(f.city)}"></label><label>Contract type<input name="contract" value="${esc(f.contract)}"></label><label>Working pattern<input name="workingPattern" value="${esc(f.workingPattern)}"></label>`);
    checks.insertAdjacentHTML("beforeend", `<label><input type="checkbox" name="sponsorshipPossible" ${f.sponsorshipPossible ? "checked" : ""}> Include sponsorship that may be available</label><label><input type="checkbox" name="newWeek" ${f.newWeek ? "checked" : ""}> Published this week</label>`);
  }

  function handleInput(event) {
    if (event.target.matches("[data-opportunity-search]")) {
      state.filters.search = event.target.value;
      clearTimeout(handleInput.timer);
      handleInput.timer = setTimeout(render, 180);
    }
  }

  async function handleClick(event) {
    const button = event.target.closest("button,a");
    if (!button) return;
    if (button.dataset.open) return showScreen(button.dataset.open);
    if (button.matches("[data-opportunity-retry]")) return load();
    if (button.matches("[data-summary-filter]")) return showSummaryJobs(button.dataset.summaryFilter);
    if (button.matches("[data-summary-close]")) return $("[data-opportunity-summary-dialog]")?.close();
    if (button.matches("[data-open-filters]")) return $("[data-opportunity-filters]")?.showModal();
    if (button.matches("[data-filter-reset],[data-clear-filters]")) { state.filters = { search: "", country: "", profession: "", type: "", specialty: "", employer: "", band: "", region: "", city: "", contract: "", workingPattern: "", salaryMin: "", sponsorship: false, sponsorshipPossible: false, newToday: false, newWeek: false, remote: false, graduate: false, saved: false, closing: false }; $("[data-opportunity-filters]")?.close(); return render(); }
    if (button.matches("[data-filter-apply]")) { event.preventDefault(); const form = button.form, data = new FormData(form); for (const key of ["country","profession","type","specialty","employer","band","region","city","contract","workingPattern","salaryMin"]) state.filters[key] = String(data.get(key) || ""); for (const key of ["sponsorship","sponsorshipPossible","newToday","newWeek","remote","graduate","saved","closing"]) state.filters[key] = data.has(key); $("[data-opportunity-filters]")?.close(); track("opportunity_filters_applied", { filters: state.filters }); return render(); }
    if (button.matches("[data-load-more]")) { state.page += 1; return load(false); }
    if (button.matches("[data-toggle-possible-sponsorship]")) { state.includePossibleSponsorship = !state.includePossibleSponsorship; return render(); }
    if (button.matches("[data-open-estimator]")) return showScreen("cost-estimator");
    if (button.matches("[data-show-recommended]")) return $("[data-recommended-section]")?.scrollIntoView({ behavior: "smooth" });
    if (button.matches("[data-improve-profile]")) return showScreen("profile");
    if (button.matches("[data-next-journey]")) return showScreen("checklist");
    if (button.matches("[data-ask-zibur]")) { showScreen("assistant"); const input = $("#question"); if (input) { input.value = "Which published opportunities best match my destination and current journey stage?"; input.focus(); } return; }
    const id = button.dataset.saveOpportunity || button.dataset.shareOpportunity || button.dataset.calendarOpportunity || button.dataset.dismissOpportunity || button.dataset.viewOpportunity || button.dataset.applyOpportunity;
    if (!id) return;
    const row = [...state.rows, ...state.sponsorshipRows, ...state.fundingRows, ...state.eventRows, ...state.summaryRows].find((item) => item.id === id);
    if (!row) return;
    if (button.dataset.saveOpportunity) return toggleSave(row);
    if (button.dataset.shareOpportunity) return share(row);
    if (button.dataset.calendarOpportunity) return addToCalendar(row);
    if (button.dataset.dismissOpportunity) return dismiss(row);
    if (button.dataset.viewOpportunity) { $("[data-opportunity-summary-dialog]")?.close(); return showDetail(row); }
    if (button.dataset.applyOpportunity) track("opportunity_apply_clicked", { opportunity_id: id });
  }

  async function toggleSave(row) {
    const { data: auth } = await db().auth.getUser(), user = auth?.user;
    if (!user) return notify("Sign in to save opportunities.");
    const saved = state.saved.has(row.id);
    const result = saved ? await db().from("btv_saved_jobs").delete().eq("user_id", user.id).eq("job_id", row.id) : await db().from("btv_saved_jobs").insert({ user_id: user.id, job_id: row.id });
    if (result.error) return notify(result.error.message);
    saved ? state.saved.delete(row.id) : state.saved.add(row.id);
    notify(saved ? "Removed from saved opportunities" : "Opportunity saved");
    track(saved ? "opportunity_unsaved" : "opportunity_saved", { opportunity_id: row.id });
    render();
  }

  async function dismiss(row) {
    const { data: auth } = await db().auth.getUser(), user = auth?.user;
    if (!user) return;
    const { error } = await db().from("btv_opportunity_dismissals").insert({ user_id: user.id, opportunity_id: row.id });
    if (error && !String(error.message).toLowerCase().includes("duplicate")) return notify(error.message);
    state.dismissed.add(row.id); render();
  }

  async function share(row) {
    const url = `${location.origin}/opportunities?opportunity=${encodeURIComponent(row.id)}`;
    try { if (navigator.share) await navigator.share({ title: row.title, text: row.summary || row.title, url }); else { await navigator.clipboard.writeText(url); notify("Opportunity link copied"); } track("opportunity_shared", { opportunity_id: row.id }); } catch (error) { if (error.name !== "AbortError") notify("The opportunity link could not be shared."); }
  }

  function addToCalendar(row) {
    const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Beyond The Visa//Opportunity Centre//EN","BEGIN:VEVENT",`UID:${row.id}@beyondthevisa.org`,`DTSTART:${stamp(row.event_start_at)}`,`DTEND:${stamp(row.event_end_at || new Date(new Date(row.event_start_at).getTime() + 3600000))}`,`SUMMARY:${String(row.title).replace(/[\n,;]/g, " ")}`,`DESCRIPTION:${String(row.summary || "").replace(/[\n,;]/g, " ")}`,`URL:${row.registration_url || row.source_url || "https://www.beyondthevisa.org/opportunities"}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); link.download = "opportunity-event.ics"; link.click(); URL.revokeObjectURL(link.href); track("opportunity_event_calendar", { opportunity_id: row.id });
  }

  async function showSummaryJobs(filterKey) {
    const dialog = $("[data-opportunity-summary-dialog]");
    if (!dialog || !db()) return;
    const definitions = {
      "new-today": ["New jobs today", "Vacancies published today", "briefcase"],
      nursing: ["NHS nursing jobs", "Current nursing vacancies from NHS Jobs", "users"],
      midwifery: ["NHS midwifery jobs", "Current midwifery vacancies from NHS Jobs", "clinical"],
      "sponsorship-confirmed": ["Visa sponsorship confirmed", "Vacancies whose current advert explicitly confirms sponsorship", "shield"],
      "sponsorship-possible": ["Sponsorship may be available", "Vacancies where the current advert indicates sponsorship may be available", "target"],
      "closing-week": ["Closing this week", "Vacancies closing during the next seven days", "calendar"],
      recommended: ["Recommended for you", "Current vacancies matched to your saved destination and profession", "star"],
      employers: ["Employers currently recruiting", "Current vacancies from active NHS employers", "building"],
    };
    const definition = definitions[filterKey];
    if (!definition) return;
    const [title, description, icon] = definition;
    dialog.innerHTML = `<section class="opportunitySummaryModal138"><header><span class="opportunitySummaryModalIcon138">${opportunityIcon(icon)}</span><div><small>UPDATED DAILY FROM NHS JOBS</small><h2>${esc(title)}</h2><p>${esc(description)}</p></div><button type="button" data-summary-close aria-label="Close ${esc(title)}">&times;</button></header><div class="opportunitySummaryLoading138" role="status"><span></span><b>Loading current vacancies&hellip;</b></div></section>`;
    dialog.showModal();
    try {
      let query = db().from("btv_jobs").select("*").in("status", ACTIVE_OPPORTUNITY_STATUSES).is("expired_at", null).eq("source_name", "NHS Jobs").eq("opportunity_type", "job").eq("verified", true).order("featured", { ascending: false }).order("published_at", { ascending: false }).limit(48);
      if (filterKey === "new-today") query = query.gte("published_at", `${today()}T00:00:00Z`);
      if (filterKey === "nursing") query = query.in("profession", ["nurse", "both"]);
      if (filterKey === "midwifery") query = query.in("profession", ["midwife", "both"]);
      if (filterKey === "sponsorship-confirmed") query = query.eq("sponsorship_status", "confirmed");
      if (filterKey === "sponsorship-possible") query = query.eq("sponsorship_status", "may_be_available");
      if (filterKey === "closing-week") { const weekEnd = new Date(); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7); query = query.gte("closing_at", new Date().toISOString()).lte("closing_at", weekEnd.toISOString()).order("closing_at", { ascending: true }); }
      if (filterKey === "recommended") {
        const destination = codeFor(state.profile?.destination_country || state.profile?.destination);
        const profession = String(state.profile?.profession || "").toLowerCase().includes("midwi") ? "midwife" : "nurse";
        if (destination) query = query.or(`country.eq.${destination},country.eq.${COUNTRY_NAMES[destination]}`).or(`profession.eq.both,profession.eq.${profession}`);
        else query = query.in("profession", [profession, "both"]);
      }
      if (filterKey === "employers") query = query.not("employer", "is", null).order("employer", { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      state.summaryRows = data || [];
      const updated = state.lastUpdated ? `Last updated ${new Date(state.lastUpdated).toLocaleString("en-GB")}` : "Updated through the daily NHS Jobs import";
      dialog.innerHTML = `<section class="opportunitySummaryModal138"><header><span class="opportunitySummaryModalIcon138">${opportunityIcon(icon)}</span><div><small>UPDATED DAILY FROM NHS JOBS</small><h2>${esc(title)}</h2><p>${esc(description)} &middot; ${esc(updated)}</p></div><button type="button" data-summary-close aria-label="Close ${esc(title)}">&times;</button></header>${state.summaryRows.length ? `<div class="opportunitySummaryResults138">${state.summaryRows.map((row) => card(row)).join("")}</div>` : empty("No current vacancies are available in this category. The list will update after the next daily NHS Jobs import.")}</section>`;
      track("opportunity_summary_opened", { category: filterKey, result_count: state.summaryRows.length });
    } catch (error) {
      dialog.innerHTML = `<section class="opportunitySummaryModal138"><header><div><small>OPPORTUNITY CENTRE</small><h2>${esc(title)}</h2></div><button type="button" data-summary-close aria-label="Close ${esc(title)}">&times;</button></header><div class="opportunityState138"><b>These jobs could not be loaded.</b><p>${esc(error.message)}</p><button type="button" data-summary-filter="${esc(filterKey)}">Try again</button></div></section>`;
    }
  }

  async function showDetail(row) {
    const dialog = $("[data-opportunity-detail]");
    if (row.source_name === "NHS Jobs") {
      const source = row.canonical_url || row.source_url || row.application_url;
      let advertId = ""; try { advertId = new URL(source, location.origin).pathname.match(/\/jobadvert\/([^/]+)/i)?.[1] || ""; } catch {}
      advertId = advertId || row.external_reference || row.external_id || "";
      dialog.classList.add("nhsJobDetail150");
      dialog.innerHTML = '<article><button class="nhsJobDetailClose150" data-close-job-detail aria-label="Close job details">×</button><div class="nhsJobDetailLoading150"><b>Loading the full NHS Jobs advert...</b><p>Retrieving duties, requirements and employer details.</p></div></article>';
      dialog.querySelector("[data-close-job-detail]").onclick = () => dialog.close();
      dialog.showModal();
      let details = {};
      try { const response = await fetch(`/api/job-details?id=${encodeURIComponent(advertId)}`), payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Details could not be loaded."); details = payload; }
      catch (error) { details = { overview: row.summary, error: error.message, applyUrl: row.application_url || source, sourceUrl: source }; }
      const block = (title, value) => value ? `<section><h2>${esc(title)}</h2><p>${esc(value).replace(/\n/g,"<br>")}</p></section>` : "";
      const apply = details.applyUrl || row.application_url || source;
      dialog.innerHTML = `<article><button class="nhsJobDetailClose150" data-close-job-detail aria-label="Close job details">×</button><header><span>VACANCY DETAILS · NHS JOBS</span><h1>${esc(details.title || row.title)}</h1><p>${esc(details.employer || row.employer)}</p></header><div class="nhsJobDetailActions150"><button data-close-job-detail>← Back to opportunities</button>${apply ? `<a href="${esc(apply)}" target="_blank" rel="noopener noreferrer" data-apply-opportunity="${row.id}">Apply on NHS Jobs ↗</a>` : ""}</div><dl class="nhsJobDetailFacts150"><div><dt>Salary</dt><dd>${esc(details.salary || row.salary_text || "Not stated")}</dd></div><div><dt>Location</dt><dd>${esc(details.address || row.location || row.city || "Not stated")}</dd></div><div><dt>Closing date</dt><dd>${esc(details.closingDate || dateLabel(row.closing_at))}</dd></div><div><dt>Reference</dt><dd>${esc(details.reference || row.external_reference || "Not stated")}</dd></div><div><dt>Published</dt><dd>${esc(details.datePosted || dateLabel(row.published_at))}</dd></div><div><dt>Sponsorship</dt><dd>${esc(SPONSOR_LABELS[row.sponsorship_status] || SPONSOR_LABELS.not_stated)}</dd></div></dl>${details.error ? `<p class="nhsJobDetailNotice150">${esc(details.error)} You can still continue to the official advert.</p>` : ""}${block("Job summary", details.overview || row.summary)}${block("Main duties of the job", details.mainDuties)}${block("Job description and responsibilities", details.jobDescription)}${block("About the employer", details.aboutEmployer)}${block("Person specification", details.personSpecification)}${block("Additional information", details.additionalInformation)}${block("Employer contact", [details.contactRole,details.contactName,details.contactEmail,details.contactPhone].filter(Boolean).join("\n") || "See the official advert for employer contact details.")}<footer><p>Vacancy information is reproduced from NHS Jobs. Confirm current availability, eligibility, salary, sponsorship and application requirements on the original advert.</p>${apply ? `<a href="${esc(apply)}" target="_blank" rel="noopener noreferrer" data-apply-opportunity="${row.id}">Apply on NHS Jobs ↗</a>` : ""}${details.sourceUrl ? `<a href="${esc(details.sourceUrl)}" target="_blank" rel="noopener noreferrer">View original advert</a>` : ""}</footer></article>`;
      dialog.querySelectorAll("[data-close-job-detail]").forEach((button) => button.onclick = () => dialog.close());
      track("opportunity_viewed", { opportunity_id: row.id }); return;
    }
    dialog.classList.remove("nhsJobDetail150");
    dialog.innerHTML = `<article><div class="opportunityDialogHead138"><span>${esc(TYPE_LABELS[row.opportunity_type] || "Opportunity")}</span><button aria-label="Close details">×</button></div><h2>${esc(row.title)}</h2><p>${esc(row.description || row.summary || "Full information is available from the recorded source.")}</p><p><b>Source:</b> ${esc(row.source_name || row.provider_name || row.employer || "Not stated")}<br><b>Published:</b> ${dateLabel(row.published_at)}<br><b>Last checked:</b> ${dateLabel(row.last_checked_at)}</p>${row.source_url ? `<a href="${esc(row.source_url)}" target="_blank" rel="noopener">Open official or original source</a>` : ""}</article>`;
    $("button", dialog).onclick = () => dialog.close();
    dialog.showModal(); track("opportunity_viewed", { opportunity_id: row.id });
  }

  async function track(eventType, metadata) {
    try { const { data } = await db().auth.getUser(); if (!data?.user) return; await db().from("btv_client_events").insert({ user_id: data.user.id, event_type: eventType, message: "Opportunity Centre interaction", route: "/opportunities", app_version: "138", metadata }); } catch {}
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", install, { once: true }) : install();
  new MutationObserver(upgradeEntryPoints).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("btv:session-restored", () => { if ($("#opportunities.active")) load(); });
})();
