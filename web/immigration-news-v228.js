(() => {
  "use strict";
  if (window.BTVImmigrationNews) return;

  const names = { uk: "United Kingdom", us: "United States", au: "Australia", ca: "Canada", nz: "New Zealand", ie: "Ireland", ae: "United Arab Emirates", sa: "Saudi Arabia" };
  const aliases = { "united kingdom": "uk", uk: "uk", "united states": "us", usa: "us", us: "us", australia: "au", canada: "ca", "new zealand": "nz", ireland: "ie", "united arab emirates": "ae", uae: "ae", "saudi arabia": "sa" };
  const voiceLocales = { uk: "en-GB", ie: "en-GB", us: "en-US", ca: "en-CA", au: "en-AU", nz: "en-NZ", ae: "en-GB", sa: "en-GB" };
  const naturalVoiceNames = ["sonia online", "ryan online", "libby online", "jenny online", "aria online", "guy online", "natasha online", "william online", "google uk english", "google us english", "samantha", "daniel", "serena", "karen", "moira"];
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
    dialog.innerHTML = `<div class="newsApp228"><header><button type="button" data-news-close aria-label="Close immigration news">&larr;</button><div class="newsBrand228"><i><img src="favicon-192-v281.png" width="44" height="44" style="display:block;object-fit:contain" alt="Beyond The Visa"></i><div><small>BEYOND THE VISA</small><h2>Immigration Newsroom</h2></div></div><div class="newsHeaderStatus228"><i></i><span>Updated daily</span></div></header><main><div class="newsLoading228"><i></i><b>Loading current immigration headlines...</b></div></main></div>`;
    document.body.append(dialog);
    dialog.querySelector("[data-news-close]").onclick = () => { stopBriefing(dialog); dialog.close(); };
    dialog.addEventListener("click", (event) => { if (event.target === dialog) { stopBriefing(dialog); dialog.close(); } });
    return dialog;
  }

  function stopBriefing(dialog) {
    clearTimeout(dialog._newsTimer);
    dialog._newsTimer = null;
    dialog._newsPlaying = false;
    dialog._newsSpeechToken = (dialog._newsSpeechToken || 0) + 1;
    window.speechSynthesis?.cancel();
  }

  function availableVoices() {
    return "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
  }

  function preferredVoice(item) {
    const locale = voiceLocales[item?.country_code] || "en-GB";
    const language = locale.split("-")[0];
    const voices = availableVoices().filter((voice) => String(voice.lang || "").toLowerCase().startsWith(language));
    return voices.sort((a, b) => {
      const score = (voice) => {
        const name = String(voice.name || "").toLowerCase();
        const exactLocale = String(voice.lang || "").toLowerCase() === locale.toLowerCase() ? 30 : 0;
        const premium = naturalVoiceNames.some((candidate, index) => name.includes(candidate)) ? 80 - naturalVoiceNames.findIndex((candidate) => name.includes(candidate)) : 0;
        const robotic = /compact|espeak|festival/.test(name) ? -80 : 0;
        return exactLocale + premium + robotic + (voice.default ? 5 : 0);
      };
      return score(b) - score(a);
    })[0] || null;
  }

  function spokenHeadline(item) {
    const publisher = item.publisher || names[item.country_code] || "the Immigration Newsroom";
    const title = String(item.title || "").replace(/\bUK\b/g, "U K").replace(/\bUS\b/g, "U S").replace(/\bUSA\b/g, "U S A").replace(/\bNHS\b/g, "N H S");
    return `Here is your next update. ${title}. This report comes from ${publisher}.`;
  }

  function updateVoiceLabel(dialog, voice) {
    const label = dialog.querySelector("[data-news-voice]");
    if (!label) return;
    label.textContent = voice ? `Natural voice · ${voice.name.replace(/Microsoft|Google|Online|\(Natural\)/gi, "").replace(/\s+/g, " ").trim()}` : "Best available device voice";
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
    const duration = Math.max(9, Math.min(22, Math.ceil(spokenHeadline(item).split(/\s+/).length / 2.25) + 2));
    if (progress) { progress.style.animation = "none"; progress.offsetHeight; progress.style.animation = `newsBriefingProgress228 ${duration}s linear`; }
    if (speak && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const token = ++dialog._newsSpeechToken;
      const speech = new SpeechSynthesisUtterance(spokenHeadline(item));
      const voice = preferredVoice(item);
      if (voice) speech.voice = voice;
      speech.lang = voice?.lang || voiceLocales[item.country_code] || "en-GB";
      speech.rate = 0.96;
      speech.pitch = 1.02;
      speech.volume = 1;
      updateVoiceLabel(dialog, voice);
      const continueBriefing = () => {
        if (!dialog._newsPlaying || token !== dialog._newsSpeechToken) return;
        clearTimeout(dialog._newsTimer);
        dialog._newsTimer = setTimeout(() => showBriefingItem(dialog, (dialog._newsIndex || 0) + 1, true), 900);
      };
      speech.onend = continueBriefing;
      speech.onerror = continueBriefing;
      window.speechSynthesis.speak(speech);
    } else if (speak && dialog._newsPlaying) {
      clearTimeout(dialog._newsTimer);
      dialog._newsTimer = setTimeout(() => showBriefingItem(dialog, (dialog._newsIndex || 0) + 1, true), duration * 1000);
    }
  }

  function toggleBriefing(dialog) {
    const button = dialog.querySelector("[data-news-video-play]");
    if (dialog._newsPlaying) {
      stopBriefing(dialog);
      button.innerHTML = "<span>&#9654;</span> Play briefing";
      button.setAttribute("aria-pressed", "false");
      return;
    }
    dialog._newsPlaying = true;
    showBriefingItem(dialog, dialog._newsIndex || 0, true);
    button.innerHTML = "<span>&#10074;&#10074;</span> Pause briefing";
    button.setAttribute("aria-pressed", "true");
  }

  function wireBriefing(dialog) {
    dialog.querySelector("[data-news-video-play]").onclick = () => toggleBriefing(dialog);
    dialog.querySelector("[data-news-video-prev]").onclick = () => showBriefingItem(dialog, (dialog._newsIndex || 0) - 1, Boolean(dialog._newsPlaying));
    dialog.querySelector("[data-news-video-next]").onclick = () => showBriefingItem(dialog, (dialog._newsIndex || 0) + 1, Boolean(dialog._newsPlaying));
    updateVoiceLabel(dialog, preferredVoice(dialog._newsItems?.[0]));
    if ("speechSynthesis" in window) window.speechSynthesis.addEventListener?.("voiceschanged", () => updateVoiceLabel(dialog, preferredVoice(dialog._newsItems?.[dialog._newsIndex || 0])), { once: true });
  }

  function closeArticle(dialog) {
    const modal = dialog.querySelector("[data-news-article-modal]");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.innerHTML = "";
    dialog._articleTrigger?.focus?.();
    dialog._articleTrigger = null;
  }

  function safeArticleUrl(value) {
    try {
      const url = new URL(value, location.href);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function articleSummary(item, publisher) {
    const raw = String(item.summary || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;|&#34;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
    const title = String(item.title || "").replace(/\s+/g, " ").trim();
    const publisherSuffix = new RegExp(`\\s+${String(publisher).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const cleaned = raw.replace(publisherSuffix, "").trim();
    const comparable = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (cleaned.length > title.length + 24 && comparable(cleaned) !== comparable(title)) {
      return {
        text: cleaned.slice(0, 1800),
        notice: "This source-led summary uses the description supplied in the publisher feed.",
      };
    }
    return {
      text: `${publisher} identifies this as a report about “${title}”. Its feed did not supply a fuller article synopsis, so Beyond The Visa has not invented or inferred details that are not present in the source.`,
      notice: "Open the original report for the publisher’s complete facts, context and any later corrections.",
    };
  }

  function openArticle(dialog, index, trigger) {
    const item = dialog._allNewsItems?.[index];
    const modal = dialog.querySelector("[data-news-article-modal]");
    if (!item || !modal) return;
    dialog._articleTrigger = trigger;
    const publisher = item.publisher || names[item.country_code] || "Immigration news";
    const articleUrl = safeArticleUrl(item.canonical_url);
    if (!articleUrl) return;
    const summary = articleSummary(item, publisher);
    modal.innerHTML = `
      <button type="button" class="newsArticleBackdrop228" data-news-article-close aria-label="Close article"></button>
      <article class="newsArticlePanel228" role="document" aria-labelledby="newsArticleTitle228" tabindex="-1">
        <header class="newsArticleBrowserBar228">
          <img src="assets/news/newsroom-header-v232.webp" width="1600" height="800" alt="Healthcare professionals reviewing international migration news">
          <div><small>${esc(publisher)} &middot; ${date(item.published_at)}</small><h2 id="newsArticleTitle228">${esc(item.title)}</h2></div>
          <button type="button" data-news-article-close aria-label="Close article">&times;</button>
        </header>
        <div class="newsArticleReader228">
          <section>
            <small>ARTICLE SUMMARY</small>
            <h3>What this report covers</h3>
            <p>${esc(summary.text)}</p>
          </section>
          <aside aria-label="Article source details">
            <div><small>DESTINATION</small><b>${esc(names[item.country_code] || names[country()] || "International")}</b></div>
            <div><small>PUBLISHER</small><b>${esc(publisher)}</b></div>
            <div><small>PUBLISHED</small><b>${date(item.published_at)}</b></div>
          </aside>
          <div class="newsArticleNotice228"><span aria-hidden="true">&#10003;</span><p><b>Transparent, source-led reading</b>${esc(summary.notice)}</p></div>
        </div>
        <footer class="newsArticleFooter228">
          <div><small>CONTINUE AT THE ORIGINAL SOURCE</small><b>${esc(publisher)}</b><span>The full report opens securely outside this reader.</span></div>
          <a href="${esc(articleUrl)}" target="_blank" rel="noopener noreferrer">Read original article &nearr;</a>
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
          <aside class="newsVideoDesk228"><div class="newsVideoStage228"><div class="newsVideoTop228"><span><i></i> DAILY BRIEFING</span><b data-news-video-count>${items.length ? `1 / ${Math.min(items.length, 12)}` : "0 / 0"}</b></div><div class="newsVoiceQuality228"><span aria-hidden="true">◉</span><b data-news-voice>Preparing natural voice</b></div><div class="newsVideoMark228"><img src="favicon-192-v281.png" width="64" height="64" style="display:block;object-fit:contain" alt="Beyond The Visa"><span>NEWS</span></div><div class="newsVideoCopy228" aria-live="polite"><small data-news-video-source>${esc(first.publisher || "Immigration newsroom")}</small><h2 data-news-video-title>${esc(first.title || "Your daily immigration briefing")}</h2></div><div class="newsVideoProgressTrack228"><i data-news-video-progress></i></div><div class="newsVideoControls228"><button type="button" data-news-video-prev aria-label="Previous headline">&larr;</button><button type="button" data-news-video-play aria-pressed="false"><span>&#9654;</span> Play briefing</button><button type="button" data-news-video-next aria-label="Next headline">&rarr;</button></div></div><p>Play a calm, naturally paced briefing generated securely on your device from today's current headlines.</p><div class="newsVideoTrust228"><span>&#10003;</span><div><b>Source-led reporting</b><small>Every briefing item links to its original publisher.</small></div></div></aside>
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
