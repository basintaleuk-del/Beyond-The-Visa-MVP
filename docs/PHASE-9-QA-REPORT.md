# Phase 9 — Publish-readiness QA

## Automated gates

- Unit and regression tests for contracts, rewards, learning, Zibur, admin and security.
- Local asset-reference validation for all application entry points.
- Baseline accessibility checks for language, viewport, page titles and image alternatives.
- Security-shell checks for CSP, referrer controls and privacy-safe monitoring.
- Production web build and TypeScript compilation.
- Explicit regression guard for the five existing bottom-navigation destinations.

Run the full gate with `npm run verify`.

## Manual device gates still required

Automated checks cannot certify Google/Apple sign-in, Paystack settlement, push delivery, camera permission, biometric prompts, screen readers or store review behavior. Complete `docs/MOBILE-QA-CHECKLIST.md` on physical Android and iOS devices before public launch.

## Release rule

A failed automated gate blocks packaging. A failed authentication, payment, data-loss, accessibility or privacy device test blocks public release.
