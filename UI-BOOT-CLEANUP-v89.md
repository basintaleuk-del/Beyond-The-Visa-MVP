# UI Boot Cleanup v89

This patch prevents legacy login, dashboard and theme layers from appearing before the current interface.

## Changes

- Removed `experience-v30.7.js` from the active `index.html` loading path. It registered an old service worker, injected an old stylesheet and repeatedly altered homepage/menu elements.
- Removed `recovery-v63.js` from the active loading path. It cleared caches, redirected the browser to `?v=63`, registered `sw-v63.js`, and rebuilt the old v63 dashboard.
- Stopped `platform-upgrade-v72.js` from wrapping `renderDashboardInsights` or automatically replacing the homepage after delays or wallet events. Platform hub functions remain available through `BTVPlatform`.
- Removed delayed and document-wide MutationObserver rewiring from `release-v33.js`. Its Zibur/job shortcut feature now wires once.
- Added a short boot visibility guard so legacy static markup cannot flash before the current scripts finish. The guard reveals the page immediately after DOM initialisation, with a 2.5-second safety fallback.

## Source of truth

Edit `web/` only. Regenerate `www/` with:

```cmd
npm run build:web
```

## Validation

After replacing the files, run the build and test login, logout, refresh, dashboard, navigation, Beyond Coins, Zibur, mock tests, and admin access.
