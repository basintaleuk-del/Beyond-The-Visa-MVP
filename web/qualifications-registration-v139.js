(() => {
  "use strict";
  if (window.BTVQualificationsRegistration139) return;

  const TABLES = {
    profile: "btv_professional_profiles",
    registrations: "btv_professional_registrations",
    practice: "btv_professional_practice_history",
    assessments: "btv_professional_assessments",
  };
  const assessmentNames = ["NCLEX-RN", "Multiple-choice question examination — MCQ", "Objective Structured Clinical Examination — OSCE", "Outcomes-Based Assessment — OBA", "Orientation Part 1", "Orientation Part 2", "IELTS", "OET", "Other professional examination"];
  const australianAssessmentNames = new Set(["Multiple-choice question examination — MCQ", "Outcomes-Based Assessment — OBA", "Orientation Part 1", "Orientation Part 2"]);
  const countries = ["United Kingdom", "Australia", "Canada", "New Zealand", "Ireland", "United States", "Other"];
  const state = { user: null, profile: {}, destination: "", registrations: [], practice: [], assessments: [], documents: [], loading: false, editing: {} };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const db = () => window.btvSupabase;
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const label = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const dateValue = (value) => value ? String(value).slice(0, 10) : "";
  const destinationCode = (value) => ({ australia: "au", au: "au", "new zealand": "nz", nz: "nz", "united kingdom": "uk", uk: "uk", canada: "ca", ca: "ca", "united states": "us", us: "us", usa: "us", ireland: "ie", ie: "ie" })[String(value || "").trim().toLowerCase()] || "";
  const usesAustralianRegistration = () => destinationCode(state.destination) === "au";

  function showScreen(id) {
    $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
    $$(".nav").forEach((button) => button.classList.toggle("active", button.dataset.open === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function build() {
    if ($("#qualifications-registration")) return $("#qualifications-registration");
    const screen = document.createElement("section");
    screen.id = "qualifications-registration";
    screen.className = "screen qualificationsRegistration139";
    screen.innerHTML = `<div class="pageTitle"><button class="back" type="button" data-qr-back data-history-home aria-label="Back to home">←</button><div><span>PROFESSIONAL PROFILE</span><h1>Qualifications &amp; Registration</h1></div></div><p class="qrLead139">Training, registration and practice history</p><div class="qrHero139"><span>YOUR PROFESSIONAL RECORD</span><h2>Keep the evidence behind your international journey together.</h2><p>Save each section independently. Incomplete sections never prevent you from using the rest of Beyond The Visa.</p></div><div data-qr-status class="qrStatus139" role="status" aria-live="polite"></div><div data-qr-content><div class="qrLoading139"><i></i><i></i><i></i></div></div>`;
    const main = $("#appShell main") || $("main");
    const hero = $(".qrHero139", screen);
    if (hero) hero.innerHTML = `<img src="assets/qualifications/qualifications-registration-hero.jpg" alt="" width="1400" height="788" decoding="async"><div class="qrHeroCopy139"><span>YOUR PROFESSIONAL RECORD</span><h2>Keep the evidence behind your international journey together.</h2><p>Save each section independently. Incomplete sections never prevent you from using the rest of Beyond The Visa.</p></div>`;
    const documents = $("#documents");
    if (documents?.parentElement === main) main.insertBefore(screen, documents); else main?.append(screen);
    screen.addEventListener("submit", handleSubmit);
    screen.addEventListener("click", handleClick);
    screen.addEventListener("change", handleChange);
    return screen;
  }

  function status(message, tone = "success") {
    const box = $("[data-qr-status]");
    if (!box) return;
    box.textContent = message;
    box.className = `qrStatus139 show ${tone}`;
    if (tone === "success") setTimeout(() => box.classList.remove("show"), 2600);
  }

  async function account() {
    if (state.user) return state.user;
    if (!db()?.auth) throw new Error("The secure profile service is unavailable.");
    const { data, error } = await db().auth.getUser();
    if (error || !data?.user) throw new Error("Please sign in again to open your professional profile.");
    state.user = data.user;
    return state.user;
  }

  async function loadDocuments(userId) {
    const categories = ["certificates", "cvs", "images"];
    const results = await Promise.all(categories.map((category) => db().storage.from("btv-user-files").list(`${userId}/${category}`, { limit: 100, sortBy: { column: "created_at", order: "desc" } })));
    state.documents = results.flatMap((result, index) => (result.data || []).filter((file) => file.name !== ".emptyFolderPlaceholder").map((file) => ({ path: `${userId}/${categories[index]}/${file.name}`, name: file.name.replace(/^\d+-/, ""), updated_at: file.updated_at || file.created_at })));
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const content = $("[data-qr-content]");
    if (content) content.innerHTML = '<div class="qrLoading139"><i></i><i></i><i></i></div>';
    try {
      const user = await account();
      const [professional, canonical, registrations, practice, assessments] = await Promise.all([
        db().from(TABLES.profile).select("*").eq("user_id", user.id).maybeSingle(),
        db().from("profiles").select("profession,qualification_country,destination_country,destination").eq("id", user.id).maybeSingle(),
        db().from(TABLES.registrations).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        db().from(TABLES.practice).select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
        db().from(TABLES.assessments).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      for (const result of [professional, canonical, registrations, practice, assessments]) if (result.error) throw result.error;
      state.profile = professional.data || {};
      if (!state.profile.profession && canonical.data?.profession) state.profile.profession = String(canonical.data.profession).toLowerCase().includes("midwi") ? "midwife" : "registered_nurse";
      if (!state.profile.qualification_country) state.profile.qualification_country = canonical.data?.qualification_country || "";
      state.destination = canonical.data?.destination_country || canonical.data?.destination || "";
      state.registrations = registrations.data || [];
      state.practice = practice.data || [];
      state.assessments = assessments.data || [];
      await loadDocuments(user.id);
      render();
    } catch (error) {
      console.error("Qualifications & Registration could not load", error);
      if (content) content.innerHTML = `<div class="qrError139"><b>Your professional profile could not be loaded.</b><p>${esc(error.message)}</p><button type="button" data-qr-retry>Try again</button></div>`;
    } finally { state.loading = false; }
  }

  function completion() {
    const p = state.profile;
    return {
      primary: Boolean(p.profession && p.qualification_country && p.qualification_title && p.institution && p.graduation_year && p.nursing_field),
      registrations: state.registrations.length > 0,
      practice: state.practice.length > 0,
      assessments: state.assessments.length > 0,
      english: Boolean(p.english_test_type && p.english_test_date && p.english_overall_result),
      documents: state.documents.length > 0,
    };
  }

  function badge(progress) {
    const complete = progress >= 100, started = progress > 0;
    const text = complete ? "Complete" : started ? "In progress" : "Not started";
    const icon = complete ? "✓" : started ? "◐" : "○";
    return `<span class="qrBadge139 ${complete ? "complete" : started ? "progress" : "empty"}"><i aria-hidden="true">${icon}</i>${text}</span>`;
  }

  function sectionProgress(values) {
    return Math.round((values.filter((value) => Array.isArray(value) ? value.length > 0 : Boolean(value)).length / values.length) * 100);
  }

  function progress() {
    const p = state.profile;
    return {
      primary: sectionProgress([p.profession, p.qualification_country, p.qualification_title, p.institution, p.graduation_year, p.nursing_field]),
      registrations: state.registrations.length ? 100 : 0,
      practice: state.practice.length ? 100 : 0,
      assessments: state.assessments.length ? 100 : 0,
      english: sectionProgress([p.english_test_type, p.english_test_date, p.english_overall_result]),
      documents: state.documents.length ? 100 : 0,
    };
  }

  function updatedAt(values) {
    const dates = values.flat().map((value) => value?.updated_at || value?.created_at).filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()));
    if (!dates.length) return "";
    const latest = new Date(Math.max(...dates.map((value) => value.getTime())));
    return `Updated ${latest.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  function sectionIcon(kind) {
    const paths = {
      qualification: '<path d="M5 6h14v10H5z"/><path d="m8 16-1 5 5-3 5 3-1-5"/><path d="M8 10h8"/>',
      registration: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
      practice: '<path d="M4 7h16v12H4z"/><path d="M9 7V4h6v3M4 12h16M10 12v2h4v-2"/>',
      assessment: '<path d="M7 3h10v4H7z"/><path d="M5 5h14v16H5z"/><path d="m8 14 2 2 5-5"/>',
      english: '<path d="M4 5h10v11H8l-4 3z"/><path d="M10 9h10v9h-3l-3 3v-5"/>',
      documents: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
    };
    return `<span class="qrSectionIcon139" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg></span>`;
  }

  const field = (name, title, value = "", type = "text", required = false, extra = "") => `<label><span>${title}</span><input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} ${extra}></label>`;
  const select = (name, title, value, options, required = false) => `<label><span>${title}</span><select name="${name}" ${required ? "required" : ""}><option value="">Select</option>${options.map((option) => { const key = Array.isArray(option) ? option[0] : option, text = Array.isArray(option) ? option[1] : option; return `<option value="${esc(key)}" ${key === value ? "selected" : ""}>${esc(text)}</option>`; }).join("")}</select></label>`;
  function evidenceSelect(name, title, value) {
    return `<label><span>${title}</span><select name="${name}"><option value="">No document associated</option>${state.documents.map((document) => `<option value="${esc(document.path)}" ${document.path === value ? "selected" : ""}>${esc(document.name)}</option>`).join("")}</select></label>`;
  }

  function render() {
    const content = $("[data-qr-content]");
    if (!content) return;
    if (!usesAustralianRegistration()) {
      const genericDone = completion(), amounts = progress();
      content.classList.remove("qrContentWithPathway139");
      content.innerHTML = `<div class="qrSections139">${primarySection(genericDone.primary, amounts.primary)}${registrationsSection(genericDone.registrations, amounts.registrations)}${practiceSection(genericDone.practice, amounts.practice)}${assessmentsSection(genericDone.assessments, amounts.assessments)}${englishSection(genericDone.english, amounts.english)}${documentsSection(genericDone.documents, amounts.documents)}</div>`;
      const assessment = $('[name="assessment_name"]', content);
      [...(assessment?.options || [])].forEach((option) => { if (australianAssessmentNames.has(option.value)) option.remove(); });
      return;
    }
    const done = completion(), amounts = progress(), pathway = window.BTVAustraliaPathway139?.indicate({ ...state.profile, registrations: state.registrations, practice: state.practice, assessments: state.assessments }) || { label: "Qualification Assessment Required", reason: "Complete the official IQNM Self-check." };
    content.classList.add("qrContentWithPathway139");
    content.innerHTML = `<section class="qrPathway139"><span>INDICATIVE AUSTRALIAN PATHWAY</span><div><h2>${esc(pathway.label)}</h2>${badge(state.profile.qualification_country ? 50 : 0)}</div><p>${esc(pathway.reason)}</p><small>This guidance is not an official Ahpra or NMBA assessment. Complete the official IQNM Self-check and follow the outcome provided by Ahpra.</small><a href="${esc(window.BTVAustraliaPathway139?.officialSelfCheckUrl || "https://www.ahpra.gov.au/Registration/International-practitioners.aspx")}" target="_blank" rel="noopener">Open the official IQNM Self-check guidance ↗</a></section>
      <div class="qrSections139">${primarySection(done.primary, amounts.primary)}${registrationsSection(done.registrations, amounts.registrations)}${practiceSection(done.practice, amounts.practice)}${assessmentsSection(done.assessments, amounts.assessments)}${englishSection(done.english, amounts.english)}${documentsSection(done.documents, amounts.documents)}</div>`;
  }

  function section(kind, title, description, amount, body, open = false, lastUpdated = "") {
    return `<details class="qrSection139" style="--qr-progress:${amount}%" ${open ? "open" : ""}><summary>${sectionIcon(kind)}<div class="qrSectionCopy139"><h2>${title}</h2><p>${description}</p>${lastUpdated ? `<small>${esc(lastUpdated)}</small>` : ""}<div class="qrProgress139" aria-label="${amount}% complete"><i></i></div></div><div class="qrSectionMeta139">${badge(amount)}<b>${amount}%</b></div><i class="qrChevron139" aria-hidden="true">⌄</i></summary><div class="qrSectionBody139">${body}</div></details>`;
  }

  function primarySection(done, amount) {
    const p = state.profile;
    const form = `<form data-qr-form="primary" class="qrForm139"><div class="qrFormGrid139">${select("profession", "Profession", p.profession, [["registered_nurse","Registered nurse"],["enrolled_nurse","Enrolled nurse"],["midwife","Midwife"]], true)}${select("qualification_country","Country of qualification",p.qualification_country,countries,true)}${field("qualification_title","Qualification title",p.qualification_title,"text",true)}${field("institution","Institution",p.institution,"text",true)}${field("graduation_year","Graduation year",p.graduation_year,"number",true,'min="1900" max="2100"')}${field("nursing_field","Nursing or midwifery field",p.nursing_field,"text",true)}${evidenceSelect("qualification_evidence_path","Qualification evidence",p.qualification_evidence_path)}</div><button class="qrSave139">Save primary qualification</button></form>`;
    return section("qualification", "Primary Qualification", "Your main professional training record.", amount, form, !done, updatedAt([p]));
  }

  function registrationsSection(done, amount) {
    const edit = state.registrations.find((record) => record.id === state.editing.registration) || {};
    const list = state.registrations.map((record) => recordCard(record.id, `${record.country} · ${record.regulatory_authority}`, `${record.registration_type} · ${record.status}`, "registration")).join("");
    const form = `<div class="qrRecordList139">${list}</div><form data-qr-form="registration" data-record-id="${esc(edit.id)}" class="qrForm139"><h3>${edit.id ? "Edit registration" : "Add registration"}</h3><div class="qrFormGrid139">${select("country","Country",edit.country,countries,true)}${field("regulatory_authority","Regulatory authority",edit.regulatory_authority,"text",true)}${field("registration_type","Registration type",edit.registration_type,"text",true)}${field("registration_number","Registration number",edit.registration_number)}${field("initial_registration_date","Initial registration date",dateValue(edit.initial_registration_date),"date")}${select("status","Status",edit.status,["Active","Expired","Pending","Suspended"],true)}${evidenceSelect("evidence_document_path","Registration evidence",edit.evidence_document_path)}</div><div class="qrFormActions139"><button class="qrSave139">${edit.id ? "Update" : "Save"} registration</button>${edit.id ? '<button type="button" data-cancel-edit="registration">Cancel</button>' : ""}</div></form>`;
    return section("registration", "Registration History", "Add every current or previous professional registration.", amount, form, Boolean(edit.id), updatedAt(state.registrations));
  }

  function practiceSection(done, amount) {
    const edit = state.practice.find((record) => record.id === state.editing.practice) || {};
    const list = state.practice.map((record) => recordCard(record.id, `${record.country} · ${record.employer}`, `${record.clinical_area || "Clinical area not stated"}${record.currently_employed ? " · Current" : ""}`, "practice")).join("");
    const form = `<div class="qrRecordList139">${list}</div><form data-qr-form="practice" data-record-id="${esc(edit.id)}" class="qrForm139"><h3>${edit.id ? "Edit practice record" : "Add practice record"}</h3><div class="qrFormGrid139">${select("country","Country of practice",edit.country,countries,true)}${field("employer","Employer",edit.employer,"text",true)}${field("clinical_area","Clinical area or specialty",edit.clinical_area)}${field("start_date","Start date",dateValue(edit.start_date),"date")}${field("end_date","End date",dateValue(edit.end_date),"date",false,edit.currently_employed ? "disabled" : "")}${field("estimated_practice_hours","Estimated practice hours",edit.estimated_practice_hours,"number",false,'min="0" step="0.5"')}${field("registration_held","Registration held while practising",edit.registration_held)}${evidenceSelect("evidence_document_path","Employment evidence",edit.evidence_document_path)}<label class="qrCheck139"><input name="currently_employed" type="checkbox" ${edit.currently_employed ? "checked" : ""}> Currently employed</label></div><div class="qrFormActions139"><button class="qrSave139">${edit.id ? "Update" : "Save"} practice record</button>${edit.id ? '<button type="button" data-cancel-edit="practice">Cancel</button>' : ""}</div></form>`;
    return section("practice", "Practice History", "Record employers, clinical areas and estimated practice hours.", amount, form, Boolean(edit.id), updatedAt(state.practice));
  }

  function assessmentsSection(done, amount) {
    const edit = state.assessments.find((record) => record.id === state.editing.assessment) || {};
    const list = state.assessments.map((record) => recordCard(record.id, record.assessment_name === "Other professional examination" ? record.assessment_other_name : record.assessment_name, record.status, "assessment")).join("");
    const form = `<div class="qrRecordList139">${list}</div><form data-qr-form="assessment" data-record-id="${esc(edit.id)}" class="qrForm139"><h3>${edit.id ? "Edit examination" : "Add examination or assessment"}</h3><div class="qrFormGrid139">${select("assessment_name","Examination or assessment",edit.assessment_name,assessmentNames,true)}${field("assessment_other_name","Other examination name",edit.assessment_other_name)}${select("status","Status",edit.status,["Not started","Planned","Booked","Passed","Failed","Expired"],true)}${field("result_date","Result date",dateValue(edit.result_date),"date")}${evidenceSelect("evidence_document_path","Optional evidence document",edit.evidence_document_path)}</div><div class="qrFormActions139"><button class="qrSave139">${edit.id ? "Update" : "Save"} assessment</button>${edit.id ? '<button type="button" data-cancel-edit="assessment">Cancel</button>' : ""}</div></form>`;
    return section("assessment", "Examinations & Assessments", "Track professional and language examinations without assuming they apply to every pathway.", amount, form, Boolean(edit.id), updatedAt(state.assessments));
  }

  function englishSection(done, amount) {
    const p = state.profile, components = p.english_component_results || {};
    const form = `<form data-qr-form="english" class="qrForm139"><div class="qrFormGrid139">${select("english_test_type","Test type",p.english_test_type,["IELTS","OET","Other"],true)}${field("english_test_date","Test date",dateValue(p.english_test_date),"date",true)}${field("english_overall_result","Overall result",p.english_overall_result,"text",true)}${field("listening","Listening",components.listening)}${field("reading","Reading",components.reading)}${field("writing","Writing",components.writing)}${field("speaking","Speaking",components.speaking)}${field("english_expiry_date","Expiry date",dateValue(p.english_expiry_date),"date")}${evidenceSelect("english_evidence_path","Evidence document",p.english_evidence_path)}</div><button class="qrSave139">Save English-language evidence</button></form>`;
    return section("english", "English-Language Evidence", "Record test results and associate a document from My Documents.", amount, form, false, p.english_test_type ? updatedAt([p]) : "");
  }

  function documentsSection(done, amount) {
    const files = state.documents.map((document) => `<li><span>${esc(document.name)}</span><small>Available for association</small></li>`).join("") || "<li><span>No relevant documents uploaded yet.</span></li>";
    return section("documents", "Supporting Documents", "Uses your existing private My Documents vault.", amount, `<ul class="qrDocuments139">${files}</ul><button type="button" class="qrDocumentsButton139" data-open-documents>Open My Documents</button>`, false, updatedAt(state.documents));
  }

  function recordCard(id, title, subtitle, kind) {
    return `<article><div><b>${esc(title)}</b><small>${esc(subtitle)}</small></div><div><button type="button" data-edit-record="${esc(kind)}" data-record-id="${esc(id)}">Edit</button><button type="button" class="danger" data-delete-record="${esc(kind)}" data-record-id="${esc(id)}">Remove</button></div></article>`;
  }

  async function handleSubmit(event) {
    const form = event.target.closest("[data-qr-form]");
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"],button:not([type])');
    if (submit) submit.disabled = true;
    try {
      const user = await account(), data = Object.fromEntries(new FormData(form));
      if (form.dataset.qrForm === "primary") await savePrimary(user, data);
      if (form.dataset.qrForm === "english") await saveEnglish(user, data);
      if (form.dataset.qrForm === "registration") await saveRecord("registration", form.dataset.recordId, user, data);
      if (form.dataset.qrForm === "practice") await saveRecord("practice", form.dataset.recordId, user, data, form);
      if (form.dataset.qrForm === "assessment") await saveRecord("assessment", form.dataset.recordId, user, data);
      status("Your professional profile was saved.");
      await loadAfterSave();
    } catch (error) { status(error.message || "Your changes could not be saved.", "error"); }
    finally { if (submit) submit.disabled = false; }
  }

  async function savePrimary(user, data) {
    data.graduation_year = data.graduation_year ? Number(data.graduation_year) : null;
    const pathway = window.BTVAustraliaPathway139?.indicate(data)?.label || "Qualification Assessment Required";
    const payload = { user_id: user.id, ...data, australian_pathway: pathway, updated_at: new Date().toISOString() };
    const result = await db().from(TABLES.profile).upsert(payload, { onConflict: "user_id" });
    if (result.error) throw result.error;
    const canonicalProfession = data.profession === "midwife" ? "Midwife" : "Nurse";
    const canonical = await db().from("profiles").update({ profession: canonicalProfession, qualification_country: data.qualification_country, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (canonical.error) throw canonical.error;
  }

  async function saveEnglish(user, data) {
    const components = { listening: data.listening || "", reading: data.reading || "", writing: data.writing || "", speaking: data.speaking || "" };
    for (const key of ["listening", "reading", "writing", "speaking"]) delete data[key];
    data.english_expiry_date = data.english_expiry_date || null;
    data.english_evidence_path = data.english_evidence_path || null;
    const result = await db().from(TABLES.profile).upsert({ user_id: user.id, ...data, english_component_results: components, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (result.error) throw result.error;
  }

  async function saveRecord(kind, id, user, data, form) {
    let table;
    if (kind === "registration") { table = TABLES.registrations; data.initial_registration_date = data.initial_registration_date || null; }
    if (kind === "practice") { table = TABLES.practice; data.currently_employed = new FormData(form).has("currently_employed"); data.end_date = data.currently_employed ? null : (data.end_date || null); data.start_date = data.start_date || null; data.estimated_practice_hours = data.estimated_practice_hours ? Number(data.estimated_practice_hours) : null; }
    if (kind === "assessment") { table = TABLES.assessments; data.result_date = data.result_date || null; data.assessment_other_name = data.assessment_name === "Other professional examination" ? (data.assessment_other_name || null) : null; }
    data.evidence_document_path = data.evidence_document_path || null;
    const payload = { ...data, user_id: user.id, updated_at: new Date().toISOString() };
    const result = id ? await db().from(table).update(payload).eq("id", id).eq("user_id", user.id) : await db().from(table).insert(payload);
    if (result.error) throw result.error;
    state.editing = {};
  }

  async function loadAfterSave() {
    state.loading = false;
    await load();
  }

  async function handleClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.matches("[data-qr-back]")) return showScreen("home");
    if (button.matches("[data-qr-retry]")) return load();
    if (button.matches("[data-cancel-edit]")) { state.editing = {}; return render(); }
    if (button.matches("[data-edit-record]")) { state.editing = { [button.dataset.editRecord]: button.dataset.recordId }; return render(); }
    if (button.matches("[data-delete-record]")) return removeRecord(button.dataset.deleteRecord, button.dataset.recordId);
    if (button.matches("[data-open-documents]")) return openDocuments();
  }

  function handleChange(event) {
    if (event.target.name === "currently_employed") {
      const end = event.target.form?.elements.end_date;
      if (end) { end.disabled = event.target.checked; if (event.target.checked) end.value = ""; }
    }
  }

  async function removeRecord(kind, id) {
    if (!confirm("Remove this professional-history record?")) return;
    const table = kind === "registration" ? TABLES.registrations : kind === "practice" ? TABLES.practice : TABLES.assessments;
    const user = await account(), result = await db().from(table).delete().eq("id", id).eq("user_id", user.id);
    if (result.error) return status(result.error.message, "error");
    status("Record removed.");
    await loadAfterSave();
  }

  function openDocuments() {
    const entry = $("[data-storage-open]");
    if (entry) return entry.click();
    if ($("#documents")) showScreen("documents");
  }

  async function open() {
    build();
    showScreen("qualifications-registration");
    await load();
  }

  window.BTVQualificationsRegistration139 = Object.freeze({ open });
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", build, { once: true }) : build();
})();
