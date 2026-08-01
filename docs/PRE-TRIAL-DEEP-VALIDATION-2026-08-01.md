# Beyond The Visa — second-stage pre-trial production validation

**Audit date:** 1 August 2026

**Branch:** `pre-trial-deep-validation`

**Pre-change checkpoint:** `9fddf2e`

**Production changes made:** none
**Recommendation:** **NOT READY**

This is a read-only production assessment plus local, reversible fixes. No production deployment, DNS mutation, database migration, payment, notification, user-data mutation, or destructive provider call was performed. A usable, production-isolated Vercel Preview was not available, so every acceptance test that requires Preview is explicitly blocked rather than being substituted with production.

## 1. Domain-scope correction

The two previously cited `.co.uk` names are not owned by Beyond The Visa. They are not launch blockers and were not accessed, claimed, configured, monitored, or included in DNS, Vercel, certificate, environment, deployment, or rollback actions. The original audit has been corrected. The owned scope is the two `.org` and two `.uk` origins below.

## 2. Owned-domain results

| Owned origin | DNS/application | HTTPS | redirect/deep-link result | Status |
|---|---|---|---|---|
| `https://beyondthevisa.org` | Beyond The Visa on Vercel | valid | redirects once to `https://www.beyondthevisa.org`; path and query preserved | partial pass |
| `https://www.beyondthevisa.org` | Beyond The Visa on Vercel | valid | canonical live destination; no loop | pass |
| `https://beyondthevisa.uk` | Beyond The Visa on Vercel | valid | serves directly; HTTP upgrades once; path and query preserved | partial pass |
| `https://www.beyondthevisa.uk` | alias is not attached to the Vercel project | invalid hostname/certificate match | HTTPS fails before the application can load | **fail/blocker** |

The reachable origins returned the application for `/`, `/auth/callback?code=test&returnTo=%2Fjourney`, password-recovery parameters, a job-detail deep link, legal content, sitemap, robots, favicon and `/api/push-config`. Curl and browser inspection found no Hostinger or unrelated application and no redirect loop. OAuth code uses the current origin and a constrained return target; a real OAuth round trip was not attempted against production.

Canonical behaviour is not coherent: production `.org` apex redirects to `www`, while canonical, Open Graph, sitemap and robots metadata name the `.org` apex; the `.uk` apex serves a duplicate application instead of converging. The application root source contains canonical metadata, but the lower-level web shell does not. No canonical was changed because approval is required. Decide whether the canonical is apex `.org` or `www.org`, then align Vercel redirects, metadata, OAuth allowlists and sitemaps in one approved change.

## 3. Original-audit regression results

| Check | Result |
|---|---|
| production web build | pass |
| TypeScript | pass through `npm run verify` |
| lint/release contracts | pass |
| unit/integration suite | **495 pass, 0 fail** |
| release QA | 0 failures, 0 warnings |
| broken local asset/link scan | pass |
| SEO audit | 100 SEO / 100 Google readiness / 100 AI readiness; 40 public pages |
| production dependency audit | 0 known vulnerabilities across 37 production packages |
| responsive Chrome checks | pass at 390×844, 412×915, 768×1024, 1440×900 and 1920×1080 |
| route/auth/access contracts | automated contracts pass; real Preview E2E blocked |
| environment inventory | complete; Preview parity fails |

The Careerjet Windows-safe build, Platform Hub `started_at` field, Golden Question canonical metadata, official/optimised logo, mobile target improvements and root-relative asset-validator fix remain present. The root-relative scanners now resolve `/asset` beneath the web root and reject escapes. No regression was found.

## 4. Lighthouse results by route

Required Vercel Preview Lighthouse coverage is **blocked** because the project has no usable Preview deployment or isolated Preview data plane. The table is supplemental local evidence from the rebuilt `www` output, not an acceptance substitute. JSON reports are in `docs/evidence/lighthouse-local`.

| Route/profile | Perf | A11y | Best | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| homepage mobile | 55 | 100 | 96 | 100 | 10.0s | **16.9s** | 100ms | 0 |
| homepage desktop | 69 | 100 | 96 | 100 | 2.2s | **3.4s** | 0ms | 0 |
| Golden Question mobile | 99 | 100 | 100 | 100 | 1.7s | 1.9s | 0ms | 0 |
| Golden Question desktop | 100 | 100 | 100 | 100 | 0.5s | 0.5s | 0ms | 0 |
| privacy mobile | 99 | 100 | 100 | 91 | 0.8s | 2.3s | 0ms | 0 |
| privacy desktop | 100 | 100 | 100 | 91 | 0.2s | 0.5s | 0ms | 0 |

Login, registration, dashboard, jobs/detail, pathways, mentors, learning hub and mock exam require authenticated Preview state and remain blocked. Local Lighthouse does not report field INP. Legal SEO 91 is below the requested 95. Best Practices 96 on the homepage reflects local signed-out Supabase/console behaviour.

## 5. Core Web Vitals and performance

CLS is zero on all six local profiles and TBT is low. The signed-out homepage LCP is unacceptable, especially under mobile throttling. Its approximately 681 KiB transfer includes a large HTML/CSS boot surface and globally loaded resources; Lighthouse estimated roughly 505 KiB unused CSS and 310 KiB unused JavaScript. Correcting this safely requires route/build architecture work, visual regression coverage and Preview measurement. It was not rewritten during this audit.

Low-risk fixes removed zoom suppression, repaired contrast, added the auth main landmark, aligned accessible button names, and retained native controls. They raised local accessibility from 87/91 to 100. No essential content was hidden or delayed to change scores.

## 6. JavaScript bundle analysis

`web/app-content-v171.js` was 1,249,384 bytes. More than 97.8% was a duplicated base64 PNG inside `installBrandArtwork`; the file contains nine feature functions (`buildFeedback`, `buildLegalCentre`, `deleteLocalAccount`, `exportLocalData`, `installBrandArtwork`, `installCookieNotice`, `setRating`, `showPolicy`, `submitFeedback`) and no bundled framework/library module graph, heavy dependency, polyfill or duplicated utility suitable for route splitting.

The guarded optimisation points the artwork at the existing `favicon-512-v281.png`, supplies dimensions, and bumps the deferred loader cache key. Result: **27,631 bytes**, a 1,221,753-byte (97.79%) reduction. The file remains deferred until authenticated application content is needed. All 495 tests pass. Blind splitting was rejected because it would add lifecycle risk without addressing the measured payload.

## 7. Image and video optimisation

The signed-out page exposes 17 active images, no missing alt attributes and no horizontal overflow. Nine dynamically rendered images lack intrinsic `width`/`height`; these include quick-action art, coin art and profile imagery and remain a CLS-hardening follow-up. Several source PNGs are 1.5–2.8 MB and need route-by-route visual approval before WebP/AVIF replacement. Existing WebP artwork was retained.

The welcome video is 37,034,319 bytes and the start guide is 8,856,389 bytes. Both use `preload="metadata"`, `controls` and `playsinline`, do not autoplay, and are created only in their relevant UI. Streaming-compatible recompression and poster review are recommended, but the intentional videos were not removed. No public/legacy asset was deleted because external URLs, database records, emails and caches were not exhaustively provable.

## 8. Load-test methodology and results

Authorised Preview load testing is blocked. No production load was generated. A dependency-free local static-server harness exercised representative static/SPA requests at progressive concurrency with a 511 socket backlog, per-request timeout and failure classification:

| concurrency | RPS | average | p50 | p95 | p99 | error/timeout |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 204.10 | 20.98ms | 18.91ms | 41.00ms | 41.00ms | 0% / 0% |
| 50 | 1,012.90 | 31.81ms | 31.51ms | 41.00ms | 45.71ms | 0% / 0% |
| 100 | 1,244.53 | 48.55ms | 46.09ms | 72.81ms | 73.20ms | 0% / 0% |

These numbers validate only local static delivery. They say nothing reliable about Vercel cold starts, Supabase/database latency or connections, authentication, providers, rate limits, CPU/memory or production capacity. No higher capacity estimate is claimed.

## 9. Job-provider failure tests

The automated suite covers NHS Jobs, Reed, Adzuna, USAJOBS, Jooble and Careerjet contracts with server-only credentials, missing credentials, rejected requests, timeouts, empty/malformed payloads, bounded pagination, deduplication, country mapping, safe URLs, partial provider continuation, cautious expiry and protection against zero-result mass deactivation. Careerjet specifically verifies `Retry-After`, safe structured logs and a maximum-ten controlled sample.

Coverage is fixture/contract based and uneven for every individual 401/403/404/429/500 code across every provider. Invalid live keys and quota-consuming provider calls were not used. The site-level isolation and stale-job safety contracts pass; a full provider-by-provider Preview matrix remains required.

## 10. Supabase failure tests

Automated contracts cover bounded session/profile hydration, missing/expired session handling, retry safety, RLS-protected writes, idempotent wallet/payment actions, owner-scoped records and service-role exclusion from browser code. The application avoids automatic realtime/assistant work during session restore.

Slow/failed database, offline browser, invalid refresh token, failed storage/Edge Function, live RLS denial and rate-limit behaviour were not injected into a real Preview. These acceptance cases are blocked. No production migration or write was executed.

## 11. Migration reconciliation table

Remote migration history contains 50 versions through `20260731011000`. Eleven later local migrations are absent from that history, although read-only schema markers show most features already exist remotely.

| local migration | read-only remote evidence | classification/action |
|---|---|---|
| `20260731020000_live_international_jobs_v251` | expected objects present | applied under different version; checksum/manual history repair |
| `20260731120000_professional_profile_v252` | seven columns and expected function signature present | applied under different version |
| `20260731123000_usajobs_integration_v253` | objects present | applied under different version |
| `20260731133000_adzuna_jobs_integration_v254` | objects present | applied under different version |
| `20260731150000_reed_jobs_integration_v255` | 54 jobs, partial index and superseding cross-source unique index; original full index absent | superseded/partially applied; manual review, never replay blindly |
| `20260801120000_featured_pathways_v256` | objects present | applied under different version |
| `20260801123000_pathway_alerts_v257` | objects present | applied under different version |
| `20260801143000_signup_wallet_v258` | objects present | applied under different version |
| `20260801145133_restrict_security_definer_execution` | anonymous execution remains on admin/RPC functions; policy/search-path hardening absent | **genuinely missing; security blocker** |
| `20260801170000_jooble_jobs_v259` | objects present | applied under different version |
| `20260801190000_careerjet_jobs_v260` | objects present | applied under different version |

Ordered Preview-branch plan:

1. Obtain approval for a paid Supabase branch and create it with no production traffic.
2. Export branch schema, migration history and object-definition checksums.
3. Compare every migration statement and dependency with the branch object definitions.
4. Mark only byte/semantically confirmed already-present migrations as applied on the branch; do not replay their DDL.
5. Reconcile Reed manually against the superseding uniqueness model.
6. Apply only the hardening migration to the reconciled branch.
7. Run security/performance advisors and auth, wallet, admin, mentor and job regression suites.
8. Verify anonymous denial, authenticated intended RPCs and service-role operations.
9. Execute and validate the prepared inverse in a disposable branch, then recreate/retest hardening.
10. Only after review, schedule a separate approved production change window.

Security advisors currently flag public/anonymous SECURITY DEFINER exposure, mutable search paths, public-extension placement and storage-policy concerns. The inverse is prepared at `supabase/rollback/20260801145133_restrict_security_definer_execution.rollback.sql`; it is emergency-only because it deliberately reopens the prior permissions.

## 12. Authentication tests

The automated auth contracts pass for callback-before-profile ordering, single-flight listener/login, bounded recovery, session restoration, account cache isolation, protected navigation and duplicate-profile prevention. Owned-origin callback/deep-link parameters survive reachable-domain routing.

Dedicated Preview accounts and providers were unavailable. Email verification/reset, real Google/Facebook sign-up and return, cancellation/missing-email errors, token refresh across tabs, onboarding persistence, account linking/deletion and cross-origin callbacks are **blocked**, not passed. No production account was created or deleted.

## 13. Payment and Beyond Coins tests

Automated tests validate authoritative status/amount/currency, server verification, client non-authority, failed-payment zero credit, idempotent callbacks/webhooks, exact-once coin credit, wallet row locks, duplicate-attempt prevention, insufficient-balance ordering, owner RLS and idempotent refund ledger entries. All pass.

No isolated Paystack test credentials exist in Preview, so checkout cancellation/decline/abandonment/timeouts, invalid signatures, delayed/interrupted returns, renewal and refund UI remain blocked. No real card, settlement, refund or value transfer occurred.

## 14. Mentor booking concurrency

Static SQL/contracts show `btv_book_mentor` locks availability with `SELECT … FOR UPDATE` and marks the slot booked within the transaction, which is the correct single-winner design. Owner scoping and protected booking operations pass automated tests. A real simultaneous two-client race, mentor approval/content upload, messaging and payment-state E2E need Preview and remain blocked.

## 15. Notification resilience

Automated tests cover preferences, duplicate suppression, failed dispatch isolation, digests, invalid/revoked push endpoints and protected scheduler/manual endpoints. No email, push or bulk message was sent. Real provider retry/delivery evidence remains a safe-Preview requirement.

## 16. Browser and device results

Current Chrome passed visual/overflow checks at iPhone, Android, tablet, desktop and high-resolution desktop sizes; OAuth buttons and auth forms render correctly. Automated CSS/contracts cover dark mode, reduced motion, service-worker/offline and responsive mentor/payment components. Managed-browser keyboard focus could not conclusively enter the page, so manual keyboard acceptance is outstanding. Edge, Firefox, Safari, rotation, mobile keyboard, real uploads, back navigation and native payment windows were not available and are blocked.

## 17. Accessibility results

Local Lighthouse accessibility is 100 for all six tested route/profile combinations after fixes. Browser inspection confirms a main landmark, natural social-button accessible names, browser zoom, zero missing alt text and no horizontal overflow. Auth language/input/submit targets are at least 44 px; the visible 24 px consent checkbox is wrapped by a larger native label.

Still required: manual logical tab order, visible focus across every screen, Escape/modal focus trap/return, error summaries/live regions, skip-link judgement, screen-reader loading announcements and all authenticated routes. Nine active images need intrinsic dimensions. There is no evidence of a remaining critical automated failure, but manual acceptance is incomplete.

## 18. Security findings

- `npm audit --omit=dev`: 0 known production vulnerabilities.
- No source maps are present. One tracked `.env.example` contains placeholders, not runtime credentials.
- Secret-pattern candidates are limited to `.env.example` and two installation/instruction files; four historical commits introduce or modify those examples/instructions. They require human value-level confirmation before release, but no secret value is reproduced here.
- Browser contracts prevent service-role credentials and provider secrets from client bundles.
- Return targets are constrained by current-origin/internal-route logic; no confirmed open redirect was found by static review.
- Security headers include referrer and permissions policies; production supplies HSTS, frame and MIME protections. The meta CSP still permits `unsafe-inline`, leaving residual XSS impact risk.
- Current live Supabase grants expose sensitive SECURITY DEFINER/admin functions to anonymous execution until the staged hardening migration is reconciled and tested.
- Storage advisor findings, file MIME/size enforcement, IDOR/account-enumeration probes, webhook/cron live enforcement and CSP removal of inline code need isolated Preview testing.

No harmful penetration testing was performed.

## 19. Trial-user acceptance checklist/results

| persona | starting point and steps | expected | actual/evidence | status |
|---|---|---|---|---|
| new international nurse | Preview registration → verify → onboard → choose country → dashboard | one profile/wallet, persisted country | static contracts pass; no Preview account | blocked |
| returning user | login → restore dashboard → jobs/save | stable session/state | restoration contracts pass | partial |
| mentor | register → approval → service/availability → booking | protected mentor workflow | SQL/UI contracts only | blocked |
| administrator | admin login → users/jobs/mentor actions | permissioned and audited | backend-enforcement tests pass; live role not used | partial |
| premium user | verified purchase → premium/exam → ledger | one unlock/debit | idempotency contracts pass; no test checkout | partial |
| failed payment | decline/timeout → return | no coins/unlock | failure contracts pass; no browser checkout | partial |
| expired session | protected deep link → refresh/login → intended return | no loop, safe return | contracts pass; real token unavailable | partial |
| no-jobs country | select country → search/filter | safe empty state, other features usable | provider/country contracts pass | partial |
| mobile-only | auth/navigation/jobs/mentor/payment at 390/412 px | no overflow, usable targets | signed-out Chrome visual pass | partial |
| slow internet | throttled start → recovery | clear loading, no false success | Lighthouse shows homepage LCP 16.9s | **fail** |

Screenshots were inspected in the managed browser; machine-readable Lighthouse evidence is committed. Stateful persona evidence needs dedicated Preview accounts and approved screenshots.

## 20. Files changed

- Corrected original audit report.
- Root/web viewport and auth accessibility sources; auth CSS/social names; Golden Question contrast.
- `app-content-v171.js` and its guarded optimiser/test.
- Web build, root-relative asset validators and package scripts.
- Local validation server/load harness and Lighthouse JSON evidence.
- Guarded accessibility-fix script.
- Emergency inverse hardening migration.
- This deep-validation report.

The final Git commit is the authoritative file list.

## 21. Files removed

No repository file or public asset was removed; therefore no unused-file claim is made. Audit-only temporary Chrome/Lighthouse profiles are deleted before handoff and are not application files.

## 22. Dependencies changed

None. Lighthouse 13.3.0 was invoked ephemerally and was not added to `package.json` or the lockfile.

## 23. Unresolved risks

1. `www.beyondthevisa.uk` has no valid Vercel alias/certificate.
2. Canonical origin behaviour conflicts between redirects and metadata.
3. No production-isolated, environment-complete Preview exists.
4. Homepage mobile performance is poor; authenticated route performance is unknown.
5. Required Preview Lighthouse, load, auth, payment, booking-race, outage and migration tests are blocked.
6. Migration history drift is material; Reed differs and the hardening migration is missing.
7. Live anonymous SECURITY DEFINER exposure remains until an approved, tested hardening release.
8. Firefox/Safari/manual keyboard and complete persona UAT are incomplete.
9. Large media and missing intrinsic image dimensions remain performance follow-ups.
10. CSP still depends on inline scripts/styles.

## 24. Preview environment requirements

Vercel currently has only Production deployments in the inspected history. Preview has some provider/VAPID configuration but lacks a complete safe app environment. Before testing, configure value-free equivalents for:

- Preview Supabase URL and publishable/anon key;
- a Preview-only service-role key bound only to the Preview Supabase branch;
- Preview cron secret;
- VAPID public/private configuration;
- minimal provider test credentials or deterministic mocks;
- Paystack test public/secret/webhook configuration;
- Preview application URL and owned callback allowlists.

Never copy production service-role/payment credentials into Preview. Add a guard that fails the Preview build if its Supabase project reference equals production.

## 25. Exact deployment checklist

This checklist is for a later approved window; no step was executed here.

1. Approve the canonical `.org` form and the `www.uk` alias/certificate repair.
2. Create an isolated Supabase branch and complete the ten-step reconciliation plan above.
3. Build an environment-complete Vercel Preview connected only to that branch and Paystack test mode.
4. Run all 12 requested Lighthouse routes mobile/desktop and resolve critical failures; rerun full authenticated browser/device/accessibility UAT.
5. Run mocked 10/50/100 Preview load and provider/outage matrices within quotas.
6. Complete real Preview auth, payment idempotency, mentor race, notification and ten-persona acceptance.
7. Confirm security/performance advisors and anonymous/authenticated/service-role grants after hardening.
8. Capture database backup, migration history/schema checksums, current Vercel deployment ID, environment-name inventory and domain configuration.
9. Obtain explicit release approval, freeze unrelated changes, and tag the reviewed commit.
10. Apply the reviewed migration/history operations in the approved order; stop on any checksum mismatch.
11. Deploy the exact reviewed commit, attach only owned aliases, and apply the approved canonical redirects.
12. Smoke test all four owned origins, callbacks, deep links, legal/SEO, auth, a Paystack test path where applicable and critical APIs.
13. Monitor errors, auth/payment/job metrics and database advisors through the trial window.

## 26. Exact rollback procedure

1. Declare rollback; stop new releases, imports, cron and payment/notification test dispatch without deleting data.
2. Record the failing deployment, timestamps, logs and database state.
3. Promote the previously captured known-good Vercel deployment; restore only the previously documented owned-domain alias/redirect configuration.
4. If database hardening alone caused a confirmed outage, snapshot grants/policies, then apply the reviewed emergency inverse `supabase/rollback/20260801145133_restrict_security_definer_execution.rollback.sql`. It intentionally reopens permissions, so use only with security approval.
5. Do not undo migrations that may contain user data. Restore data only from the approved backup through a separate incident procedure.
6. Verify owned-origin TLS/redirects, auth/session return, wallet/payment idempotency, bookings, jobs, notifications and admin denial.
7. Revoke/rotate any exposed credential, preserve evidence and document the incident before reopening the trial.

## 27. Final recommendation

**NOT READY**

The local code baseline is materially healthier: the full suite passes, the 1.22 MB duplicated artwork payload is removed, accessibility reaches 100 on the tested local routes, dependency audit is clean, and rollback/reconciliation artefacts exist. Production-trial acceptance is nevertheless blocked by the broken owned `www.uk` origin, canonical ambiguity, missing isolated Preview/parity, poor homepage mobile LCP, unreconciled Supabase history and untested hardening/auth/payment/stateful flows.

Do not deploy. Create the isolated Preview and Supabase branch, resolve the owned-domain/canonical decisions with approval, then execute the blocked acceptance matrix and request a new readiness decision.
