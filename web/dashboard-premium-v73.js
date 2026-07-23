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
  const menuStateKey = "btv-dashboard-menu-group-v99";
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

  function destinationInfo() {
    const selected = typeof window.country === "function" ? window.country() : null;
    const raw = selected?.name || localProfile().destination || state.u?.user_metadata?.destination || "United Kingdom";
    const name = String(raw).trim();
    const key = ({
      "united kingdom": "uk", uk: "uk", england: "uk",
      "united states": "us", "united states of america": "us", usa: "us", us: "us",
      australia: "au", canada: "ca", "new zealand": "nz", ireland: "ie",
    })[name.toLowerCase()] || "uk";
    const meta = {
      uk: { flag: "🇬🇧", exam: "cbt" }, us: { flag: "🇺🇸", exam: "nclex" },
      au: { flag: "🇦🇺", exam: "nclex" }, ca: { flag: "🇨🇦", exam: "nclex" },
      nz: { flag: "🇳🇿", exam: "registration" }, ie: { flag: "🇮🇪", exam: "cbt" },
    }[key];
    return { key, name: selected?.name || name, flag: selected?.flag || meta.flag, exam: meta.exam };
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
    const destination = destinationInfo();
    return `${profession} pathway · ${destination.name} ${destination.flag}`;
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
      state = { u, isAdmin: false, wallet: { balance: Number(account.coins || 0) }, game: { level: 1, xp: 0, current_streak: 0 }, mocks: [], notes: [], saved: [], progress: [], steps: [], activity: [] };
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
      let isAdmin = false;
      try {
        const role = await db().from("profiles").select("role").eq("id", u.id).maybeSingle();
        isAdmin = role.data?.role === "admin";
      } catch (e) {
        console.warn("v73 admin access check failed", e);
      }
      platform = {
        isAdmin,
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
      platform = { isAdmin: false, wallet: { balance: 0 }, game: { level: 1, xp: 0, current_streak: 0 }, mocks: [], notes: [], saved: [], progress: [], steps: [], activity: [] };
    }
    state = { u, ...platform };
    return state;
  }

  function journey() {
    const legacy = typeof window.completed === "function" ? window.completed() : 0;
    const legacyTotal = typeof window.country === "function" ? window.country()?.steps?.length || 0 : 0;
    const useChecklist = legacyTotal > 0;
    const done = useChecklist ? legacy : state.progress?.filter((x) => x.completed === true || Boolean(x.completed_at)).length || 0;
    const total = useChecklist ? legacyTotal : state.steps?.length || 7;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function recommendation(j) {
    const p = localProfile();
    if (!p.profession || !p.destination) return { title: "Complete your profile", copy: "Add your profession and destination for personalised guidance.", id: "profile" };
    const active = state.mocks?.find((x) => x.status === "active" || x.status === "in_progress");
    if (active) return { title: "Resume your active mock", copy: `Continue ${String(active.mock_code).replaceAll("_", " ")} without paying again.`, id: "mock-tests" };
    if (!j.done) return { title: "Upload your essential documents", copy: "Start with the certificates and identity files your pathway will need.", id: "documents" };
    if (state.notes?.some((x) => !x.read_at)) return { title: "Review your updates", copy: "You have unread guidance and account notifications.", id: "notifications" };
    return { title: "Continue today’s study plan", copy: "Keep your learning streak moving forward.", id: "study-plan" };
  }

  function examStats() {
    const destination = destinationInfo();
    if (destination.exam === "registration") return { label: "Registration", route: "journey", value: `${journey().pct}%`, sub: `${destination.name} pathway` };
    const token = destination.exam;
    const latest = state.mocks?.find((x) => String(x.mock_code || "").toLowerCase().includes(token) && (x.status === "completed" || x.status === "submitted"));
    if (!latest || !latest.total) return { label: token === "nclex" ? "NCLEX accuracy" : "CBT accuracy", route: token, value: "-", sub: "0 questions answered" };
    const pct = Math.round((Number(latest.score || 0) / Number(latest.total || 1)) * 100);
    return { label: token === "nclex" ? "NCLEX accuracy" : "CBT accuracy", route: token, value: `${pct}%`, sub: `${Number(latest.total || 0)} questions answered` };
  }

  function showHomeAdvice() {
    const destination = destinationInfo();
    const progress = journey();
    const suggested = recommendation(progress);
    const current = journeyItems().find((step) => step.current);
    const unread = state.notes?.filter((note) => !note.read_at).length || 0;
    const choices = [
      { tag: "RECOMMENDED NEXT STEP", title: suggested.title, copy: suggested.copy, route: suggested.id },
      current ? { tag: "YOUR JOURNEY", title: current.title, copy: `${current.copy} You are ${progress.pct}% through your ${destination.name} checklist.`, route: "journey" } : null,
      unread ? { tag: "ACCOUNT UPDATE", title: `Review ${unread} unread notification${unread === 1 ? "" : "s"}`, copy: "Open your updates for journey reminders, learning news and account information.", route: "notifications" } : null,
      destination.exam === "cbt" ? { tag: "LEARNING ADVICE", title: "Keep CBT preparation consistent", copy: "A short focused practice session followed by explanation review is more useful than rushing through a large question set.", route: "cbt" } : destination.exam === "nclex" ? { tag: "LEARNING ADVICE", title: "Practise NCLEX clinical judgement", copy: "Use safety, assessment, prioritisation and least-harm reasoning before reviewing the explanation.", route: "nclex" } : { tag: "REGISTRATION ADVICE", title: `Review your ${destination.name} pathway`, copy: "Confirm every registration and immigration requirement through the responsible current official authority.", route: "journey" },
      { tag: "CAREER ADVICE", title: "Keep one career action moving", copy: "Save a suitable role, improve one interview example, or organise one supporting document today.", route: "jobs" },
      { tag: "PLANNING ADVICE", title: "Verify before paying or submitting", copy: "Check current regulator and government guidance before paying a fee, uploading evidence or making a travel commitment.", route: "resources" },
    ].filter(Boolean);
    const selected = choices.sort(() => Math.random() - 0.5).slice(0, 3);
    let dialog = document.getElementById("homeAdvice107");
    if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "homeAdvice107"; dialog.className = "homeAdvice107"; document.body.append(dialog); }
    dialog.innerHTML = `<div class="homeAdvicePanel107"><header><div><small>${esc(destination.flag)} ${esc(destination.name.toUpperCase())} PATHWAY</small><h2>Your recommendations</h2><p>Fresh practical advice each time you open Home.</p></div><button type="button" data-advice-close aria-label="Close recommendations">&times;</button></header><div class="homeAdviceGrid107">${selected.map((item, index) => `<article class="${index === 0 ? "featured" : ""}"><small>${esc(item.tag)}</small><h3>${esc(item.title)}</h3><p>${esc(item.copy)}</p><button type="button" data-advice-route="${esc(item.route)}">Open ${esc(item.title)}</button></article>`).join("")}</div><footer><button type="button" class="changeDestination107" data-change-destination>${esc(destination.flag)} Change destination country</button><button type="button" data-advice-close>Not now</button></footer></div>`;
    const close = () => dialog.close();
    dialog.querySelectorAll("[data-advice-close]").forEach((button) => button.onclick = close);
    dialog.querySelectorAll("[data-advice-route]").forEach((button) => button.onclick = () => { const route = button.dataset.adviceRoute; close(); go(route); });
    dialog.querySelector("[data-change-destination]").onclick = () => { close(); window.openScreen?.("countries"); };
    dialog.onclick = (event) => { if (event.target !== dialog) return; const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); };
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("[data-advice-close]")?.focus();
  }

  function go(id) {
    if (id === "dashboard") {
      if (carouselSlides.length > 1) carouselIndex = Math.floor(Math.random() * carouselSlides.length);
      F()?.open("dashboard");
      queueRender();
      return setTimeout(showHomeAdvice, 80);
    }
    if (id === "explore" || id === "books") {
      F()?.open("study");
      return setTimeout(() => window.dispatchEvent(new CustomEvent("btv:feature-action", { detail: { id } })), 120);
    }
    if (["preferences", "bookings"].includes(id)) {
      window.BTVPlatform?.open?.();
      return setTimeout(() => document.querySelector(`[data-btv-pane="${id === "preferences" ? "prefs" : "book"}"]`)?.click(), 180);
    }
    if (id === "membership") {
      const button = document.querySelector("[data-open-premium]");
      return button ? button.click() : F()?.open("membership");
    }
    if (id === "legal" || id === "feedback") return window.openScreen?.(id);
    if (id === "admin") return state.isAdmin ? location.assign("admin.html") : undefined;
    if (id === "assistant" && typeof window.BTVFloatingZiburToggle === "function") return window.BTVFloatingZiburToggle(true);
    F()?.open(id);
  }

  function menuGroups() {
    const exam = destinationInfo().exam;
    const examLinks = exam === "nclex" ? [["NCLEX", "nclex"]] : exam === "cbt" ? [["CBT", "cbt"]] : [];
    return [
      { id: "account", label: "Account", links: [["Profile", "profile"], ["My Documents", "documents"], ["Membership", "membership"], ["Notifications", "notifications"], ["Beyond Coins", "wallet"], ["Account settings", "preferences"], ["Bookings", "bookings"], ["Privacy & legal", "legal"]] },
      { id: "learn", label: "Learn", links: [["Learning dashboard", "study"], ["Explore", "explore"], ["Books", "books"], ...examLinks, ["OSCE", "osce"], ["IELTS", "ielts"], ["CBT Numeracy", "calculations"], ["Learning progress", "analytics"]] },
      { id: "career", label: "Career and Journey", links: [["My Journey", "journey"], ["Jobs", "jobs"], ["Saved jobs", "saved-jobs"], ["Interview preparation", "interview"], ["Visa Hub", "resources"]] },
      { id: "support", label: "Community and Support", links: [["Mentors", "mentors"], ["Community", "community"], ["Success stories", "stories"], ["Help and support", "feedback"], ["Ask Zibur", "assistant"]] },
    ];
  }

  function menuMarkup(prefix) {
    const sections = menuGroups().map((group) => {
      const panelId = `${prefix}-${group.id}`;
      return `<section class="menuGroup73" data-menu-section="${group.id}">
        <button type="button" class="menuGroupToggle73" data-menu-toggle="${group.id}" aria-expanded="false" aria-controls="${panelId}">
          <span>${esc(group.label)}</span><span class="menuChevron73" aria-hidden="true">${iconSvg("arrowRight")}</span>
        </button>
        <div class="menuGroupLinks73" id="${panelId}" hidden>
          ${group.links.map(([label, route]) => `<button type="button" class="menuLink73" data-go="${route}"><span>${esc(label)}</span>${iconSvg("arrowRight")}</button>`).join("")}
        </div>
      </section>`;
    }).join("");
    const admin = state.isAdmin ? `<section class="menuAdmin73" aria-labelledby="${prefix}-admin-title"><p id="${prefix}-admin-title">Administration</p><button type="button" class="menuLink73 adminLink73" data-go="admin"><span>Admin Access</span>${iconSvg("arrowRight")}</button></section>` : "";
    return `${sections}${admin}<button class="drawerSignOut73 menuSignOut73" data-signout>${iconSvg("logout")}<span>Sign out</span></button>`;
  }

  function setupMenuGroups(root) {
    const toggles = [...root.querySelectorAll("[data-menu-toggle]")];
    if (!toggles.length) return;
    const setOpen = (id, remember = true) => {
      toggles.forEach((toggle) => {
        const open = toggle.dataset.menuToggle === id;
        const panel = root.querySelector(`#${toggle.getAttribute("aria-controls")}`);
        toggle.setAttribute("aria-expanded", String(open));
        if (panel) panel.hidden = !open;
      });
      if (remember) {
        try { id ? sessionStorage.setItem(menuStateKey, id) : sessionStorage.removeItem(menuStateKey); } catch {}
      }
    };
    let saved = "";
    try { saved = sessionStorage.getItem(menuStateKey) || ""; } catch {}
    if (saved && toggles.some((toggle) => toggle.dataset.menuToggle === saved)) setOpen(saved, false);
    toggles.forEach((toggle) => {
      toggle.onclick = () => setOpen(toggle.getAttribute("aria-expanded") === "true" ? "" : toggle.dataset.menuToggle);
      toggle.closest("[data-menu-section]")?.querySelectorAll("[data-go]").forEach((link) => link.addEventListener("click", () => {
        try { sessionStorage.setItem(menuStateKey, toggle.dataset.menuToggle); } catch {}
      }));
    });
  }

  function journeyItems() {
    const legacySteps = typeof window.country === "function" ? window.country()?.steps || [] : [];
    const useChecklist = legacySteps.length > 0;
    const steps = useChecklist ? legacySteps.map((step, index) => ({ code: `legacy-${index}`, title: step[0], description: step[1], sort_order: index + 1 })) : state.steps || [];
    const completedCodes = new Set((state.progress || []).filter((item) => item.completed === true || item.completed_at).map((item) => item.step_code));
    let checklistStatus = {};
    try { checklistStatus = JSON.parse(localStorage.getItem("btv-v1") || "{}").done?.[destinationInfo().key] || {}; } catch {}
    let currentFound = false;
    return steps.map((step, index) => {
      const complete = useChecklist ? Boolean(checklistStatus[index]) : completedCodes.has(step.code);
      const current = !complete && !currentFound;
      if (current) currentFound = true;
      return {
        title: step.title || `Journey step ${index + 1}`,
        copy: step.description || "Review this milestone and keep the required evidence safe.",
        status: complete ? "Completed" : current ? "Current step" : "Upcoming",
        action: complete ? "Review step" : current ? "Continue step" : "View details",
        complete,
        current,
        order: step.sort_order || index + 1,
      };
    });
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
      ["LEARNING", [["Learn overview", "study"], ["CBT", "cbt"], ["NCLEX", "nclex"], ["OSCE", "osce"], ["IELTS", "ielts"], ["CBT Numeracy", "calculations"], ["Saved learning", "analytics"]]],
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

  function openDrawerV99(trigger) {
    lastFocus = trigger;
    let backdrop = document.getElementById("drawerBackdrop73");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "drawerBackdrop73";
      backdrop.className = "drawerBackdrop73";
      backdrop.hidden = true;
      document.body.append(backdrop);
    }
    const name = safeName(state.u);
    backdrop.innerHTML = `<aside class="drawer73" role="dialog" aria-modal="true" aria-label="Account and navigation menu"><div class="drawerHead73"><b>Menu</b><button class="icon73 ghost73" data-close aria-label="Close navigation">&times;</button></div><div class="drawerUser73"><span class="avatar">${esc(initials(name))}</span><span><b>${esc(name)}</b><small>${esc(userPathway(state.u))}</small></span></div><div class="drawerMenu73">${menuMarkup("drawer-menu73")}</div></aside>`;
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("open"));
    document.body.style.overflow = "hidden";
    const close = () => {
      backdrop.classList.remove("open");
      const finish = () => { backdrop.hidden = true; };
      matchMedia("(prefers-reduced-motion: reduce)").matches ? finish() : setTimeout(finish, 220);
      document.body.style.overflow = "";
      trigger.setAttribute("aria-expanded", "false");
      lastFocus?.focus();
    };
    trigger.setAttribute("aria-expanded", "true");
    backdrop.querySelector("[data-close]").onclick = close;
    backdrop.onclick = (event) => { if (event.target === backdrop) close(); };
    setupMenuGroups(backdrop);
    wire(backdrop);
    backdrop.querySelectorAll("[data-go],[data-signout]").forEach((button) => button.addEventListener("click", close));
    backdrop.onkeydown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...backdrop.querySelectorAll("button:not([disabled]),a[href]")].filter((element) => !element.hidden && !element.closest("[hidden]"));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    backdrop.querySelector("[data-close]").focus();
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

  function notificationMarkup() {
    const unread = state.notes?.filter((note) => !note.read_at).length || 0;
    const items = (state.notes || []).slice(0, 8);
    return `<div class="notificationWrap102">
      <button class="icon73 notificationBell102" type="button" data-notification-toggle aria-label="Notifications${unread ? `, ${unread} unread` : ""}" aria-expanded="false" aria-controls="dashboard-notifications102">${iconSvg("bell")}${unread ? `<span>${unread > 9 ? "9+" : unread}</span>` : ""}</button>
      <section class="notificationMenu102" id="dashboard-notifications102" aria-label="Recent notifications" hidden>
        <header><div><small>YOUR UPDATES</small><h2>Notifications</h2></div>${unread ? `<button type="button" data-notification-read>Mark all read</button>` : ""}</header>
        <div class="notificationList102">${items.length ? items.map((note) => `<button type="button" class="notificationItem102 ${note.read_at ? "" : "unread"}" data-notification-id="${esc(note.id)}"${note.action_url ? ` data-notification-url="${esc(note.action_url)}"` : ""}><i aria-hidden="true">${note.read_at ? "✓" : "●"}</i><span><b>${esc(note.title || note.category || "Account update")}</b><small>${esc(note.body || note.message || "Open your account for more information.")}</small><time>${note.created_at ? new Date(note.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "Recent"}</time></span></button>`).join("") : `<div class="notificationEmpty102"><b>You are up to date</b><p>Journey reminders, learning updates and account messages will appear here.</p></div>`}</div>
        <button type="button" class="notificationAll102" data-go="notifications">Open notification centre ${iconSvg("arrowRight")}</button>
      </section>
    </div>`;
  }

  function setupNotifications(root) {
    const toggle = root.querySelector("[data-notification-toggle]");
    const menu = root.querySelector(".notificationMenu102");
    if (!toggle || !menu) return;
    const close = () => { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); };
    toggle.onclick = (event) => { event.preventDefault(); event.stopPropagation(); const open = menu.hidden; menu.hidden = !open; toggle.setAttribute("aria-expanded", String(open)); if (open) { menu.querySelector("button")?.focus(); setTimeout(() => document.addEventListener("click", close, { once: true }), 0); } };
    menu.onclick = (event) => event.stopPropagation();
    root.addEventListener("keydown", (event) => { if (event.key === "Escape" && !menu.hidden) { close(); toggle.focus(); } });
    menu.querySelector("[data-notification-read]")?.addEventListener("click", async () => {
      if (state.u?.id && db()?.from) await db().from("btv_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", state.u.id).is("read_at", null);
      state.notes = (state.notes || []).map((note) => ({ ...note, read_at: note.read_at || new Date().toISOString() }));
      queueRender();
    });
    menu.querySelectorAll("[data-notification-id]").forEach((item) => item.addEventListener("click", async () => {
      const id = item.dataset.notificationId;
      if (id && state.u?.id && db()?.from) await db().from("btv_notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", state.u.id);
      const url = item.dataset.notificationUrl;
      if (url && (/^\//.test(url) || /^https:\/\//.test(url))) location.assign(url);
      else go("notifications");
    }));
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
        openDrawerV99(x);
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
    document.getElementById("profileSummary")?.remove();
    document.getElementById("homeWelcomeArt")?.remove();

    const root = document.getElementById("dashboardV3") || document.createElement("section");
    root.id = "dashboardV3";
    root.className = "mission73 dashboardShell73";
    if (!root.isConnected) home.prepend(root);

    const j = journey();
    const rec = recommendation(j);
    const name = safeName(state.u);
    const pathway = userPathway(state.u);
    const exam = examStats();
    const destination = destinationInfo();
    const savedJobs = Number(state.saved?.length || 0);
    const streak = Number(state.game?.current_streak || 0);
    const journeySteps = journeyItems();
    const currentJourneyStep = journeySteps.find((step) => step.current) || journeySteps[journeySteps.length - 1] || null;
    const readinessCircumference = 2 * Math.PI * 34;
    const readinessOffset = readinessCircumference - (readinessCircumference * j.pct) / 100;

    const learningFocus = [
      ...(destination.exam === "nclex" ? [{ title: "Continue NCLEX preparation", id: "nclex" }] : destination.exam === "cbt" ? [{ title: "Continue CBT preparation", id: "cbt" }] : [{ title: "Review registration pathway", id: "journey" }]),
      { title: "Clinical learning library", id: "adult-nursing" },
      { title: "Interview preparation", id: "interview" },
    ];
    const quickActions = [
      { title: "Mentor Marketplace", copy: "Find approved professional mentors", id: "mentors", icon: "🤝" },
      { title: "Interview preparation", copy: "Practise role-specific healthcare interviews", id: "interview", icon: "🎙️" },
      { title: "Jobs", copy: "Find and save suitable opportunities", id: "jobs", icon: "💼" },
      { title: "My documents", copy: "Keep career and visa evidence organised", id: "documents", icon: "📂" },
    ];

    root.innerHTML = `<div class="dashboardLayout73">
      <aside class="sidebar73">
        <div class="sidebarBrand73">
          <div class="brandLogo73"><img src="login-logo-v72.png" alt="Beyond The Visa logo"></div>
          <div><b>Beyond The Visa</b><small>NURSING PLATFORM</small></div>
        </div>
        <button type="button" class="profileCard73 profileAction73" data-go="profile" aria-label="Open profile for ${esc(name)}">
          <span class="avatar73">${esc(initials(name))}</span>
          <span><b>${esc(name)}</b><small>View profile</small></span>
          <span class="profileArrow73">${iconSvg("arrowRight")}</span>
        </button>
        <div class="sidebarNavWrap73">
          <p class="sidebarGroup73">DASHBOARD</p>
          <button class="sideNavItem73 active" data-go="dashboard"><span class="sideIc73">${iconSvg("home")}</span><span>Home</span><i></i></button>
          <nav class="sidebarMemberMenu73" aria-label="Account, learning, career and support menu">${menuMarkup("sidebar-menu73")}</nav>
        </div>
        <div class="sidebarLondon73" aria-hidden="true"></div>
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
            <button class="coinBalance104" type="button" data-go="wallet" aria-label="Beyond Coins balance: ${Number(state.wallet?.balance || 0).toLocaleString('en-GB')} coins. Open wallet">
              <img class="coinBalanceLogo106" src="beyond-coin-v84.png" alt="" aria-hidden="true"><span><b>${Number(state.wallet?.balance || 0).toLocaleString('en-GB')}</b><small>Beyond Coins</small></span>
            </button>
            ${notificationMarkup()}
            <button class="icon73" data-theme-toggle aria-label="Toggle dark mode">${iconSvg("moon")}</button>
            <button class="icon73 mobileMenuBtn73" data-mobile-open aria-label="Open account and navigation menu" aria-expanded="false">${iconSvg("menu")}</button>
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
                  <b>${j.pct}%</b><small>READY</small>
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
            <article class="statCard73 journeySummaryStat73" data-go="journey"><small>🧭 Journey</small><b>${j.pct}%</b><span>${j.done} of ${j.total} steps</span><em>Open My Journey ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="${exam.route}"><small>🩺 ${esc(exam.label)}</small><b>${esc(exam.value)}</b><span>${esc(exam.sub)}</span><em>Open preparation ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="saved-jobs"><small>🔖 Saved jobs</small><b>${savedJobs}</b><span>Career opportunities</span><em>View saved jobs ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="analytics"><small>🔥 Study streak</small><b>${streak}</b><span>days active</span><em>View learning progress ${iconSvg("arrowRight")}</em></article>
          </section>

          <section class="journeyPanel73" aria-labelledby="journey-title73">
            <div class="journeyHead73"><div><p>CAREER AND JOURNEY</p><h3 id="journey-title73">My Journey</h3><span>Your current journey position</span></div><button type="button" data-go="journey">Go to My Journey ${iconSvg("arrowRight")}</button></div>
            <div class="journeyProgress73" role="progressbar" aria-label="Journey completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${j.pct}"><i style="width:${j.pct}%"></i></div>
            ${currentJourneyStep ? `<article class="journeyCurrent73 ${j.total > 0 && j.done >= j.total ? "complete" : "current"}">
              <div class="journeyCurrentMarker73" aria-hidden="true">${j.total > 0 && j.done >= j.total ? "&#10003;" : esc(currentJourneyStep.order)}</div>
              <div class="journeyCurrentCopy73"><span class="journeyStatus73">${j.total > 0 && j.done >= j.total ? "Journey complete" : "Current step"}</span><h4>${esc(currentJourneyStep.title)}</h4><p>${esc(currentJourneyStep.copy)}</p><small>${j.done} of ${j.total} steps completed · ${j.pct}% complete</small></div>
              <button type="button" data-go="journey">${j.total > 0 && j.done >= j.total ? "Review journey" : "Continue journey"} ${iconSvg("arrowRight")}</button>
            </article>` : `<div class="journeyEmpty73"><b>Your journey is ready to begin</b><p>Open My Journey to load the milestones matched to your profile.</p><button type="button" data-go="journey">Open My Journey</button></div>`}
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
      <button type="button" class="floatingZibur73" data-go="assistant" aria-label="Open Ask Zibur assistant">${iconSvg("spark")}<span>Ask Zibur</span></button>
    </div>`;

    setupMenuGroups(root);
    wire(root);
    setupNotifications(root);
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
    if (carouselSlides.length > 1) carouselIndex = Math.floor(Math.random() * carouselSlides.length);
    queueRender();
    setTimeout(showHomeAdvice, 80);
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
