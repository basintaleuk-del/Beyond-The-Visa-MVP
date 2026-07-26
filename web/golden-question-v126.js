(() => {
  "use strict";
  if (window.__btvGoldenQuestion126) return;
  window.__btvGoldenQuestion126 = true;
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
  let data = null,
    started = 0,
    timer = null;
  const db = () => window.btvSupabase;
  const call = async (body) => {
    const { data, error } = await db().functions.invoke("golden-question", {
      body,
    });
    if (error) throw Error(data?.error || error.message);
    if (data?.error)
      throw Object.assign(Error(data.error), { code: data.code });
    return data;
  };
  const toast = (msg) => {
    let x = $(".gqToast");
    if (!x) {
      x = document.createElement("div");
      x.className = "gqToast";
      x.setAttribute("role", "status");
      document.body.append(x);
    }
    x.textContent = msg;
    x.classList.add("show");
    setTimeout(() => x.classList.remove("show"), 2400);
  };
  const label = (v) =>
    String(v || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (x) => x.toUpperCase());
  function msNextLondon() {
    const now = Date.now(),
      today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/London",
      }).format(now);
    let lo = now,
      hi = now + 27 * 3600000;
    for (let i = 0; i < 32; i++) {
      const mid = Math.floor((lo + hi) / 2);
      if (
        new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
          mid
        ) === today
      )
        lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, hi - now);
  }
  function countdown() {
    const x = $("[data-gq-countdown]");
    if (!x) return;
    const sec = Math.floor(msNextLondon() / 1000),
      h = Math.floor(sec / 3600),
      m = Math.floor((sec % 3600) / 60),
      s = sec % 60;
    x.textContent = `${h}h ${m}m ${s}s`;
    x.setAttribute(
      "aria-label",
      `${h} hours and ${m} minutes until the next question`
    );
  }
  function host() {
    let h = $("#goldenQuestion126");
    if (h) return h;
    h = document.createElement("section");
    h.id = "goldenQuestion126";
    h.setAttribute("aria-label", "Today's Golden Question");
    const home = $("#home"),
      anchor = $(".dashboardV3", home) || $(".welcome", home);
    if (anchor) anchor.insertAdjacentElement("afterend", h);
    else home?.prepend(h);
    return h;
  }
  const state = (title, message, extra = "") =>
    `<article class="gqCard"><div class="gqTop"><div class="gqTrophy" aria-hidden="true">♛</div><div><small>DAILY CLINICAL CHALLENGE</small><h2>Today’s Golden Question</h2></div></div><div class="gqState"><h3>${esc(
      title
    )}</h3><p>${esc(message)}</p>${extra}</div></article>`;
  function resultHtml(r) {
    if (!r) return "";
    const cls =
        r.review_status === "pending"
          ? "pending"
          : r.is_correct
          ? ""
          : "incorrect",
      title =
        r.review_status === "pending"
          ? "Answer awaiting educator review"
          : r.is_correct
          ? "Correct — excellent work"
          : "Not quite — keep learning";
    return `<section class="gqResult ${cls}" tabindex="-1"><h3>${title}</h3>${
      r.review_status !== "pending"
        ? `<p><b>Correct answer:</b> ${esc(
            Array.isArray(r.correct_answer)
              ? r.correct_answer.join(", ")
              : r.correct_answer
          )}</p>`
        : ""
    }<p>${esc(r.explanation || "An educator will review your response.")}</p>${
      r.safety_points
        ? `<p class="gqSafety"><b>Clinical safety:</b> ${esc(
            r.safety_points
          )}</p>`
        : ""
    }${
      r.clinical_reference
        ? `<p><b>Reference:</b> ${esc(r.clinical_reference)}</p>`
        : ""
    }<p><b>${Number(r.points_awarded || 0)} points earned</b>${
      r.streak_bonus ? ` · ${r.streak_bonus} streak bonus` : ""
    }</p></section>`;
  }
  function answerInput(d) {
    const q = d.question,
      o = d.options || [];
    if (o.length)
      return `<fieldset class="gqOptions"><legend class="sr">Select one or more answers</legend>${o
        .map(
          (x) =>
            `<label class="gqOption"><input type="checkbox" name="gq-answer" value="${esc(
              x.option_key
            )}"><span><b>${esc(x.option_key.toUpperCase())}.</b> ${esc(
              x.option_text
            )}</span></label>`
        )
        .join("")}</fieldset>`;
    if (q.question_type === "true_false")
      return `<fieldset class="gqOptions"><legend class="sr">Choose true or false</legend>${[
        "true",
        "false",
      ]
        .map(
          (x) =>
            `<label class="gqOption"><input type="radio" name="gq-answer" value="${x}"><span>${label(
              x
            )}</span></label>`
        )
        .join("")}</fieldset>`;
    return `<label><span class="sr">Your short answer</span><textarea class="gqAnswerText" maxlength="500" placeholder="Write a concise clinical answer. Do not include patient-identifiable information."></textarea></label>`;
  }
  function card(d) {
    const answered = d.state === "answered",
      leaders = (d.leaderboard || []).slice(0, 5),
      s = d.sponsor;
    return `<article class="gqCard"><header class="gqTop"><div class="gqTrophy" aria-hidden="true">♛</div><div><small>DAILY CLINICAL CHALLENGE</small><h2>Today’s Golden Question</h2></div><span class="gqCountdown">Next in <b data-gq-countdown aria-live="off">—</b></span></header><div class="gqBody"><p class="gqMessage">Answer today’s Golden Question, build your monthly score and compete for ${
      d.settings.reward
    } BC ${esc(
      d.settings.sponsor_wording
    )}.</p><div class="gqMeta"><span class="gqPill">${new Date(
      d.date + "T12:00:00"
    ).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}</span><span class="gqPill">${label(
      d.profession
    )}</span><span class="gqPill">${esc(
      d.question.category
    )}</span><span class="gqPill">${label(d.question.difficulty)}</span></div>${
      s
        ? `<aside class="gqNotice"><b>This month’s Golden Question is sponsored by ${esc(
            s.name
          )}</b>${
            s.logo_url
              ? `<img class="gqSponsorLogo" src="${esc(s.logo_url)}" alt="${esc(
                  s.name
                )} logo" loading="lazy">`
              : ""
          }<p>${esc(
            s.prize_description || s.message || "A surprise sponsor package"
          )}</p>${
            s.website_url
              ? `<a href="${esc(
                  s.website_url
                )}" target="_blank" rel="noopener noreferrer sponsored">Visit sponsor</a>`
              : ""
          }</aside>`
        : `<p class="gqNotice"><b>Sponsor announcement coming soon</b></p>`
    }${
      d.question.image_url
        ? `<img class="gqImage" src="${esc(d.question.image_url)}" alt="${esc(
            d.question.image_alt || "Clinical equipment for identification"
          )}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'gqNotice',textContent:'The question image could not be loaded. Please check your connection.'}))">`
        : ""
    }<h3 class="gqQuestion">${esc(
      d.question.question_text
    )}</h3><form id="gqAnswerForm">${answered ? "" : answerInput(d)}${
      answered
        ? resultHtml(d.result)
        : `<div class="gqActions"><button class="gqPrimary" type="submit">Submit Answer</button><button class="gqSecondary" type="button" data-gq-share>Share Question</button></div>`
    }</form>${
      answered
        ? `<div class="gqActions"><button class="gqSecondary" type="button" data-gq-share>Share Result</button><button class="gqLink" type="button" data-gq-centre>Leaderboard, history & discussion</button></div>`
        : ""
    }<div class="gqStats"><div><b>${
      d.monthly_points || 0
    }</b><small>MONTHLY POINTS</small></div><div><b>${
      d.position ? "#" + d.position : "—"
    }</b><small>YOUR POSITION</small></div><div><b>${
      d.attempt_count || 0
    }</b><small>${label(
      d.profession
    )} ATTEMPTS</small></div></div><section class="gqCompactBoard" aria-label="Current monthly leaders"><h3>Monthly leaders</h3>${
      leaders.length
        ? leaders
            .map(
              (x) =>
                `<p><b>#${x.position} ${esc(x.display_name)}</b><span>${
                  x.points
                } points</span></p>`
            )
            .join("")
        : "<p>No scores yet—be the first to take part.</p>"
    }${
      d.position && !leaders.some((x) => x.is_me)
        ? `<p class="me"><b>Your rank: #${d.position}</b><span>${
            d.monthly_points || 0
          } points</span></p>`
        : ""
    }</section>${
      !answered
        ? `<button class="gqLink" type="button" data-gq-centre>View leaderboard, history & rules</button>`
        : ""
    }</div></article>`;
  }
  async function load() {
    const h = host();
    if (!db()) {
      h.innerHTML = state(
        "Connection unavailable",
        "The secure question service could not be loaded."
      );
      return;
    }
    h.innerHTML = state(
      "Loading today’s challenge",
      "Preparing the secure question for your profession…"
    );
    try {
      data = await call({ action: "today" });
      if (data.state === "profession_missing") {
        h.innerHTML = state(
          "Choose your profession",
          "Select the profession you are registered in. This choice is locked for fair competition.",
          `<div class="gqProfession"><button data-gq-prof="nursing">I’m a Nurse</button><button data-gq-prof="midwifery">I’m a Midwife</button></div>`
        );
        $$("[data-gq-prof]", h).forEach(
          (b) =>
            (b.onclick = async () => {
              b.disabled = true;
              try {
                await call({
                  action: "select_profession",
                  profession: b.dataset.gqProf,
                });
                load();
              } catch (e) {
                toast(e.message);
              }
            })
        );
        return;
      }
      if (data.state === "paused" || data.state === "empty") {
        h.innerHTML = state(
          data.state === "paused" ? "Challenge paused" : "No question today",
          data.message ||
            "There is no approved question available for your profession yet."
        );
        return;
      }
      h.innerHTML = card(data);
      started = Date.now();
      bind();
      countdown();
      clearInterval(timer);
      timer = setInterval(countdown, 1000);
    } catch (e) {
      h.innerHTML = state(
        navigator.onLine ? "Question unavailable" : "You’re offline",
        navigator.onLine
          ? "We could not load today’s question. Please try again shortly."
          : "Reconnect to load and submit the secure daily question.",
        `<button class="gqSecondary" onclick="window.BTVGoldenQuestion.load()">Try again</button>`
      );
    }
  }
  function selectedAnswer() {
    const checks = $$('input[name="gq-answer"]:checked');
    if (checks.length) return checks.map((x) => x.value);
    return $(".gqAnswerText")?.value?.trim() || null;
  }
  async function submit(e) {
    e.preventDefault();
    const answer = selectedAnswer();
    if (!answer || (Array.isArray(answer) && !answer.length))
      return toast("Choose or enter an answer first.");
    const button = $(".gqPrimary", e.currentTarget);
    button.disabled = true;
    button.textContent = "Submitting securely…";
    try {
      await call({
        action: "submit",
        daily_question_id: data.assignment.id,
        answer,
        duration_seconds: Math.round((Date.now() - started) / 1000),
        client_hint: `${
          navigator.userAgentData?.platform || navigator.platform
        }:${screen.width}x${screen.height}`,
      });
      await load();
      $(".gqResult")?.focus();
    } catch (err) {
      if (err.code === "TERMS_REQUIRED") {
        button.disabled = false;
        button.textContent = "Submit Answer";
        return terms(true);
      }
      toast(
        err.code === "ALREADY_ANSWERED"
          ? "Your scored answer is already recorded."
          : err.message
      );
      if (err.code === "ALREADY_ANSWERED") load();
      else {
        button.disabled = false;
        button.textContent = "Submit Answer";
      }
    }
  }
  function bind() {
    const form = $("#gqAnswerForm");
    if (form && !data.result) form.addEventListener("submit", submit);
    $$("[data-gq-share]").forEach((b) => (b.onclick = share));
    $$("[data-gq-centre]").forEach((b) => (b.onclick = centre));
  }
  function modal(title, content) {
    let d = $("#gqModal126");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "gqModal126";
      d.className = "gqModal";
      document.body.append(d);
    }
    d.innerHTML = `<header class="gqModalHead"><h2>${esc(
      title
    )}</h2><button class="gqClose" aria-label="Close">×</button></header><div class="gqModalBody">${content}</div>`;
    $(".gqClose", d).onclick = () => d.close();
    d.showModal();
    return d;
  }
  function share() {
    if (!data?.question) return;
    const url = `${location.origin}/golden-question.html?d=${encodeURIComponent(
        data.assignment.id
      )}`,
      text =
        data.state === "answered" && data.position
          ? `I answered today’s Golden Question on Beyond The Visa and I’m currently ranked #${data.position} this month. Can you beat me?`
          : `Today’s Golden Question on Beyond The Visa. Can you solve it? ${data.question.question_text}`;
    if (navigator.share)
      return navigator
        .share({
          title: "Today’s Golden Question on Beyond The Visa",
          text,
          url,
        })
        .then(() => track("native"))
        .catch(() => {});
    const channels = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
      x: `https://x.com/intent/post?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(
        "Today’s Golden Question"
      )}&body=${encodeURIComponent(text + "\n\n" + url)}`,
    };
    const d = modal(
      "Share Question",
      `<p class="gqNotice"><b>Spoiler warning:</b> Please avoid posting the answer or official explanation.</p><div class="gqShareGrid"><button data-share="copy">Copy link</button>${Object.keys(
        channels
      )
        .map((x) => `<button data-share="${x}">${label(x)}</button>`)
        .join("")}</div>`
    );
    $$("[data-share]", d).forEach(
      (b) =>
        (b.onclick = async () => {
          const ch = b.dataset.share;
          if (ch === "copy") {
            await navigator.clipboard.writeText(url);
            toast("Question link copied");
          } else window.open(channels[ch], "_blank", "noopener,noreferrer");
          track(ch);
        })
    );
  }
  function track(channel) {
    call({
      action: "share",
      daily_question_id: data.assignment.id,
      channel,
      platform: navigator.userAgentData?.platform || navigator.platform,
    }).catch(() => {});
  }
  const boardMarkup = (rows) =>
    rows.length
      ? rows
          .map(
            (x) =>
              `<article class="gqBoardRow ${x.is_me ? "me" : ""}"><b>#${
                x.position
              }</b><span><b>${esc(x.display_name)} ${
                x.previous_winner ? "♛" : ""
              }</b><small>${
                x.location ? " · " + esc(x.location) : ""
              }</small></span><b>${x.points} pts</b><span>${
                x.accuracy
              }%</span><span>${x.current_streak} day</span></article>`
          )
          .join("")
      : "<p>No scores for this month.</p>";
  async function centre() {
    const d = modal(
      "Golden Question Centre",
      '<p class="gqNotice">Loading your competition dashboard…</p>'
    );
    try {
      const h = await call({ action: "history" }),
        rows = h.leaderboard || [],
        history = h.history || [],
        month = new Date().toISOString().slice(0, 7);
      $(
        ".gqModalBody",
        d
      ).innerHTML = `<div class="gqTabs"><button class="active" data-panel="board">Leaderboard</button><button data-panel="history">My history</button><button data-panel="discussion">Discussion</button><button data-panel="rules">Rules</button></div><section class="gqPanel active" data-gq-panel="board"><div class="gqActions"><select data-board-prof aria-label="Leaderboard profession"><option value="nursing">Nursing</option><option value="midwifery">Midwifery</option></select><input data-board-month type="month" value="${month}" aria-label="Leaderboard month"><button class="gqSecondary" data-board-load>View</button></div><div class="gqBoard" data-board-rows>${boardMarkup(
        rows
      )}</div></section><section class="gqPanel gqHistory" data-gq-panel="history">${
        history.length
          ? history
              .map(
                (x) =>
                  `<article><b>${esc(
                    x.question?.question_text || "Golden Question"
                  )}</b><p>${
                    x.review_status === "pending"
                      ? "Pending review"
                      : x.is_correct
                      ? "Correct"
                      : "Incorrect"
                  } · ${x.points_awarded} points</p><small>${new Date(
                    x.submitted_at
                  ).toLocaleString("en-GB")}</small></article>`
              )
              .join("")
          : "<p>Your answered questions will appear here.</p>"
      }</section><section class="gqPanel" data-gq-panel="discussion"><p class="gqNotice">Educational discussion is not a substitute for local policy, senior clinical advice or emergency escalation. Never include patient-identifiable information. Likes do not make advice verified.</p><form class="gqCommentForm"><textarea maxlength="2000" required placeholder="Explain your reasoning or discuss safe practice…"></textarea><button class="gqPrimary">Post</button></form><div data-comments>Loading…</div></section><section class="gqPanel" data-gq-panel="rules">${rulesHtml()}</section>`;
      $("[data-board-prof]", d).value = data.profession;
      $("[data-board-load]", d).onclick = async () => {
        const r = await call({
          action: "leaderboard",
          profession: $("[data-board-prof]", d).value,
          month: $("[data-board-month]", d).value + "-01",
        });
        $("[data-board-rows]", d).innerHTML = boardMarkup(r.leaderboard);
      };
      $$("[data-panel]", d).forEach(
        (b) =>
          (b.onclick = () => {
            $$("[data-panel]", d).forEach((x) =>
              x.classList.toggle("active", x === b)
            );
            $$("[data-gq-panel]", d).forEach((x) =>
              x.classList.toggle(
                "active",
                x.dataset.gqPanel === b.dataset.panel
              )
            );
            if (b.dataset.panel === "discussion") comments(d);
          })
      );
      $(".gqCommentForm", d).onsubmit = async (e) => {
        e.preventDefault();
        const t = $("textarea", e.currentTarget);
        await call({
          action: "discussion",
          operation: "add",
          daily_question_id: data.assignment.id,
          body: t.value,
        });
        t.value = "";
        comments(d);
      };
    } catch (e) {
      $(".gqModalBody", d).innerHTML = `<p class="gqNotice">${esc(
        e.message
      )}</p>`;
    }
  }
  async function comments(d) {
    const box = $("[data-comments]", d);
    try {
      const r = await call({
        action: "discussion",
        operation: "list",
        daily_question_id: data.assignment.id,
      });
      box.innerHTML = r.comments.length
        ? r.comments
            .map(
              (x) =>
                `<article class="gqComment"><b>${esc(x.display_name)} ${
                  x.educator_reviewed
                    ? '<span class="gqPill">Educator Reviewed</span>'
                    : ""
                }</b><p>${esc(x.body)}</p><small>${new Date(
                  x.created_at
                ).toLocaleString(
                  "en-GB"
                )}</small><button class="gqLink" data-like-comment="${
                  x.id
                }">Helpful · ${
                  x.like_count
                }</button><button class="gqLink" data-report-comment="${
                  x.id
                }">Report</button></article>`
            )
            .join("")
        : "<p>No comments yet. Start a safe, educational discussion.</p>";
      $$("[data-like-comment]", box).forEach(
        (b) =>
          (b.onclick = async () => {
            await call({
              action: "discussion",
              operation: "like",
              comment_id: b.dataset.likeComment,
            });
            comments(d);
          })
      );
      $$("[data-report-comment]", box).forEach(
        (b) =>
          (b.onclick = async () => {
            const category = prompt(
              "Report category: unsafe_clinical_advice, harassment, spam, confidentiality_breach or misinformation"
            );
            if (category) {
              await call({
                action: "discussion",
                operation: "report",
                comment_id: b.dataset.reportComment,
                category,
              });
              toast("Report sent for review");
            }
          })
      );
    } catch (e) {
      box.textContent = "Discussion is unavailable.";
    }
  }
  function rulesHtml() {
    return `<h3>Competition terms</h3><ul><li>Eligible registered members may use one account and submit one scored answer per day.</li><li>Correct answers earn 10 points by default. Streak and limited speed bonuses may apply; competition points are not spendable BC.</li><li>Monthly rankings are separate for Nursing and Midwifery.</li><li>Ties are decided by points, correct answers, accuracy, longest streak, then earliest final tied score.</li><li>Winners are verified for eligibility and fair play before 500 BC and any sponsor package are awarded.</li><li>Unsafe activity, duplicate accounts or competition-rule breaches may be reviewed or disqualified.</li><li>Sponsor-package availability and delivery restrictions may vary by location. Winners provide delivery details privately after verification.</li><li>Beyond the Visa may correct or withdraw an inaccurate clinical question with a fair scoring resolution.</li></ul><p class="gqNotice">All questions and discussion are educational. Follow local policy, professional guidance and emergency escalation procedures.</p>`;
  }
  function terms(forSubmit = false) {
    const d = modal(
      "Golden Question rules",
      rulesHtml() +
        `<label class="gqOption"><input type="checkbox" data-terms-check><span>I have read and accept the Golden Question competition terms.</span></label><button class="gqPrimary" data-accept-terms disabled>Accept and continue</button>`
    );
    const c = $("[data-terms-check]", d),
      b = $("[data-accept-terms]", d);
    c.onchange = () => (b.disabled = !c.checked);
    b.onclick = async () => {
      b.disabled = true;
      await call({ action: "accept_terms" });
      d.close();
      toast("Competition terms accepted");
      if (forSubmit) $("#gqAnswerForm")?.requestSubmit();
    };
  }
  function boot() {
    if (!$("#home")) return;
    load();
  }
  window.BTVGoldenQuestion = { load, open: centre };
  addEventListener("btv:home-rendered", boot);
  addEventListener("btv:auth-ready", boot);
  addEventListener("online", () => {
    if ($("#goldenQuestion126")) load();
  });
  if (document.readyState === "loading")
    addEventListener("DOMContentLoaded", () => setTimeout(boot, 400));
  else setTimeout(boot, 400);
})();
