# Homepage refresh consolidation (v88)

## Root cause

The homepage was being produced by several generations of code at the same time. The original static `#home` markup was visible first, two legacy inline `renderDashboardInsights` functions ran eagerly, and the current dashboard renderer ran later. In addition, `recovery-v63.js` rebuilt the dashboard independently, redirected to `?v=63`, cleared caches, and attempted to register an obsolete worker. `experience-v30.7.js`, `release-v33.js`, and `platform-upgrade-v72.js` also contained delayed or observer-driven homepage mutations.

That combination caused the visible sequence: old homepage, intermediate homepage, final homepage.

## Consolidation

- `index.html` now contains one visible homepage mount and one approved guarded renderer.
- The app shell remains hidden until `BTVHomeBoot()` has rendered the current dashboard.
- Legacy state elements remain in a hidden compatibility container so journey, cost, profile, authentication, and navigation code continue to work without displaying the old interface.
- Obsolete recovery and v30.7 experience scripts are no longer loaded.
- `release-v33.js` no longer mutates homepage tiles through delayed timers or a document-wide observer.
- `platform-upgrade-v72.js` listens for `btv:home-rendered` instead of replacing the dashboard renderer.
- All local index assets use the v88 cache-busting version.
- The service worker uses a v88 cache, removes older Beyond The Visa caches on activation, fetches navigation HTML with `no-store`, and only runtime-caches same-origin static assets.
- The service-worker registration uses `updateViaCache: 'none'` and explicitly checks for an update.

## Preserved functionality

Authentication, onboarding, profile state, journey and cost state, bottom navigation, Beyond Coins, learning modules, Zibur, mentor/success-story features, admin assets, responsive styling, and Capacitor/mobile source files remain present. Older dashboard source modules required by regression coverage remain checked in but are not referenced by `index.html`.

## Validation

- Homepage v88 regression tests: 4/4 passed.
- Release QA and contract validation: passed with zero failures and zero warnings.
- TypeScript: passed (`tsc --noEmit`).
- Production web build: passed and regenerated `www/`.
- Mojibake scan of `web/` and `www/`: clean.
- Full legacy test suite: 60/61 passed. The remaining existing failure is `admin actions are backend protected and audited`, which expects a `btv_has_admin_permission` SQL symbol that is not present in the current v87 migration. This is unrelated to homepage rendering and was not altered as part of this focused fix.

## Backup

The pre-change files are under `backups/homepage-refresh-v88-20260719-002634/`. Obsolete homepage layers and the previous rejected patch are retained under `backups/obsolete-homepage-layers-v88/` for audit only; they are not referenced by the live application.
