(function () {
  "use strict";
  if (window.__btvHelpSupportV210) return;
  window.__btvHelpSupportV210 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
          character
        ]
    );

  const icon = (name) => {
    const paths = {
      arrow: '<path d="m15 18-6-6 6-6"/><path d="M9 12h10"/>',
      headset:
        '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M18 19c0 1.1-.9 2-2 2h-3"/><rect x="3" y="13" width="4" height="6" rx="2"/><rect x="17" y="13" width="4" height="6" rx="2"/>',
      ticket:
        '<path d="M3 9a3 3 0 0 0 0 6v3h18v-3a3 3 0 0 0 0-6V6H3Z"/><path d="M13 6v2M13 11v2M13 16v2"/>',
      refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
      person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      bug: '<path d="M8 2h8M9 2v3M15 2v3"/><rect x="6" y="5" width="12" height="15" rx="6"/><path d="M3 9h3M18 9h3M3 15h3M18 15h3M12 9v7"/>',
      card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z"/><path d="M4 6.5v13"/>',
      briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
      chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
      sparkle: '<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z"/>',
      feedback: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${
      paths[name] || paths.chat
    }</svg>`;
  };

  const socialIcon = (name) => {
    const icons = {
      facebook:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.7 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.2-2.8-.2-2.8 0-4.7 1.7-4.7 4.8v2.4H6.8V13h3.1v9h3.8Z"/></svg>',
      tiktok:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#25F4EE" d="M15.7 3.2c.4 2.1 1.7 3.5 3.8 4v3.2a8.2 8.2 0 0 1-3.8-1.1v6.1a6.3 6.3 0 1 1-5.4-6.2v3.3a3.1 3.1 0 1 0 2.1 2.9V3.2h3.3Z"/><path fill="#FE2C55" d="M17.2 4.7c.6.9 1.4 1.5 2.3 1.8v.7c-2.1-.5-3.4-1.9-3.8-4h.8c.1.6.4 1.1.7 1.5ZM10.3 9.2v.9a6.3 6.3 0 0 0 1.6 12.2 6.3 6.3 0 0 1-1.6-13.1Z"/><path fill="currentColor" d="M15.7 3.2h.8c.3 1.7 1.3 2.8 3 3.3v3.2a8.3 8.3 0 0 1-3-.8v6.5a6.3 6.3 0 0 1-4.6 6.1 6.3 6.3 0 0 1-1.6-12.3v3.3a3.1 3.1 0 1 0 2.1 2.9V3.2h3.3Z"/></svg>',
      instagram:
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.6" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
      whatsapp:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.4-1.7a11.8 11.8 0 0 0 5.5 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.2-3.5-8.4Zm-8.4 18.2c-1.7 0-3.4-.5-4.9-1.3l-.4-.2-3.8 1 1-3.7-.2-.4a9.7 9.7 0 1 1 8.3 4.6Zm5.3-7.3c-.3-.1-1.7-.8-2-1-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.3-.5.3-.8.1-2-.9-3.3-1.7-4.6-4-.3-.6.3-.6.9-1.9.1-.3.1-.5 0-.7L8.4 6c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.1.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.2-.2-.5-.3-1.2-.6Z"/></svg>',
    };
    return icons[name] || "";
  };

  const categoryMap = {
    account: {
      label: "Account & access",
      type: "contact",
      priority: "high",
      subject: "Help with my account",
      icon: "person",
    },
    technical: {
      label: "Technical problem",
      type: "bug_report",
      priority: "high",
      subject: "Technical problem",
      icon: "bug",
    },
    coins: {
      label: "Beyond Coins & payments",
      type: "contact",
      priority: "high",
      subject: "Beyond Coins or payment support",
      icon: "card",
    },
    learning: {
      label: "Learning & exams",
      type: "contact",
      priority: "normal",
      subject: "Learning or exam support",
      icon: "book",
    },
    journey: {
      label: "Jobs & journey",
      type: "contact",
      priority: "normal",
      subject: "Jobs or journey support",
      icon: "briefcase",
    },
    feedback: {
      label: "Feedback & ideas",
      type: "feedback",
      priority: "normal",
      subject: "Platform feedback",
      icon: "feedback",
    },
  };

  const faqs = [
    [
      "How do I track a support request?",
      "Open My requests in this Help Centre. Every request is stored against your signed-in account, with its reference, status and update history.",
    ],
    [
      "Why has my Beyond Coins balance changed?",
      "Open Beyond Coins and review Transactions first. If an exam purchase or reward is missing, send a Beyond Coins request and include what you selected and when it happened.",
    ],
    [
      "What should I include when reporting a problem?",
      "Tell us the page, the button you used, what you expected, what appeared instead and the approximate time. Do not include passwords, bank-card details or patient-identifiable information.",
    ],
    [
      "Can support give immigration or registration advice?",
      "We can help you use the platform and locate official guidance. Personal legal, immigration and professional-registration decisions must be confirmed with the relevant authority or a qualified adviser.",
    ],
    [
      "How do I add more information to an existing request?",
      "Open the request, write an update and select Send update. The update is securely added to the same request for the support team.",
    ],
  ];

  let root;
  let requests = [];
  let selectedId = null;
  let previousOverflow = "";
  let lastFocus = null;

  function accountName() {
    try {
      const account = JSON.parse(localStorage.getItem("btv-account") || "{}");
      const profile = JSON.parse(localStorage.getItem("btv-profile") || "{}");
      return account.name || profile.preferred || profile.full_name || "Member";
    } catch {
      return "Member";
    }
  }

  function build() {
    if (root) return root;
    root = document.createElement("section");
    root.id = "btvHelpSupport210";
    root.className = "helpSupport210";
    root.hidden = true;
    root.innerHTML = `
      <div class="helpShell210">
        <header class="helpTopbar210">
          <button type="button" class="helpBack210" data-help-close>${icon("arrow")}<span>Back</span></button>
          <a class="helpBrand210" href="#" data-help-home aria-label="Beyond The Visa home"><span>${icon("headset")}</span><strong>Beyond The Visa</strong><small>Member Support</small></a>
          <div class="helpTopActions210"><span class="helpSecure210">${icon("shield")} Secure support</span><button type="button" data-help-new>${icon("plus")}<span>New request</span></button></div>
        </header>

        <main class="helpMain210">
          <section class="helpHero210" aria-labelledby="helpTitle210">
            <div class="helpHeroCopy210">
              <p class="helpEyebrow210"><span></span> MEMBER CARE CENTRE</p>
              <h1 id="helpTitle210">Support built around<br><em>your next step.</em></h1>
              <p>Get help with your account, learning, applications and Beyond Coins in one secure place. Every request is tracked against your signed-in account.</p>
              <div class="helpHeroActions210">
                <button type="button" class="helpPrimary210" data-help-new>${icon("ticket")} Create a support request</button>
                <button type="button" class="helpSecondary210" data-help-tickets>${icon("clock")} View my requests <b data-help-count>0</b></button>
              </div>
              <div class="helpTrustRow210"><span>${icon("lock")} Authenticated</span><span>${icon("shield")} Private by design</span><span>${icon("ticket")} Trackable reference</span></div>
            </div>
            <div class="helpHeroVisual210" aria-hidden="true">
              <div class="helpOrbit210 helpOrbitOne210"></div><div class="helpOrbit210 helpOrbitTwo210"></div>
              <div class="helpConcierge210"><span>${icon("headset")}</span><small>SUPPORT DESK</small><b>One request.<br>One clear record.</b><i>Connected to your member account</i></div>
              <div class="helpPulse210"><i></i><span>Support system connected</span></div>
            </div>
          </section>

          <section class="helpCategories210" aria-labelledby="helpCategoriesTitle210">
            <div class="helpSectionHead210"><div><p>START IN THE RIGHT PLACE</p><h2 id="helpCategoriesTitle210">What can we help with?</h2></div><span>Select a topic to prepare the right request.</span></div>
            <div class="helpCategoryGrid210">
              ${Object.entries(categoryMap)
                .map(
                  ([key, item]) => `<button type="button" data-help-category="${key}"><span>${icon(
                    item.icon
                  )}</span><strong>${item.label}</strong><small>Open support request</small>${icon("chevron")}</button>`
                )
                .join("")}
            </div>
          </section>

          <section class="helpWorkspace210">
            <article class="helpRequests210" id="helpRequests210" aria-labelledby="helpRequestsTitle210">
              <div class="helpSectionHead210 helpRequestsHead210"><div><p>YOUR SECURE HISTORY</p><h2 id="helpRequestsTitle210">My requests</h2></div><button type="button" data-help-refresh aria-label="Refresh support requests">${icon("refresh")} Refresh</button></div>
              <div class="helpStatusSummary210" data-help-summary></div>
              <div class="helpRequestList210" data-help-list><div class="helpLoading210"><i></i><span>Loading your requests…</span></div></div>
            </article>
            <aside class="helpAssist210">
              <article class="helpZibur210"><span>${icon("sparkle")}</span><p>AI GUIDANCE</p><h3>Ask Zibur first</h3><p>Get immediate guidance about using the platform, your learning plan or journey.</p><button type="button" data-help-zibur>Open Ask Zibur ${icon("chevron")}</button></article>
              <article class="helpSafety210"><span>${icon("shield")}</span><div><b>Protect your information</b><p>Never send passwords, full card details or patient-identifiable information.</p></div></article>
              <nav class="helpQuickLinks210" aria-label="Helpful destinations"><h3>Helpful destinations</h3><button data-help-route="journey">Journey guidance ${icon("chevron")}</button><button data-help-route="learn">Learning centre ${icon("chevron")}</button><button data-help-route="jobs">Jobs centre ${icon("chevron")}</button><button data-help-route="legal">Privacy & legal ${icon("chevron")}</button></nav>
            </aside>
          </section>

          <section class="helpFaq210" aria-labelledby="helpFaqTitle210">
            <div class="helpSectionHead210"><div><p>CLEAR ANSWERS</p><h2 id="helpFaqTitle210">Frequently asked questions</h2></div><label class="helpSearch210">${icon("search")}<span class="srOnly210">Search help</span><input type="search" data-help-search placeholder="Search help articles"></label></div>
            <div class="helpFaqList210" data-help-faq></div>
          </section>

          <section class="helpSocial259" aria-labelledby="helpSocialTitle259">
            <header class="helpSocialHead259">
              <p>STAY CONNECTED</p>
              <h2 id="helpSocialTitle259">Connect With Beyond the Visa</h2>
              <span>Follow us for nursing opportunities, immigration updates, career guidance and community support.</span>
            </header>
            <div class="helpSocialGrid259">
              <a class="helpSocialCard259 isFacebook259" href="https://www.facebook.com/share/1JsB8W8Wtg/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Visit Beyond the Visa on Facebook">
                <span class="helpSocialIcon259">${socialIcon("facebook")}</span><span class="helpSocialCopy259"><small>Facebook</small><strong>Beyond the Visa</strong></span><span class="helpSocialArrow259" aria-hidden="true">&#8599;</span>
              </a>
              <a class="helpSocialCard259 isTiktok259" href="https://www.tiktok.com/@beyond_the_visa?_r=1&amp;_t=ZN-98V2UDlDXD4" target="_blank" rel="noopener noreferrer" aria-label="Visit Beyond the Visa on TikTok">
                <span class="helpSocialIcon259">${socialIcon("tiktok")}</span><span class="helpSocialCopy259"><small>TikTok</small><strong>@beyond_the_visa</strong></span><span class="helpSocialArrow259" aria-hidden="true">&#8599;</span>
              </a>
              <a class="helpSocialCard259 isInstagram259" href="https://www.instagram.com/beyondthevisa_official?igsh=eTlraTNjdnNpdWwy&amp;utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Visit Beyond the Visa on Instagram">
                <span class="helpSocialIcon259">${socialIcon("instagram")}</span><span class="helpSocialCopy259"><small>Instagram</small><strong>@beyondthevisa_official</strong></span><span class="helpSocialArrow259" aria-hidden="true">&#8599;</span>
              </a>
              <a class="helpSocialCard259 isWhatsapp259" href="https://wa.me/447723126429?text=Hello%20Beyond%20the%20Visa%2C%20I%20found%20your%20contact%20through%20your%20website%20and%20would%20like%20to%20make%20an%20enquiry." target="_blank" rel="noopener noreferrer" aria-label="Contact Beyond the Visa on WhatsApp">
                <span class="helpSocialIcon259">${socialIcon("whatsapp")}</span><span class="helpSocialCopy259"><small>WhatsApp</small><strong>+44 7723 126429</strong></span><span class="helpSocialArrow259" aria-hidden="true">&#8599;</span>
              </a>
            </div>
          </section>
        </main>
        <footer class="helpFooter210"><span>Beyond The Visa Member Support</span><span>Secure requests · Clear status · Account-linked history</span></footer>
      </div>

      <div class="helpModal210" data-help-form-modal hidden>
        <div class="helpModalBackdrop210" data-help-form-close></div>
        <section class="helpFormPanel210" role="dialog" aria-modal="true" aria-labelledby="helpFormTitle210">
          <header><div><p>SECURE MEMBER REQUEST</p><h2 id="helpFormTitle210">How can we help?</h2></div><button type="button" data-help-form-close aria-label="Close request form">${icon("close")}</button></header>
          <form data-help-form>
            <label>Area of support<select name="category" required>${Object.entries(categoryMap)
              .map(([key, item]) => `<option value="${key}">${item.label}</option>`)
              .join("")}</select></label>
            <label>Subject<input name="subject" required minlength="4" maxlength="180" autocomplete="off" placeholder="A short summary of what you need"></label>
            <label>What happened, or what do you need?<textarea name="message" required minlength="10" maxlength="5000" rows="7" placeholder="Include the page, action and any error message. Do not include passwords or card details."></textarea><small><span data-help-chars>0</span> / 5000</small></label>
            <label class="helpConsent210"><input type="checkbox" name="safe" required><span>I confirm this message contains no password, full card details or patient-identifiable information.</span></label>
            <p class="helpFormMessage210" data-help-form-message role="status"></p>
            <div class="helpFormActions210"><button type="button" data-help-form-close>Cancel</button><button type="submit" class="helpPrimary210">${icon("ticket")} Send secure request</button></div>
          </form>
        </section>
      </div>

      <div class="helpModal210" data-help-detail-modal hidden>
        <div class="helpModalBackdrop210" data-help-detail-close></div>
        <section class="helpDetailPanel210" role="dialog" aria-modal="true" aria-labelledby="helpDetailTitle210">
          <header><div><p data-help-detail-kind>SUPPORT REQUEST</p><h2 id="helpDetailTitle210" data-help-detail-title>Request details</h2></div><button type="button" data-help-detail-close aria-label="Close request details">${icon("close")}</button></header>
          <div data-help-detail-body></div>
        </section>
      </div>`;
    document.body.append(root);
    bind();
    renderFaqs("");
    return root;
  }

  function statusLabel(status) {
    return ({ new: "Received", in_progress: "In progress", waiting: "Waiting", resolved: "Resolved", closed: "Closed" })[status] || status;
  }

  function requestLabel(type) {
    return ({ contact: "Support", feedback: "Feedback", bug_report: "Technical", feature_request: "Feature idea" })[type] || "Support";
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-GB", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
  }

  function selectedRequest() {
    return requests.find((request) => request.id === selectedId);
  }

  function renderRequests() {
    const list = $("[data-help-list]", root);
    const count = requests.length;
    $$('[data-help-count]', root).forEach((node) => (node.textContent = count));
    const active = requests.filter((request) => !["resolved", "closed"].includes(request.status)).length;
    const resolved = requests.filter((request) => ["resolved", "closed"].includes(request.status)).length;
    $("[data-help-summary]", root).innerHTML = `<span><b>${active}</b> active</span><span><b>${resolved}</b> completed</span><span><b>${count}</b> total</span>`;
    if (!count) {
      list.innerHTML = `<div class="helpEmpty210"><span>${icon("ticket")}</span><h3>No support requests yet</h3><p>When you contact the team, your reference and progress will appear here.</p><button type="button" data-help-new>${icon("plus")} Create your first request</button></div>`;
      $("[data-help-new]", list).onclick = () => openForm("account");
      return;
    }
    list.innerHTML = requests
      .map(
        (request) => `<button type="button" class="helpRequestRow210" data-help-request="${request.id}">
          <span class="helpRequestIcon210">${icon(request.request_type === "bug_report" ? "bug" : request.request_type === "feedback" ? "feedback" : "ticket")}</span>
          <span class="helpRequestMain210"><small>${esc(requestLabel(request.request_type))} · ${formatDate(request.created_at)}</small><strong>${esc(request.subject)}</strong><em>Ref ${esc(request.id.slice(0, 8).toUpperCase())}</em></span>
          <span class="helpStatus210 is-${esc(request.status)}"><i></i>${esc(statusLabel(request.status))}</span>${icon("chevron")}
        </button>`
      )
      .join("");
    $$('[data-help-request]', list).forEach((button) => (button.onclick = () => openDetail(button.dataset.helpRequest)));
  }

  function renderLoadError(message) {
    $("[data-help-list]", root).innerHTML = `<div class="helpEmpty210 helpError210"><span>${icon("shield")}</span><h3>We could not load your secure requests</h3><p>${esc(message)}</p><button type="button" data-help-refresh>${icon("refresh")} Try again</button></div>`;
    $("[data-help-refresh]", $("[data-help-list]", root)).onclick = load;
  }

  async function authenticatedUser() {
    if (!window.btvSupabase?.auth) throw new Error("The secure support connection is still loading. Refresh and try again.");
    const { data, error } = await window.btvSupabase.auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error("Please sign in to use secure member support.");
    return data.user;
  }

  function missingRpc(error) {
    const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    return text.includes("pgrst202") || text.includes("schema cache") || text.includes("could not find the function");
  }

  async function loadThroughLiveTable(user) {
    const { data, error } = await window.btvSupabase
      .from("manager_requests")
      .select("id,request_type,subject,message,details,status,priority,created_at,updated_at,source")
      .eq("user_id", user.id)
      .in("request_type", ["contact", "feedback", "bug_report", "feature_request"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  }

  async function load() {
    const refresh = $("[data-help-refresh]", root);
    if (refresh) refresh.classList.add("isLoading210");
    try {
      const user = await authenticatedUser();
      const result = await window.btvSupabase.rpc("btv_get_my_support_requests");
      if (result.error && !missingRpc(result.error)) throw result.error;
      const data = result.error ? await loadThroughLiveTable(user) : result.data;
      requests = Array.isArray(data) ? data : [];
      renderRequests();
    } catch (error) {
      renderLoadError(error.message || "Please try again.");
    } finally {
      if (refresh) refresh.classList.remove("isLoading210");
    }
  }

  function openForm(category = "account") {
    const modal = $("[data-help-form-modal]", root);
    const form = $("[data-help-form]", root);
    const choice = categoryMap[category] ? category : "account";
    form.reset();
    form.elements.category.value = choice;
    form.elements.subject.value = categoryMap[choice].subject;
    $("[data-help-form-message]", root).textContent = "";
    $("[data-help-chars]", root).textContent = "0";
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("isOpen210"));
    setTimeout(() => form.elements.subject.focus(), 80);
  }

  function closeForm() {
    const modal = $("[data-help-form-modal]", root);
    modal.classList.remove("isOpen210");
    setTimeout(() => (modal.hidden = true), 180);
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button[type="submit"]', form);
    const message = $("[data-help-form-message]", root);
    const category = categoryMap[form.elements.category.value] || categoryMap.account;
    button.disabled = true;
    button.innerHTML = `${icon("refresh")} Sending securely…`;
    message.textContent = "";
    try {
      const user = await authenticatedUser();
      const details = {
        support_area: category.label,
        page_url: location.pathname + location.search,
        client_time: new Date().toISOString(),
        app_version: "210",
        support_channel: "member_help_centre",
      };
      let { data, error } = await window.btvSupabase.rpc("btv_submit_support_request", {
        p_request_type: category.type,
        p_subject: form.elements.subject.value.trim(),
        p_message: form.elements.message.value.trim(),
        p_details: details,
        p_priority: category.priority,
      });
      if (error && missingRpc(error)) {
        const fallback = await window.btvSupabase.from("manager_requests").insert({
          user_id: user.id,
          request_type: category.type,
          subject: form.elements.subject.value.trim().slice(0, 180),
          message: form.elements.message.value.trim().slice(0, 5000),
          details,
          status: "new",
          priority: category.priority,
          source: "web_app",
        }).select("id").single();
        data = fallback.data?.id;
        error = fallback.error;
      }
      if (error) throw error;
      const reference = String(data || "").slice(0, 8).toUpperCase();
      message.className = "helpFormMessage210 isSuccess210";
      message.textContent = `Request sent. Your reference is ${reference}.`;
      await load();
      setTimeout(closeForm, 900);
    } catch (error) {
      message.className = "helpFormMessage210 isError210";
      message.textContent = error.message || "Your request could not be sent. Please try again.";
    } finally {
      button.disabled = false;
      button.innerHTML = `${icon("ticket")} Send secure request`;
    }
  }

  function openDetail(id) {
    selectedId = id;
    const request = selectedRequest();
    if (!request) return;
    const updates = Array.isArray(request.details?.user_updates) ? request.details.user_updates : [];
    $("[data-help-detail-kind]", root).textContent = `${requestLabel(request.request_type).toUpperCase()} · REF ${request.id.slice(0, 8).toUpperCase()}`;
    $("[data-help-detail-title]", root).textContent = request.subject;
    $("[data-help-detail-body]", root).innerHTML = `
      <div class="helpDetailMeta210"><span class="helpStatus210 is-${esc(request.status)}"><i></i>${esc(statusLabel(request.status))}</span><span>Created ${formatDate(request.created_at, true)}</span><span>Updated ${formatDate(request.updated_at, true)}</span></div>
      <article class="helpOriginalMessage210"><small>YOUR REQUEST</small><p>${esc(request.message)}</p></article>
      ${updates.length ? `<div class="helpUpdateHistory210"><h3>Your updates</h3>${updates.map((update) => `<article><span>${icon("chat")}</span><div><p>${esc(update.message)}</p><small>${formatDate(update.created_at, true)}</small></div></article>`).join("")}</div>` : ""}
      ${request.status === "closed" ? '<p class="helpClosedNote210">This request is closed and no longer accepts updates. Create a new request if you need more help.</p>' : `<form class="helpUpdateForm210" data-help-update><label>Add information for the support team<textarea name="message" rows="3" minlength="2" maxlength="2000" required placeholder="Add a useful detail to this request…"></textarea></label><p data-help-update-message role="status"></p><button type="submit">${icon("chat")} Send update</button></form>`}`;
    $("[data-help-update]", root)?.addEventListener("submit", addUpdate);
    const modal = $("[data-help-detail-modal]", root);
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("isOpen210"));
    setTimeout(() => $("[data-help-detail-close]", root).focus(), 80);
  }

  function closeDetail() {
    const modal = $("[data-help-detail-modal]", root);
    modal.classList.remove("isOpen210");
    setTimeout(() => (modal.hidden = true), 180);
  }

  async function addUpdate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button[type="submit"]', form);
    const message = $("[data-help-update-message]", form);
    button.disabled = true;
    button.textContent = "Sending…";
    message.textContent = "";
    try {
      const user = await authenticatedUser();
      let { data, error } = await window.btvSupabase.rpc("btv_add_support_update", {
        p_request_id: selectedId,
        p_message: form.elements.message.value.trim(),
      });
      if (error && missingRpc(error)) {
        const parent = selectedRequest();
        const fallback = await window.btvSupabase.from("manager_requests").insert({
          user_id: user.id,
          request_type: "contact",
          subject: `Follow-up: ${parent?.subject || "Support request"}`.slice(0, 180),
          message: form.elements.message.value.trim().slice(0, 2000),
          details: { parent_request_id: selectedId, support_area: "Request follow-up", support_channel: "member_help_centre" },
          status: "new",
          priority: parent?.priority || "normal",
          source: "web_app",
        }).select("id").single();
        data = fallback.data?.id;
        error = fallback.error;
      }
      if (error) throw error;
      await load();
      if (data && typeof data === "string" && requests.some((request) => request.id === data)) selectedId = data;
      openDetail(selectedId);
    } catch (error) {
      message.textContent = error.message || "The update could not be sent.";
    } finally {
      button.disabled = false;
      button.textContent = "Send update";
    }
  }

  function renderFaqs(query) {
    const normalized = query.trim().toLowerCase();
    const matches = faqs.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(normalized));
    $("[data-help-faq]", root).innerHTML = matches.length
      ? matches.map(([question, answer], index) => `<article class="helpFaqItem210"><button type="button" aria-expanded="false" aria-controls="helpFaqAnswer${index}"><span>${esc(question)}</span>${icon("plus")}</button><div id="helpFaqAnswer${index}" hidden><p>${esc(answer)}</p></div></article>`).join("")
      : `<div class="helpFaqEmpty210">No help articles match “${esc(query)}”. You can create a support request instead.</div>`;
    $$(".helpFaqItem210 > button", root).forEach((button) => {
      button.onclick = () => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        button.nextElementSibling.hidden = expanded;
      };
    });
  }

  function route(id) {
    close();
    if (id === "journey") return window.BTVFeatures?.open ? window.BTVFeatures.open("journey") : window.openScreen?.("checklist");
    if (id === "learn") return window.BTVFeatures?.open ? window.BTVFeatures.open("study") : window.openScreen?.("learn");
    if (id === "jobs") return window.BTVFeatures?.open ? window.BTVFeatures.open("jobs") : window.openScreen?.("jobs");
    if (id === "legal") return window.openScreen?.("legal");
  }

  function bind() {
    $$('[data-help-close]', root).forEach((button) => (button.onclick = close));
    $$('[data-help-home]', root).forEach((link) => (link.onclick = (event) => { event.preventDefault(); close(); window.openScreen?.("home"); }));
    $$('[data-help-new]', root).forEach((button) => (button.onclick = () => openForm("account")));
    $$('[data-help-tickets]', root).forEach((button) => (button.onclick = () => $("#helpRequests210", root).scrollIntoView({ behavior: "smooth", block: "start" })));
    $$('[data-help-category]', root).forEach((button) => (button.onclick = () => openForm(button.dataset.helpCategory)));
    $("[data-help-refresh]", root).onclick = load;
    $("[data-help-form]", root).addEventListener("submit", submit);
    $$('[data-help-form-close]', root).forEach((button) => (button.onclick = closeForm));
    $$('[data-help-detail-close]', root).forEach((button) => (button.onclick = closeDetail));
    $("[data-help-form] textarea", root).addEventListener("input", (event) => ($("[data-help-chars]", root).textContent = event.target.value.length));
    $("[data-help-form] select", root).addEventListener("change", (event) => { const category = categoryMap[event.target.value]; if (category) event.currentTarget.form.elements.subject.value = category.subject; });
    $("[data-help-search]", root).addEventListener("input", (event) => renderFaqs(event.target.value));
    $("[data-help-zibur]", root).onclick = () => { close(); if (typeof window.BTVFloatingZiburToggle === "function") window.BTVFloatingZiburToggle(true); else window.BTVFeatures?.open?.("assistant"); };
    $$('[data-help-route]', root).forEach((button) => (button.onclick = () => route(button.dataset.helpRoute)));
    root.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!$("[data-help-detail-modal]", root).hidden) closeDetail();
      else if (!$("[data-help-form-modal]", root).hidden) closeForm();
      else close();
    });
  }

  function revealSection(section) {
    if (section !== "social") return false;
    const social = $(".helpSocial259", root);
    if (!social) return false;
    social.setAttribute("tabindex", "-1");
    requestAnimationFrame(() => {
      social.scrollIntoView({ block: "start", behavior: "auto" });
      social.focus({ preventScroll: true });
    });
    return true;
  }

  function open(section = "") {
    build();
    if (!root.hidden) {
      revealSection(section);
      return;
    }
    lastFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    root.hidden = false;
    document.body.style.overflow = "hidden";
    root.scrollTop = 0;
    requestAnimationFrame(() => {
      root.classList.add("isOpen210");
      if (!revealSection(section)) $("[data-help-close]", root).focus();
    });
    load();
  }

  function close() {
    if (!root || root.hidden) return;
    root.classList.remove("isOpen210");
    closeForm();
    closeDetail();
    document.body.style.overflow = previousOverflow;
    setTimeout(() => { root.hidden = true; lastFocus?.focus?.(); }, 180);
  }

  window.BTVHelpSupport = { open, close, refresh: load };
  document.addEventListener(
    "click",
    (event) => {
      const trigger = event.target.closest('[data-go="help-support"],[data-open-help-support]');
      if (!trigger) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open(trigger.closest("[data-home-ad-slot]") ? "social" : "");
    },
    true
  );
})();
