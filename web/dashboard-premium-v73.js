(function(){
  if (window.__btvDashboardPremium73) return;
  window.__btvDashboardPremium73 = true;

  const F = () => window.BTVFeatures;
  const db = () => window.btvSupabase;
  let state = {};
  let renderQueued = false;
  let lastFocus = null;
  let carouselIndex = 0;
  let carouselTimer = null;
  const carouselSlides = [
    { category: "Motivation", title: "You did not come this far to stop now.", copy: "Every study session and completed milestone moves your international nursing journey forward." },
    { category: "Platform News", title: "New CBT practice questions available", copy: "Build confidence with fresh practice questions and detailed explanations.", action: "Start practising", route: "cbt", date: "23 July 2026" },
    { category: "Motivation", title: "Keep learning. Keep preparing.", copy: "Your opportunity is coming. Focus on the next clear action and let steady progress compound." },
    { category: "Platform News", title: "Visa Hub guidance updated", copy: "Review the latest pathway guidance saved for your destination.", action: "Review journey", route: "journey", date: "21 July 2026" }
  ];

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
    let session = null;
    try { session = (await db()?.auth?.getSession())?.data?.session || null; } catch (e) { console.warn("v73 session fallback", e); }
    const profile = localProfile();
    let account = {};
    try { account = JSON.parse(localStorage.getItem("btv-account") || "{}"); } catch {}
    const u = session?.user || { id: account.id || "local-account", email: account.email || "", user_metadata: { full_name: profile.preferredName || profile.name || account.name || "MR", profession: profile.profession, destination: profile.destination } };
    if (!session || !db()?.from) {
      state = { u, wallet: { balance: Number(account.coins || 0) }, game: { level: 1, xp: 0, current_streak: 0 }, mocks: [], notes: [], saved: [], progress: [], steps: [], activity: [] };
      return state;
    }
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
      ["LEARNING", [["Learn overview", "study"], ["CBT", "cbt"], ["NCLEX", "nclex"], ["OSCE", "osce"], ["IELTS", "ielts"], ["Calculators", "calculations"], ["Saved learning", "analytics"]]],
      ["CAREER AND MIGRATION", [["Journey Planner", "journey"], ["Visa Hub", "resources"], ["Jobs", "jobs"], ["Interview preparation", "interview"], ["Saved jobs", "saved-jobs"], ["Mentors", "mentors"]]],
      ["COMMUNITY AND SUPPORT", [["Ask Zibur", "assistant"], ["Community", "community"], ["Notifications", "notifications"], ["Success stories", "stories"]]],
      ["ACCOUNT", [["Profile", "profile"], ["Beyond Coins", "wallet"], ["Settings", "profile"]]],
    ];
    o.innerHTML = `<aside class="drawer73" role="dialog" aria-modal="true" aria-label="Navigation menu"><div class="drawerHead73"><b>Beyond The Visa</b><button class="icon73 ghost73" data-close aria-label="Close navigation">×</button></div><div class="drawerUser73"><span class="avatar">${esc(initials(name))}</span><span><b>${esc(name)}</b><small>${esc(userPathway(state.u))}</small></span></div>${nav.map(([group, links]) => `<div class="drawerGroup73"><strong>${group}</strong>${links.map(([label, id]) => `<button class="drawerLink73" data-go="${id}"><span>${label}</span><span class="rowArrow73">${iconSvg("arrowRight")}</span></button>`).join("")}</div>`).join("")}<button class="drawerSignOut73" data-signout>${iconSvg("logout")}<span>Sign out</span></button></aside>`;
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("open"));
    document.body.style.overflow = "hidden";
    const close = () => {
      o.classList.remove("open");
      const finish = () => { o.hidden = true; };
      matchMedia("(prefers-reduced-motion: reduce)").matches ? finish() : setTimeout(finish, 220);
      document.body.style.overflow = "";
      trigger.setAttribute("aria-expanded", "false");
      lastFocus?.focus();
    };
    trigger.setAttribute("aria-expanded", "true");
    o.querySelector("[data-close]").onclick = close;
    o.onclick = (e) => { if (e.target === o) close(); };
    wire(o);
    o.querySelectorAll("[data-go],[data-signout]").forEach((b) => b.addEventListener("click", close));
    o.onkeydown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const focusable = [...o.querySelectorAll("button:not([disabled]),a[href]")].filter((x) => !x.hidden);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    o.querySelector("[data-close]").focus();
  }

  function setupCarousel(root) {
    const carousel = root.querySelector("[data-dashboard-carousel]");
    if (!carousel) return;
    const stage = carousel.querySelector("[data-carousel-stage]");
    const dots = carousel.querySelector("[data-carousel-dots]");
    const status = carousel.querySelector("[data-carousel-status]");
    let pausedByUser = false;
    let touchStart = 0;
    const renderSlide = (announce = false) => {
      const slide = carouselSlides[carouselIndex];
      stage.innerHTML = `<div class="carouselCopy73"><span>${esc(slide.category)}</span><h3>${esc(slide.title)}</h3><p>${esc(slide.copy)}</p>${slide.date ? `<small>${esc(slide.date)}</small>` : ""}</div>${slide.action ? `<button data-go="${esc(slide.route)}">${esc(slide.action)} ${iconSvg("arrowRight")}</button>` : ""}`;
      dots.innerHTML = carouselSlides.map((_, i) => `<button type="button" data-slide="${i}" class="${i === carouselIndex ? "active" : ""}" aria-label="Show slide ${i + 1}" aria-current="${i === carouselIndex}"></button>`).join("");
      wire(stage);
      dots.querySelectorAll("[data-slide]").forEach((dot) => dot.onclick = () => { pausedByUser = true; carouselIndex = Number(dot.dataset.slide); renderSlide(true); });
      if (announce) status.textContent = `${slide.category}: ${slide.title}`;
    };
    const move = (direction, manual = true) => {
      if (manual) pausedByUser = true;
      carouselIndex = (carouselIndex + direction + carouselSlides.length) % carouselSlides.length;
      renderSlide(manual);
    };
    carousel.querySelector("[data-carousel-prev]").onclick = () => move(-1);
    carousel.querySelector("[data-carousel-next]").onclick = () => move(1);
    carousel.onkeydown = (e) => { if (e.key === "ArrowLeft") move(-1); if (e.key === "ArrowRight") move(1); };
    carousel.addEventListener("touchstart", (e) => { touchStart = e.changedTouches[0].clientX; }, { passive: true });
    carousel.addEventListener("touchend", (e) => { const delta = e.changedTouches[0].clientX - touchStart; if (Math.abs(delta) > 45) move(delta > 0 ? -1 : 1); }, { passive: true });
    clearInterval(carouselTimer);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) carouselTimer = setInterval(() => { if (!pausedByUser && !carousel.matches(":hover")) move(1, false); }, 8000);
    renderSlide();
  }

  function wire(root) {
    root.querySelectorAll("[data-go]").forEach((x) => {
      x.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
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
      { title: "Patient safety", id: "adult-nursing" },
      { title: "Professional practice", id: "adult-nursing" },
    ];
    const quickActions = [
      { title: "CBT learning", copy: "Questions, explanations and mock tests", id: "cbt", icon: "CBT" },
      { title: "Journey checklist", copy: "Complete your registration and visa steps", id: "journey", icon: "JL" },
      { title: "Cost planner", copy: "Plan fees and relocation expenses", id: "costs", icon: "£" },
      { title: "Ask Zibur", copy: "Get guidance based on your saved journey", id: "assistant", icon: "AI" },
      { title: "My documents", copy: "Certificates, passport, visa and CV files", id: "documents", icon: "DOC" },
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
          <button class="sideNavItem73" data-go="study"><span class="sideIc73">${iconSvg("learn")}</span><span>Learn</span></button>
          <button class="sideNavItem73" data-go="journey"><span class="sideIc73">${iconSvg("journey")}</span><span>Journey</span></button>
          <button class="sideNavItem73" data-go="jobs"><span class="sideIc73">${iconSvg("search")}</span><span>Jobs</span></button>
          <button class="sideNavItem73" data-go="assistant"><span class="sideIc73">${iconSvg("spark")}</span><span>Ask Zibur</span></button>
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
                <div><b>${esc(rec.title)}</b><small>${esc(rec.copy)}</small><button data-go="${rec.id}">Continue now</button></div>
              </div>
            </article>
            <article class="panel73">
              <div class="panelHead73"><h3>Learning focus</h3><button data-go="study">See all</button></div>
              <div class="focusList73">
                ${learningFocus.map((x) => `<button class="focusRow73" data-go="${x.id}"><span>${esc(x.title)}</span><em>NEW</em><i>${iconSvg("arrowRight")}</i></button>`).join("")}
              </div>
            </article>
          </section>
          <section class="quickPanel73" aria-labelledby="quick-actions-title">
            <div class="panelHead73"><h3 id="quick-actions-title">Quick actions</h3></div>
            <div class="quickGrid73">${quickActions.map(x=>`<button type="button" data-go="${x.id}"><span>${x.icon}</span><div><b>${x.title}</b><small>${x.copy}</small></div>${iconSvg("arrowRight")}</button>`).join("")}</div>
          </section>
          <section class="dashboardCarousel73" data-dashboard-carousel tabindex="0" aria-label="Motivation and platform news carousel">
            <div class="carouselStage73" data-carousel-stage></div>
            <div class="carouselFooter73"><div class="carouselDots73" data-carousel-dots></div><div class="carouselControls73"><button type="button" data-carousel-prev aria-label="Previous slide">&#8592;</button><button type="button" data-carousel-next aria-label="Next slide">&#8594;</button></div></div>
            <p class="sr" aria-live="polite" aria-atomic="true" data-carousel-status></p>
          </section>
        </div>
      </div>
    </div>`;

    wire(root);
    setupCarousel(root);
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
  setTimeout(queueRender, 700);
})();
