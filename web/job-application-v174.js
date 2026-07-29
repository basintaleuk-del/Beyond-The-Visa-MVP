(() => {
  "use strict";
  if (window.BTVJobApplication) return;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[char])
    );
  let returnFocus = null;
  function dialog() {
    let el = document.querySelector("[data-job-application-dialog]");
    if (el) return el;
    el = document.createElement("dialog");
    el.className = "jobApplication174";
    el.dataset.jobApplicationDialog = "";
    document.body.append(el);
    el.addEventListener("click", (event) => {
      if (event.target === el) close();
    });
    el.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    return el;
  }
  function close() {
    const el = dialog();
    if (el.open) el.close();
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  async function token() {
    const result = await window.btvSupabase?.auth.getSession();
    return result?.data?.session?.access_token || "";
  }
  async function submit(job, form) {
    const button = form.querySelector('[type="submit"]'),
      status = form.querySelector("[data-application-status]");
    button.disabled = true;
    button.textContent = "Saving application...";
    status.textContent = "";
    try {
      const data = Object.fromEntries(new FormData(form));
      data.action = "submit_application";
      data.job_id = job.id;
      data.sponsorship_required = form.elements.sponsorship_required.checked;
      data.consent_confirmed = form.elements.consent_confirmed.checked;
      const response = await fetch("/api/jobs", {
          method: "POST",
          headers:{Authorization:`Bearer ${await token()}`,"content-type":"application/json"},
          body: JSON.stringify(data),
        }),
        body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "Application could not be saved.");
    window.dispatchEvent(
      new CustomEvent("btv:coin-activity", {
        detail: {
          code: "verified-job-application",
          relatedId: body.application_id || body.application?.id || null,
        },
      }),
    );
    const official =
        body.employer_submission_required && body.application_url
          ? `<a href="${esc(
              body.application_url
            )}" target="_blank" rel="noopener noreferrer">Continue to the employer's official application</a>`
          : "";
      dialog().innerHTML = `<article class="jobApplicationSuccess174"><button type="button" data-close-application aria-label="Close">&times;</button><span>APPLICATION SAVED</span><h2>${esc(
        job.title
      )}</h2><p>${esc(body.message)}</p>${
        body.employer_submission_required
          ? "<div><b>One final step remains</b><p>This vacancy is controlled by the employer. Beyond The Visa has securely saved your preparation, but the employer will not receive it until you complete their official form.</p></div>"
          : "<div><b>Submitted</b><p>Your on-site application has been recorded.</p></div>"
      }${official}<button type="button" data-close-application>Return to jobs</button></article>`;
      dialog()
        .querySelectorAll("[data-close-application]")
        .forEach((item) => (item.onclick = close));
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
      button.textContent = "Save application";
    }
  }
  async function open(job) {
    if (!job?.id) return;
    returnFocus = document.activeElement;
    const el = dialog(),
      user = (await window.btvSupabase?.auth.getUser())?.data?.user;
    if (!user) {
      window.toast?.("Sign in to apply for this job");
      return;
    }
    const name =
        user.user_metadata?.full_name || user.user_metadata?.name || "",
      email = user.email || "";
    el.innerHTML = `<article><button class="jobApplicationClose174" type="button" data-close-application aria-label="Close application">&times;</button><header><span>APPLY ON BEYOND THE VISA</span><h2>${esc(
      job.title
    )}</h2><p>${esc(
      job.employer || "Employer"
    )}</p></header><p class="jobApplicationNotice174">Complete and save your application here. If the employer controls applications externally, we will clearly show the final official submission step.</p><form><div class="jobApplicationGrid174"><label>Full name<input name="applicant_name" autocomplete="name" maxlength="200" value="${esc(
      name
    )}" required></label><label>Email address<input name="applicant_email" type="email" autocomplete="email" maxlength="320" value="${esc(
      email
    )}" required></label><label>Phone number<input name="applicant_phone" autocomplete="tel" maxlength="80"></label><label>Current country<input name="current_country" autocomplete="country-name" maxlength="120"></label><label>Professional title<input name="professional_title" maxlength="160" placeholder="Registered nurse, midwife..."></label><label>Professional registration<input name="professional_registration" maxlength="300" placeholder="Body, status and number if applicable"></label><label class="wide174">Work authorisation status<textarea name="work_authorisation" maxlength="300" rows="2" placeholder="State your current right-to-work or visa status"></textarea></label><label class="wide174">Experience summary<textarea name="experience_summary" maxlength="3000" rows="4" placeholder="Summarise your most relevant clinical experience"></textarea></label><label class="wide174">Supporting statement<textarea name="supporting_statement" minlength="40" maxlength="8000" rows="8" placeholder="Explain how your skills and experience meet this role" required></textarea></label></div><label class="jobApplicationCheck174"><input name="sponsorship_required" type="checkbox"> I require employer sponsorship or immigration support</label><label class="jobApplicationCheck174"><input name="consent_confirmed" type="checkbox" required> I confirm this information is accurate and may be stored privately in my Beyond The Visa account for this application.</label><p class="jobApplicationStatus174" data-application-status role="alert"></p><footer><button type="button" data-close-application>Cancel</button><button type="submit">Save application</button></footer></form></article>`;
    el.querySelectorAll("[data-close-application]").forEach(
      (item) => (item.onclick = close)
    );
    el.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      submit(job, event.currentTarget);
    };
    if (!el.open) el.showModal();
    el.querySelector("input,textarea")?.focus();
  }
  window.BTVJobApplication = { open, close };
})();
