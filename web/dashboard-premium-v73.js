(function () {
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
    {
      category: "Motivation",
      title: "You did not come this far to stop now.",
      copy: "Every study session and completed milestone moves your international nursing journey forward.",
    },
    {
      category: "Platform News",
      title: "New CBT practice questions available",
      copy: "Build confidence with fresh practice questions and detailed explanations.",
      action: "Start practising",
      route: "cbt",
      date: "23 July 2026",
    },
    {
      category: "Motivation",
      title: "Keep learning. Keep preparing.",
      copy: "Your opportunity is coming. Focus on the next clear action and let steady progress compound.",
    },
    {
      category: "Platform News",
      title: "Visa Hub guidance updated",
      copy: "Review the latest pathway guidance saved for your destination.",
      action: "Review journey",
      route: "journey",
      date: "21 July 2026",
    },
  ];

  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  const iconSvg = (name) =>
    ({
      home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5V21h-6v-7H9v7H3z"/></svg>',
      journey:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="4" cy="6" r="1.4"/><circle cx="4" cy="12" r="1.4"/><circle cx="4" cy="18" r="1.4"/></svg>',
      spark:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6z"/></svg>',
      learn:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5z"/><path d="M9 3v18"/></svg>',
      cost: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M8.5 9.5h5a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h5"/></svg>',
      search:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
      users:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="18" cy="9" r="2.3"/><path d="M15.5 20a5 5 0 0 1 5-4.4"/></svg>',
      mentor:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V7l8-4 8 4v13"/><path d="M8 10h8M8 14h8"/></svg>',
      settings:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6z"/></svg>',
      bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10 21h4"/></svg>',
      moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 1 1 11.5 4 7 7 0 0 0 20 15.5z"/></svg>',
      menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
      coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M8.8 9.4H14a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h4.4"/></svg>',
      logout:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
      arrowRight:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    }[name] || "");
  const socialLinksMarkup = () => `
    <div class="sidebarSocialStrip262" role="navigation" aria-label="Connect with Beyond the Visa">
      <a class="isFacebook262" href="https://www.facebook.com/share/1JsB8W8Wtg/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Visit Beyond the Visa on Facebook" title="Facebook">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.7 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.2-2.8-.2-2.8 0-4.7 1.7-4.7 4.8v2.4H6.8V13h3.1v9h3.8Z"/></svg><span><b>Facebook</b><small>Beyond the Visa</small></span><i class="socialArrow264" aria-hidden="true">&#8599;</i>
      </a>
      <a class="isTiktok262" href="https://www.tiktok.com/@beyond_the_visa?_r=1&amp;_t=ZN-98V2UDlDXD4" target="_blank" rel="noopener noreferrer" aria-label="Visit Beyond the Visa on TikTok" title="TikTok @beyond_the_visa">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.7 3.2c.4 2.1 1.7 3.5 3.8 4v3.2a8.2 8.2 0 0 1-3.8-1.1v6.1a6.3 6.3 0 1 1-5.4-6.2v3.3a3.1 3.1 0 1 0 2.1 2.9V3.2h3.3Z"/></svg><span><b>TikTok</b><small>@beyond_the_visa</small></span><i class="socialArrow264" aria-hidden="true">&#8599;</i>
      </a>
      <a class="isInstagram262" href="https://www.instagram.com/beyondthevisa_official?igsh=eTlraTNjdnNpdWwy&amp;utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Visit Beyond the Visa on Instagram" title="Instagram @beyondthevisa_official">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.6" cy="6.5" r="1" class="socialDot262"/></svg><span><b>Instagram</b><small>@beyondthevisa_official</small></span><i class="socialArrow264" aria-hidden="true">&#8599;</i>
      </a>
      <a class="isWhatsapp262" href="https://wa.me/447723126429?text=Hello%20Beyond%20the%20Visa%2C%20I%20found%20your%20contact%20through%20your%20website%20and%20would%20like%20to%20make%20an%20enquiry." target="_blank" rel="noopener noreferrer" aria-label="Message Beyond the Visa on WhatsApp" title="WhatsApp +44 7723 126429">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.4-1.7a11.8 11.8 0 0 0 5.5 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.2-3.5-8.4Zm-8.4 18.2c-1.7 0-3.4-.5-4.9-1.3l-.4-.2-3.8 1 1-3.7-.2-.4a9.7 9.7 0 1 1 8.3 4.6Zm5.3-7.3c-.3-.1-1.7-.8-2-1-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.3-.5.3-.8.1-2-.9-3.3-1.7-4.6-4-.3-.6.3-.6.9-1.9.1-.3.1-.5 0-.7L8.4 6c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.1.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.2-.2-.5-.3-1.2-.6Z"/></svg><span><b>WhatsApp</b><small>+44 7723 126429</small></span><i class="socialArrow264" aria-hidden="true">&#8599;</i>
      </a>
    </div>`;
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

  function localProfileExtra() {
    try {
      return JSON.parse(localStorage.getItem("btv-profile-extra") || "{}");
    } catch {
      return {};
    }
  }

  function profilePhoto() {
    const stored =
      localProfileExtra().photo ||
      localProfile().photo ||
      "";
    if (stored) return String(stored);
    const current =
      document.querySelector("#headerProfile img")?.getAttribute("src") ||
      document.getElementById("pfPhoto")?.getAttribute("src") ||
      "";
    return String(current).startsWith("data:image/svg+xml") ? "" : String(current);
  }

  function avatarMarkup(name, className) {
    const photo = profilePhoto();
    return photo
      ? `<span class="${className}"><img data-btv-profile-photo src="${esc(
          photo
        )}" alt=""></span>`
      : `<span class="${className}">${esc(initials(name))}</span>`;
  }

  function destinationInfo() {
    const profile = localProfile();
    const synced = window.destinationSync?.snapshot?.() || null;
    const selected =
      typeof window.country === "function" ? window.country() : null;
    const raw =
      synced?.country ||
      profile.destination_country ||
      profile.destination ||
      state.u?.user_metadata?.destination_country ||
      state.u?.user_metadata?.destination ||
      selected?.name ||
      "United Kingdom";
    const key =
      {
        "united kingdom": "uk",
        uk: "uk",
        england: "uk",
        "united states": "us",
        "united states of america": "us",
        usa: "us",
        us: "us",
        australia: "au",
        au: "au",
        canada: "ca",
        ca: "ca",
        "new zealand": "nz",
        nz: "nz",
        ireland: "ie",
        ie: "ie",
        "united arab emirates": "ae",
        uae: "ae",
        ae: "ae",
        "saudi arabia": "sa",
        sa: "sa",
      }[String(raw).trim().toLowerCase()] || "uk";
    const meta = {
      uk: { name: "United Kingdom", flag: "🇬🇧", exam: "cbt" },
      us: { name: "United States", flag: "🇺🇸", exam: "nclex" },
      au: { name: "Australia", flag: "🇦🇺", exam: "registration" },
      ca: { name: "Canada", flag: "🇨🇦", exam: "nclex" },
      nz: { name: "New Zealand", flag: "🇳🇿", exam: "registration" },
      ie: { name: "Ireland", flag: "🇮🇪", exam: "registration" },
      ae: { name: "United Arab Emirates", flag: "🇦🇪", exam: "registration" },
      sa: { name: "Saudi Arabia", flag: "🇸🇦", exam: "registration" },
    }[key];
    return {
      key,
      name: meta.name,
      flag: meta.flag,
      flagCode: key === "uk" ? "gb" : key,
      exam: meta.exam,
    };
  }

  function safeName(u) {
    const p = localProfile();
    const raw =
      p.preferredName ||
      p.name ||
      u?.user_metadata?.preferred_name ||
      u?.user_metadata?.full_name ||
      "";
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
    const weekday = d
      .toLocaleDateString(undefined, { weekday: "long" })
      .toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    const month = d
      .toLocaleDateString(undefined, { month: "long" })
      .toUpperCase();
    return `${weekday}, ${day} ${month} ${d.getFullYear()}`;
  }

  function fmtHeroDate() {
    const d = new Date();
    const weekday = d
      .toLocaleDateString(undefined, { weekday: "long" })
      .toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    const month = d
      .toLocaleDateString(undefined, { month: "long" })
      .toUpperCase();
    return `${weekday} ${day} ${month}`;
  }

  async function load() {
    let session = null;
    try {
      session = (await db()?.auth?.getSession())?.data?.session || null;
    } catch (e) {
      console.warn("v73 session fallback", e);
    }
    const profile = localProfile();
    let account = {};
    try {
      account = JSON.parse(localStorage.getItem("btv-account") || "{}");
    } catch {}
    const u = session?.user || {
      id: account.id || "local-account",
      email: account.email || "",
      user_metadata: {
        full_name:
          profile.preferredName || profile.name || account.name || "MR",
        profession: profile.profession,
        destination: profile.destination,
      },
    };
    if (!session || !db()?.from) {
      state = {
        u,
        isAdmin: false,
        wallet: { balance: Number(account.coins || 0) },
        game: { level: 1, xp: 0, current_streak: 0 },
        mocks: [],
        notes: [],
        saved: [],
        progress: [],
        steps: [],
        activity: [],
        streak: null,
      };
      return state;
    }
    let platform = {};
    try {
      const [wallet, game, mocks, notes, saved, progress, steps, activity] =
        await Promise.all([
          db()
            .from("btv_wallets")
            .select("*")
            .eq("user_id", u.id)
            .maybeSingle(),
          db()
            .from("btv_gamification")
            .select("*")
            .eq("user_id", u.id)
            .maybeSingle(),
          db()
            .from("btv_mock_sessions")
            .select("*")
            .eq("user_id", u.id)
            .order("started_at", { ascending: false })
            .limit(12),
          db()
            .from("btv_notifications")
            .select("*")
            .eq("user_id", u.id)
            .order("created_at", { ascending: false })
            .limit(12),
          db().from("btv_saved_jobs").select("*").eq("user_id", u.id),
          db()
            .from("btv_user_journey_progress")
            .select("*")
            .eq("user_id", u.id),
          db()
            .from("btv_journey_steps")
            .select("*")
            .eq("is_active", true)
            .order("sort_order"),
          db()
            .from("btv_study_activity")
            .select("*")
            .eq("user_id", u.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
      const failed = [
        wallet,
        game,
        mocks,
        notes,
        saved,
        progress,
        steps,
        activity,
      ].find((x) => x.error);
      if (failed) throw failed.error;
      let isAdmin = false;
      try {
        const role = await db()
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .maybeSingle();
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
        streak: null,
      };
      try {
        const streakSummary = await db().rpc("btv_learning_streak_summary");
        if (streakSummary.error) throw streakSummary.error;
        platform.streak = streakSummary.data || null;
      } catch (e) {
        console.warn("v73 streak standings fallback", e);
      }
    } catch (e) {
      console.warn("v73 data fallback", e);
      platform = {
        isAdmin: false,
        wallet: { balance: 0 },
        game: { level: 1, xp: 0, current_streak: 0 },
        mocks: [],
        notes: [],
        saved: [],
        progress: [],
        steps: [],
        activity: [],
        streak: null,
      };
    }
    state = { u, ...platform };
    return state;
  }

  function journey() {
    const legacy =
      typeof window.completed === "function" ? window.completed() : 0;
    const synced = window.destinationSync?.snapshot?.() || null;
    const syncedSteps = Array.isArray(synced?.steps) ? synced.steps : [];
    const destinationKey = destinationInfo().key;
    const role = String(
      localProfile().profession || state.u?.user_metadata?.profession || ""
    )
      .trim()
      .toLowerCase();
    const canonicalRole = role.startsWith("midwi")
      ? "midwifery"
      : role.startsWith("nurs")
      ? "nursing"
      : "";
    const scopedSteps = (state.steps || []).filter((step) => {
      if (step?.destination && step.destination !== destinationKey)
        return false;
      if (
        step?.is_active === false ||
        step?.is_archived === true ||
        step?.is_required === false
      )
        return false;
      const roles = Array.isArray(step?.applicable_professions)
        ? step.applicable_professions.map((value) =>
            String(value || "").toLowerCase()
          )
        : [];
      return (
        !roles.length ||
        !canonicalRole ||
        roles.some((value) => value.startsWith(canonicalRole.slice(0, 5)))
      );
    });
    const legacyTotal =
      typeof window.country === "function"
        ? window.country()?.steps?.length || 0
        : 0;
    const useSynced =
      synced?.country === destinationKey &&
      syncedSteps.length > 0 &&
      syncedSteps.length >= scopedSteps.length;
    const usePlatformSteps = !useSynced && scopedSteps.length > 0;
    const scopedCodes = new Set(scopedSteps.map((step) => step.code));
    const rawDone = useSynced
      ? synced?.done || 0
      : usePlatformSteps
      ? state.progress?.filter(
          (x) =>
            scopedCodes.has(x.step_code) &&
            (x.completed === true || Boolean(x.completed_at))
        ).length || 0
      : legacy;
    const calculatedTotal = useSynced
      ? syncedSteps.length
      : usePlatformSteps
      ? scopedSteps.length
      : legacyTotal || 7;
    const total = destinationKey === "uk" ? Math.max(calculatedTotal, 15) : calculatedTotal;
    const done = Math.min(Math.max(Number(rawDone) || 0, 0), total);
    return { done, total, pct: total ? Math.min(100, Math.round((done / total) * 100)) : 0 };
  }

  function recommendation(j) {
    const p = localProfile();
    if (!p.profession || !p.destination)
      return {
        title: "Complete your profile",
        copy: "Add your profession and destination for personalised guidance.",
        id: "profile",
      };
    const active = state.mocks?.find(
      (x) => x.status === "active" || x.status === "in_progress"
    );
    if (active)
      return {
        title: "Resume your active mock",
        copy: `Continue ${String(active.mock_code).replaceAll(
          "_",
          " "
        )} without paying again.`,
        id: "mock-tests",
      };
    if (!j.done)
      return {
        title: "Upload your essential documents",
        copy: "Start with the certificates and identity files your pathway will need.",
        id: "documents",
      };
    if (state.notes?.some((x) => !x.read_at))
      return {
        title: "Review your updates",
        copy: "You have unread guidance and account notifications.",
        id: "notifications",
      };
    return {
      title: "Continue today’s study plan",
      copy: "Keep your learning streak moving forward.",
      id: "study-plan",
    };
  }

  function examStats() {
    const destination = destinationInfo();
    if (destination.exam === "registration")
      return {
        label: "Registration",
        route: "journey",
        value: `${journey().pct}%`,
        sub: `${destination.name} pathway`,
      };
    const token = destination.exam;
    const latest = state.mocks?.find(
      (x) =>
        String(x.mock_code || "")
          .toLowerCase()
          .includes(token) &&
        (x.status === "completed" || x.status === "submitted")
    );
    if (!latest || !latest.total)
      return {
        label: token === "nclex" ? "NCLEX accuracy" : "CBT accuracy",
        route: token,
        value: "-",
        sub: "0 questions answered",
      };
    const pct = Math.round(
      (Number(latest.score || 0) / Number(latest.total || 1)) * 100
    );
    return {
      label: token === "nclex" ? "NCLEX accuracy" : "CBT accuracy",
      route: token,
      value: `${pct}%`,
      sub: `${Number(latest.total || 0)} questions answered`,
    };
  }

  function showHomeAdvice() {
    const destination = destinationInfo();
    const progress = journey();
    const suggested = recommendation(progress);
    const current = journeyItems().find((step) => step.current);
    const unread = state.notes?.filter((note) => !note.read_at).length || 0;
    const choices = [
      {
        tag: "RECOMMENDED NEXT STEP",
        title: suggested.title,
        copy: suggested.copy,
        route: suggested.id,
      },
      current
        ? {
            tag: "YOUR JOURNEY",
            title: current.title,
            copy: `${current.copy} You are ${progress.pct}% through your ${destination.name} checklist.`,
            route: "journey",
          }
        : null,
      unread
        ? {
            tag: "ACCOUNT UPDATE",
            title: `Review ${unread} unread notification${
              unread === 1 ? "" : "s"
            }`,
            copy: "Open your updates for journey reminders, learning news and account information.",
            route: "notifications",
          }
        : null,
      destination.exam === "cbt"
        ? {
            tag: "LEARNING ADVICE",
            title: "Keep CBT preparation consistent",
            copy: "A short focused practice session followed by explanation review is more useful than rushing through a large question set.",
            route: "cbt",
          }
        : destination.exam === "nclex"
        ? {
            tag: "LEARNING ADVICE",
            title: "Practise NCLEX clinical judgement",
            copy: "Use safety, assessment, prioritisation and least-harm reasoning before reviewing the explanation.",
            route: "nclex",
          }
        : {
            tag: "REGISTRATION ADVICE",
            title: `Review your ${destination.name} pathway`,
            copy: "Confirm every registration and immigration requirement through the responsible current official authority.",
            route: "journey",
          },
      {
        tag: "CAREER ADVICE",
        title: "Keep one career action moving",
        copy: "Save a suitable role, improve one interview example, or organise one supporting document today.",
        route: "jobs",
      },
      {
        tag: "PLANNING ADVICE",
        title: "Verify before paying or submitting",
        copy: "Check current regulator and government guidance before paying a fee, uploading evidence or making a travel commitment.",
        route: "resources",
      },
    ].filter(Boolean);
    const selected = choices.sort(() => Math.random() - 0.5).slice(0, 3);
    let dialog = document.getElementById("homeAdvice107");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "homeAdvice107";
      dialog.className = "homeAdvice107";
      document.body.append(dialog);
    }
    dialog.innerHTML = `<div class="homeAdvicePanel107"><header><div><small>${esc(
      destination.flag
    )} ${esc(
      destination.name.toUpperCase()
    )} PATHWAY</small><h2>Your recommendations</h2><p>Fresh practical advice for your journey.</p></div><button type="button" data-advice-close aria-label="Close recommendations">&times;</button></header><div class="homeAdviceGrid107">${selected
      .map(
        (item, index) =>
          `<article class="${index === 0 ? "featured" : ""}"><small>${esc(
            item.tag
          )}</small><h3>${esc(item.title)}</h3><p>${esc(
            item.copy
          )}</p><button type="button" data-advice-route="${esc(
            item.route
          )}">Open ${esc(item.title)}</button></article>`
      )
      .join(
        ""
      )}</div><footer><button type="button" data-refresh-advice>Show different advice</button><button type="button" data-advice-close>Close</button></footer></div>`;
    const close = () => dialog.close();
    dialog
      .querySelectorAll("[data-advice-close]")
      .forEach((button) => (button.onclick = close));
    dialog.querySelectorAll("[data-advice-route]").forEach(
      (button) =>
        (button.onclick = () => {
          const route = button.dataset.adviceRoute;
          close();
          go(route);
        })
    );
    dialog.querySelector("[data-refresh-advice]").onclick = showHomeAdvice;
    dialog.onclick = (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        close();
    };
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("[data-advice-close]")?.focus();
  }

  function coinDetailBody(key) {
    const details = {
      earning: {
        title: "How to earn Beyond Coins",
        body: "You earn coins through approved activity on the platform, including study milestones, streak goals, and selected promotional rewards. Rewards are credited to your wallet and can be used across supported preparation services.",
      },
      usage: {
        title: "Where Beyond Coins are used",
        body: "Beyond Coins can be used for paid learning actions such as timed mock attempts and premium preparation unlocks where marked. The exact coin cost is shown before confirmation.",
      },
      charges: {
        title: "What counts as a charge",
        body: "A charge is applied only when you confirm a paid action. If the action is session-based, the charge applies to that purchased session only.",
      },
      refunds: {
        title: "Refunds and reversals",
        body: "If a technical failure prevents the purchased action from starting correctly, support can investigate and issue a coin reversal where applicable. Completed usage is normally not refundable.",
      },
      history: {
        title: "Transaction history",
        body: "Your wallet history records each credit and debit with timestamps so you can audit your usage and support requests.",
      },
    };
    return details[key] || details.usage;
  }

  function openCoinDetail(key) {
    const info = coinDetailBody(key);
    let dialog = document.getElementById("coinsDetailDialog73");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "coinsDetailDialog73";
      dialog.className = "coinsDetailDialog73";
      document.body.append(dialog);
    }
    dialog.innerHTML = `<article class="coinsDetailPanel73"><header><h3>${esc(
      info.title
    )}</h3><button type="button" data-coin-detail-close aria-label="Close">&times;</button></header><p>${esc(
      info.body
    )}</p><footer><button type="button" data-coin-detail-close>Close</button></footer></article>`;
    const close = () => dialog.close();
    dialog
      .querySelectorAll("[data-coin-detail-close]")
      .forEach((button) => (button.onclick = close));
    if (!dialog.open) dialog.showModal();
  }

  async function loadCoinsData() {
    const supa = window.btvSupabase;
    if (!supa || !state.u)
      return {
        opportunities: [],
        claimed: new Set(),
        packages: [],
        referralCode: null,
      };
    const uid = state.u.id;
    try {
      const [opRes, claimRes, pkgRes] = await Promise.all([
        supa
          .from("btv_coin_opportunities")
          .select("code,title,description,coin_reward,sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        supa
          .from("btv_coin_rewards")
          .select("opportunity_code")
          .eq("user_id", uid),
        supa
          .from("btv_coin_packages")
          .select(
            "code,title,coin_amount,price_minor,currency,bonus_coins,sort_order"
          )
          .eq("is_active", true)
          .order("sort_order")
          .limit(9),
      ]);
      let referralCode = null;
      try {
        const { data } = await supa.rpc("btv_get_or_create_referral_code");
        referralCode = data;
      } catch {}
      return {
        opportunities: opRes.data || [],
        claimed: new Set((claimRes.data || []).map((r) => r.opportunity_code)),
        packages: pkgRes.data || [],
        referralCode,
      };
    } catch (e) {
      console.error("[BTV] loadCoinsData:", e);
      return {
        opportunities: [],
        claimed: new Set(),
        packages: [],
        referralCode: null,
      };
    }
  }

  async function claimCoinOpportunity(code, btn, onSuccess) {
    const supa = window.btvSupabase;
    if (!supa) return;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = "Claiming…";
    try {
      const { data, error } = await supa.rpc("btv_claim_coin_opportunity", {
        p_code: code,
      });
      if (error) throw new Error(error.message);
      onSuccess(data);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = orig;
      const msg = String(e.message || "");
      alert(
        msg.includes("Complete this activity")
          ? "Finish this activity first, then come back to claim your coins."
          : msg.includes("unavailable")
          ? "This reward is not available right now."
          : "Could not claim reward. Please try again."
      );
    }
  }

  async function initiateCoinPurchase(pkg) {
    const supa = window.btvSupabase;
    if (!supa || !state.u) {
      alert("Please sign in to purchase coins.");
      return null;
    }
    try {
      const { data, error } = await supa.rpc("btv_initiate_coin_purchase", {
        p_package_code: pkg.code,
      });
      if (error) throw new Error(error.message);
      if (!data?.success)
        throw new Error(data?.message || "Purchase could not be initiated.");
      return data;
    } catch (e) {
      console.error("[BTV] initiateCoinPurchase:", e);
      alert(e.message || "Purchase could not be started. Please try again.");
      return null;
    }
  }

  function showBuyDialog(pkg, purchaseData) {
    let d = document.getElementById("coinsBuyDialog73");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "coinsBuyDialog73";
      d.className = "coinsBuyDialog73";
      document.body.append(d);
    }
    const total = pkg.coin_amount + (pkg.bonus_coins || 0);
    const sym =
      { GBP: "£", USD: "$", EUR: "€", GHS: "₵", NGN: "₦" }[pkg.currency] ||
      pkg.currency;
    const price = (pkg.price_minor / 100).toFixed(2);
    const ref = purchaseData?.reference || "N/A";
    const email = "support@beyondthevisa.org";
    const sub = encodeURIComponent("Beyond Coins Purchase – " + ref);
    const body = encodeURIComponent(
      "Hello,\n\nI would like to purchase the " +
        pkg.title +
        " pack (" +
        total +
        " Beyond Coins) at " +
        sym +
        price +
        ".\n\nMy purchase reference: " +
        ref +
        "\n\nPlease confirm payment details.\n\nThank you."
    );
    d.innerHTML = `<article class="coinsBuyPanel73"><header><h3>Buy ${total} BC</h3><button type="button" data-buy-close aria-label="Close">&times;</button></header><div class="coinsBuyHero73"><b>${total} BC</b>${
      pkg.bonus_coins > 0
        ? `<span class="coinsBuyBonusBadge73">+${pkg.bonus_coins} bonus</span>`
        : ""
    }<big>${sym}${price}</big></div><p class="coinsBuyInfo73">Email support with your purchase reference below. Beyond Coins are credited to your wallet once payment is confirmed — normally within one business day.</p><div class="coinsBuyRef73"><small>Your purchase reference</small><b>${esc(
      ref
    )}</b></div><a href="mailto:${email}?subject=${sub}&body=${body}" class="coinsBuyEmailBtn73">📧 Email support to pay</a><button type="button" data-buy-close class="coinsBuyDoneBtn73">Done</button></article>`;
    d.querySelectorAll("[data-buy-close]").forEach(
      (b) => (b.onclick = () => d.close())
    );
    if (!d.open) d.showModal();
  }

  function copyReferralLink(code, btn) {
    const link = location.origin + "?ref=" + encodeURIComponent(code);
    if (!navigator.clipboard) {
      prompt("Copy your referral link:", link);
      return;
    }
    navigator.clipboard
      .writeText(link)
      .then(() => {
        const prev = btn.textContent;
        btn.textContent = "✓ Copied!";
        btn.classList.add("refCopied73");
        setTimeout(() => {
          btn.textContent = prev;
          btn.classList.remove("refCopied73");
        }, 2500);
      })
      .catch(() => prompt("Copy your referral link:", link));
  }

  function renderEarnList(
    container,
    opportunities,
    claimed,
    referralCode,
    dialog
  ) {
    if (!container) return;
    if (!opportunities.length) {
      container.innerHTML = `<p class="coinsEmpty73">No earn activities available right now.</p>`;
      return;
    }
    container.innerHTML = opportunities
      .map((op) => {
        const isClaimed = claimed.has(op.code);
        const isRef = op.code === "invite-friend";
        return `<article class="coinsEarnItem73${isClaimed ? " earned73" : ""}">
        <div class="coinsEarnBody73"><b>${esc(op.title)}</b><small>${esc(
          op.description
        )}</small>${
          isRef && referralCode
            ? `<div class="coinsRefRow73"><code class="coinsRefCode73">${esc(
                referralCode
              )}</code><button type="button" class="coinsRefCopyBtn73" data-ref="${esc(
                referralCode
              )}">Copy link</button></div>`
            : ""
        }</div>
        <div class="coinsEarnRight73"><span class="coinsRewardTag73">+${
          op.coin_reward
        } BC</span>${
          isClaimed
            ? `<span class="coinsEarned73">Earned ✓</span>`
            : `<button type="button" class="coinsClaimBtn73" data-earn="${esc(
                op.code
              )}">${isRef ? "Share" : "Claim"}</button>`
        }</div>
      </article>`;
      })
      .join("");
    container
      .querySelectorAll("[data-ref]")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          copyReferralLink(btn.dataset.ref, btn)
        )
      );
    container.querySelectorAll("[data-earn]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const code = btn.dataset.earn;
        if (code === "invite-friend") {
          const rb = container.querySelector("[data-ref]");
          if (rb) copyReferralLink(rb.dataset.ref, rb);
          return;
        }
        claimCoinOpportunity(code, btn, (newBal) => {
          btn.parentElement.innerHTML = `<span class="coinsEarned73">Earned ✓</span>`;
          btn.closest(".coinsEarnItem73")?.classList.add("earned73");
          state.wallet = { ...(state.wallet || {}), balance: newBal };
          const balEl = dialog?.querySelector(".coinsBalanceAmt73");
          if (balEl)
            balEl.textContent = Number(newBal).toLocaleString("en-GB") + " BC";
          window.dispatchEvent(new CustomEvent("btv:wallet-changed"));
        });
      })
    );
  }

  function renderBuyGrid(container, packages) {
    if (!container) return;
    if (!packages.length) {
      container.innerHTML = `<p class="coinsEmpty73">Coin packages coming soon.</p>`;
      return;
    }
    const sym = { GBP: "£", USD: "$", EUR: "€", GHS: "₵", NGN: "₦" };
    container.innerHTML = packages
      .map((pkg) => {
        const total = pkg.coin_amount + (pkg.bonus_coins || 0);
        const s = sym[pkg.currency] || pkg.currency;
        const price = (pkg.price_minor / 100).toFixed(2);
        return `<article class="coinsPkgCard73"><div class="coinsPkgTop73"><b>${total}</b><small>BC</small></div>${
          pkg.bonus_coins > 0
            ? `<span class="coinsPkgBonus73">+${pkg.bonus_coins} bonus</span>`
            : `<span class="coinsPkgLabel73">${esc(pkg.title)}</span>`
        }<button type="button" class="coinsPkgBuyBtn73" data-pkg='${JSON.stringify(
          {
            code: pkg.code,
            title: pkg.title,
            coin_amount: pkg.coin_amount,
            bonus_coins: pkg.bonus_coins || 0,
            price_minor: pkg.price_minor,
            currency: pkg.currency,
          }
        )}'>Buy · ${s}${price}</button></article>`;
      })
      .join("");
    container.querySelectorAll("[data-pkg]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const pkg = JSON.parse(btn.dataset.pkg);
        btn.disabled = true;
        const orig = btn.textContent;
        btn.textContent = "Setting up…";
        const result = await initiateCoinPurchase(pkg);
        btn.disabled = false;
        btn.textContent = orig;
        if (result) showBuyDialog(pkg, result);
      })
    );
  }

  async function openCoinsCentre() {
    if (window.BTVBeyondCoins178?.open) return window.BTVBeyondCoins178.open();
    const premiumWalletButton = document.querySelector("[data-coins-widget178] button");
    if (premiumWalletButton) return premiumWalletButton.click();
    const balance = Number(state.wallet?.balance || 0).toLocaleString("en-GB");
    let dialog = document.getElementById("coinsCentreDialog73");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "coinsCentreDialog73";
      dialog.className = "coinsCentreDialog73";
      document.body.append(dialog);
    }
    dialog.innerHTML = `<article class="coinsCentrePanel73">
      <header><div><small>BEYOND COINS</small><h2>Your Beyond Coins</h2><p>Earn, buy or spend your coins across the platform.</p></div><button type="button" data-coin-close class="coinsCentreClose73" aria-label="Close">&times;</button></header>
      <section class="coinsBalance73"><b class="coinsBalanceAmt73">${balance} BC</b><span>Current wallet balance</span></section>
      <section class="coinsEarnSection73"><header class="coinsSub73"><span>EARN COINS</span><small>One-time activities · auto-credited</small></header><div class="coinsEarnList73" id="coinsEarnList73"><div class="coinsSpinner73">Loading activities…</div></div></section>
      <section class="coinsBuySection73"><header class="coinsSub73"><span>BUY COINS</span><small>Instant top-up packages</small></header><div class="coinsBuyGrid73" id="coinsBuyGrid73"><div class="coinsSpinner73">Loading packages…</div></div></section>
      <section class="coinsInfoSection73"><header class="coinsSub73"><span>ABOUT COINS</span></header><div class="coinsDetails73"><button type="button" data-coin-detail="earning"><span>How to earn coins</span>${iconSvg(
        "arrowRight"
      )}</button><button type="button" data-coin-detail="usage"><span>Where coins are used</span>${iconSvg(
      "arrowRight"
    )}</button><button type="button" data-coin-detail="charges"><span>Charging rules</span>${iconSvg(
      "arrowRight"
    )}</button><button type="button" data-coin-detail="refunds"><span>Refund policy</span>${iconSvg(
      "arrowRight"
    )}</button><button type="button" data-coin-detail="history"><span>Transaction history</span>${iconSvg(
      "arrowRight"
    )}</button></div></section>
    </article>`;
    const close = () => dialog.close();
    dialog.querySelector("[data-coin-close]")?.addEventListener("click", close);
    dialog
      .querySelectorAll("[data-coin-detail]")
      .forEach((b) =>
        b.addEventListener("click", () => openCoinDetail(b.dataset.coinDetail))
      );
    if (!dialog.open) dialog.showModal();
    const data = await loadCoinsData();
    renderEarnList(
      dialog.querySelector("#coinsEarnList73"),
      data.opportunities,
      data.claimed,
      data.referralCode,
      dialog
    );
    renderBuyGrid(dialog.querySelector("#coinsBuyGrid73"), data.packages);
  }

  async function openMentorMarketplace() {
    let dialog = document.getElementById("mentorMarketplaceDialog177");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "mentorMarketplaceDialog177";
      dialog.className = "mentorMarketplaceDialog177";
      document.body.append(dialog);
    }

    const close = () => dialog.close();
    dialog.innerHTML = `<article class="mentorMarketplace177">
      <header class="mentorHero177">
        <div class="mentorHeroTop177"><span>MENTOR MARKETPLACE</span><button type="button" data-mentor-close aria-label="Close mentor marketplace">&times;</button></div>
        <div class="mentorHeroCopy177">
          <div><p class="mentorEyebrow177">THE PRIVATE MENTOR NETWORK</p><h2>Experience that moves your career forward.</h2><p>Connect with approved healthcare professionals who understand registration, relocation and the decisions that shape an international career.</p></div>
          <div class="mentorHeroProof177" aria-label="Marketplace standards"><div><b>Approved</b><small>professional profiles</small></div><div><b>1-to-1</b><small>focused guidance</small></div><div><b>Safe</b><small>on-platform support</small></div></div>
        </div>
      </header>
      <div class="mentorToolbar177">
        <label><span class="mentorSearchIcon177">${iconSvg("search")}</span><input type="search" data-mentor-search placeholder="Search specialty, language or support" aria-label="Search mentors"></label>
        <div class="mentorFilters177" role="group" aria-label="Filter mentors">
          <button type="button" class="active" data-mentor-filter="all">All mentors</button>
          <button type="button" data-mentor-filter="registration">Registration</button>
          <button type="button" data-mentor-filter="exam">Exam preparation</button>
          <button type="button" data-mentor-filter="career">Career & interviews</button>
        </div>
      </div>
      <div class="mentorBody177">
        <main class="mentorResults177">
          <div class="mentorResultsHead177"><div><p>APPROVED MENTORS</p><h3>Find your right fit</h3></div><span data-mentor-count>Checking availability...</span></div>
          <div class="mentorGrid177" data-mentor-results><div class="mentorLoading177"><i></i><p>Loading approved mentors...</p></div></div>
        </main>
        <aside class="mentorGuide177">
          <section><p>HOW IT WORKS</p><ol><li><i>1</i><span><b>Choose your mentor</b><small>Match experience to your destination and goals.</small></span></li><li><i>2</i><span><b>Pick a focused topic</b><small>Prepare the one outcome you want from your session.</small></span></li><li><i>3</i><span><b>Meet securely</b><small>Keep communication and support on Beyond The Visa.</small></span></li></ol></section>
          <section class="mentorTopics177"><p>POPULAR SUPPORT</p><div><span>Registration pathways</span><span>CBT & NCLEX planning</span><span>Interview confidence</span><span>First months abroad</span></div></section>
          <section class="mentorSafety177"><span aria-hidden="true">&#10003;</span><div><b>Your safety matters</b><small>Never share private contact or payment details. Sessions and support stay protected on the platform.</small></div></section>
          <button type="button" class="mentorMatch177" data-mentor-match>Help me find a mentor</button>
        </aside>
      </div>
    </article>`;

    dialog.querySelector("[data-mentor-close]")?.addEventListener("click", close);
    dialog.querySelector("[data-mentor-match]")?.addEventListener("click", () => {
      close();
      go("feedback");
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    }, { once: true });
    if (!dialog.open) dialog.showModal();

    const results = dialog.querySelector("[data-mentor-results]");
    const count = dialog.querySelector("[data-mentor-count]");
    let mentors = [];
    let mentorLoadFailed = false;
    let mentorRequest = 0;

    const initialsForMentor = (mentor, index) =>
      String(mentor.specialty || `Mentor ${index + 1}`)
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
    const card = (mentor, index) => {
      const support = Array.isArray(mentor.areas_of_support) ? mentor.areas_of_support : [];
      const languages = Array.isArray(mentor.languages) ? mentor.languages : [];
      const title = mentor.specialty || "Healthcare career mentor";
      return `<article class="mentorCard177" data-mentor-card data-mentor-id="${esc(mentor.id || "")}" data-search="${esc(`${title} ${support.join(" ")} ${languages.join(" ")} ${mentor.biography || ""}`.toLowerCase())}">
        <div class="mentorCardTop177"><span class="mentorAvatar177">${esc(initialsForMentor(mentor, index))}</span><span class="mentorVerified177">&#10003; Approved</span></div>
        <div class="mentorCardTitle177"><h4>${esc(title)}</h4><span>${Number(mentor.experience_years || 0)}+ years experience</span></div>
        <div class="mentorRating177"><b>${Number(mentor.rating || 0) > 0 ? `&#9733; ${Number(mentor.rating).toFixed(1)}` : "New mentor"}</b><small>${Number(mentor.review_count || 0)} reviews</small></div>
        <p class="mentorBio177">${esc(mentor.biography || "Practical guidance for your healthcare registration and international career journey.")}</p>
        <div class="mentorTags177">${support.slice(0, 3).map((item) => `<span>${esc(item)}</span>`).join("") || "<span>Career guidance</span><span>Pathway planning</span>"}</div>
        <div class="mentorCardFoot177"><div><small>SESSION FROM</small><b>${Number(mentor.coin_price || 0)} BC</b></div><button type="button" data-mentor-profile aria-expanded="false">View profile</button></div>
        <div class="mentorProfile177" hidden><p><b>Languages</b><span>${esc(languages.join(", ") || "English")}</span></p><p><b>Best for</b><span>${esc(support.join(", ") || "Registration, career and relocation planning")}</span></p></div>
      </article>`;
    };

    const renderMentors = () => {
      const query = String(dialog.querySelector("[data-mentor-search]")?.value || "").trim().toLowerCase();
      const active = dialog.querySelector("[data-mentor-filter].active")?.dataset.mentorFilter || "all";
      const category = {
        registration: ["registration", "pathway", "visa", "relocation", "licensure"],
        exam: ["exam", "cbt", "nclex", "osce", "ielts"],
        career: ["career", "interview", "application", "employment", "job"],
      }[active] || [];
      const filtered = mentors.filter((mentor) => {
        const haystack = `${mentor.specialty || ""} ${(mentor.areas_of_support || []).join(" ")} ${(mentor.languages || []).join(" ")} ${mentor.biography || ""}`.toLowerCase();
        return (!query || haystack.includes(query)) && (!category.length || category.some((term) => haystack.includes(term)));
      });
      count.textContent = `${filtered.length} ${filtered.length === 1 ? "mentor" : "mentors"} available`;
      results.innerHTML = filtered.length
        ? filtered.map(card).join("")
        : `<section class="mentorEmpty177"><span aria-hidden="true">&#9671;</span><h4>${mentorLoadFailed ? "Mentors could not be loaded" : active === "all" ? "New mentor profiles are being reviewed" : `${{ registration: "Registration", exam: "Exam preparation", career: "Career and interview" }[active]} mentors are being reviewed`}</h4><p>${mentorLoadFailed ? "Please try again. No profile or booking information was changed." : active === "all" ? "We are carefully approving experienced professionals before they appear here. Tell us what support you need and we will keep you informed." : "No approved mentor currently matches this support area. Choose another category or check again soon."}</p><button type="button" data-mentor-empty-action>${mentorLoadFailed ? "Try again" : active === "all" ? "Join the early access list" : "Show all mentors"}</button></section>`;
      results.querySelector("[data-mentor-empty-action]")?.addEventListener("click", () => {
        if (mentorLoadFailed) {
          loadFilteredMentors();
        } else if (active !== "all" || mentors.length) {
          dialog.querySelector("[data-mentor-search]").value = "";
          dialog.querySelectorAll("[data-mentor-filter]").forEach((button) => button.classList.toggle("active", button.dataset.mentorFilter === "all"));
          loadFilteredMentors();
        } else {
          close();
          go("feedback");
        }
      });
      results.querySelectorAll("[data-mentor-profile]").forEach((button) => button.addEventListener("click", () => {
        const profile = button.closest("[data-mentor-card]")?.querySelector(".mentorProfile177");
        if (!profile) return;
        profile.hidden = !profile.hidden;
        button.setAttribute("aria-expanded", String(!profile.hidden));
        button.textContent = profile.hidden ? "View profile" : "Hide profile";
      }));
    };

    const loadFilteredMentors = async () => {
      const request = ++mentorRequest;
      const query = String(dialog.querySelector("[data-mentor-search]")?.value || "").trim().slice(0, 120);
      const category = dialog.querySelector("[data-mentor-filter].active")?.dataset.mentorFilter || "all";
      results.setAttribute("aria-busy", "true");
      count.textContent = "Updating approved mentors...";
      let response;
      try {
        response = await db().rpc("btv_list_approved_mentors", { p_category: category, p_search: query || null });
        if (response.error) {
          response = await db().from("btv_mentors")
            .select("id,biography,experience_years,specialty,languages,areas_of_support,coin_price,rating,review_count")
            .eq("status", "approved")
            .order("rating", { ascending: false });
        }
        if (response.error) throw response.error;
        if (request !== mentorRequest) return;
        mentors = response.data || [];
        mentorLoadFailed = false;
      } catch (error) {
        if (request !== mentorRequest) return;
        mentors = [];
        mentorLoadFailed = true;
        console.warn("Mentor marketplace unavailable", error);
      } finally {
        if (request === mentorRequest) results.removeAttribute("aria-busy");
      }
      renderMentors();
    };

    let mentorSearchTimer;
    dialog.querySelector("[data-mentor-search]")?.addEventListener("input", () => {
      clearTimeout(mentorSearchTimer);
      mentorSearchTimer = setTimeout(loadFilteredMentors, 220);
    });
    dialog.querySelectorAll("[data-mentor-filter]").forEach((button) => button.addEventListener("click", () => {
      dialog.querySelectorAll("[data-mentor-filter]").forEach((item) => item.classList.toggle("active", item === button));
      loadFilteredMentors();
    }));
    await loadFilteredMentors();
  }

  function openStandalonePanel(type) {
    if (type === "stories") {
      if (window.BTVSuccessStories?.open) return window.BTVSuccessStories.open();
      return window.BTVPlatform?.open?.("stories");
    }
    if (type === "mentors") return openMentorMarketplace();
    const panels = {
      mentors: {
        icon: "🧑‍⚕️",
        title: "Mentors",
        subtitle:
          "Connect with nurses who have completed the journey you're starting.",
        badge: null,
        sections: [
          {
            heading: "What mentors offer",
            items: [
              {
                icon: "🎥",
                label: "1-to-1 video sessions",
                detail:
                  "Guided conversations with nurses who have registered, relocated and are practising in your target country.",
              },
              {
                icon: "🗺️",
                label: "Pathway guidance",
                detail:
                  "Tailored advice on registration, exam preparation, visa timing and employment based on your background.",
              },
              {
                icon: "📝",
                label: "Application review",
                detail:
                  "Honest feedback on your personal statement, documents and interview technique before you submit.",
              },
              {
                icon: "💬",
                label: "Ongoing support",
                detail:
                  "Message your mentor between sessions for quick guidance as questions come up.",
              },
            ],
          },
        ],
        cta: { label: "Notify me when live", action: "feedback" },
      },
      bookings: {
        icon: "📅",
        title: "My Bookings",
        subtitle: "Your upcoming mentor sessions and scheduled appointments.",
        badge: null,
        sections: [
          {
            heading: "Upcoming sessions",
            items: [
              {
                icon: "ℹ️",
                label: "No bookings yet",
                detail:
                  "Once you book a mentor session or consultation, it will appear here. You can cancel or reschedule from this panel.",
              },
            ],
          },
          {
            heading: "How to book",
            items: [
              {
                icon: "1️⃣",
                label: "Browse mentors",
                detail:
                  "Open the Mentors panel and find a nurse with experience in your destination and specialty.",
              },
              {
                icon: "2️⃣",
                label: "Choose a time",
                detail:
                  "Select an available slot that works for your time zone.",
              },
              {
                icon: "3️⃣",
                label: "Pay with coins",
                detail:
                  "Session fees are deducted from your Beyond Coins balance.",
              },
            ],
          },
        ],
        cta: { label: "Open mentors", action: "mentors" },
      },
      stories: {
        icon: "✦",
        title: "Success Stories",
        subtitle: "Real journeys from nurses who made it to their destination.",
        badge: null,
        sections: [
          {
            heading: "Featured journeys",
            items: [
              {
                icon: "🇬🇧",
                label: "NHS nurse to NMC registration",
                detail:
                  '"Beyond The Visa helped me understand every step. I passed CBT first attempt and was registered within eight months." — Amara, London',
              },
              {
                icon: "🇺🇸",
                label: "Nigerian nurse to NCLEX and US licensure",
                detail:
                  '"The question bank and the journey tracker kept me organised throughout the whole process." — Chisom, Texas',
              },
              {
                icon: "🇦🇺",
                label: "UK nurse on the Australia streamlined pathway",
                detail:
                  "\"I didn't realise the NCLEX wasn't required for me. The pathway guide made the whole thing much clearer.\" — Jade, Melbourne",
              },
            ],
          },
        ],
        cta: { label: "Share your story", action: "feedback" },
      },
    };
    const cfg = panels[type];
    if (!cfg) return;
    let dialog = document.getElementById("standalonePanelDialog73");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "standalonePanelDialog73";
      dialog.className = "standalonePanelDialog73";
      document.body.append(dialog);
    }
    const sectionsHtml = cfg.sections
      .map(
        (sec) => `
      <div class="spSection73">
        <h3 class="spSectionHead73">${esc(sec.heading)}</h3>
        ${sec.items
          .map(
            (item) =>
              `<article class="spItem73"><span class="spItemIcon73" aria-hidden="true">${
                item.icon
              }</span><div><b>${esc(item.label)}</b><small>${esc(
                item.detail
              )}</small></div></article>`
          )
          .join("")}
      </div>`
      )
      .join("");
    dialog.innerHTML = `<article class="standalonePanelContent73">
      <header class="spHeader73">
        <div><span class="spIcon73" aria-hidden="true">${
          cfg.icon
        }</span><h2>${esc(cfg.title)}</h2><p>${esc(cfg.subtitle)}</p></div>
        <button type="button" data-sp-close class="spCloseBtn73" aria-label="Close">&times;</button>
      </header>
      <div class="spBody73">${sectionsHtml}</div>
      <footer class="spFooter73">
        <button type="button" class="spCtaBtn73" data-sp-cta="${esc(
          cfg.cta.action
        )}">${esc(cfg.cta.label)}</button>
        <button type="button" class="spDoneBtn73" data-sp-close>Done</button>
      </footer>
    </article>`;
    const close = () => dialog.close();
    dialog
      .querySelectorAll("[data-sp-close]")
      .forEach((b) => (b.onclick = close));
    dialog.querySelector("[data-sp-cta]")?.addEventListener("click", (e) => {
      const action = e.currentTarget.dataset.spCta;
      close();
      if (action === "mentors")
        setTimeout(() => openStandalonePanel("mentors"), 80);
      else go(action);
    });
    if (!dialog.open) dialog.showModal();
  }

  function streakDayLabel(value) {
    return Number(value) === 1 ? "day" : "days";
  }

  function streakDateLabel(value) {
    const parsed = value ? new Date(`${value}T12:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }

  function streakSummaryMarkup(summary) {
    const current = Number(summary?.current_streak || 0);
    const longest = Number(summary?.longest_streak || 0);
    const rank = Number(summary?.rank_position || 0);
    const learners = Number(summary?.ranked_learners || 0);
    const percentile = Number(summary?.percentile || 0);
    const today = Number(summary?.today_questions || 0);
    const active30 = Number(summary?.active_days_30 || 0);
    const calendar = Array.isArray(summary?.calendar) ? summary.calendar : [];
    const leaders = Array.isArray(summary?.leaderboard)
      ? summary.leaderboard
      : [];
    const rankCopy =
      rank && learners
        ? `<strong>#${rank}</strong><span>of ${learners.toLocaleString(
            "en-GB"
          )} active learners</span>`
        : "<strong>New</strong><span>Answer a question to enter the standings</span>";
    const percentileCopy = percentile
      ? `<span class="streakPercentile245">Top ${Math.max(
          1,
          101 - percentile
        )}% this season</span>`
      : "";
    const calendarMarkup = calendar
      .map((day) => {
        const date = streakDateLabel(day.date);
        const weekday = day.date
          ? new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, {
              weekday: "narrow",
              timeZone: "UTC",
            })
          : "";
        const questions = Number(day.questions || 0);
        return `<div class="streakDay245 ${
          day.active ? "active" : ""
        }" title="${esc(date)}: ${questions} questions"><span>${esc(
          weekday
        )}</span><i aria-hidden="true"></i><small>${questions}</small></div>`;
      })
      .join("");
    const leaderboardMarkup = leaders.length
      ? leaders
          .map(
            (learner) => `<li class="${
              learner.is_you ? "isYou" : ""
            }"><span class="streakPosition245">${Number(
              learner.position || 0
            )}</span><b>${esc(learner.label || "Learner")}</b><em>${Number(
              learner.current_streak || 0
            )} ${streakDayLabel(learner.current_streak)}</em></li>`
          )
          .join("")
      : `<li class="streakEmpty245"><b>Your standings begin with one answered question.</b><span>Free practice and mock answers both count.</span></li>`;

    return `<div class="streakHero245">
      <div class="streakHeroCopy245"><span>YOUR LEARNING MOMENTUM</span><h2>${current}</h2><p>consecutive answer ${streakDayLabel(
      current
    )}</p><small>${
      today
        ? `${today.toLocaleString("en-GB")} question${
            today === 1 ? "" : "s"
          } answered today`
        : "Answer one free or mock question today to activate the day"
    }</small></div>
      <div class="streakRank245">${rankCopy}${percentileCopy}</div>
    </div>
    <div class="streakMetrics245">
      <article><small>PERSONAL BEST</small><b>${longest} ${streakDayLabel(
      longest
    )}</b><span>Longest consecutive run</span></article>
      <article><small>LAST 30 DAYS</small><b>${active30} active</b><span>${Number(
      summary?.questions_30 || 0
    ).toLocaleString("en-GB")} questions answered</span></article>
      <article><small>ALL ANSWERS</small><b>${Number(
        summary?.questions_total || 0
      ).toLocaleString("en-GB")}</b><span>${Number(
      summary?.free_questions_total || 0
    ).toLocaleString("en-GB")} free · ${Number(
      summary?.mock_questions_total || 0
    ).toLocaleString("en-GB")} mock</span></article>
    </div>
    <section class="streakCalendarSection245"><div><span>14-DAY ACTIVITY</span><p>Every marked day contains at least one answered question.</p></div><div class="streakCalendar245" aria-label="Question activity over the last 14 days">${calendarMarkup}</div></section>
    <section class="streakStandings245"><div class="streakStandingsHead245"><div><span>LEARNER STANDINGS</span><h3>Your position, privately ranked</h3></div><small>Names are anonymised</small></div><ol>${leaderboardMarkup}</ol></section>
    <aside class="streakRule245"><b>How your streak works</b><span>Answer at least one free-practice or mock question in a UTC calendar day. Accuracy does not affect the streak, and only verified platform answers count.</span></aside>`;
  }

  async function openStudyStreak() {
    let dialog = document.getElementById("studyStreakDialog245");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "studyStreakDialog245";
      dialog.className = "studyStreakDialog245";
      document.body.appendChild(dialog);
    }
    const renderDialog = (summary, pending = false) => {
      dialog.innerHTML = `<article class="studyStreakPanel245">
        <header><div class="streakMark245" aria-hidden="true">🔥</div><div><span>BEYOND THE VISA</span><b>Study streak</b></div><button type="button" data-streak-close aria-label="Close study streak">&times;</button></header>
        <main>${
          pending
            ? '<div class="streakLoading245"><i></i><b>Preparing your verified streak…</b><span>Matching your free and mock question activity.</span></div>'
            : streakSummaryMarkup(summary)
        }</main>
        ${
          pending
            ? ""
            : '<footer><button type="button" data-streak-study>Answer today’s question</button><button type="button" data-streak-close>Close</button></footer>'
        }
      </article>`;
      dialog
        .querySelectorAll("[data-streak-close]")
        .forEach((button) => (button.onclick = () => dialog.close()));
      dialog
        .querySelector("[data-streak-study]")
        ?.addEventListener("click", () => {
          dialog.close();
          go("study");
        });
    };
    renderDialog(state.streak, !state.streak);
    dialog.onclick = (event) => {
      if (event.target === dialog) dialog.close();
    };
    if (!dialog.open) dialog.showModal();
    if (!state.streak && db()?.rpc) {
      try {
        const response = await db().rpc("btv_learning_streak_summary");
        if (response.error) throw response.error;
        state.streak = response.data || {};
        renderDialog(state.streak);
      } catch (error) {
        console.warn("v73 streak panel unavailable", error);
        renderDialog({
          current_streak: Number(state.game?.current_streak || 0),
          longest_streak: Number(state.game?.longest_streak || 0),
        });
        dialog
          .querySelector(".streakHero245")
          ?.insertAdjacentHTML(
            "afterend",
            '<p class="streakSync245">Live standings are synchronising. Your verified answer history remains safely recorded.</p>'
          );
      }
    }
  }

  function go(id) {
    if (id === "immigration-news") return window.BTVImmigrationNews?.open?.(destinationInfo().key);
    if (id === "dashboard") {
      if (carouselSlides.length > 1)
        carouselIndex = Math.floor(Math.random() * carouselSlides.length);
      F()?.open("dashboard");
      return queueRender();
    }
    if (id === "qualifications-registration") return window.BTVQualificationsRegistration139?.open();
    if (id === "golden-question") return window.BTVGoldenQuestion?.openToday?.();
    if (id === "opportunities") return window.openScreen?.("opportunities");
    if (id === "books") {
      F()?.open("study");
      return setTimeout(
        () =>
          window.dispatchEvent(
            new CustomEvent("btv:feature-action", { detail: { id } })
          ),
        120
      );
    }
    if (id === "wallet") return openCoinsCentre();
    if (id === "inbox")
      return window.BTVInboxCentre?.open?.() || F()?.open("notifications");
    if (id === "notifications")
      return window.BTVNotifications?.open?.("inbox");
    if (id === "mentors" || id === "bookings") {
      if (id === "bookings")
        return window.BTVBookingsCentre?.open?.() || openStandalonePanel(id);
      return openStandalonePanel(id);
    }
    if (id === "stories") {
      if (window.BTVSuccessStories?.open) return window.BTVSuccessStories.open();
      return window.BTVPlatform?.open?.("stories");
    }
    if (id === "help-support") return window.BTVHelpSupport?.open?.();
    if (id === "legal" || id === "feedback") return window.openScreen?.(id);
    if (id === "admin")
      return state.isAdmin ? location.assign("admin.html") : undefined;
    if (
      id === "assistant" &&
      typeof window.BTVFloatingZiburToggle === "function"
    )
      return window.BTVFloatingZiburToggle(true);
    F()?.open(id);
  }

  function menuGroups() {
    const exam = destinationInfo().exam;
    const examLinks =
      exam === "nclex"
        ? [["NCLEX", "nclex"]]
        : exam === "cbt"
        ? [["CBT", "cbt"]]
        : [];
    return [
      {
        id: "account",
        label: "Account",
        links: [
          ["Profile", "profile"],
          ["Inbox", "inbox"],
          ["Qualifications & Registration", "qualifications-registration"],
          ["My Documents", "documents"],
          ["Notification Centre", "notifications"],
          ["Beyond Coins", "wallet"],
          ["Privacy & legal", "legal"],
        ],
      },
      {
        id: "learn",
        label: "Learn",
        links: [
          ["Learning dashboard", "study"],
          ["Books", "books"],
          ...examLinks,
          ["OSCE", "osce"],
          ["IELTS", "ielts"],
          ["CBT Numeracy", "calculations"],
          ["Learning progress", "analytics"],
        ],
      },
      {
        id: "career",
        label: "Career and Journey",
        links: [
          ["My Journey", "journey"],
          ["Opportunities", "opportunities"],
          ["Jobs", "jobs"],
          ["Saved jobs", "saved-jobs"],
          ["Interview preparation", "interview"],
          ["Visa Hub", "resources"],
          ["Immigration news", "immigration-news"],
        ],
      },
      {
        id: "support",
        label: "Community and Support",
        links: [
          ["Mentors", "mentors"],
          ["Success stories", "stories"],
          ["Community", "community"],
          ["Help and support", "help-support"],
          ["Ask Zibur", "assistant"],
        ],
      },
    ];
  }

  function menuMarkup(prefix) {
    const sections = menuGroups()
      .map((group) => {
        return `<section class="menuGroup73" data-menu-section="${group.id}">
        <h3 class="menuSectionTitle73">${esc(group.label)}</h3>
        <div class="menuGroupLinks73">
          ${group.links
            .map(
              ([label, route]) =>
                `<button type="button" class="menuLink73" data-go="${route}"><span>${esc(
                  label
                )}</span>${iconSvg("arrowRight")}</button>`
            )
            .join("")}
        </div>
      </section>`;
      })
      .join("");
    const admin = state.isAdmin
      ? `<section class="menuAdmin73" aria-labelledby="${prefix}-admin-title"><p id="${prefix}-admin-title">Administration</p><button type="button" class="menuLink73 adminLink73" data-go="admin"><span>Admin Access</span>${iconSvg(
          "arrowRight"
        )}</button></section>`
      : "";
    return `${sections}${admin}<button class="drawerSignOut73 menuSignOut73" data-signout>${iconSvg(
      "logout"
    )}<span>Sign out</span></button>`;
  }

  function setupMenuGroups() {}

  function journeyItems() {
    const legacySteps =
      typeof window.country === "function" ? window.country()?.steps || [] : [];
    const synced = window.destinationSync?.snapshot?.() || null;
    const syncedSteps = Array.isArray(synced?.steps) ? synced.steps : [];
    const destinationKey = destinationInfo().key;
    const platformSteps = (state.steps || []).filter(
      (step) => !step?.destination || step.destination === destinationKey
    );
    const useSynced =
      synced?.country === destinationKey &&
      syncedSteps.length > 0 &&
      syncedSteps.length >= platformSteps.length;
    const usePlatformSteps = !useSynced && platformSteps.length > 0;
    const useChecklist =
      !useSynced && !usePlatformSteps && legacySteps.length > 0;
    const steps = useSynced
      ? syncedSteps
      : usePlatformSteps
      ? platformSteps
      : legacySteps.map((step, index) => ({
          code: `legacy-${index}`,
          title: step[0],
          description: step[1],
          sort_order: index + 1,
        }));
    const sourceProgress = useSynced
      ? synced?.progress || []
      : state.progress || [];
    const completedCodes = new Set(
      sourceProgress
        .filter((item) => item.completed === true || item.completed_at)
        .map((item) => item.step_code)
    );
    let checklistStatus = {};
    try {
      checklistStatus =
        JSON.parse(localStorage.getItem("btv-v1") || "{}").done?.[
          destinationInfo().key
        ] || {};
    } catch {}
    let currentFound = false;
    return steps.map((step, index) => {
      const complete = useChecklist
        ? Boolean(checklistStatus[index])
        : completedCodes.has(step.code);
      const current = !complete && !currentFound;
      if (current) currentFound = true;
      return {
        title: step.title || `Journey step ${index + 1}`,
        copy:
          step.description ||
          "Review this milestone and keep the required evidence safe.",
        status: complete ? "Completed" : current ? "Current step" : "Upcoming",
        action: complete
          ? "Review step"
          : current
          ? "Continue step"
          : "View details",
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
      [
        "LEARNING",
        [
          ["Learn overview", "study"],
          ["CBT", "cbt"],
          ["NCLEX", "nclex"],
          ["OSCE", "osce"],
          ["IELTS", "ielts"],
          ["CBT Numeracy", "calculations"],
          ["Saved learning", "analytics"],
        ],
      ],
      [
        "CAREER AND MIGRATION",
        [
          ["Journey Planner", "journey"],
          ["Opportunities", "opportunities"],
          ["Visa Hub", "resources"],
          ["Jobs", "jobs"],
          ["Interview preparation", "interview"],
          ["Saved jobs", "saved-jobs"],
          ["Mentors", "mentors"],
        ],
      ],
      [
        "COMMUNITY AND SUPPORT",
        [
          ["Ask Zibur", "assistant"],
          ["Community", "community"],
          ["Notification Centre", "notifications"],
          ["Success stories", "stories"],
        ],
      ],
      [
        "ACCOUNT",
        [
          ["Profile", "profile"],
          ["Inbox", "inbox"],
          ["Qualifications & Registration", "qualifications-registration"],
          ["Beyond Coins", "wallet"],
          ["Settings", "profile"],
        ],
      ],
    ];
    o.innerHTML = `<aside class="drawer73" role="dialog" aria-modal="true" aria-label="Navigation menu"><div class="drawerHead73"><b>Beyond The Visa</b><button class="icon73 ghost73" data-close aria-label="Close navigation">×</button></div><div class="drawerUser73">${avatarMarkup(
      name,
      "avatar"
    )}<span><b>${esc(name)}</b><small>${esc(
      userPathway(state.u)
    )}</small></span></div>${nav
      .map(
        ([group, links]) =>
          `<div class="drawerGroup73"><strong>${group}</strong>${links
            .map(
              ([label, id]) =>
                `<button class="drawerLink73" data-go="${id}"><span>${label}</span><span class="rowArrow73">${iconSvg(
                  "arrowRight"
                )}</span></button>`
            )
            .join("")}</div>`
      )
      .join("")}<button class="drawerSignOut73" data-signout>${iconSvg(
      "logout"
    )}<span>Sign out</span></button></aside>`;
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("open"));
    document.body.style.overflow = "hidden";
    const close = () => {
      o.classList.remove("open");
      const finish = () => {
        o.hidden = true;
      };
      matchMedia("(prefers-reduced-motion: reduce)").matches
        ? finish()
        : setTimeout(finish, 220);
      document.body.style.overflow = "";
      trigger.setAttribute("aria-expanded", "false");
      lastFocus?.focus();
    };
    trigger.setAttribute("aria-expanded", "true");
    o.querySelector("[data-close]").onclick = close;
    o.onclick = (e) => {
      if (e.target === o) close();
    };
    wire(o);
    o.querySelectorAll("[data-go],[data-signout]").forEach((b) =>
      b.addEventListener("click", close)
    );
    o.onkeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = [
        ...o.querySelectorAll("button:not([disabled]),a[href]"),
      ].filter((x) => !x.hidden);
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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
    backdrop.innerHTML = `<aside class="drawer73" role="dialog" aria-modal="true" aria-label="Account and navigation menu"><div class="drawerHead73"><b>Menu</b><button class="icon73 ghost73" data-close aria-label="Close navigation">&times;</button></div><div class="drawerUser73">${avatarMarkup(
      name,
      "avatar"
    )}<span><b>${esc(name)}</b><small>${esc(
      userPathway(state.u)
    )}</small></span></div><div class="drawerMenu73">${menuMarkup(
      "drawer-menu73"
    )}</div><section class="sidebarConnect262 drawerConnect262" data-home-social-slot="mobile-menu" aria-labelledby="drawer-connect-title262"><div class="sidebarConnectTop262"><span>BEYOND THE VISA</span><i aria-hidden="true">&#8599;</i></div><div class="sidebarConnectCopy262"><b id="drawer-connect-title262">Connect with us</b><small>News, guidance and opportunities—wherever you scroll.</small></div>${socialLinksMarkup()}</section></aside>`;
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("open"));
    document.body.style.overflow = "hidden";
    const close = () => {
      backdrop.classList.remove("open");
      const finish = () => {
        backdrop.hidden = true;
      };
      matchMedia("(prefers-reduced-motion: reduce)").matches
        ? finish()
        : setTimeout(finish, 220);
      document.body.style.overflow = "";
      trigger.setAttribute("aria-expanded", "false");
      lastFocus?.focus();
    };
    trigger.setAttribute("aria-expanded", "true");
    backdrop.querySelector("[data-close]").onclick = close;
    backdrop.onclick = (event) => {
      if (event.target === backdrop) close();
    };
    setupMenuGroups(backdrop);
    wire(backdrop);
    backdrop
      .querySelectorAll("[data-go],[data-signout]")
      .forEach((button) => button.addEventListener("click", close));
    backdrop.onkeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...backdrop.querySelectorAll("button:not([disabled]),a[href]"),
      ].filter((element) => !element.hidden && !element.closest("[hidden]"));
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
      stage.innerHTML = `<div class="carouselCopy73"><span>${esc(
        slide.category
      )}</span><h3>${esc(slide.title)}</h3><p>${esc(slide.copy)}</p>${
        slide.date ? `<small>${esc(slide.date)}</small>` : ""
      }</div>${
        slide.action
          ? `<button data-go="${esc(slide.route)}">${esc(
              slide.action
            )} ${iconSvg("arrowRight")}</button>`
          : ""
      }`;
      dots.innerHTML = carouselSlides
        .map(
          (_, i) =>
            `<button type="button" data-slide="${i}" class="${
              i === carouselIndex ? "active" : ""
            }" aria-label="Show slide ${i + 1}" aria-current="${
              i === carouselIndex
            }"></button>`
        )
        .join("");
      wire(stage);
      dots.querySelectorAll("[data-slide]").forEach(
        (dot) =>
          (dot.onclick = () => {
            pausedByUser = true;
            carouselIndex = Number(dot.dataset.slide);
            renderSlide(true);
          })
      );
      if (announce) status.textContent = `${slide.category}: ${slide.title}`;
    };
    const move = (direction, manual = true) => {
      if (manual) pausedByUser = true;
      carouselIndex =
        (carouselIndex + direction + carouselSlides.length) %
        carouselSlides.length;
      renderSlide(manual);
    };
    carousel.querySelector("[data-carousel-prev]").onclick = () => move(-1);
    carousel.querySelector("[data-carousel-next]").onclick = () => move(1);
    carousel.onkeydown = (e) => {
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    carousel.addEventListener(
      "touchstart",
      (e) => {
        touchStart = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    carousel.addEventListener(
      "touchend",
      (e) => {
        const delta = e.changedTouches[0].clientX - touchStart;
        if (Math.abs(delta) > 45) move(delta > 0 ? -1 : 1);
      },
      { passive: true }
    );
    clearInterval(carouselTimer);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      carouselTimer = setInterval(() => {
        if (!pausedByUser && !carousel.matches(":hover")) move(1, false);
      }, 8000);
    renderSlide();
  }

  async function setupImmigrationNewsTile(root) {
    const tile=root.querySelector("[data-immigration-news-tile]");
    if(!tile)return;
    const destination=destinationInfo();
    tile.innerHTML=`<div class="newsFlashHeader228"><span>NEWS FLASH · ${esc(destination.name.toUpperCase())}</span></div><div class="newsFlashGrid228" aria-busy="true"><button type="button" class="newsFlashTile228" data-go="immigration-news"><h3>Loading today's pathway headlines...</h3></button></div>`;
    try{
      const response=await fetch(`/api/immigration-news?country=${encodeURIComponent(destination.key)}&limit=4`),data=await response.json(),items=data.items?.slice(0,4)||[];
      if(!response.ok||!items.length)throw Error(data.error||"No current headline");
      tile.innerHTML=`<div class="newsFlashHeader228"><span>NEWS FLASH · ${esc(destination.name.toUpperCase())}</span></div><div class="newsFlashGrid228">${items.map(item=>`<button type="button" class="newsFlashTile228" data-go="immigration-news"><h3>${esc(item.title)}</h3></button>`).join("")}</div>`;
    }catch{
      tile.innerHTML=`<div class="newsFlashHeader228"><span>IMMIGRATION NEWS</span></div><div class="newsFlashGrid228"><button type="button" class="newsFlashTile228" data-go="immigration-news"><h3>Open your daily immigration news centre</h3></button></div>`;
    }
    wire(tile);
  }

  function notificationMarkup() {
    const unread = state.notes?.filter((note) => !note.read_at).length || 0;
    const items = (state.notes || []).slice(0, 8);
    return `<div class="notificationWrap102">
      <button class="icon73 notificationBell102" type="button" data-go="notifications" aria-label="Open Notification Centre${
        unread ? `, ${unread} unread` : ""
      }" aria-expanded="false" aria-controls="dashboard-notifications102">${iconSvg(
      "bell"
    )}${unread ? `<span>${unread > 9 ? "9+" : unread}</span>` : ""}</button>
      <section class="notificationMenu102" id="dashboard-notifications102" aria-label="Recent notifications" hidden>
        <header><div><small>YOUR UPDATES</small><h2>Notifications</h2></div>${
          unread
            ? `<button type="button" data-notification-read>Mark all read</button>`
            : ""
        }</header>
        <div class="notificationList102">${
          items.length
            ? items
                .map(
                  (note) =>
                    `<button type="button" class="notificationItem102 ${
                      note.read_at ? "" : "unread"
                    }" data-notification-id="${esc(note.id)}"${
                      note.action_url
                        ? ` data-notification-url="${esc(note.action_url)}"`
                        : ""
                    }><i aria-hidden="true">${
                      note.read_at ? "✓" : "●"
                    }</i><span><b>${esc(
                      note.title || note.category || "Account update"
                    )}</b><small>${esc(
                      note.body ||
                        note.message ||
                        "Open your account for more information."
                    )}</small><time>${
                      note.created_at
                        ? new Date(note.created_at).toLocaleDateString(
                            undefined,
                            { day: "numeric", month: "short" }
                          )
                        : "Recent"
                    }</time></span></button>`
                )
                .join("")
            : `<div class="notificationEmpty102"><b>You are up to date</b><p>Journey reminders, learning updates and account messages will appear here.</p></div>`
        }</div>
        <button type="button" class="notificationAll102" data-go="notifications">Open notification centre ${iconSvg(
          "arrowRight"
        )}</button>
      </section>
    </div>`;
  }

  function setupNotifications(root) {
    const toggle = root.querySelector("[data-notification-toggle]");
    const menu = root.querySelector(".notificationMenu102");
    if (!toggle || !menu) return;
    const close = () => {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        menu.querySelector("button")?.focus();
        setTimeout(
          () => document.addEventListener("click", close, { once: true }),
          0
        );
      }
    };
    menu.onclick = (event) => event.stopPropagation();
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        close();
        toggle.focus();
      }
    });
    menu
      .querySelector("[data-notification-read]")
      ?.addEventListener("click", async () => {
        if (state.u?.id && db()?.from)
          await db()
            .from("btv_notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", state.u.id)
            .is("read_at", null);
        state.notes = (state.notes || []).map((note) => ({
          ...note,
          read_at: note.read_at || new Date().toISOString(),
        }));
        queueRender();
      });
    menu.querySelectorAll("[data-notification-id]").forEach((item) =>
      item.addEventListener("click", async () => {
        const id = item.dataset.notificationId;
        if (id && state.u?.id && db()?.from)
          await db()
            .from("btv_notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", state.u.id);
        const url = item.dataset.notificationUrl;
        if (url && (/^\//.test(url) || /^https:\/\//.test(url)))
          location.assign(url);
        else go("notifications");
      })
    );
  }

  function wire(root) {
    root.querySelectorAll("[data-streak-open]").forEach((x) => {
      x.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openStudyStreak();
      };
      x.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openStudyStreak();
        }
      };
    });
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
    home.querySelectorAll("[data-gq-home-tile]").forEach((tile) => tile.remove());
    document.getElementById("careerDashboard")?.remove();
    document.getElementById("btvTop73")?.remove();
    document.getElementById("profileSummary")?.remove();
    document.getElementById("homeWelcomeArt")?.remove();

    const root =
      document.getElementById("dashboardV3") ||
      document.createElement("section");
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
    const streak = Number(
      state.streak?.current_streak ?? state.game?.current_streak ?? 0
    );
    const journeySteps = journeyItems();
    const currentJourneyStep =
      journeySteps.find((step) => step.current) ||
      journeySteps[journeySteps.length - 1] ||
      null;
    const readinessCircumference = 2 * Math.PI * 34;
    const readinessOffset =
      readinessCircumference - (readinessCircumference * j.pct) / 100;

    const learningFocus = [
      ...(destination.exam === "nclex"
        ? [{ title: "Continue NCLEX preparation", id: "nclex" }]
        : destination.exam === "cbt"
        ? [{ title: "Continue CBT preparation", id: "cbt" }]
        : [{ title: "Review registration pathway", id: "journey" }]),
      { title: "Clinical learning library", id: "adult-nursing" },
      { title: "Interview preparation", id: "interview" },
    ];
    const quickActions = [
      {
        title: "Golden Question",
        copy: "Coming soon — daily clinical challenge, leaderboard and prizes",
        id: "golden-question",
        icon: "♛",
        image: "assets/quick-actions/quick-action-golden-question.webp",
      },
      {
        title: "Mentor Marketplace",
        copy: "Find approved professional mentors",
        id: "mentors",
        icon: "🤝",
        image: "assets/quick-actions/quick-action-mentor-marketplace.webp",
      },
      {
        title: "Interview preparation",
        copy: "Practise role-specific healthcare interviews",
        id: "interview",
        icon: "🎙️",
        image: "assets/quick-actions/quick-action-interview-preparation.webp",
      },
      {
        title: "Jobs",
        copy: "Find and save suitable opportunities",
        id: "jobs",
        icon: "💼",
        image: "assets/quick-actions/quick-action-jobs.webp",
      },
      {
        title: "My documents",
        copy: "Keep career and visa evidence organised",
        id: "documents",
        icon: "📂",
        image: "assets/quick-actions/quick-action-documents.webp",
      },
    ];

    root.innerHTML = `<div class="dashboardLayout73">
      <aside class="sidebar73">
        <div class="sidebarBrand73">
          <div class="brandLogo73"><img src="favicon-192-v281.png" width="64" height="64" alt="Beyond The Visa logo"></div>
          <div><b>Beyond The Visa</b><small>NURSING PLATFORM</small></div>
        </div>
        <button type="button" class="profileCard73 profileAction73" data-go="profile" aria-label="Open profile for ${esc(
          name
        )}">
          ${avatarMarkup(name, "avatar73")}
          <span><b>${esc(name)}</b><small>View profile</small></span>
          <span class="profileArrow73">${iconSvg("arrowRight")}</span>
        </button>
        <div class="sidebarNavWrap73">
          <p class="sidebarGroup73">DASHBOARD</p>
          <button class="sideNavItem73 active" data-go="dashboard"><span class="sideIc73">${iconSvg(
            "home"
          )}</span><span>Home</span><i></i></button>
          <nav class="sidebarMemberMenu73" aria-label="Account, learning, career and support menu">${menuMarkup(
            "sidebar-menu73"
          )}</nav>
        </div>
        <section class="sidebarConnect262" data-home-social-slot="sidebar" aria-labelledby="sidebar-connect-title262">
          <div class="sidebarConnectTop262"><span>BEYOND THE VISA</span><i aria-hidden="true">&#8599;</i></div>
          <div class="sidebarConnectCopy262"><b id="sidebar-connect-title262">Connect with us</b><small>News, guidance and opportunities—wherever you scroll.</small></div>
          ${socialLinksMarkup()}
        </section>
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
            <button class="coinBalance104" type="button" data-go="wallet" aria-label="Beyond Coins balance: ${Number(
              state.wallet?.balance || 0
            ).toLocaleString("en-GB")} coins. Open wallet">
              <img class="coinBalanceLogo106" src="beyond-coin-v84.png" alt="" aria-hidden="true"><span><b>${Number(
                state.wallet?.balance || 0
              ).toLocaleString("en-GB")}</b><small>Beyond Coins</small></span>
            </button>
            ${notificationMarkup()}
            <button class="icon73" data-theme-toggle aria-label="Toggle dark mode">${iconSvg(
              "moon"
            )}</button>
            <button class="icon73 mobileMenuBtn73" data-mobile-open aria-label="Open account and navigation menu" aria-expanded="false">${iconSvg(
              "menu"
            )}</button>
          </div>
        </header>
        <div class="dashboardContent73">
          <section class="welcomeCard73" data-home-advice role="button" tabindex="0" aria-label="Open personalised recommendations and advice">
            <div class="welcomeOverlay73" aria-hidden="true"></div>
            <div class="welcomeLines73" aria-hidden="true"></div>
            <div class="welcomeNurse73" aria-hidden="true"></div>
            <div class="welcomeInner73">
              <p class="welcomeDate73">${fmtHeroDate()}</p>
              <span class="welcomeDestination73"><b aria-hidden="true">${esc(
                destination.flag
              )}</b>${esc(destination.name)}</span>
              <h2>Welcome back, ${esc(name)}</h2>
              <p class="welcomePathway73">${esc(pathway)}</p>
              <div class="welcomeReadiness73">
                <div class="ring73" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${
                  j.pct
                }">
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
            <span class="premiumBadge73 destinationFlagBadge73" aria-label="Selected destination: ${esc(
              destination.name
            )}" title="${esc(destination.name)}"><img src="https://flagcdn.com/w80/${esc(
              destination.flagCode
            )}.png" width="40" height="30" alt="" aria-hidden="true"></span>
          </section>

          <section class="statsRow73">
            <article class="statCard73 journeySummaryStat73" data-go="journey"><small>🧭 Journey</small><b>${
              j.pct
            }%</b><span>${j.done} of ${
      j.total
    } steps</span><em>Open My Journey ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="${exam.route}"><small>🩺 ${esc(
      exam.label
    )}</small><b>${esc(exam.value)}</b><span>${esc(
      exam.sub
    )}</span><em>Open preparation ${iconSvg("arrowRight")}</em></article>
            <article class="statCard73" data-go="saved-jobs"><small>🔖 Saved jobs</small><b>${savedJobs}</b><span>Career opportunities</span><em>View saved jobs ${iconSvg(
      "arrowRight"
    )}</em></article>
            <article class="statCard73 streakStat245" data-streak-open role="button" tabindex="0" aria-label="Open study streak and learner standings"><small>🔥 Study streak</small><b>${streak}</b><span>consecutive answer ${streakDayLabel(
      streak
    )}</span><em>${
      state.streak?.rank_position
        ? `Rank #${Number(state.streak.rank_position)}`
        : "View streak standings"
    } ${iconSvg("arrowRight")}</em></article>
          </section>

          <section class="coinWidget178" data-coins-widget178 aria-label="Beyond Coins wallet">
            <div><span>BEYOND COINS</span><strong>${Number(state.wallet?.balance || 0).toLocaleString("en-GB")} BC</strong><small>Loading rewards and level…</small></div>
            <button type="button" data-open-wallet178>View wallet</button>
          </section>

          <section class="journeyPanel73" aria-labelledby="journey-title73">
            <div class="journeyHead73"><div><p>CAREER AND JOURNEY</p><h3 id="journey-title73">My Journey</h3><span>Your current journey position</span></div><button type="button" data-go="journey">Go to My Journey ${iconSvg(
              "arrowRight"
            )}</button></div>
            <div class="journeyProgress73" role="progressbar" aria-label="Journey completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${
              j.pct
            }"><i style="width:${j.pct}%"></i></div>
            ${
              currentJourneyStep
                ? `<article class="journeyCurrent73 ${
                    j.total > 0 && j.done >= j.total ? "complete" : "current"
                  }">
              <div class="journeyCurrentMarker73" aria-hidden="true">${
                j.total > 0 && j.done >= j.total
                  ? "&#10003;"
                  : esc(currentJourneyStep.order)
              }</div>
              <div class="journeyCurrentCopy73"><span class="journeyStatus73">${
                j.total > 0 && j.done >= j.total
                  ? "Journey complete"
                  : "Current step"
              }</span><h4>${esc(currentJourneyStep.title)}</h4><p>${esc(
                    currentJourneyStep.copy
                  )}</p><small>${j.done} of ${j.total} steps completed · ${
                    j.pct
                  }% complete</small></div>
              <button type="button" data-go="journey">${
                j.total > 0 && j.done >= j.total
                  ? "Review journey"
                  : "Continue journey"
              } ${iconSvg("arrowRight")}</button>
            </article>`
                : `<div class="journeyEmpty73"><b>Your journey is ready to begin</b><p>Open My Journey to load the milestones matched to your profile.</p><button type="button" data-go="journey">Open My Journey</button></div>`
            }
          </section>

          <section class="secondaryGrid73">
            <article class="panel73 recommendedPanel73">
              <div class="recommendedHead73"><div><h3>Recommended next step</h3><p>Based on your current journey</p></div><button type="button" data-go="study-plan">View plan</button></div>
              <button type="button" class="studyPlanCard73" data-go="study-plan" aria-label="Continue today’s study plan">
                <span class="studyPlanCopy73"><small class="studyPlanBadge73">RECOMMENDED NOW</small><b>Continue today’s study plan</b><small>Keep your learning streak moving forward.</small></span>
                <span class="studyPlanSpark73" aria-hidden="true">${iconSvg(
                  "spark"
                )}</span>
              </button>
            </article>
            <article class="panel73">
              <div class="panelHead73"><h3>Learning focus</h3><button data-go="study">See all</button></div>
              <div class="focusList73">
                ${learningFocus
                  .map(
                    (x) =>
                      `<button class="focusRow73" data-go="${x.id}"><span>${esc(
                        x.title
                      )}</span><em>NEW</em><i>${iconSvg(
                        "arrowRight"
                      )}</i></button>`
                  )
                  .join("")}
              </div>
            </article>
          </section>
          <section class="quickPanel73" aria-labelledby="quick-actions-title">
            <div class="panelHead73"><h3 id="quick-actions-title">Quick actions</h3></div>
            <div class="quickGrid73">${quickActions
              .map(
                (x) =>
                  `<button type="button" data-go="${x.id}"><img class="quickActionMedia73" src="${x.image}" alt="" aria-hidden="true" loading="lazy" decoding="async"><span>${
                    x.icon
                  }</span><div><b>${x.title}</b><small>${
                    x.copy
                  }</small></div>${iconSvg("arrowRight")}</button>`
              )
              .join("")}</div>
          </section>
          <section class="dashboardCarousel73" data-immigration-news-tile aria-label="Latest immigration news">
            <div class="carouselCopy73"><span>IMMIGRATION NEWS</span><h3>Loading today’s pathway headlines…</h3><p>Checking current immigration, visa and work-permit reporting.</p></div>
          </section>
        </div>
      </div>
      <button type="button" class="floatingZibur73" data-go="assistant" aria-label="Open Ask Zibur assistant">${iconSvg(
        "spark"
      )}<span>Ask Zibur</span></button>
    </div>`;

    setupMenuGroups(root);
    wire(root);
    setupNotifications(root);
    setupImmigrationNewsTile(root);
    const welcomeAdvice = root.querySelector("[data-home-advice]");
    welcomeAdvice?.addEventListener("click", showHomeAdvice);
    welcomeAdvice?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showHomeAdvice();
      }
    });
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
    if (!e.target.closest('[data-open="home"]')) return;
    if (carouselSlides.length > 1)
      carouselIndex = Math.floor(Math.random() * carouselSlides.length);
    queueRender();
  });
  window.addEventListener("btv:wallet-changed", queueRender);
  window.addEventListener("btv:destination-changed", queueRender);
  window.addEventListener("btv:auth-ready", queueRender);
  window.addEventListener("btv:profile-photo-updated", queueRender);
  window.addEventListener("focus", queueRender);
  document.addEventListener("DOMContentLoaded", queueRender);

  if (
    typeof window.showApp === "function" &&
    !window.__btvDashboardPremium73ShowAppWrapped
  ) {
    window.__btvDashboardPremium73ShowAppWrapped = true;
    const oldShowApp = window.showApp;
    window.showApp = function () {
      oldShowApp.apply(this, arguments);
      queueRender();
    };
  }

  window.renderDashboardInsights = queueRender;
  window.BTVMentorMarketplace = { open: openMentorMarketplace };
  queueRender();
  setTimeout(queueRender, 700);
})();
