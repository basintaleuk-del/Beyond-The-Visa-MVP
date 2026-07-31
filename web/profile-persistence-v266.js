(() => {
  "use strict";
  if (window.__btvProfilePersistence266) return;
  window.__btvProfilePersistence266 = true;

  const FIELD_MAP = {
    pfPreferred: "preferred",
    pfSpecialty: "specialty",
    pfExperience: "experience",
    pfArrival: "arrival",
    pfLearning: "learning",
    pfSupport: "support",
    pfGoal: "goal",
  };
  const SELECT_COLUMNS = "preferred_name,clinical_specialty,experience_level,target_arrival_month,learning_preference,priority_support,career_goal,updated_at";
  let loading = null;
  let saving = false;

  const db = () => window.btvSupabase;
  const field = (id) => document.getElementById(id);
  const parse = (value) => { try { return JSON.parse(value || "{}"); } catch { return {}; } };
  const status = (message, tone = "") => {
    const node = document.querySelector("#profile [data-profile-save-status]");
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone;
  };

  async function account() {
    if (!db()?.auth) throw new Error("The secure profile service is unavailable.");
    const { data, error } = await db().auth.getUser();
    if (error || !data?.user) throw new Error("Please sign in again before saving your profile.");
    return data.user;
  }

  function cacheKey(userId) { return `btv-profile-extra:${userId}`; }

  function readCache(userId) {
    const scoped = parse(localStorage.getItem(cacheKey(userId)));
    if (Object.keys(scoped).length) return scoped;
    const accountData = parse(localStorage.getItem("btv-account"));
    return accountData.id === userId ? parse(localStorage.getItem("btv-profile-extra")) : {};
  }

  function writeCache(userId, values) {
    const safe = { ...readCache(userId), ...values };
    localStorage.setItem(cacheKey(userId), JSON.stringify(safe));
    localStorage.setItem("btv-profile-extra", JSON.stringify(safe));
    return safe;
  }

  function fromServer(row = {}) {
    return {
      preferred: row.preferred_name || "",
      specialty: row.clinical_specialty || "",
      experience: row.experience_level || "",
      arrival: row.target_arrival_month ? String(row.target_arrival_month).slice(0, 7) : "",
      learning: row.learning_preference || "",
      support: row.priority_support || "",
      goal: row.career_goal || "",
    };
  }

  function formValues() {
    return Object.fromEntries(Object.entries(FIELD_MAP).map(([id, key]) => [key, String(field(id)?.value || "").trim()]));
  }

  function apply(values) {
    for (const [id, key] of Object.entries(FIELD_MAP)) if (field(id)) field(id).value = values[key] || "";
    const name = field("pfName");
    const accountData = parse(localStorage.getItem("btv-account"));
    if (name) name.textContent = values.preferred || accountData.name || "Your profile";
    window.updateProfileButton?.();
    window.BTVProfilePremium215?.update?.();
  }

  async function persist(user, values) {
    const { data, error } = await db().rpc("btv_save_member_professional_profile", {
      p_preferred_name: values.preferred || null,
      p_clinical_specialty: values.specialty || null,
      p_experience_level: values.experience || null,
      p_target_arrival_month: values.arrival || null,
      p_learning_preference: values.learning || null,
      p_priority_support: values.support || null,
      p_career_goal: values.goal || null,
    });
    if (error) throw error;
    return writeCache(user.id, fromServer(data || {}));
  }

  async function hydrate(force = false) {
    if (loading && !force) return loading;
    loading = (async () => {
      const user = await account();
      const cached = readCache(user.id);
      if (Object.keys(cached).length) apply(cached);
      status("Loading your securely saved profile…");
      const { data, error } = await db().from("btv_professional_profiles").select(SELECT_COLUMNS).eq("user_id", user.id).maybeSingle();
      if (error) {
        if (Object.keys(cached).length) {
          status("Showing your last saved copy. Reconnect to confirm the latest cloud version.", "warning");
          return cached;
        }
        throw error;
      }
      if (!data && Object.values(cached).some((value) => typeof value === "string" && value.trim())) {
        const migrated = await persist(user, cached);
        apply(migrated);
        status("Your existing profile has been secured to your account.", "success");
        window.dispatchEvent(new CustomEvent("btv:profile-hydrated", { detail: { userId: user.id } }));
        return migrated;
      }
      const values = writeCache(user.id, fromServer(data || {}));
      apply(values);
      status(data ? "Your securely saved profile is up to date." : "Your profile is ready to complete.");
      window.dispatchEvent(new CustomEvent("btv:profile-hydrated", { detail: { userId: user.id } }));
      return values;
    })().catch((error) => {
      console.error("Professional profile hydration failed", error);
      status(error.message || "Your profile could not be loaded securely.", "error");
      throw error;
    }).finally(() => { loading = null; });
    return loading;
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (saving || !form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    saving = true;
    if (button) button.disabled = true;
    status("Saving securely…");
    try {
      const user = await account();
      const values = formValues();
      const persisted = await persist(user, values);
      apply(persisted);
      status("Profile saved securely. It will remain available after you sign in again.", "success");
      window.toast?.("Profile saved securely");
      window.dispatchEvent(new CustomEvent("btv:profile-persisted", { detail: { userId: user.id } }));
    } catch (error) {
      console.error("Professional profile save failed", error);
      status(error.message || "Your changes could not be saved securely.", "error");
      window.toast?.("Profile save failed. Your existing record was not changed.");
    } finally {
      saving = false;
      if (button) button.disabled = false;
    }
  }

  function install() {
    const form = document.getElementById("profileForm");
    if (!form || form.dataset.profilePersistence266) return false;
    form.dataset.profilePersistence266 = "true";
    form.onsubmit = save;
    const page = document.getElementById("profile");
    if (page?.classList.contains("active")) hydrate().catch(() => {});
    return true;
  }

  function start() {
    install();
    if (document.getElementById("appShell")?.hidden === false) hydrate().catch(() => {});
  }

  window.addEventListener("btv:session-restored", (event) => {
    if (event.detail?.state !== "app") return;
    setTimeout(() => { install(); hydrate(true).catch(() => {}); }, 0);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#headerProfile,[data-edit-profile]")) return;
    setTimeout(() => { install(); hydrate(true).catch(() => {}); }, 0);
  }, true);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start, { once: true }) : start();
  window.BTVProfilePersistence266 = Object.freeze({ hydrate, install });
})();
