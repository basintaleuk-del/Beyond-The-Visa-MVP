(() => {
  "use strict";
  if (window.__btvDestinationJourney121) return;
  window.__btvDestinationJourney121 = true;

  const valid = new Set(["uk", "us", "ca", "au", "nz", "ie", "ae", "sa"]);
  const guestKey = "btv_destination_country";
  const names = {
    uk: "United Kingdom",
    us: "United States",
    ca: "Canada",
    au: "Australia",
    nz: "New Zealand",
    ie: "Ireland",
    ae: "United Arab Emirates",
    sa: "Saudi Arabia",
  };
  const legacyStepCodes = {
    uk: [
      "passport",
      "ielts",
      "nmc",
      "cbt",
      null,
      "cos",
      "visa",
      "travel",
      "arrival",
      "arrival",
    ],
    au: [
      "au_passport",
      "au_english",
      "au_registration",
      "au_assessment",
      "au_checks",
      "au_employment",
      "au_visa",
      "au_arrival",
    ],
    ca: [
      "ca_passport",
      "ca_province",
      "ca_credentials",
      "ca_language",
      "ca_registration",
      "ca_immigration",
      "ca_employment",
      "ca_arrival",
    ],
    nz: [
      "nz_passport",
      "nz_registration",
      "nz_english",
      "nz_verification",
      "nz_employment",
      "nz_visa",
      "nz_arrival",
    ],
    ie: [
      "ie_passport",
      "ie_registration",
      "ie_english",
      "ie_verification",
      "ie_employment",
      "ie_permission",
      "ie_arrival",
    ],
    us: [
      "us_passport",
      "us_state",
      "us_credentials",
      "us_nclex",
      "us_english",
      "us_immigration",
      "us_arrival",
    ],
    ae: [
      "ae_authority",
      "ae_pqr",
      "ae_verification",
      "ae_assessment",
      "ae_eligibility",
      "ae_employment",
      "ae_work_residence",
      "ae_arrival",
    ],
    sa: [
      "sa_mumaris",
      "sa_classification",
      "sa_verification",
      "sa_assessment",
      "sa_employment",
      "sa_work_residence",
      "sa_registration",
      "sa_arrival",
    ],
  };
  const model = {
    userId: null,
    country: null,
    profession: null,
    steps: [],
    progress: [],
    hydrated: false,
    saving: false,
  };
  const read = (key, fallback = {}) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") || fallback;
    } catch {
      return fallback;
    }
  };
  const clean = (value) => {
    const key = String(value || "")
      .trim()
      .toLowerCase();
    return valid.has(key) ? key : null;
  };
  const profession = (value) => {
    const key = String(value || "")
      .trim()
      .toLowerCase();
    return key.startsWith("midwi")
      ? "midwifery"
      : key.startsWith("nurs")
      ? "nursing"
      : null;
  };
  const appliesToProfession = (step) => {
    const values = Array.isArray(step?.applicable_professions)
      ? step.applicable_professions.map(profession).filter(Boolean)
      : [];
    return (
      !values.length || !model.profession || values.includes(model.profession)
    );
  };
  const safeRender = (name, callback) => {
    try {
      if (typeof callback === "function") callback.call(window);
    } catch (error) {
      console.warn(`Destination ${name} render skipped`, error);
    }
  };

  function snapshot() {
    const complete = new Set(
      model.progress
        .filter((row) => row.completed === true)
        .map((row) => row.step_code)
    );
    const steps = model.steps.filter(
      (step) =>
        step.is_active !== false &&
        step.is_archived !== true &&
        step.is_required !== false &&
        appliesToProfession(step)
    );
    const done = steps.filter((step) => complete.has(step.code)).length;
    return {
      country: model.country,
      steps,
      progress: model.progress,
      done,
      total: steps.length,
      pct: steps.length ? Math.round((done / steps.length) * 100) : 0,
      hydrated: model.hydrated,
      saving: model.saving,
    };
  }
  function cacheCountry(key) {
    sessionStorage.setItem("btv-current-destination", key);
    const journey = read("btv-v1");
    journey.country = key;
    localStorage.setItem("btv-v1", JSON.stringify(journey));
    const profile = read("btv-profile");
    profile.destination = key;
    profile.destination_country = key;
    if (key !== "uk") delete profile.region;
    localStorage.setItem("btv-profile", JSON.stringify(profile));
    if (typeof state !== "undefined" && state) state.country = key;
  }
  function apply(source) {
    const snap = snapshot(),
      key = snap.country;
    if (!key) return;
    cacheCountry(key);
    if (typeof countries !== "undefined" && countries[key] && snap.steps.length)
      countries[key].steps = snap.steps.map((step) => [
        step.title,
        step.description || "",
        step.code,
      ]);
    if (typeof state !== "undefined" && state) {
      state.done = state.done || {};
      state.done[key] = {};
      const completedCodes = new Set(
        snap.progress
          .filter((row) => row.completed === true)
          .map((row) => row.step_code)
      );
      snap.steps.forEach((step, index) => {
        if (completedCodes.has(step.code)) state.done[key][index] = true;
      });
      safeRender("core", typeof render === "function" ? render : null);
    }
    window.dispatchEvent(
      new CustomEvent("btv:destination-changed", {
        detail: { country: key, name: names[key], source, snapshot: snap },
      })
    );
    window.dispatchEvent(
      new CustomEvent("btv:journey-changed", { detail: snap })
    );
    safeRender("dashboard", window.renderDashboardInsights);
    safeRender("learning", window.buildLearning);
    safeRender("exam tabs", window.updateExamTabs);
    safeRender("culture", window.renderCulture);
  }
  async function importLegacyProgress(userId, key, steps, progress) {
    const account = read("btv-account"),
      legacy = read("btv-v1").done?.[key];
    if (account.id !== userId || !legacy || typeof legacy !== "object")
      return progress;
    const available = new Set(steps.map((step) => step.code));
    const already = new Set(
      progress
        .filter((row) => row.completed === true)
        .map((row) => row.step_code)
    );
    const codes = [
      ...new Set(
        Object.entries(legacy)
          .filter(([, done]) => done === true)
          .map(([index]) => legacyStepCodes[key]?.[Number(index)])
          .filter((code) => code && available.has(code) && !already.has(code))
      ),
    ];
    if (!codes.length) return progress;
    const imported = [];
    for (const code of codes) {
      const result = await window.btvSupabase.rpc("btv_set_journey_step", {
        p_step_code: code,
        p_completed: true,
      });
      if (result.error) {
        console.warn("Legacy journey import skipped", code, result.error);
        continue;
      }
      imported.push({
        step_code: code,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    if (imported.length)
      window.toast?.(
        `${imported.length} saved journey step${
          imported.length === 1 ? "" : "s"
        } restored`
      );
    return [...progress, ...imported];
  }
  async function fetchJourney(userId) {
    const sb = window.btvSupabase;
    const [
      { data: profile, error: profileError },
      { data: steps, error: stepsError },
      { data: progress, error: progressError },
    ] = await Promise.all([
      sb
        .from("profiles")
        .select("destination_country,destination,profession")
        .eq("id", userId)
        .single(),
      sb
        .from("btv_journey_steps")
        .select(
          "code,title,destination,sort_order,description,is_required,is_active,is_archived,applicable_professions"
        )
        .eq('is_active',true)
        .eq("is_archived", false)
        .eq("is_required", true)
        .order('sort_order'),
      sb
        .from("btv_user_journey_progress")
        .select("step_code,completed,completed_at,updated_at")
        .eq("user_id", userId),
    ]);
    if (profileError) throw profileError;
    if (stepsError) throw stepsError;
    if (progressError) throw progressError;
    let key = clean(profile.destination_country);
    if (!key) {
      const fallback =
        clean(profile.destination) || clean(localStorage.getItem(guestKey));
      if (!fallback) throw new Error("Choose a destination to continue.");
      const saved = await sb.rpc("btv_set_destination_country", {
        p_country: fallback,
      });
      if (saved.error || clean(saved.data) !== fallback)
        throw saved.error || new Error("Destination confirmation failed.");
      key = fallback;
    }
    model.country = key;
    model.profession = profession(profile.profession);
    model.steps = (steps || []).filter((step) => step.destination === key);
    model.progress = await importLegacyProgress(
      userId,
      key,
      model.steps.filter(appliesToProfession),
      progress || []
    );
  }
  async function hydrate(user) {
    if (!user?.id) {
      model.userId = null;
      model.country =
        clean(localStorage.getItem(guestKey)) ||
        clean(read("btv-v1").country) ||
        "uk";
      model.profession = profession(read("btv-profile").profession);
      model.steps = [];
      model.progress = [];
      model.hydrated = true;
      apply("guest-hydration");
      return snapshot();
    }
    model.userId = user.id;
    model.hydrated = false;
    await fetchJourney(user.id);
    model.hydrated = true;
    apply("account-hydration");
    return snapshot();
  }
  async function change(key) {
    key = clean(key);
    if (!key || model.saving || key === model.country) return snapshot();
    if (!model.userId) {
      localStorage.setItem(guestKey, key);
      model.country = key;
      apply("guest-selection");
      return snapshot();
    }
    const previous = {
      country: model.country,
      profession: model.profession,
      steps: model.steps,
      progress: model.progress,
    };
    model.saving = true;
    setPickerBusy(true);
    try {
      const result = await window.btvSupabase.rpc(
        "btv_set_destination_country",
        { p_country: key }
      );
      if (result.error) throw result.error;
      if (clean(result.data) !== key)
        throw new Error("The saved destination could not be confirmed.");
      await fetchJourney(model.userId);
      if (model.country !== key)
        throw new Error("The account returned a different destination.");
      apply("account-selection");
      window.toast?.(`${names[key]} saved to your account`);
      return snapshot();
    } catch (error) {
      Object.assign(model, previous);
      apply("save-rollback");
      window.toast?.("Destination was not changed. Please try again.");
      throw error;
    } finally {
      model.saving = false;
      setPickerBusy(false);
    }
  }
  function setPickerBusy(busy) {
    document.querySelectorAll("#countryGrid .country").forEach((button) => {
      button.disabled = busy;
      button.setAttribute("aria-busy", String(busy));
    });
  }
  async function setStep(code, completed) {
    const before = model.progress.map((row) => ({ ...row }));
    if (!model.userId) throw new Error("Sign in to save journey progress.");
    try {
      const result = await window.btvSupabase.rpc("btv_set_journey_step", {
        p_step_code: code,
        p_completed: Boolean(completed),
      });
      if (result.error) throw result.error;
      const existing = model.progress.find((row) => row.step_code === code);
      if (existing) existing.completed = Boolean(completed);
      else
        model.progress.push({ step_code: code, completed: Boolean(completed) });
      apply("journey-save");
      return snapshot();
    } catch (error) {
      model.progress = before;
      apply("journey-rollback");
      window.toast?.("Journey progress was not saved. Please try again.");
      throw error;
    }
  }

  const legacyRenderCountries = window.renderCountries;
  window.renderCountries = function () {
    if (typeof legacyRenderCountries === "function") legacyRenderCountries();
    document.querySelectorAll("#countryGrid .country").forEach((button) => {
      button.onclick = async () => {
        try {
          await change(button.dataset.country);
        } catch (error) {
          console.error("Destination save failed", error);
        }
      };
    });
  };
  window.renderChecklist = function () {
    const root = document.getElementById("checklistItems"),
      snap = snapshot();
    if (!root || !snap.hydrated) return;
    const complete = new Set(
      snap.progress
        .filter((row) => row.completed === true)
        .map((row) => row.step_code)
    );
    root.innerHTML = "";
    snap.steps.forEach((step, index) => {
      const row = document.createElement("div");
      row.className = "checkItem";
      const id = `step-db-${index}`;
      row.innerHTML = `<input id="${id}" type="checkbox" ${
        complete.has(step.code) ? "checked" : ""
      }><label for="${id}"><b></b><small></small></label>`;
      row.querySelector("b").textContent = step.title;
      row.querySelector("small").textContent = step.description || "";
      row.querySelector("input").onchange = async (event) => {
        event.target.disabled = true;
        try {
          await setStep(step.code, event.target.checked);
          if (event.target.checked) window.toast?.("Step completed");
        } catch {
          event.target.checked = !event.target.checked;
        } finally {
          event.target.disabled = false;
        }
      };
      root.append(row);
    });
  };
  window.BTVDestination = {
    get: () => model.country || clean(localStorage.getItem(guestKey)) || "uk",
    set: change,
    remember: () => {},
    restore: () => apply("history-restore"),
  };
  window.BTVDestinationJourney = {
    hydrate,
    change,
    setStep,
    snapshot,
    diagnostics: () =>
      window.btvSupabase.rpc("btv_get_journey_diagnostics", {}),
  };
  window.addEventListener("pageshow", () => {
    if (model.hydrated) apply("pageshow");
  });
  window.addEventListener("popstate", () => {
    if (model.hydrated) setTimeout(() => apply("history-restore"), 0);
  });
})();
