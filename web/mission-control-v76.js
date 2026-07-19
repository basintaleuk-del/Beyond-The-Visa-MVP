(function () {
  const svg = {
    clipboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10l1.5 1.5L14 8M9 16h6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>'
  };

  function preserveHeader() {
    const header = document.getElementById('btvTop73');
    if (!header) return;
    const mark = header.querySelector('.brandSymbol');
    if (mark && !mark.querySelector('img')) mark.innerHTML = '<img src="login-logo-v72.png" alt="">';
    const notify = header.querySelector('.notificationHead73');
    if (notify && !notify.querySelector('svg')) notify.innerHTML = svg.bell;
    const menu = header.querySelector('[data-mobile-open]');
    if (menu && !menu.querySelector('svg')) menu.innerHTML = svg.menu;
    const tools = header.querySelector('.headerTools73');
    if (tools && !header.querySelector('.themeHead76')) {
      const theme = document.createElement('button');
      theme.className = 'iconButton73 themeHead76';
      theme.type = 'button';
      theme.innerHTML = svg.moon;
      theme.setAttribute('aria-label', 'Toggle dark mode');
      theme.onclick = function () { document.getElementById('theme')?.click(); };
      tools.insertBefore(theme, header.querySelector('.menuWrap73'));
    }
  }

  function enhanceMissionControl() {
    const root = document.getElementById('dashboardV3');
    const hero = root?.querySelector('.hero73');
    const next = hero?.querySelector('.nextAction73');
    if (!hero || !next) return;
    hero.dataset.missionControl = 'v76';
    hero.setAttribute('aria-label', 'Mission Control overview');
    const progress = hero.querySelector('.heroProgress73');
    if (progress && !progress.getAttribute('aria-label')) progress.setAttribute('aria-label', 'Journey completion');
    if (!next.querySelector('.missionIcon76')) next.insertAdjacentHTML('afterbegin', '<span class="missionIcon76">' + svg.clipboard + '</span>');
  }

  function run() {
    preserveHeader();
    enhanceMissionControl();
  }
  new MutationObserver(function () { window.requestAnimationFrame(run); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', run);
  setTimeout(run, 1200);
})();
