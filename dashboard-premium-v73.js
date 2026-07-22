(function(){
  if (window.__btvDashboardPremium73) return;
  window.__btvDashboardPremium73 = true;

  const F = () => window.BTVFeatures;
  const db = () => window.btvSupabase;
  let state = {};
  let renderQueued = false;
  let lastFocus = null;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const iconSvg = (name) => ({
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5V21h-6v-7H9v7H3z"/></svg>',
    journey: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="4" cy="6" r="1.4"/><circle cx="4" cy="12" r="1.4"/><circle cx="4" cy="18" r="1.4"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6z"/></svg>',
    learn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5z"/><path d="M9 3v18"/></svg>',
    cost: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M8.5 9.5h5a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h5"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="18" cy="9" r="2.3"/><path d="M15.5 20a5 5 0 0 1 5-4.4"/></svg>',
    mentor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V7l8-4 8 4v13"/><path d="M8 10h8M8 14h8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10 21h4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 1 1 11.5 4 7 7 0 0 0 20 15.5z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M8.8 9.4H14a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h4.4"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  }[name] || "");
  const initials = (name) => {
    const token = String(name || "").trim();
    if (!token) return "M";
    return token[0].toUpperCase();
  };

  function localProfile() {
    try {
      return JSON.parse(localStorage.getItem("btv-profile") || "{}");
    } catch {
      return {};
    }
  }

  function safeName(u) {
    const p = localProfile();
    const raw = p.preferredName || p.name || u?.user_metadata?.preferred_name || u?.user_metadata?.full_name || "";
    const value = String(raw).trim().split(/\s+/)[0];
    return value && !/@/.test(value) ? value : "MR";
  }

  function userPathway(u) {
    const p = localProfile();
    const profession = p.profession || u?.user_metadata?.profession || "Nurse";
    const destination = p.destination || u?.user_metadata?.destination || "United States";
    return `${profession} pathway - ${destination}`;
  }

  function fmtHeaderDate() {
    const d = new Date();
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString(undefined, { month: "long" }).toUpperCase();
    return `${weekday}, ${day} ${month} ${d.getFullYear()}`;
  }

  function fmtHeroDate() {
    const d = new Date();
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString(undefined, { month: "long" }).toUpperCase();
    return `${weekday} ${day} ${month}`;
  }

  async function load() {
    const session = (await db()?.auth?.getSession())?.data?.session;
    if (!session) return null;
    const u = session.user;
    let platform = {};
    try {
      const [wallet, game, mocks, notes, saved, progress, steps, activity] = await Promise.all([
        db().from("btv_wallets").select("*").eq("user_id", u.id).maybeSingle(),
        db().from("btv_gamification").select("*").eq("user_id", u.id).maybeSingle(),
        db().from("btv_mock_sessions").select("*").eq("user_id", u.id).order("started_at", { ascending: false }).limit(12),
        db().from("btv_notifications").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(12),
        db().from("btv_saved_jobs").select("*").eq("user_id", u.id),
        db().from("btv_user_journey_progress").select("*").eq("user_id", u.id),
        db().from("btv_journey_steps").select("*").eq("is_active", true).order("sort_order"),
        db().from("btv_study_activity").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const failed = [wallet, game, mocks, notes, saved, progress, steps, activity].find((x) => x.error);
      if (failed) throw failed.error;
      platform = {
        wallet: wallet.data || { balance: 0 },
        game: game.data || { level: 1, xp: 0, current_streak: 0 },
        mocks: mocks.data || [],
        notes: notes.data || [],
        saved: saved.data || [],
        progress: progress.data || [],
        steps: steps.data || [],
        activity: activity.data || [],
      };
    } catch (e) {
      console.warn("v73 data fallback", e);
      platform = { wallet: { balance: 0 }, game: { level: 1, xp: 0, current_streak: 0 }, mocks: [], notes: [], saved: [], progress: [], steps: [], activity: [] };
    }
    state = { u, ...platform };
    return state;
  }

  function journey() {
    const legacy = typeof window.completed === "function" ? window.completed() : 0;
    const legacyTotal = typeof window.country === "function" ? window.country()?.steps?.length || 0 : 0;
    const done = state.progress?.filter((x) => x.completed === true || Boolean(x.completed_at)).length || legacy;
    const total = state.steps?.length || legacyTotal || 7;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function recommendation(j) {
    const p = localProfile();
    if (!p.profession || !p.destination) return { title: "Complete your profile", copy: "Add your profession and destination for personalised guidance.", id: "profile" };
    const active = state.mocks?.find((x) => x.status === "active" || x.status === "in_progress");
    if (active) return { title: "Resume your active mock", copy: `Continue ${String(active.mock_code).replaceAll("_", " ")} without paying again.`, id: "mock-tests" };
    if (!j.done) return { title: "Take your first journey step", copy: "Open your pathway and complete the first milestone.", id: "journey" };
    if (state.notes?.some((x) => !x.read_at)) return { title: "Review your updates", copy: "You have unread guidance and account notifications.", id: "notifications" };
    return { title: "Continue today’s study plan", copy: "Keep your learning streak moving forward.", id: "study-plan" };
  }

  function cbtStats() {
    const latest = state.mocks?.find((x) => String(x.mock_code || "").toLowerCase().includes("cbt") && (x.status === "completed" || x.status === "submitted"));
    if (!latest || !latest.total) return { value: "-", sub: "0 questions answered" };
    const pct = Math.round((Number(latest.score || 0) / Number(latest.total || 1)) * 100);
    return { value: `${pct}%`, sub: `${Number(latest.total || 0)} questions answered` };
  }

  function go(id) {
    F()?.open(id);
  }

  function themeToggle() {
    document.getElementById("theme")?.click();
  }

  function openDrawer(trigger) {
    lastFocus = trigger;
    let o = document.getElementById("drawerBackdrop73");
    if (!o) {
      o = document.createElement("div");
      o.id = "drawerBackdrop73";
      o.className = "drawerBackdrop73";
      o.hidden = true;
      document.body.append(o);
    }
    const name = safeName(state.u);
    const nav = [
      ["DASHBOARD", [["Home", "dashboard"], ["Journey", "journey"], ["Ask Zibur", "assistant"], ["Learning", "study"], ["Cost Planner", "resources"]]],
      ["EXPLORE", [["Job Search", "jobs"], ["Community", "community"], ["Mentor Marketplace", "mentors"], ["Settings", "profile"]]],
    ];
    o.innerHTML = `<aside class="drawer73" role="dialog" aria-modal="true" aria-label="Navigation menu"><div class="drawerHead73"><b>Beyond The Visa</b><button class="icon73 ghost73" data-close aria-label="Close navigation">×</button></div><div class="drawerUser73"><span class="avatar">${esc(initials(name))}</span><span><b>${esc(name)}</b><small>${esc(userPathway(state.u))}</small></span></div>${nav.map(([group, links]) => `<div class="drawerGroup73"><strong>${group}</strong>${links.map(([label, id]) => `<button class="drawerLink73" data-go="${id}"><span>${label}</span><span class="rowArrow73">${iconSvg("arrowRight")}</span></button>`).join("")}</div>`).join("")}<button class="drawerSignOut73" data-signout>${iconSvg("logout")}<span>Sign out</span></button></aside>`;
    o.hidden = false;
    document.body.style.overflow = "hidden";
    const close = () => {
      o.hidden = true;
      document.body.style.overflow = "";
      trigger.setAttribute("aria-expanded", "false");
      lastFocus?.focus();
    };
    trigger.setAttribute("aria-expanded", "true");
    o.querySelector("[data-close]").onclick = close;
    o.onclick = (e) => { if (e.target === o) close(); };
    wire(o);
    o.querySelectorAll("[data-go],[data-signout]").forEach((b) => b.addEventListener("click", close));
    o.querySelector("[data-close]").focus();
  }

  function wire(root) {
    root.querySelectorAll("[data-go]").forEach((x) => {
      x.onclick = (e) => {
        e.preventDefault();
        go(x.dataset.go);
      };
    });
    root.querySelectorAll("[data-signout]").forEach((x) => {
      x.onclick = (e) => {
        e.preventDefault();
        document.getElementById("logout")?.click();
      };
    });
    root.querySelectorAll("[data-theme-toggle]").forEach((x) => {
      x.onclick = (e) => {
        e.preventDefault();
        themeToggle();
      };
    });
    root.querySelectorAll("[data-mobile-open]").forEach((x) => {
      x.onclick = (e) => {
        e.preventDefault();
        openDrawer(x);
      };
    });
    root.querySelectorAll("[data-search-form]").forEach((form) => {
      form.onsubmit = (e) => {
        e.preventDefault();
        go("resources");
      };
    });
  }

  async function render() {
    const home = document.getElementById("home");
    if (!home || !(await load())) return;

    home.classList.add("dashboard73-active");
    document.getElementById("careerDashboard")?.remove();
    document.getElementById("btvTop73")?.remove();

    const root = document.getElementById("dashboardV3") || document.createElement("section");
    root.id = "dashboardV3";
    root.className = "mission73 dashboardShell73";
    if (!root.isConnected) home.prepend(root);

    const j = journey();
    const rec = recommendation(j);
    const name = safeName(state.u);
    const pathway = userPathway(state.u);
    const cbt = cbtStats();
    const savedJobs = Number(state.saved?.length || 0);
    const streak = Number(state.game?.current_streak || 0);
    const walletBalance = Number(state.wallet?.balance || 0);
    const readinessCircumference = 2 * Math.PI * 34;
    const readinessOffset = readinessCircumference - (readinessCircumference * j.pct) / 100;

    const learningFocus = [
      { title: "Start CBT practice", id: "cbt" },
      { title: "Review your journey milestones", id: "journey" },
      { title: "Open interview coaching", id: "interview" },
    ];

    root.innerHTML = `<div class="dashboardLayout73">
      <aside class="sidebar73">
        <div class="sidebarBrand73">
          <div class="brandLogo73"><img src="login-logo-v72.png" alt="Beyond The Visa logo"></div>
          <div><b>Beyond The Visa</b><small>NURSING PLATFORM</small></div>
        </div>
        <div class="sidebarNavWrap73">
          <p class="sidebarGroup73">DASHBOARD</p>
          <button class="sideNavItem73 active" data-go="dashboard"><span class="sideIc73">${iconSvg("home")}</span><span>Home</span><i></i></button>
          <button class="sideNavItem73" data-go="journey"><span class="sideIc73">${iconSvg("journey")}</span><span>Journey</span></button>
          <button class="sideNavItem73" data-go="assistant"><span class="sideIc73">${iconSvg("spark")}</span><span>Ask Zibur</span></button>
          <button class="sideNavItem73" data-go="study"><span class="sideIc73">${iconSvg("learn")}</span><span>Learning</span></button>
          <button class="sideNavItem73" data-go="resources"><span class="sideIc73">${iconSvg("cost")}</span><span>Cost Planner</span></button>
          <p class="sidebarGroup73">EXPLORE</p>
          <button class="sideNavItem73" data-go="jobs"><span class="sideIc73">${iconSvg("search")}</span><span>Job Search</span></button>
          <button class="sideNavItem73" data-go="community"><span class="sideIc73">${iconSvg("users")}</span><span>Community</span></button>
          <button class="sideNavItem73" data-go="mentors"><span class="sideIc73">${iconSvg("mentor")}</span><span>Mentor Marketplace</span></button>
          <button class="sideNavItem73" data-go="profile"><span class="sideIc73">${iconSvg("settings")}</span><span>Settings</span></button>
        </div>
        <div class="sidebarBottom73">
          <button class="coinsCard73" data-go="wallet" aria-label="Open Beyond Coins">
            <span class="coinDot73">${iconSvg("coin")}</span>
            <span><b>${walletBalance} BC</b><small>Beyond Coins</small></span>
          </button>
          <div class="profileCard73">
            <span class="avatar73">${esc(initials(name))}</span>
            <span><b>${esc(name)}</b><small>${esc(pathway)}</small></span>
            <button class="icon73 ghost73" data-theme-toggle aria-label="Toggle dark mode">${iconSvg("moon")}</button>
          </div>
          <button class="signout73" data-signout>${iconSvg("logout")}<span>Sign out</span></button>
        </div>
      </aside>
      <div class="mainArea73">
        <header class="mainHeader73">
          <div>
            <p>${fmtHeaderDate()}</p>
            <h1>Dashboard</h1>
          </div>
          <div class="headerActions73">
            <form data-search-form class="searchWrap73" role="search">
              <span>${iconSvg("search")}</span>
              <input type="search" placeholder="Search resources..." aria-label="Search resources">
            </form>
            <button class="icon73" data-go="notifications" aria-label="Notifications">${iconSvg("bell")}</button>
            <button class="icon73" data-theme-toggle aria-label="Toggle dark mode">${iconSvg("moon")}</button>
            <button class="avatarBtn73" data-go="profile" aria-label="Open profile">${esc(initials(name))}</button>
            <button class="icon73 mobileMenuBtn73" data-mobile-open aria-label="Open menu" aria-expanded="false">${iconSvg("menu")}</button>
          </div>
        </header>
        <div class="dashboardContent73">
          <section class="welcomeCard73">
            <div class="welcomeOverlay73" aria-hidden="true"></div>
            <div class="welcomeLines73" aria-hidden="true"></div>
            <div class="welcomeNurse73" aria-hidden="true"></div>
            <div class="welcomeInner73">
              <p class="welcomeDate73">${fmtHeroDate()}</p>
              <h2>Welcome back, ${esc(name)}</h2>
              <p class="welcomePathway73">${esc(pathway)}</p>
              <div class="welcomeReadiness73">
                <div class="ring73" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${j.pct}">
                  <svg viewBox="0 0 84 84">
                    <circle cx="42" cy="42" r="34" class="ringTrack73"></circle>
                    <circle cx="42" cy="42" r="34" class="ringValue73" style="stroke-dasharray:${readinessCircumference};stroke-dashoffset:${readinessOffset}"></circle>
                  </svg>
                  <b>${j.pct}%</b>
                </div>
                <div class="readinessCopy73">
                  <b>Your career readiness</b>
                  <small>${esc(rec.copy)}</small>
                </div>
              </div>
            </div>
            <span class="premiumBadge73"><i></i> PREMIUM PLAN</span>
          </section>

          <section class="statsRow73">
            <article class="statCard73" data-go="journey"><small>Journey</small><b>${j.pct}%</b><span>${j.done} of ${j.total} steps</span><em>Open guidance ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="cbt"><small>CBT accuracy</small><b>${esc(cbt.value)}</b><span>${esc(cbt.sub)}</span><em>Open guidance ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="saved-jobs"><small>Saved jobs</small><b>${savedJobs}</b><span>Career opportunities</span><em>Open guidance ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="analytics"><small>Study streak</small><b>${streak}</b><span>days active</span><em>Open guidance ${iconSvg("arrowRight")}</em></article>
          </section>

          <section class="secondaryGrid73">
            <article class="panel73" data-go="${rec.id}">
              <div class="panelHead73"><h3>Recommended next step</h3><button data-go="study-plan">View plan ${iconSvg("arrowRight")}</button></div>
              <div class="nextStep73">
                <span class="nextIcon73">${iconSvg("arrowRight")}</span>
                <div><b>${esc(rec.title)}</b><small>${esc(rec.copy)}</small></div>
              </div>
            </article>
            <article class="panel73">
              <div class="panelHead73"><h3>Learning focus</h3><button data-go="study">See all</button></div>
              <div class="focusList73">
                ${learningFocus.map((x) => `<button class="focusRow73" data-go="${x.id}"><span>${esc(x.title)}</span><em>NEW</em><i>${iconSvg("arrowRight")}</i></button>`).join("")}
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>`;

    wire(root);
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(async () => {
      renderQueued = false;
      await render();
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-open=\"home\"]")) return;
    queueRender();
  });
  window.addEventListener("btv:wallet-changed", queueRender);
  window.addEventListener("btv:auth-ready", queueRender);
  window.addEventListener("focus", queueRender);
  document.addEventListener("DOMContentLoaded", queueRender);

  if (typeof window.showApp === "function" && !window.__btvDashboardPremium73ShowAppWrapped) {
    window.__btvDashboardPremium73ShowAppWrapped = true;
    const oldShowApp = window.showApp;
    window.showApp = function () {
      oldShowApp.apply(this, arguments);
      queueRender();
    };
  }

  window.renderDashboardInsights = queueRender;
  queueRender();
})();
