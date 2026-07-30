(() => {
  if (window.BTVInboxCentre) return;

  const state = {
    root: null,
    user: null,
    threads: [],
    messages: new Map(),
    activeId: null,
    filter: "all",
    query: "",
    loading: false,
    channel: null,
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char]));
  const icon = (name) => {
    const paths = {
      back: '<path d="m15 18-6-6 6-6"/><path d="M9 12h10"/>',
      inbox: '<path d="M4 5h16l2 9v5H2v-5l2-9Z"/><path d="M2 14h5l2 3h6l2-3h5"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      refresh: '<path d="M20 6v5h-5"/><path d="M19 11a8 8 0 1 0-2 7"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
      send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      archive: '<path d="M3 6h18v4H3zM5 10v10h14V10M9 14h6"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      mentor: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      job_offer: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18"/>',
      application: '<path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
      support: '<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/>',
      account: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
      system: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="5"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.inbox}</svg>`;
  };
  const label = (category) => ({
    mentor: "Mentors", job_offer: "Job offers", application: "Applications",
    support: "Support", account: "Account", system: "Platform",
  }[category] || "Updates");
  const time = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    if (diff < 86_400_000 && date.getDate() === new Date().getDate())
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604_800_000) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  };
  const safeAction = (url) => {
    if (!url) return "";
    try {
      const parsed = new URL(url, location.origin);
      if (parsed.protocol !== "https:" && parsed.origin !== location.origin) return "";
      return parsed.href;
    } catch { return ""; }
  };
  const db = () => window.btvSupabase;
  const unread = (thread) =>
    (state.messages.get(thread.id) || []).some((message) =>
      message.sender_type !== "member" && !message.read_at
    );
  const preview = (thread) => {
    const messages = state.messages.get(thread.id) || [];
    return messages.at(-1)?.body || thread.preview || "Open this update";
  };
  const filtered = () => state.threads.filter((thread) => {
    if (state.filter === "unread" && !unread(thread)) return false;
    if (!["all", "unread"].includes(state.filter) && thread.category !== state.filter) return false;
    const query = state.query.trim().toLowerCase();
    return !query || [thread.subject, thread.sender_name, preview(thread)]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  function shell() {
    let root = $("#inboxCentre234");
    if (!root) {
      root = document.createElement("section");
      root.id = "inboxCentre234";
      root.className = "inboxCentre234";
      root.hidden = true;
      document.body.append(root);
    }
    state.root = root;
    return root;
  }

  function folderButton(id, text, count) {
    return `<button type="button" class="inboxFolder234 ${state.filter === id ? "active" : ""}" data-inbox-filter="${id}" aria-pressed="${state.filter === id}">
      <span>${icon(id === "all" || id === "unread" ? "inbox" : id)}${esc(text)}</span>
      <b>${count}</b>
    </button>`;
  }

  function render() {
    const root = shell();
    const list = filtered();
    const active = state.threads.find((thread) => thread.id === state.activeId) || list[0] || null;
    if (active && !state.activeId) state.activeId = active.id;
    const counts = state.threads.reduce((result, thread) => {
      result[thread.category] = (result[thread.category] || 0) + 1;
      if (unread(thread)) result.unread += 1;
      return result;
    }, { unread: 0 });
    root.innerHTML = `
      <div class="inboxFrame234">
        <header class="inboxTop234">
          <button type="button" class="inboxIconButton234" data-inbox-close aria-label="Back to Beyond The Visa">${icon("back")}</button>
          <a class="inboxBrand234" href="#" data-inbox-close>
            <span>${icon("inbox")}</span>
            <span><small>BEYOND THE VISA</small><b>Personal Inbox</b></span>
          </a>
          <div class="inboxSecure234">${icon("shield")}<span>Private member channel</span></div>
          <button type="button" class="inboxIconButton234" data-inbox-refresh aria-label="Refresh inbox">${icon("refresh")}</button>
        </header>
        <div class="inboxWorkspace234 ${active ? "hasConversation" : ""}">
          <aside class="inboxRail234">
            <div class="inboxRailIntro234">
              <span class="inboxEyebrow234">YOUR COMMUNICATIONS</span>
              <h1>Everything important.<br><em>One secure place.</em></h1>
              <p>Mentor conversations, application updates, verified job offers and account messages—kept together for you.</p>
            </div>
            <nav aria-label="Inbox folders">
              ${folderButton("all", "All messages", state.threads.length)}
              ${folderButton("unread", "Unread", counts.unread)}
              ${folderButton("mentor", "Mentors", counts.mentor || 0)}
              ${folderButton("job_offer", "Job offers", counts.job_offer || 0)}
              ${folderButton("application", "Applications", counts.application || 0)}
              ${folderButton("support", "Support", counts.support || 0)}
            </nav>
            <div class="inboxTrust234">${icon("shield")}<div><b>Protected by design</b><span>Your inbox is owner-protected by Supabase access policies.</span></div></div>
          </aside>
          <main class="inboxListPane234" aria-label="Inbox messages">
            <div class="inboxListHead234">
              <div><span class="inboxEyebrow234">PERSONAL INBOX</span><h2>${state.filter === "all" ? "All messages" : state.filter === "unread" ? "Unread" : label(state.filter)}</h2></div>
              <label class="inboxSearch234">${icon("search")}<span class="srOnly234">Search messages</span><input type="search" aria-label="Search messages" value="${esc(state.query)}" placeholder="Search your inbox" data-inbox-search></label>
            </div>
            <div class="inboxThreadList234" aria-live="polite">
              ${state.loading ? `<div class="inboxState234"><span class="inboxLoader234"></span><b>Securing your inbox</b><p>Loading your personal updates…</p></div>` :
                list.length ? list.map((thread) => `
                  <button type="button" class="inboxThread234 ${thread.id === state.activeId ? "active" : ""} ${unread(thread) ? "unread" : ""}" data-inbox-thread="${esc(thread.id)}">
                    <span class="inboxAvatar234 category-${esc(thread.category)}">${icon(thread.category)}</span>
                    <span class="inboxThreadCopy234">
                      <span class="inboxThreadMeta234"><b>${esc(thread.sender_name || "Beyond The Visa")}</b><time>${esc(time(thread.last_message_at))}</time></span>
                      <strong>${esc(thread.subject)}</strong>
                      <span>${esc(preview(thread))}</span>
                      <small>${esc(label(thread.category))}${thread.priority !== "standard" ? ` · ${esc(thread.priority)}` : ""}</small>
                    </span>
                    ${unread(thread) ? '<i aria-label="Unread message"></i>' : ""}
                  </button>`).join("") :
                `<div class="inboxState234">${icon("inbox")}<b>Your ${state.filter === "all" ? "inbox" : "folder"} is clear</b><p>Personal updates will appear here as soon as they arrive.</p></div>`}
            </div>
          </main>
          <section class="inboxReader234" aria-label="Selected conversation">
            ${active ? conversation(active) : `<div class="inboxWelcome234">${icon("inbox")}<span class="inboxEyebrow234">PRIVATE MEMBER CHANNEL</span><h2>Select a conversation</h2><p>Choose a message to read the full update, respond securely or take the next verified action.</p></div>`}
          </section>
        </div>
      </div>`;
    bind();
  }

  function conversation(thread) {
    const messages = state.messages.get(thread.id) || [];
    const canReply = ["mentor", "application", "support"].includes(thread.category) && thread.status !== "archived";
    return `
      <header class="inboxReaderHead234">
        <button type="button" class="inboxMobileBack234" data-inbox-list>${icon("back")} Inbox</button>
        <div class="inboxSender234">
          <span class="inboxAvatar234 category-${esc(thread.category)}">${icon(thread.category)}</span>
          <div><span>${esc(label(thread.category))}</span><h2>${esc(thread.subject)}</h2><p>${esc(thread.sender_name)} · ${esc(thread.sender_role || "Verified sender")}</p></div>
        </div>
        <button type="button" class="inboxIconButton234" data-inbox-archive="${esc(thread.id)}" aria-label="${thread.status === "archived" ? "Restore" : "Archive"} conversation">${icon("archive")}</button>
      </header>
      <div class="inboxAssurance234">${icon("shield")}<span><b>Verified inside Beyond The Visa</b> Use only the secure actions shown here. Never send payment or personal documents outside the platform.</span></div>
      <div class="inboxConversation234">
        ${messages.map((message) => {
          const action = safeAction(message.action_url);
          return `<article class="inboxBubble234 ${message.sender_type === "member" ? "mine" : ""}">
            <div><b>${esc(message.sender_name)}</b><time>${esc(new Date(message.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }))}</time></div>
            <p>${esc(message.body).replace(/\n/g, "<br>")}</p>
            ${action ? `<a href="${esc(action)}" class="inboxAction234">${esc(message.action_label || "View update")}${icon("arrow")}</a>` : ""}
          </article>`;
        }).join("")}
      </div>
      ${canReply ? `<form class="inboxComposer234" data-inbox-reply="${esc(thread.id)}">
        <label for="inboxReply234">Reply securely</label>
        <div><textarea id="inboxReply234" name="message" rows="2" maxlength="8000" required placeholder="Write a message…"></textarea><button type="submit" aria-label="Send reply">${icon("send")}</button></div>
        <small>For your safety, contact details, external links and off-platform payments cannot be shared.</small>
      </form>` : `<div class="inboxReadOnly234">${icon("shield")}This is a verified read-only update.</div>`}
    `;
  }

  function bind() {
    const root = state.root;
    root.querySelectorAll("[data-inbox-close]").forEach((button) => button.onclick = (event) => {
      event.preventDefault(); close();
    });
    root.querySelector("[data-inbox-refresh]")?.addEventListener("click", () => load(true));
    root.querySelectorAll("[data-inbox-filter]").forEach((button) => button.onclick = () => {
      state.filter = button.dataset.inboxFilter; state.activeId = null; render();
    });
    root.querySelector("[data-inbox-search]")?.addEventListener("input", (event) => {
      state.query = event.target.value; state.activeId = null; render();
      requestAnimationFrame(() => {
        const input = $("[data-inbox-search]", root);
        input?.focus(); input?.setSelectionRange(state.query.length, state.query.length);
      });
    });
    root.querySelectorAll("[data-inbox-thread]").forEach((button) => button.onclick = async () => {
      state.activeId = button.dataset.inboxThread;
      root.classList.add("showConversation");
      render();
      await markRead(state.activeId);
    });
    root.querySelector("[data-inbox-list]")?.addEventListener("click", () => {
      root.classList.remove("showConversation");
    });
    root.querySelector("[data-inbox-archive]")?.addEventListener("click", archiveThread);
    root.querySelector("[data-inbox-reply]")?.addEventListener("submit", sendReply);
  }

  function legacyThread(notification, table = "btv_notifications") {
    const category = /mentor/i.test(notification.category) ? "mentor"
      : /job|application/i.test(notification.category) ? "application"
      : /support/i.test(notification.category) ? "support"
      : /wallet|account/i.test(notification.category) ? "account" : "system";
    const id = `legacy-${table}-${notification.id}`;
    state.messages.set(id, [{
      id: notification.id, sender_type: "system", sender_name: "Beyond The Visa",
      body: notification.body, action_label: notification.action_url ? "View update" : null,
      action_url: notification.action_url, read_at: notification.read_at,
      created_at: notification.created_at,
    }]);
    return {
      id, category, subject: notification.title, sender_name: "Beyond The Visa",
      sender_role: "Member updates", priority: "standard", status: "open",
      last_message_at: notification.created_at, legacyId: notification.id, legacyTable: table,
    };
  }

  async function load(showLoader = false) {
    if (state.loading) return;
    state.loading = true;
    if (showLoader || !state.threads.length) render();
    try {
      const client = db();
      if (!client) throw new Error("Secure inbox is unavailable right now.");
      const session = (await client.auth.getSession()).data?.session;
      if (!session) throw new Error("Please sign in to open your personal inbox.");
      state.user = session.user;
      state.messages.clear();

      const threadResult = await client.from("btv_inbox_threads")
        .select("id,user_id,category,subject,sender_name,sender_role,priority,status,last_message_at,created_at")
        .eq("user_id", session.user.id).order("last_message_at", { ascending: false });
      let threads = threadResult.error ? [] : (threadResult.data || []);
      if (threads.length) {
        const ids = threads.map((thread) => thread.id);
        const messageResult = await client.from("btv_inbox_messages")
          .select("id,thread_id,sender_type,sender_name,body,action_label,action_url,read_at,created_at")
          .in("thread_id", ids).order("created_at", { ascending: true });
        if (messageResult.error) throw messageResult.error;
        messageResult.data.forEach((message) => {
          const messages = state.messages.get(message.thread_id) || [];
          messages.push(message); state.messages.set(message.thread_id, messages);
        });
      }

      const [legacyResult, platformResult] = await Promise.all([
        client.from("btv_notifications")
          .select("id,category,title,body,action_url,read_at,created_at")
          .eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100),
        client.from("notifications")
          .select("id,category,title,body,action_url,read_at,created_at")
          .eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100),
      ]);
      const mirrored = new Set(threads.flatMap((thread) =>
        (state.messages.get(thread.id) || []).map((message) => message.action_url + "|" + message.body)
      ));
      const legacy = [
        ...(legacyResult.data || []).map((notification) => [notification, "btv_notifications"]),
        ...(platformResult.data || []).map((notification) => [notification, "notifications"]),
      ].filter(([notification]) =>
        !mirrored.has(notification.action_url + "|" + notification.body)
      ).map(([notification, table]) => legacyThread(notification, table));
      state.threads = [...threads, ...legacy].sort((a, b) =>
        new Date(b.last_message_at) - new Date(a.last_message_at)
      );
      if (state.activeId && !state.threads.some((thread) => thread.id === state.activeId)) state.activeId = null;
    } catch (error) {
      state.threads = [];
      state.messages.clear();
      state.error = error.message || "Your inbox could not be loaded.";
    } finally {
      state.loading = false;
      render();
      if (state.error) {
        const empty = $(".inboxState234", state.root);
        if (empty) empty.innerHTML = `${icon("shield")}<b>Inbox unavailable</b><p>${esc(state.error)}</p>`;
        state.error = "";
      }
    }
  }

  async function markRead(id) {
    const thread = state.threads.find((item) => item.id === id);
    if (!thread || !unread(thread)) return;
    try {
      if (thread.legacyId) {
        await db().from(thread.legacyTable || "btv_notifications").update({ read_at: new Date().toISOString() }).eq("id", thread.legacyId);
      } else {
        await db().rpc("btv_inbox_mark_thread", { p_thread: id, p_read: true });
      }
      (state.messages.get(id) || []).forEach((message) => {
        if (message.sender_type !== "member") message.read_at ||= new Date().toISOString();
      });
      render();
    } catch {}
  }

  async function archiveThread(event) {
    const id = event.currentTarget.dataset.inboxArchive;
    if (id.startsWith("legacy-")) return;
    const thread = state.threads.find((item) => item.id === id);
    const next = thread.status === "archived" ? "open" : "archived";
    const result = await db().from("btv_inbox_threads").update({ status: next }).eq("id", id);
    if (!result.error) { thread.status = next; render(); }
  }

  async function sendReply(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("button", form);
    const body = new FormData(form).get("message")?.trim();
    if (!body) return;
    button.disabled = true;
    const result = await db().rpc("btv_inbox_send_reply", {
      p_thread: form.dataset.inboxReply, p_body: body,
    });
    button.disabled = false;
    if (result.error) {
      let notice = $(".inboxComposerError234", form);
      if (!notice) {
        notice = document.createElement("p"); notice.className = "inboxComposerError234";
        form.append(notice);
      }
      notice.textContent = result.error.message || "Your reply could not be sent.";
      return;
    }
    form.reset();
    await load();
  }

  function subscribe() {
    if (state.channel || !state.user || !db()?.channel) return;
    state.channel = db().channel(`member-inbox-${state.user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "btv_inbox_threads",
        filter: `user_id=eq.${state.user.id}`,
      }, () => load())
      .subscribe();
  }
  function unsubscribe() {
    if (!state.channel) return;
    db()?.removeChannel?.(state.channel); state.channel = null;
  }
  async function open() {
    const root = shell();
    root.hidden = false;
    document.body.classList.add("inboxOpen234");
    state.filter = "all";
    state.activeId = null;
    render();
    await load();
    subscribe();
    root.querySelector("[data-inbox-search]")?.focus();
  }
  function close() {
    shell().hidden = true;
    shell().classList.remove("showConversation");
    document.body.classList.remove("inboxOpen234");
    unsubscribe();
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !shell().hidden) close();
  });
  window.BTVInboxCentre = { open, close, refresh: load };
})();
