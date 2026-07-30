(() => {
  "use strict";
  if (window.BTVImmigrationNews) return;

  const names = { uk: "United Kingdom", us: "United States", au: "Australia", ca: "Canada", nz: "New Zealand", ie: "Ireland", ae: "United Arab Emirates", sa: "Saudi Arabia" };
  const aliases = { "united kingdom": "uk", uk: "uk", "united states": "us", usa: "us", us: "us", australia: "au", canada: "ca", "new zealand": "nz", ireland: "ie", "united arab emirates": "ae", uae: "ae", "saudi arabia": "sa" };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const date = (value) => value ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Recently";

  function country() {
    let raw = "";
    try { raw = window.country?.()?.name || JSON.parse(localStorage.getItem("btv-profile") || "{}").destination || ""; } catch {}
    return aliases[String(raw).toLowerCase()] || "uk";
  }

  function shell() {
    let dialog = document.getElementById("immigrationNews228");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "immigrationNews228";
    dialog.className = "immigrationNews228";
    dialog.innerHTML = `<div class="newsApp228"><header><button type="button" data-news-close aria-label="Close immigration news">&larr;</button><div class="newsBrand228"><i>BV</i><div><small>BEYOND THE VISA</small><h2>Immigration Newsroom</h2></div></div><div class="newsHeaderStatus228"><i></i><span>Updated daily</span></div></header><main><div class="newsLoading228"><i></i><b>Loading current immigration headlines...</b></div></main></div>`;
    document.body.append(dialog);
    dialog.querySelector("[data-news-close]").onclick = () => { stopBriefing(dialog); dialog.close(); };
    dialog.addEventListener("click", (event) => { if (event.target === dialog) { stopBriefing(dialog); dialog.close(); } });
    return dialog;
  }

  function stopBriefing(dialog) {
    clearInterval(dialog._newsTimer);
    dialog._newsTimer = null;
    window.speechSynthesis?.cancel();
  }

  function showBriefingItem(dialog, index, speak = false) {
    const items = dialog._newsItems || [];
    if (!items.length) return;
    dialog._newsIndex = (index + items.length) % items.length;
    const item = items[dialog._newsIndex];
    const title = dialog.querySelector("[data-news-video-title]");
    const source = dialog.querySelector("[data-news-video-source]");
    const count = dialog.querySelector("[data-news-video-count]");
    const progress = dialog.querySelector("[data-news-video-progress]");
    if (title) title.textContent = item.title;
    if (source) source.textContent = item.publisher || "Immigration newsroom";
    if (count) count.textContent = `${dialog._newsIndex + 1} / ${items.length}`;
    if (progress) { progress.style.animation = "none"; progress.offsetHeight; progress.style.animation = "newsBriefingProgress228 8s linear"; }
    if (speak && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(`${item.title}. Source: ${item.publisher || names[item.country_code] || "Immigration news"}.`);
      speech.rate = 0.92;
      window.speechSynthesis.speak(speech);
    }
  }

  function toggleBriefing(dialog) {
    const button = dialog.querySelector("[data-news-video-play]");
    if (dialog._newsTimer) {
      stopBriefing(dialog);
      button.innerHTML = "<span>&#9654;</span> Play briefing";
      button.setAttribute("aria-pressed", "false");
      return;
    }
    showBriefingItem(dialog, dialog._newsIndex || 0, true);
    dialog._newsTimer = setInterval(() => showBriefingItem(dialog, (dialog._newsIndex || 0) + 1, true), 8000);
    button.innerHTML = "<span>&#10074;&#10074;</span> Pause briefing";
    button.setAttribute("aria-pressed", "true");
  }

  function wireBriefing(dialog) {
    dialog.querySelector("[data-news-video-play]").onclick = () => toggleBriefing(dialog);
    dialog.querySelector("[data-news-video-prev]").onclick = () => showBriefingItem(dialog, (dialog._newsIndex || 0) - 1, Boolean(dialog._newsTimer));
    dialog.querySelector("[data-news-video-next]").onclick = () => showBriefingItem(dialog, (dialog._newsIndex || 0) + 1, Boolean(dialog._newsTimer));
  }

  function closeArticle(dialog) {
    const modal = dialog.querySelector("[data-news-article-modal]");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.innerHTML = "";
    dialog._articleTrigger?.focus?.();
    dialog._articleTrigger = null;
  }

  function openArticle(dialog, index, trigger) {
    const item = dialog._allNewsItems?.[index];
    const modal = dialog.querySelector("[data-news-article-modal]");
    if (!item || !modal) return;
    dialog._articleTrigger = trigger;
    const publisher = item.publisher || names[item.country_code] || "Immigration news";
    modal.innerHTML = `
      <button type="button" class="newsArticleBackdrop228" data-news-article-close aria-label="Close article"></button>
      <article class="newsArticlePanel228" role="document" aria-labelledby="newsArticleTitle228" tabindex="-1">
        <header class="newsArticleHeader228">
          <img src="assets/news/newsroom-header-v232.webp" width="1600" height="800" alt="Healthcare professionals reviewing international migration news">
          <button type="button" data-news-article-close aria-label="Close article">&times;</button>
          <div><small>${esc(publisher)} &middot; ${date(item.published_at)}</small><h2 id="newsArticleTitle228">${esc(item.title)}</h2></div>
        </header>
        <div class="newsArticleBody228">
          <p>${esc(item.summary || "The publisher has not supplied an article extract in its news feed. Use the original article link below to read the full report.")}</p>
          <aside><b>About this report</b><span>This preview contains the complete text supplied through the publisher's news feed. Immigration rules can change quickly, so confirm decisions with the responsible official authority.</span></aside>
        </div>
        <footer class="newsArticleFooter228">
          <div><small>CONTINUE WITH THE PUBLISHER</small><b>${esc(publisher)}</b></div>
          <a href="${esc(item.canonical_url)}" target="_blank" rel="noopener noreferrer">Read original article &nearr;</a>
        </footer>
      </article>`;
    modal.hidden = false;
    modal.querySelectorAll("[data-news-article-close]").forEach((button) => {
      button.onclick = () => closeArticle(dialog);
    });
    modal.onkeydown = (event) => {
      if (event.key === "Escape") closeArticle(dialog);
    };
    modal.querySelector(".newsArticlePanel228")?.focus?.();
  }

  async function load(dialog, selected) {
    stopBriefing(dialog);
    const main = dialog.querySelector("main");
    main.innerHTML = '<div class="newsLoading228"><i></i><b>Loading current immigration headlines...</b></div>';
    try {
      const response = await fetch(`/api/immigration-news?country=${encodeURIComponent(selected)}&limit=30`);
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      const items = data.items || [];
      dialog._allNewsItems = items;
      dialog._newsItems = items.slice(0, 12);
      dialog._newsIndex = 0;
      const first = items[0] || {};
      main.innerHTML = `
        <section class="newsHero228"><div><small>${esc(names[selected].toUpperCase())} INTELLIGENCE DESK</small><h1>Immigration intelligence, clearly delivered.</h1><p>Daily visa, work-permit and pathway reporting for the destinations Beyond The Visa supports.</p></div><aside><b>${items.length}</b><span>current reports</span><small>Refreshed ${date(data.updated_at)}</small></aside></section>
        <nav class="newsCountries228" aria-label="Filter immigration news">${Object.entries(names).map(([code, name]) => `<button type="button" class="${code === selected ? "active" : ""}" data-news-country="${code}" aria-pressed="${code === selected}">${esc(name)}</button>`).join("")}</nav>
        <div class="newsDesk228">
          <section class="newsEditorial228"><header><div><small>LATEST REPORTING</small><h2>News desk</h2></div><span>${esc(names[selected])}</span></header><div class="newsGrid228">
            ${items.map((item, index) => `<button type="button" class="newsCard228 ${index === 0 ? "featured" : ""}" data-news-article="${index}" aria-label="Open article: ${esc(item.title)}"><span class="newsCardImage228" aria-hidden="true"></span><small>${esc(item.publisher || names[item.country_code] || "Immigration news")} &middot; ${date(item.published_at)}</small><h3>${esc(item.title)}</h3><p>${esc(item.summary || "Open this report for available details.")}</p><span>Open article</span></button>`).join("") || '<div class="newsEmpty228"><b>No current headlines found.</b><p>Please check again after the next daily update.</p></div>'}
          </div></section>
          <aside class="newsVideoDesk228"><div class="newsVideoStage228"><div class="newsVideoTop228"><span><i></i> DAILY BRIEFING</span><b data-news-video-count>${items.length ? `1 / ${Math.min(items.length, 12)}` : "0 / 0"}</b></div><div class="newsVideoMark228">BV<span>NEWS</span></div><div class="newsVideoCopy228" aria-live="polite"><small data-news-video-source>${esc(first.publisher || "Immigration newsroom")}</small><h2 data-news-video-title>${esc(first.title || "Your daily immigration briefing")}</h2></div><div class="newsVideoProgressTrack228"><i data-news-video-progress></i></div><div class="newsVideoControls228"><button type="button" data-news-video-prev aria-label="Previous headline">&larr;</button><button type="button" data-news-video-play aria-pressed="false"><span>&#9654;</span> Play briefing</button><button type="button" data-news-video-next aria-label="Next headline">&rarr;</button></div></div><p>Play a hands-free visual and spoken briefing generated on your device from today's current headlines.</p><div class="newsVideoTrust228"><span>&#10003;</span><div><b>Source-led reporting</b><small>Every briefing item links to its original publisher.</small></div></div></aside>
        </div>
        <footer>${esc(data.source_notice || "Verify immigration decisions with the official authority.")}</footer>
        <section class="newsArticleModal228" data-news-article-modal role="dialog" aria-modal="true" aria-label="Immigration news article" hidden></section>`;
      main.querySelectorAll("[data-news-country]").forEach((button) => { button.onclick = () => load(dialog, button.dataset.newsCountry); });
      main.querySelectorAll("[data-news-article]").forEach((button) => { button.onclick = () => openArticle(dialog, Number(button.dataset.newsArticle), button); });
      wireBriefing(dialog);
    } catch (error) {
      main.innerHTML = `<div class="newsEmpty228"><b>News is temporarily unavailable.</b><p>${esc(error.message || "Please try again shortly.")}</p><button type="button" data-news-retry>Try again</button></div>`;
      main.querySelector("[data-news-retry]").onclick = () => load(dialog, selected);
    }
  }

  function open(selected = country()) {
    const dialog = shell();
    if (!dialog.open) dialog.showModal();
    load(dialog, names[selected] ? selected : country());
  }

  window.BTVImmigrationNews = { open, country };
})();
