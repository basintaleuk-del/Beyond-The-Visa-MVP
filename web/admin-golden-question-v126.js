(() => {
  "use strict";
  if (window.__btvAdminGolden126) return;
  window.__btvAdminGolden126 = true;
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)],
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>'"]/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          }[m])
      );
  let root,
    cache = { questions: [] };
  const call = async (operation, extra = {}) => {
    const { data, error } = await window.btvSupabase.functions.invoke(
      "golden-question",
      { body: { action: "admin", operation, ...extra } }
    );
    if (error) throw Error(data?.error || error.message);
    if (data?.error) throw Error(data.error);
    return data;
  };
  function install() {
    const app = $("#app");
    if (!app || $("#goldenAdmin126")) return;
    const nav = $(".sidebar nav");
    const b = document.createElement("button");
    b.dataset.tab = "goldenAdmin126";
    b.textContent = "Golden Question";
    nav.append(b);
    root = document.createElement("section");
    root.id = "goldenAdmin126";
    root.className = "tab";
    $("main").append(root);
    b.addEventListener("click", () => {
      document
        .querySelectorAll("[data-tab]")
        .forEach((x) => x.classList.toggle("active", x === b));
      document
        .querySelectorAll(".tab")
        .forEach((x) => x.classList.toggle("active", x === root));
      $("#pageTitle").textContent = "Golden Question Centre";
      renderShell();
      dashboard();
    });
  }
  function renderShell() {
    root.innerHTML = `<div class="gqaShell"><section class="gqaHero"><span>CLINICAL KNOWLEDGE COMPETITION</span><h2>Golden Question Centre</h2><p>Questions, daily scheduling, fair-play review, leaderboards and sponsor prizes.</p></section><nav class="gqaTabs">${[
      ["dashboard", "Dashboard"],
      ["bank", "Question Bank"],
      ["schedule", "Daily Schedule"],
      ["leaderboard", "Leaderboard Management"],
      ["prizes", "Sponsor & Prize Management"],
      ["moderation", "Moderation"],
      ["settings", "Settings"],
    ]
      .map(
        (x, i) =>
          `<button class="${i ? "" : "active"}" data-gqa-tab="${x[0]}">${
            x[1]
          }</button>`
      )
      .join("")}</nav>${[
      "dashboard",
      "bank",
      "schedule",
      "leaderboard",
      "prizes",
      "moderation",
      "settings",
    ]
      .map(
        (x, i) =>
          `<section class="gqaPane ${
            i ? "" : "active"
          }" data-gqa-pane="${x}"></section>`
      )
      .join("")}</div>`;
    $$("[data-gqa-tab]", root).forEach(
      (b) =>
        (b.onclick = () => {
          show(b.dataset.gqaTab);
          ({
            dashboard,
            bank,
            schedule,
            leaderboard,
            prizes,
            moderation,
            settings,
          })[b.dataset.gqaTab]();
        })
    );
  }
  function show(id) {
    $$("[data-gqa-tab]", root).forEach((x) =>
      x.classList.toggle("active", x.dataset.gqaTab === id)
    );
    $$("[data-gqa-pane]", root).forEach((x) =>
      x.classList.toggle("active", x.dataset.gqaPane === id)
    );
  }
  const pane = (id) => $(`[data-gqa-pane="${id}"]`, root),
    loading = (id) =>
      (pane(id).innerHTML =
        '<div class="gqaPanel gqaEmpty">Loading secure admin data…</div>'),
    error = (id, e) =>
      (pane(id).innerHTML = `<div class="gqaPanel gqaDanger">${esc(
        e.message
      )}</div>`);
  async function dashboard() {
    loading("dashboard");
    try {
      const d = await call("dashboard"),
        today = new Map((d.assignments || []).map((x) => [x.profession, x])),
        c = d.counts || {};
      const stats = [
        ["Total questions", c.total],
        ["Nurse", c.nurse],
        ["Midwife", c.midwife],
        ["Both professions", c.both],
        ["Active", c.active],
        ["Already used", c.used],
        ["Remaining unused", c.unused],
        ["With images", c.images],
        ["Scheduled", c.scheduled],
        ["Monthly participants", c.participants],
      ];
      pane("dashboard").innerHTML = `<div class="gqaStats">${stats
        .map(
          ([label, value]) =>
            `<article class="gqaStat"><span>${label}</span><b>${
              value ?? 0
            }</b></article>`
        )
        .join(
          ""
        )}</div><div class="gqaPanel"><h3>Today’s releases</h3><p><b>Nursing:</b> ${esc(
        today.get("nursing")?.question_text || "Not assigned"
      )}</p><p><b>Midwifery:</b> ${esc(
        today.get("midwifery")?.question_text || "Not assigned"
      )}</p><h3>Current prize</h3><p>500 BC · ${
        d.sponsor
          ? `${esc(d.sponsor.name)} — ${esc(
              d.sponsor.prize_description || "surprise sponsor package"
            )}`
          : "Sponsor announcement coming soon"
      }</p><p>${
        d.winners.filter((x) => x.reward_status === "pending").length
      } winner rewards pending verification · ${
        d.open_reports
      } comment reports awaiting review.</p></div>`;
    } catch (e) {
      error("dashboard", e);
    }
  }
  async function bank() {
    loading("bank");
    try {
      cache = await call("questions");
      renderBank();
    } catch (e) {
      error("bank", e);
    }
  }
  function renderBank() {
    const p = pane("bank");
    const values = (key) =>
      [
        ...new Set((cache.questions || []).map((x) => x[key]).filter(Boolean)),
      ].sort();
    p.innerHTML = `<div class="gqaPanel"><div class="gqaToolbar"><input data-gqa-search placeholder="Search all 200 questions"><select data-filter="profession"><option value="">All professions</option><option value="nursing">Nurse</option><option value="midwifery">Midwife</option><option value="both">Both</option></select><select data-filter="category"><option value="">All categories</option>${values(
      "category"
    )
      .map((x) => `<option>${esc(x)}</option>`)
      .join(
        ""
      )}</select><select data-filter="difficulty"><option value="">All difficulties</option>${values(
      "difficulty"
    )
      .map((x) => `<option>${esc(x)}</option>`)
      .join(
        ""
      )}</select><select data-filter="status"><option value="">All statuses</option><option>approved</option><option>draft</option><option>archived</option></select><select data-filter="image"><option value="">Image or no image</option><option value="yes">Has image</option><option value="no">No image</option></select><select data-sort><option value="order">Bank order</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="next">Next release</option><option value="last">Last released</option></select><button class="gqaButton gold" data-new-question>+ Create question</button></div><p class="gqaNotice">${
      cache.total || cache.questions.length
    } records loaded directly from public.btv_golden_questions. ${
      cache.duplicate_groups || 0
    } repeated-prompt groups detected; review before duplicating.</p><div data-question-rows></div></div>`;
    $("[data-new-question]", p).onclick = () => editor();
    $$("input,select", p).forEach((control) => (control.oninput = renderRows));
    renderRows();
  }
  function renderRows() {
    const p = pane("bank"),
      q = ($("[data-gqa-search]", p)?.value || "").toLowerCase(),
      filter = (name) => $(`[data-filter="${name}"]`, p)?.value || "";
    let rows = (cache.questions || []).filter(
      (x) =>
        (!q || JSON.stringify(x).toLowerCase().includes(q)) &&
        (!filter("profession") || x.profession === filter("profession")) &&
        (!filter("category") || x.category === filter("category")) &&
        (!filter("difficulty") || x.difficulty === filter("difficulty")) &&
        (!filter("status") || x.status === filter("status")) &&
        (!filter("image") ||
          (filter("image") === "yes") === Boolean(x.image_path))
    );
    const sort = $("[data-sort]", p)?.value;
    if (sort === "newest")
      rows.sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at))
      );
    if (sort === "oldest")
      rows.sort((a, b) =>
        String(a.created_at).localeCompare(String(b.created_at))
      );
    if (sort === "next")
      rows.sort((a, b) =>
        String(a.next_scheduled_date || "9999").localeCompare(
          String(b.next_scheduled_date || "9999")
        )
      );
    if (sort === "last")
      rows.sort((a, b) =>
        String(b.last_released_at || "").localeCompare(
          String(a.last_released_at || "")
        )
      );
    $("[data-question-rows]", p).innerHTML = `<p><b>${
      rows.length
    }</b> questions match</p><div class="gqaTableWrap"><table class="gqaTable"><thead><tr><th>Question</th><th>Profession</th><th>Difficulty</th><th>Image</th><th>Status</th><th>Last / next</th><th>Responses</th><th></th></tr></thead><tbody>${
      rows
        .map(
          (x) =>
            `<tr><td><b>${esc(x.question_text)}</b><br><small>${esc(
              x.category
            )}</small></td><td>${esc(x.profession)}</td><td>${esc(
              x.difficulty
            )}</td><td>${
              x.image_path ? "Yes" : "No"
            }</td><td><span class="gqaStatus ${x.status}">${esc(
              x.status
            )}</span></td><td><small>${
              x.last_released_at
                ? new Date(x.last_released_at).toLocaleDateString()
                : "Never"
            } / ${esc(
              x.next_scheduled_date || "Not scheduled"
            )}</small></td><td>${x.response_count || 0} · ${
              x.correct_percentage || 0
            }%</td><td><button class="gqaButton quiet" data-edit="${
              x.id
            }">Edit</button></td></tr>`
        )
        .join("") || '<tr><td colspan="8">No questions found.</td></tr>'
    }</tbody></table></div>`;
    $$("[data-edit]", p).forEach(
      (b) =>
        (b.onclick = () => editor(rows.find((x) => x.id === b.dataset.edit)))
    );
  }
  const field = (
    name,
    label,
    type = "text",
    value = "",
    wide = false,
    opts = []
  ) =>
    `<label class="gqaField ${wide ? "wide" : ""}"><span>${label}</span>${
      type === "textarea"
        ? `<textarea name="${name}">${esc(value)}</textarea>`
        : type === "select"
        ? `<select name="${name}">${opts
            .map(
              (x) =>
                `<option value="${x}" ${
                  x === value ? "selected" : ""
                }>${x.replaceAll("_", " ")}</option>`
            )
            .join("")}</select>`
        : `<input name="${name}" type="${type}" value="${esc(value)}">`
    }</label>`;
  function editor(item = {}) {
    let d = $("#gqaEditor");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "gqaEditor";
      d.className = "gqaModal";
      document.body.append(d);
    }
    const opts = item.golden_question_options || [];
    d.innerHTML = `<header><h2>${
      item.id ? "Edit" : "Create"
    } Golden Question</h2><button type="button" aria-label="Close">×</button></header><form><div class="gqaForm">${field(
      "profession",
      "Profession",
      "select",
      item.profession || "nursing",
      false,
      ["nursing", "midwifery", "both"]
    )}${field(
      "question_type",
      "Question type",
      "select",
      item.question_type || "multiple_choice",
      false,
      [
        "multiple_choice",
        "equipment",
        "clinical_scenario",
        "true_false",
        "short_answer",
      ]
    )}${field("category", "Category", "text", item.category || "")}${field(
      "subcategory",
      "Subcategory",
      "text",
      item.subcategory || ""
    )}${field(
      "difficulty",
      "Difficulty",
      "select",
      item.difficulty || "medium",
      false,
      ["easy", "medium", "hard", "expert"]
    )}${field("status", "Status", "select", item.status || "draft", false, [
      "draft",
      "pending_review",
      "approved",
      "rejected",
      "archived",
    ])}${field(
      "question_text",
      "Question text",
      "textarea",
      item.question_text || "",
      true
    )}${field(
      "teaser",
      "Safe social teaser",
      "text",
      item.teaser || "",
      true
    )}<div class="gqaOptions"><b>Answer options (A–D)</b><div data-option-list>${Array.from(
      { length: 4 }
    )
      .map(
        (_, i) =>
          `<div class="gqaOption"><input value="${esc(
            opts[i]?.option_key || String.fromCharCode(65 + i)
          )}" aria-label="Option key"><input value="${esc(
            opts[i]?.option_text || ""
          )}" placeholder="Option text"><button type="button" class="gqaButton quiet" data-remove-option>×</button></div>`
      )
      .join("")}</div></div>${field(
      "correct_answer",
      "Correct answer key(s), comma separated",
      "text",
      Array.isArray(item.correct_answer)
        ? item.correct_answer.join(",")
        : item.correct_answer || "",
      true
    )}${field(
      "acceptable_answers",
      "Acceptable short-answer variants, one per line",
      "textarea",
      (item.acceptable_answers || []).join("\n"),
      true
    )}${field(
      "explanation",
      "Educational explanation",
      "textarea",
      item.explanation || "",
      true
    )}${field(
      "safety_points",
      "Clinical safety points",
      "textarea",
      item.safety_points || "",
      true
    )}${field(
      "clinical_reference",
      "Guideline or source reference",
      "text",
      item.clinical_reference || "",
      true
    )}${field(
      "publication_date",
      "Earliest publication date",
      "date",
      item.publication_date || ""
    )}${field(
      "base_points",
      "Base points",
      "number",
      item.base_points ?? 10
    )}${field(
      "max_speed_bonus",
      "Maximum speed bonus",
      "number",
      item.max_speed_bonus ?? 3
    )}${field(
      "image_alt",
      "Image alt text",
      "text",
      item.image_alt || "",
      true
    )}${field(
      "image_credit",
      "Image credit",
      "text",
      item.image_credit || "",
      true
    )}${field(
      "copyright_notes",
      "Copyright / permission notes",
      "textarea",
      item.copyright_notes || "",
      true
    )}<label class="gqaField wide"><span>Equipment image (JPG, PNG or WebP; max 5 MB)</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><label class="gqaCheck"><input name="is_active" type="checkbox" ${
      item.is_active ? "checked" : ""
    }> Active</label><label class="gqaCheck"><input name="speed_bonus_enabled" type="checkbox" ${
      item.speed_bonus_enabled ? "checked" : ""
    }> Speed bonus</label><label class="gqaCheck"><input name="sharing_enabled" type="checkbox" ${
      item.sharing_enabled !== false ? "checked" : ""
    }> Sharing allowed</label><label class="gqaCheck"><input name="eligible_for_random" type="checkbox" ${
      item.eligible_for_random !== false ? "checked" : ""
    }> Eligible for random release</label></div><p class="gqaNotice" data-message>Correct answers stay in the protected question bank and are never sent before submission.</p><div class="gqaToolbar"><button type="button" class="gqaButton quiet" data-duplicate ${
      item.id ? "" : "hidden"
    }>Duplicate</button><button class="gqaButton gold">Save question</button></div></form>`;
    $("header button", d).onclick = () => d.close();
    $("[data-duplicate]", d).onclick = () => {
      const normalized = String(item.question_text || "")
        .trim()
        .toLowerCase();
      const matches = (cache.questions || []).filter(
        (x) =>
          String(x.question_text || "")
            .trim()
            .toLowerCase() === normalized
      ).length;
      if (
        !confirm(
          `Duplicate detection found ${matches} question(s) with this wording. Create an archived draft copy anyway?`
        )
      )
        return;
      d.close();
      editor({
        ...item,
        id: null,
        status: "archived",
        question_text: item.question_text + " (copy)",
      });
    };
    $("form", d).onsubmit = (e) => saveQuestion(e, item);
    d.showModal();
  }
  async function saveQuestion(e, item) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form),
      msg = $("[data-message]", form),
      file = fd.get("image");
    msg.textContent = "Saving securely…";
    try {
      let image_path = item.image_path || null;
      if (file?.size) {
        if (
          file.size > 5242880 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        )
          throw Error("Use a JPG, PNG or WebP image no larger than 5 MB.");
        image_path = `questions/${crypto.randomUUID()}-${file.name.replace(
          /[^a-z0-9._-]/gi,
          "-"
        )}`;
        const up = await window.btvSupabase.storage
          .from("golden-question-images")
          .upload(image_path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
      }
      const obj = Object.fromEntries(fd.entries());
      delete obj.image;
      for (const x of [
        "is_active",
        "speed_bonus_enabled",
        "sharing_enabled",
        "eligible_for_random",
      ])
        obj[x] = fd.has(x);
      obj.base_points = Number(obj.base_points) || 10;
      obj.max_speed_bonus = Math.min(3, Number(obj.max_speed_bonus) || 0);
      obj.correct_answer = obj.correct_answer
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      obj.acceptable_answers = obj.acceptable_answers
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      obj.image_path = image_path;
      obj.id = item.id;
      const options = $$("[data-option-list] .gqaOption", form)
        .map((r) => ({
          option_key: r.children[0].value.trim(),
          option_text: r.children[1].value.trim(),
        }))
        .filter((x) => x.option_text);
      if (
        ["multiple_choice", "equipment", "clinical_scenario"].includes(
          obj.question_type
        ) &&
        (options.length < 2 || options.length > 6)
      )
        throw Error("Add between two and six answer options.");
      await call("save_question", {
        question: obj,
        options,
        reason: "Question bank edit",
      });
      $("#gqaEditor").close();
      bank();
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add("gqaDanger");
    }
  }
  async function schedule() {
    const p = pane("schedule");
    p.innerHTML = `<div class="gqaPanel"><h3>Daily Schedule</h3><p class="gqaNotice">Assignments use Europe/London dates. A live question with attempts cannot be replaced without an audited fairness resolution.</p><form class="gqaSchedule"><input type="date" name="date" required><select name="profession"><option value="nursing">Nursing</option><option value="midwifery">Midwifery</option></select><select name="question_id"><option>Loading approved questions…</option></select><button class="gqaButton gold">Schedule</button></form><p data-schedule-message></p></div>`;
    try {
      if (!cache.questions?.length) cache = await call("questions");
      const select = $('[name="question_id"]', p);
      select.innerHTML = cache.questions
        .filter((x) => x.status === "approved" && x.is_active)
        .map(
          (x) =>
            `<option value="${x.id}">${esc(x.profession)} · ${esc(
              x.question_text.slice(0, 80)
            )}</option>`
        )
        .join("");
      $("form", p).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          await call("schedule", {
            date: f.get("date"),
            profession: f.get("profession"),
            question_id: f.get("question_id"),
          });
          $("[data-schedule-message]", p).textContent =
            "Question scheduled successfully.";
        } catch (err) {
          $("[data-schedule-message]", p).textContent = err.message;
        }
      };
    } catch (e) {
      error("schedule", e);
    }
  }
  async function leaderboard() {
    const p = pane("leaderboard");
    p.innerHTML = `<div class="gqaPanel"><div class="gqaToolbar"><h3>Leaderboard Management</h3><div><select data-prof><option value="nursing">Nursing</option><option value="midwifery">Midwifery</option></select> <input data-month type="month" value="${new Date()
      .toISOString()
      .slice(
        0,
        7
      )}"> <button class="gqaButton" data-refresh>Refresh</button> <button class="gqaButton gold" data-freeze>Freeze month</button> <button class="gqaButton quiet" data-export>Export CSV</button></div></div><div data-board></div></div>`;
    let last = [];
    const load = async () => {
      const d = await call("leaderboard", {
        profession: $("[data-prof]", p).value,
        month: $("[data-month]", p).value + "-01",
      });
      last = d.leaderboard;
      $(
        "[data-board]",
        p
      ).innerHTML = `<table class="gqaTable"><thead><tr><th>#</th><th>Participant</th><th>Points</th><th>Correct</th><th>Accuracy</th><th>Streak</th><th></th></tr></thead><tbody>${d.leaderboard
        .map(
          (x) =>
            `<tr><td>${x.position}</td><td>${esc(x.display_name)}</td><td>${
              x.points
            }</td><td>${x.correct_answers}/${x.attempts}</td><td>${
              x.accuracy
            }%</td><td>${
              x.current_streak
            }</td><td><button class="gqaButton quiet" data-disqualify="${
              x.user_id
            }">Disqualify</button></td></tr>`
        )
        .join(
          ""
        )}</tbody></table><p class="gqaNotice">Tie order: points, correct answers, accuracy, longest valid streak, then earliest final tied score. Disqualification requires a recorded reason.</p>`;
      $$("[data-disqualify]", p).forEach(
        (b) =>
          (b.onclick = async () => {
            const reason = prompt("Required disqualification reason");
            if (!reason) return;
            await call("disqualify", {
              user_id: b.dataset.disqualify,
              profession: $("[data-prof]", p).value,
              month: $("[data-month]", p).value + "-01",
              reason,
            });
            load();
          })
      );
    };
    $("[data-refresh]", p).onclick = load;
    $("[data-freeze]", p).onclick = async () => {
      if (!confirm("Freeze this month and create pending winner records?"))
        return;
      const r = await call("freeze_month", {
        month: $("[data-month]", p).value + "-01",
      });
      alert(`${r.winners_created} winner record(s) prepared for verification.`);
    };
    $("[data-export]", p).onclick = () => {
      const csv = [
          "Position,Display Name,Points,Correct,Attempts,Accuracy,Streak",
          ...last.map((x) =>
            [
              x.position,
              JSON.stringify(x.display_name),
              x.points,
              x.correct_answers,
              x.attempts,
              x.accuracy,
              x.current_streak,
            ].join(",")
          ),
        ].join("\n"),
        a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `golden-question-${$("[data-prof]", p).value}-${
        $("[data-month]", p).value
      }.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    load().catch((e) => error("leaderboard", e));
  }
  async function prizes() {
    loading("prizes");
    try {
      const d = await call("prizes");
      pane(
        "prizes"
      ).innerHTML = `<div class="gqaPanel"><h3>Monthly winners</h3>${
        d.winners.length
          ? d.winners
              .map(
                (x) =>
                  `<article class="gqaPrize"><span class="gqaBadge">♛ ${esc(
                    x.profession
                  )} · ${esc(
                    x.competition_month
                  )}</span><p>Verification: <b>${esc(
                    x.verification_status
                  )}</b> · Reward: <b>${esc(x.reward_status)}</b> · ${
                    x.bc_reward
                  } BC</p>${
                    x.verification_status === "pending_review"
                      ? `<button class="gqaButton" data-verify="${x.id}">Approve verified winner</button>`
                      : ""
                  }${
                    x.verification_status === "approved" &&
                    x.reward_status !== "awarded"
                      ? `<button class="gqaButton gold" data-award="${x.id}">Credit ${x.bc_reward} BC</button>`
                      : ""
                  }</article>`
              )
              .join("")
          : "<p>No winner records yet.</p>"
      }<h3>Sponsors and fulfilment</h3>${
        d.sponsors.length
          ? d.sponsors
              .map(
                (x) =>
                  `<p><b>${esc(x.name)}</b> · ${
                    x.golden_question_prize_fulfilments?.length || 0
                  } linked prize records</p>`
              )
              .join("")
          : "<p>No sponsors recorded.</p>"
      }<form class="gqaForm" data-sponsor-form>${field(
        "name",
        "Sponsor name"
      )}${field(
        "website_url",
        "Sponsor website",
        "url"
      )}${field(
        "logo_path",
        "Logo URL or storage path"
      )}${field(
        "prize_description",
        "Prize description",
        "textarea",
        "",
        true
      )}${field(
        "message",
        "Sponsor message",
        "textarea",
        "",
        true
      )}${field(
        "sponsored_month",
        "Specific competition month",
        "month"
      )}${field(
        "start_date",
        "Campaign start",
        "date"
      )}${field(
        "end_date",
        "Campaign end",
        "date"
      )}${field(
        "logo_permission_notes",
        "Logo / prize usage permission notes",
        "textarea",
        "",
        true
      )}<label class="gqaCheck"><input type="checkbox" name="is_active" checked> Active</label><button class="gqaButton">Add sponsor</button></form><form class="gqaForm" data-fulfilment-form><label class="gqaField"><span>Winner</span><select name="winner_id">${d.winners
        .map(
          (x) =>
            `<option value="${x.id}">${esc(x.profession)} · ${esc(
              x.competition_month
            )}</option>`
        )
        .join(
          ""
        )}</select></label><label class="gqaField"><span>Sponsor</span><select name="sponsor_id"><option value="">No sponsor</option>${d.sponsors
        .map((x) => `<option value="${x.id}">${esc(x.name)}</option>`)
        .join("")}</select></label>${field(
        "prize_description",
        "Prize description",
        "textarea",
        "",
        true
      )}${field(
        "dispatch_status",
        "Dispatch status",
        "select",
        "not_started",
        false,
        [
          "not_started",
          "winner_contacted",
          "details_requested",
          "dispatched",
          "completed",
        ]
      )}${field("tracking_reference", "Tracking reference")}${field(
        "private_notes",
        "Private fulfilment notes",
        "textarea",
        "",
        true
      )}<label class="gqaCheck"><input type="checkbox" name="winner_contacted"> Winner contacted</label><label class="gqaCheck"><input type="checkbox" name="delivery_requested"> Delivery information requested securely</label><button class="gqaButton gold">Save fulfilment</button></form><p class="gqaNotice">Delivery details and fulfilment notes remain private and never appear on public leaderboards.</p></div>`;
      $$("[data-verify]", pane("prizes")).forEach(
        (b) =>
          (b.onclick = async () => {
            const notes = prompt(
              "Verification notes (eligibility, duplicate-account and activity review)"
            );
            if (notes === null) return;
            await call("verify_winner", {
              winner_id: b.dataset.verify,
              approved: true,
              notes,
            });
            prizes();
          })
      );
      $$("[data-award]", pane("prizes")).forEach(
        (b) =>
          (b.onclick = async () => {
            if (
              !confirm(
                "Credit this verified winner using the existing Beyond Coins ledger?"
              )
            )
              return;
            try {
              await call("award_winner", { winner_id: b.dataset.award });
              prizes();
            } catch (e) {
              alert(e.message);
            }
          })
      );
      $("[data-sponsor-form]", pane("prizes")).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          sponsor = Object.fromEntries(f.entries());
        sponsor.is_active = f.has("is_active");
        if (sponsor.sponsored_month) sponsor.sponsored_month += "-01";
        await call("save_sponsor", {
          sponsor,
        });
        prizes();
      };
      $("[data-fulfilment-form]", pane("prizes")).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          fulfilment = Object.fromEntries(f.entries());
        fulfilment.winner_contacted = f.has("winner_contacted");
        fulfilment.delivery_requested = f.has("delivery_requested");
        await call("save_fulfilment", { fulfilment });
        prizes();
      };
    } catch (e) {
      error("prizes", e);
    }
  }
  async function moderation() {
    loading("moderation");
    try {
      const d = await call("moderation");
      pane(
        "moderation"
      ).innerHTML = `<div class="gqaStats"><article class="gqaStat"><span>Open reports</span><b>${
        d.reports.length
      }</b></article><article class="gqaStat"><span>Short answers</span><b>${
        d.short_answers.length
      }</b></article></div><div class="gqaPanel"><h3>Reported discussion</h3>${
        d.reports
          .map(
            (x) =>
              `<article class="gqaPanel gqaReport"><b>${esc(
                x.category
              )}</b><p>${esc(x.golden_question_comments?.body)}</p><small>${esc(
                x.details || "No additional detail"
              )}</small><p><button class="gqaButton quiet" data-resolve="${
                x.id
              }">Resolve</button> <button class="gqaButton" data-remove="${
                x.id
              }">Remove unsafe comment</button></p></article>`
          )
          .join("") || "<p>No open reports.</p>"
      }</div><div class="gqaPanel"><h3>Short-answer review</h3>${
        d.short_answers
          .map(
            (x) =>
              `<article><b>${esc(
                x.golden_questions?.question_text
              )}</b><pre class="gqaJson">${esc(
                JSON.stringify(x.answer, null, 2)
              )}</pre><button class="gqaButton" data-short-correct="${
                x.id
              }">Mark correct</button> <button class="gqaButton quiet" data-short-wrong="${
                x.id
              }">Mark incorrect</button></article>`
          )
          .join("") || "<p>No answers awaiting review.</p>"
      }</div>`;
      $$("[data-resolve]", pane("moderation")).forEach(
        (b) =>
          (b.onclick = async () => {
            await call("moderate_report", {
              report_id: b.dataset.resolve,
              remove_comment: false,
              reason: "Reviewed and resolved",
            });
            moderation();
          })
      );
      $$("[data-remove]", pane("moderation")).forEach(
        (b) =>
          (b.onclick = async () => {
            const reason = prompt("Required moderation reason");
            if (!reason) return;
            await call("moderate_report", {
              report_id: b.dataset.remove,
              remove_comment: true,
              reason,
            });
            moderation();
          })
      );
      $$("[data-short-correct]", pane("moderation")).forEach(
        (b) =>
          (b.onclick = async () => {
            await call("review_short", {
              attempt_id: b.dataset.shortCorrect,
              correct: true,
            });
            moderation();
          })
      );
      $$("[data-short-wrong]", pane("moderation")).forEach(
        (b) =>
          (b.onclick = async () => {
            await call("review_short", {
              attempt_id: b.dataset.shortWrong,
              correct: false,
            });
            moderation();
          })
      );
    } catch (e) {
      error("moderation", e);
    }
  }
  async function settings() {
    loading("settings");
    try {
      const d = await call("settings"),
        s = d.settings;
      pane(
        "settings"
      ).innerHTML = `<div class="gqaPanel"><h3>Competition Settings</h3><form class="gqaForm">${field(
        "reset_timezone",
        "Daily reset timezone",
        "text",
        s.reset_timezone
      )}${field(
        "correct_points",
        "Correct-answer points",
        "number",
        s.correct_points
      )}${field(
        "monthly_bc_reward",
        "Monthly BC reward",
        "number",
        s.monthly_bc_reward
      )}${field(
        "leaderboard_limit",
        "Leaderboard positions",
        "number",
        s.leaderboard_limit
      )}${field(
        "streak_bonuses",
        "Streak bonuses (JSON)",
        "textarea",
        JSON.stringify(s.streak_bonuses),
        true
      )}${field(
        "competition_terms",
        "Competition terms",
        "textarea",
        s.competition_terms,
        true
      )}${field(
        "sponsor_prize_wording",
        "Sponsor prize wording",
        "text",
        s.sponsor_prize_wording,
        true
      )}<label class="gqaCheck"><input name="feature_paused" type="checkbox" ${
        s.feature_paused ? "checked" : ""
      }> Feature paused</label><label class="gqaCheck"><input name="sharing_enabled" type="checkbox" ${
        s.sharing_enabled ? "checked" : ""
      }> Sharing enabled</label><label class="gqaCheck"><input name="commenting_enabled" type="checkbox" ${
        s.commenting_enabled ? "checked" : ""
      }> Commenting enabled</label><button class="gqaButton gold">Save settings</button></form><p data-settings-message></p></div>`;
      $("form", pane("settings")).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          patch = Object.fromEntries(f.entries());
        for (const x of [
          "correct_points",
          "monthly_bc_reward",
          "leaderboard_limit",
        ])
          patch[x] = Number(patch[x]);
        patch.streak_bonuses = JSON.parse(patch.streak_bonuses);
        for (const x of [
          "feature_paused",
          "sharing_enabled",
          "commenting_enabled",
        ])
          patch[x] = f.has(x);
        try {
          await call("settings", { patch });
          $("[data-settings-message]", pane("settings")).textContent =
            "Settings saved.";
        } catch (err) {
          $("[data-settings-message]", pane("settings")).textContent =
            err.message;
        }
      };
    } catch (e) {
      error("settings", e);
    }
  }
  const wait = setInterval(() => {
    if ($("#app") && !$("#app").hidden) {
      clearInterval(wait);
      install();
    }
  }, 300);
  setTimeout(() => clearInterval(wait), 20000);
})();
