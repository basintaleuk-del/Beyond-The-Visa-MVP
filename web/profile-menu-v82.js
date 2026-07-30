(() => {
  if (window.__btvProfileMenu82) return;
  window.__btvProfileMenu82 = true;
  const $ = (selector) => document.querySelector(selector);
  const db = () => window.btvSupabase;
  const icons = {
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    articles: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>',
    videos: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
    inbox: '<path d="M4 5h16l2 9v5H2v-5l2-9Z"/><path d="M2 14h5l2 3h6l2-3h5"/>',
    membership: '<path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8Z"/>',
    preferences: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    legal: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
    feedback: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
    contact: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>',
    admin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.inbox}</svg>`;
  function close() {
    const menu = $("#btvMemberMenu82");
    if (menu) menu.hidden = true;
    document.body.style.overflow = "";
  }
  function memberRoute(name) {
    if (name === "inbox") return window.BTVInboxCentre?.open?.() || window.BTVPlatform?.open?.("notifications");
    if (name === "videos") return window.BTVFeatures?.open?.("study");
    if (name === "articles") return window.BTVFeatures?.open?.("resources");
    if (name === "preferences") return window.openScreen?.("profile");
  }
  function action(name) {
    close();
    if (name === "profile") return window.openScreen?.("profile");
    if (["articles", "videos", "inbox", "preferences"].includes(name)) return memberRoute(name);
    if (name === "membership") {
      const button = $("[data-open-premium]");
      return button ? button.click() : window.BTVFeatures?.open?.("membership");
    }
    if (name === "legal") return window.openScreen?.("legal");
    if (name === "feedback" || name === "contact") return window.BTVHelpSupport?.open?.();
    if (name === "admin") location.href = "admin.html";
  }
  const item = (name, label, help, admin = false) =>
    `<button type="button" class="btvMemberMenuItem82 ${admin ? "btvAdminMenuItem82" : ""}" data-menu82="${name}">${svg(name)}<span>${label}</span><small>${help}</small></button>`;
  async function isAdmin() {
    try {
      const session = (await db()?.auth?.getSession())?.data?.session;
      if (!session) return false;
      const result = await db().from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      return result.data?.role === "admin";
    } catch { return false; }
  }
  async function open() {
    let menu = $("#btvMemberMenu82");
    if (!menu) {
      menu = document.createElement("section");
      menu.id = "btvMemberMenu82";
      menu.className = "btvMemberMenu82";
      menu.hidden = true;
      document.body.append(menu);
    }
    const account = JSON.parse(localStorage.getItem("btv-account") || "{}");
    const profile = JSON.parse(localStorage.getItem("btv-profile") || "{}");
    const profileButton = $("#headerProfile");
    const admin = await isAdmin();
    menu.innerHTML = `<div class="btvMemberMenuPanel82" role="dialog" aria-modal="true" aria-label="Account menu">
      <div class="btvMemberMenuHead82"><img src="${profile.photo || profileButton?.querySelector("img")?.src || ""}" alt=""><div><b>${profile.preferred || account.name || "Your account"}</b><small>${account.email || "Member centre"}</small></div><button class="btvMemberMenuClose82" aria-label="Close account menu">×</button></div>
      <div class="btvMemberMenuGroup82"><span>YOUR ACCOUNT</span>${item("profile", "Profile", "Personal details and photo")}${item("membership", "Membership", "Plan and Premium access")}${item("preferences", "Preferences", "Notifications and app settings")}${item("legal", "Privacy & legal", "Terms, cookies and your data")}</div>
      <div class="btvMemberMenuGroup82"><span>MEMBER CENTRE</span>${item("articles", "Articles", "Guidance and published updates")}${item("videos", "Videos", "Watch learning resources")}${item("inbox", "Inbox", "Mentor, job and account messages")}</div>
      <div class="btvMemberMenuGroup82"><span>HELP & MANAGEMENT</span>${item("contact", "Help & support", "Ask for help or contact the support team")}${item("feedback", "Feedback", "Send feedback or report a problem")}${admin ? item("admin", "Admin portal", "Manage users, content and services", true) : ""}</div>
    </div>`;
    menu.hidden = false;
    document.body.style.overflow = "hidden";
    menu.querySelector(".btvMemberMenuClose82").onclick = close;
    menu.querySelectorAll("[data-menu82]").forEach((button) => button.onclick = () => action(button.dataset.menu82));
    menu.onclick = (event) => { if (event.target === menu) close(); };
    menu.querySelector(".btvMemberMenuClose82").focus();
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("#headerProfile");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  window.BTVProfileMenu = { open, close };
})();
