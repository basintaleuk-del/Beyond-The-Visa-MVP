# Beyond The Visa pre-trial production audit

Date: 2026-08-01
Branch: `pre-trial-production-audit`
Pre-audit checkpoint: `0c8df18`
Source commit before checkpoint: `0fb4b0263b8c8a81c9505bd8badb7f8dabbbe712`

## Executive decision

The codebase is locally release-verifiable, but production deployment is **not yet recommended**. The code, build, tests, responsive layout, accessibility guardrails, SEO, and core security contracts pass. Two operational blockers remain:

1. The linked Supabase production database has material migration-history drift: 50 remote migrations versus 83 local files, with 11 local migrations newer than the latest remote version.
2. The staged Supabase hardening migration has deliberately not been applied. It must be tested on a Supabase branch/preview database after migration reconciliation.

Correction added 2026-08-01: domains ending in `beyondthevisa.co.uk` are not owned by Beyond The Visa. They are outside project scope and are not launch blockers, redirect targets, monitoring targets, or configuration candidates. The owned domains are `beyondthevisa.org`, `www.beyondthevisa.org`, `beyondthevisa.uk`, and `www.beyondthevisa.uk`.

No deployment, production DDL, production data mutation, DNS update, environment-value change, provider import, payment, notification dispatch, or destructive cleanup was performed.

## Safety and baseline

- The pre-existing dirty worktree was preserved in checkpoint commit `0c8df18` before audit edits.
- Baseline runtime: Node `24.18.0`, npm `11.16.0`; package requirement is Node `>=22`.
- Baseline build: failed in the Careerjet esbuild CLI path on Windows.
- Baseline tests: 2 stale Jobs-copy assertions failed.
- Baseline lint: 4 false-positive root-relative asset errors; one 1,220 KB JavaScript warning.
- Baseline typecheck: passed.
- Baseline SEO: 98/100/100; Golden Question lacked a canonical URL.
- Baseline deployable web directory: 82,013,717 bytes across 339 files.
- Baseline largest assets: 37.0 MB welcome video, 8.9 MB start guide, 2.8 MB Beyond Coin art, 2.25 MB legacy brand logo, 2.17 MB premium emblem, and 2.15 MB site logo.

## Route and feature inventory

Static application routes verified present:

- `/`, `/admin.html`, `/adult-nursing.html`
- `/auth/callback/`, `/auth-callback.html`
- `/cbt.html`, `/nclex.html`, `/numeracy.html`, `/osce.html`
- `/ielts.html`, `/ielts-mock.html`, `/exam-prep.html`
- `/golden-question.html`
- `/cookie-policy.html`, `/privacy-policy.html`, `/terms-and-conditions.html`

Vercel rewrites verified for authenticated application screens and APIs:

- `/jobs`, `/jobs/:id`, `/jobs/usa`, `/jobs/usa/:id`
- `/opportunities`, `/journey/tools/cost-estimator`
- `/clinical-learning/:slug`
- protected job-provider connection, sample, and import endpoints

The automated suite covers password/OAuth callback handling, session restoration, profile and destination persistence, Journey, Jobs and all configured providers, job applications and saves, notifications, mentors/bookings, Success Stories, community moderation, Learning, CBT/NCLEX/IELTS/OSCE/Numeracy, secure mocks, Beyond Coins and Paystack idempotency, Golden Question, admin permissions, RLS contracts, mobile navigation, legal flows, offline/service-worker behaviour, and Zibur safety. Real Google/Facebook sign-in, email delivery, payment settlement/refund, push delivery, and destructive admin actions were not executed because no isolated production test identities or payment sandbox were provided.

## Confirmed defects fixed

- Replaced the Windows-fragile Careerjet esbuild CLI command with a deterministic JavaScript transform script.
- Corrected release QA path resolution so root-relative public URLs resolve under the web root instead of the filesystem root.
- Updated four stale provider/cache assertions and added a production-schema regression test.
- Corrected Platform Hub's live `btv_mock_sessions` query from nonexistent `created_at` to `started_at`; the production log contained two matching errors.
- Cache-busted the corrected Platform Hub script and mobile accessibility stylesheet.
- Added a canonical URL, Open Graph URL, current brand image, and clean UTF-8 punctuation to both Golden Question source variants.
- Replaced visible placeholder letter marks across auth callback, admin, wallet, booking, learning, immigration, notifications, Platform Hub, Success Stories, and offline views with the official Beyond The Visa logo.
- Replaced multi-megabyte logo references on critical surfaces with the 25 KB/147 KB official favicon variants and supplied intrinsic dimensions.
- Raised compact mobile controls to 44 px minimum targets and verified no horizontal overflow at 390 px.
- Documented every environment key read by the code, using placeholders only.

## Branding and performance

Official logo assets used on active surfaces:

- `favicon-192-v281.png` — 24,954 bytes
- `favicon-512-v281.png` — 147,433 bytes

Critical-path savings:

- Sign-in/logo path: approximately 1.54 MB down to approximately 172 KB, saving about 1.37 MB before caching.
- Authenticated header mark: 2.25 MB down to 25 KB, saving about 2.22 MB on that request.
- Explicit image dimensions reduce layout movement on the updated surfaces.

Final deployable web directory: 82,018,374 bytes across 337 files. The total directory is 4,657 bytes larger because of corrected metadata/code, while critical-path image transfer is materially lower. The two videos account for about 45.9 MB and remain intentional, referenced content.

Known performance debt:

- `app-content-v171.js` is 1,220 KB and remains the sole release-QA size warning. Splitting it is recommended after the trial behind regression coverage; doing so now would be a high-blast-radius architectural rewrite.
- Several large visual assets remain referenced and should be converted to responsive WebP/AVIF variants after visual approval.

## SEO, accessibility, and browser verification

- Final SEO audit: SEO 100, Google readiness 100, AI readiness 100.
- 40 public pages, no missing metadata, duplicate titles, or duplicate descriptions.
- `/admin.html` remains intentionally excluded from indexing.
- Sitemap generation completed with 40 public pages and 2 RSS items.
- Desktop 1440×900: homepage/application and admin surfaces render without horizontal overflow.
- Mobile 390×844: no horizontal overflow and no visible interactive control below 40 px after the fix.
- Dark mode toggled successfully: dark body background and light foreground applied without overflow.
- Golden Question canonical and UTF-8 rendering verified in-browser.
- Admin portal renders the official logo and complete navigation.
- The startup watchdog emits a misleading warning after 12 seconds even when the UI has already revealed. It is low risk but should be made conditional in a later refactor of the large inline boot block.

## Supabase audit

Linked project: `wuvgktmzkzrdvbpqfmek`, `eu-west-1`, Postgres 17.6.1, `ACTIVE_HEALTHY`.

- All inventoried public application tables have RLS enabled.
- Production holds 50 recorded migrations; local source contains 83 migration files.
- Latest recorded production version: `20260731011000_notification_digests_v250`.
- Eleven local files are newer, including international jobs, profile persistence, USAJOBS, Adzuna, Reed, qualified alerts, signup-wallet repair, Jooble, Careerjet, and this audit migration.
- The migration history must be reconciled by exact version/name/content before any push. Do not bulk-apply the local directory to production.

Security advisor baseline: 150 findings:

- 2 RLS-enabled tables without policies (internal edge email/usage event tables)
- 4 mutable function search paths
- 1 extension installed in `public`
- 1 public bucket listing policy
- 43 SECURITY DEFINER functions executable by `anon`
- 98 SECURITY DEFINER functions executable by `authenticated`
- leaked-password protection disabled in Auth

Performance advisor baseline: 464 findings:

- 145 unindexed foreign keys
- 78 `auth.uid()`/RLS init-plan warnings
- 59 unused indexes
- 181 multiple-permissive-policy warnings
- 1 duplicate index

Audit migration `20260801145133_restrict_security_definer_execution.sql` is staged but unapplied. It:

- revokes direct client execution from trigger-only SECURITY DEFINER functions;
- removes anonymous execution from identified member/admin RPCs while retaining authenticated/service-role access;
- pins safe search paths on four advisor-flagged functions;
- removes anonymous listing from the unused public `profile-photos` policy.

All 44 function signatures referenced by the migration resolve in the live database; no DDL was executed during that validation.

The 98 authenticated SECURITY DEFINER findings were not blanket-revoked: many are intentional authenticated RPC boundaries and require function-by-function authorisation tests. Performance findings were not bulk-fixed because speculative indexes/policy rewrites during migration drift can regress writes or access control.

Last-24-hour logs:

- Auth logs sampled were successful `/user` requests.
- Edge Function logs sampled were primarily successful subscription-status calls plus expected unauthenticated `401` responses.
- Postgres logged two `btv_mock_sessions.created_at` failures; the client query is fixed in this branch.
- Postgres logged rejected anonymous calls to `btv_coin_wallet_snapshot`. Live ACL verification confirms `anon=false`, `authenticated=true`, and `service_role=true`; the security boundary is correct, though expired/pre-auth clients create noise.

Before trial:

1. Create or use a Supabase preview branch.
2. Reconcile migration history and apply only missing, reviewed migrations in order.
3. Apply the audit migration to preview; rerun security/performance advisors and all auth/wallet/admin tests.
4. Enable leaked-password protection in Supabase Auth settings.
5. Verify Edge Functions with `verify_jwt=false` are limited to signed webhooks or functions with explicit custom authentication.

## Vercel, domains, environment, and schedules

Linked Vercel project: `beyond-the-visa-mvp`.

Live headers on 2026-08-01:

- `https://beyondthevisa.org/` → permanent 308 to `https://www.beyondthevisa.org/`
- `https://www.beyondthevisa.org/` → 200 from Vercel with HSTS, nosniff, SAMEORIGIN, referrer, and permissions policies
- The owned `.uk` apex and `www` hostnames require second-stage validation.

Vercel production has Supabase URL/publishable/service-role values, cron secret, VAPID values, and all five job-provider credential groups. Preview has job-provider and VAPID values but no Supabase core or cron variables. Development only lists VAPID variables. Preview environment parity is required for meaningful pre-production testing.

Required Vercel/server keys:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `REED_API_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
- `USAJOBS_API_KEY`, `USAJOBS_USER_AGENT`
- `JOOBLE_API_KEY`, `CAREERJET_AFFILIATE_ID`

Required Supabase Edge Function secrets:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`, optional `GEMINI_MODEL`
- `ELEVENLABS_API_KEY`
- `PAYSTACK_SECRET_KEY`, `APP_URL`

Scheduled Vercel jobs:

- global jobs: `03:15 UTC` daily
- immigration news: `04:45 UTC` daily
- notifications: `05:15 UTC` daily

All three depend on a matching `CRON_SECRET` and idempotent backend operations.

## Deletion and dependency report

- Removed only `.tmp-usa-headers.txt`: an empty, untracked diagnostic artifact with no references.
- No tracked application files, migrations, public assets, packages, or dependencies were deleted.
- No dependencies were removed. The existing `esbuild` dependency is now used through its API.
- Unreferenced legacy logo candidates were retained because externally cached/public URLs cannot be disproved locally. Delete them only after production access-log and CDN checks.

## Verification matrix

| Check | Result |
| --- | --- |
| `npm run verify` | Pass |
| Build and generated web bundle | Pass |
| Node tests | 494 passed, 0 failed |
| Release QA | 0 failures, 1 size warning |
| TypeScript | Pass |
| SEO audit | 100 / 100 / 100 |
| Git diff validation | Pass |
| High-confidence secret scan | No private keys/tokens found; two documentation placeholders only |
| Browser desktop/mobile | Pass for exercised public, authenticated-session, admin, dark-mode, canonical, overflow and touch-target checks |
| Production mutation | None |

## Deployment and rollback plan

Deployment is intentionally not performed.

Recommended order:

1. Validate all four owned `.org` and `.uk` hostnames and document the existing canonical behaviour without changing it.
2. Add Supabase core and cron variables to Vercel Preview, using separate preview credentials.
3. Reconcile Supabase migrations on a preview branch and test the staged hardening migration.
4. Run `npm ci`, `npm run verify`, and `npm run seo:audit` on Node 22 or newer.
5. Deploy this branch to Vercel Preview only.
6. Run real test-account journeys for password login, Google/Facebook callback, logout/session expiry, jobs/save/apply, notifications, mentor booking, mock purchase/refund, Golden Question, and admin denial/allow paths.
7. Promote the verified immutable deployment to production; do not rebuild between approval and promotion.
8. Recheck owned domains, redirects, headers, cron responses, Supabase advisors/logs, sitemap/robots, and payment/webhook health.

Rollback:

- Vercel: instant rollback/promote the previously known-good immutable deployment.
- Code: revert the final audit commit; retain checkpoint `0c8df18` as the exact pre-audit source state.
- Database: no rollback is currently required because the audit migration was not applied. If later approved, capture pre-change ACLs/policies first and prepare a reviewed inverse migration before production application.
- Domains: do not change canonical or owned-domain configuration without approval; if an approved change later fails, restore the recorded prior Vercel/DNS state.
