(() => {
  "use strict";
  if (window.__btvMobileJobsNav157) return;
  window.__btvMobileJobsNav157 = true;

  const icon = '<path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h18M10 12v2h4v-2"/>';
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null") || {}; } catch { return {}; } };
  const destination = () => String(read("btv-profile").destination_country || read("btv-profile").destination || read("btv-v1").country || window.state?.country || "uk").trim().toLowerCase();
  const pathFor = (country = destination()) => country === "us" ? "/jobs/usa" : "/jobs";

  function install() {
    const button = document.querySelector('#appShell>nav .nav[data-open="assistant"],#appShell>nav .nav[data-open="jobs"]');
    if (!button) return false;
    if (button.dataset.open !== "jobs") button.dataset.open = "jobs";
    if (button.hidden) button.hidden = false;
    if (button.getAttribute("aria-label") !== "Open jobs for your selected destination") button.setAttribute("aria-label", "Open jobs for your selected destination");
    const label = button.querySelector("small");
    if (label?.textContent !== "Jobs") label.textContent = "Jobs";
    if (!button.querySelector("[data-mobile-jobs-icon] svg")) {
      button.querySelector(".menuIconV72")?.remove();
      Array.from(button.childNodes).filter((node) => node.nodeType === 3).forEach((node) => node.remove());
      button.insertAdjacentHTML("afterbegin", `<span class="menuIconV72" data-mobile-jobs-icon><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></span>`);
      button.dataset.iconV72 = "jobs";
    }
    if (!button.dataset.mobileJobsRoute157) {
      button.dataset.mobileJobsRoute157 = "true";
      button.addEventListener("click", () => {
        const path = pathFor();
        if (location.pathname !== path) history.replaceState(history.state, "", path);
        setTimeout(() => window.renderJobs?.(), 0);
      });
    }
    return true;
  }

  window.BTVMobileJobsNav = { destination, pathFor, install };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", install, { once: true }) : install();
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("btv:destination-changed", install);
})();
