# Beyond The Visa — Phase 1 Repository Audit

**Audit date:** 17 July 2026  
**Specification:** `Beyond_The_Visa_Master_PRD(12).md` + `Beyond_The_Visa_Implementation_Playbook.md`  
**Scope:** Architecture and non-regression audit only. No feature development or production-code changes were made in this phase.

## 1. Executive summary

Beyond The Visa is an existing, feature-rich static web application wrapped with Capacitor for Android and iOS. It uses Supabase for authentication, data, Row Level Security, Edge Functions, and Gemini-backed Zibur responses. The application is not a React application; most functionality is implemented by a large `index.html` plus many progressively layered versioned JavaScript and CSS files.

The current web bundle builds and all top-level JavaScript files pass syntax validation. However, this does **not** mean the release is functionally safe. The audit found release-blocking contract mismatches between the browser code, Supabase schema, RPCs, and Edge Functions. It also found missing assets still referenced by `index.html`, repeated function declarations, and multiple competing generations of the same features.

The supplied dashboard image is suitable as a later design reference. Under the active PRD, Phase 3 must preserve the existing page width, header, bottom navigation, routes, and business logic, and redesign only the welcome/Mission Control section. It must not be applied during Phase 1.

### Audit verdict

- **Buildability:** Passes the current copy/bundle process.
- **Syntax:** Top-level browser scripts pass `node --check`.
- **TypeScript:** Passes `tsc --noEmit` for the small Capacitor TypeScript surface.
- **Automated test coverage:** Absent.
- **Database/API compatibility:** Fails audit; multiple P0 mismatches exist.
- **Safe for additional feature development:** Not until Phase 2 foundation repairs are complete.
- **Production readiness:** Not ready.

## 2. Architecture report

### 2.1 Runtime architecture

1. **Web client**
   - Static HTML/CSS/JavaScript in `web/`.
   - Main application shell and several legacy implementations live inline in `web/index.html`.
   - Additional features are injected or overridden by versioned scripts such as `platform-upgrade-v72.js`, `dashboard-v73.js`, and `dashboard-reference-v74.js`.
   - The build script copies/minifies this material into `www/`.

2. **Mobile shell**
   - Capacitor 8.
   - Application ID: `org.beyondthevisa.app`.
   - Application name: `Beyond The Visa`.
   - Web directory: `www`.
   - Android and iOS native projects are present.

3. **Backend**
   - Supabase Auth and database access from the browser.
   - One platform migration in this repository.
   - Five Supabase Edge Functions.
   - Gemini is accessed server-side by `zibur-gemini`; credentials are not embedded in the browser code.

4. **Deployment model**
   - Static web deployment for `beyondthevisa.org`.
   - Capacitor packages the generated `www/` output for mobile.

### 2.2 Source structure

| Path | Responsibility |
|---|---|
| `web/` | Canonical web assets and browser application |
| `www/` | Generated Capacitor web bundle; should not be manually edited |
| `src/mobile-native.ts` | Native bridge/bootstrap logic |
| `src/mobile-native.css` | Mobile-native presentation adjustments |
| `scripts/build-web.mjs` | Copies and bundles web assets into `www/` |
| `android/` | Android Studio project |
| `ios/` | Xcode project |
| `supabase/migrations/` | Database migration source |
| `supabase/functions/` | Supabase Edge Functions |
| `assets/` | Capacitor icon and splash source assets |

### 2.3 Architectural risk

The browser application currently follows a “version-layer” architecture: later files patch earlier implementations at runtime. This preserves history but makes load order part of business logic. Missing one script can silently reactivate an older implementation. Consolidation must be incremental, with compatibility adapters and regression tests; a rewrite would violate the PRD.

## 3. Dependency report

### 3.1 Production dependencies

The project uses Capacitor 8 and the following native plugins:

- App
- Browser
- Camera
- Dialog
- Filesystem
- Haptics
- Keyboard
- Network
- Preferences
- Push Notifications
- Share
- Splash Screen
- Status Bar
- Toast

### 3.2 Development dependencies

- `@capacitor/assets`
- `@capacitor/cli`
- `esbuild`
- `typescript`

### 3.3 Dependency findings

- Node.js 22 or later is required.
- There is no framework dependency such as React, despite later PRD engineering language referring to React architecture.
- There are no test-runner, linter, formatter, accessibility-test, or E2E dependencies.
- `package.json` has no `test`, `lint`, or dedicated `typecheck` scripts.
- Adding a framework during the foundation phase would be a rewrite risk and is not recommended.l

## 4. Existing routes and screens

### 4.1 Physical HTML entry points

- `index.html` — main user application
- `admin.html` — Admin Hub
- `cbt.html` — CBT experience
- `nclex.html` — NCLEX experience
- `privacy-policy.html`
- `terms-and-conditions.html`

### 4.2 Main SPA screens found in `index.html`

- Home
- Journey/checklist
- Ask Zibur/assistant
- Learn
- Costs
- Countries

### 4.3 Dynamically injected experiences

Versioned scripts add or open additional experiences, including:

- Platform Hub
- Beyond Coins wallet
- Jobs and saved jobs
- Mentors
- Success stories
- Community
- Premium/membership legacy screens
- Study planner
- IELTS
- Books/resources/articles/videos
- Profile and settings
- Admin-only entry points

### 4.4 Route risks

- Navigation is predominantly DOM-state based, not a canonical router.
- Some links rely on functions added by later scripts, so missing assets produce partial navigation rather than a clear build failure.
- The Phase 3 dashboard must call the existing canonical screen-opening functions; it must not create parallel pages.
- Existing bottom navigation is part of the non-regression baseline and must remain untouched unless a later approved requirement explicitly changes it.

## 5. Existing database schema

The repository contains one migration: `202607160001_platform_upgrade_v72.sql`.

### 5.1 Tables

| Domain | Tables |
|---|---|
| Wallet | `btv_wallets`, `btv_wallet_transactions` |
| Mock engine | `btv_mock_catalog`, `btv_mock_sessions`, `btv_mock_refund_requests` |
| Gamification | `btv_gamification`, `btv_achievements`, `btv_user_achievements`, `btv_study_activity` |
| Journey | `btv_journey_steps`, `btv_user_journey_progress` |
| Notifications | `btv_notifications`, `btv_notification_preferences` |
| Jobs | `btv_jobs`, `btv_saved_jobs`, `btv_job_applications` |
| Stories | `btv_success_stories` |
| Mentors | `btv_mentors`, `btv_mentor_availability`, `btv_mentor_bookings`, `btv_mentor_reviews` |

### 5.2 Database functions

- `btv_is_admin`
- `btv_bootstrap_user`
- Auth-user bootstrap trigger function
- `btv_start_mock`
- `btv_complete_mock`
- `btv_request_mock_refund`
- `btv_approve_mock_refund`
- `btv_book_mentor`

### 5.3 Security model

- RLS is enabled on the migration’s domain tables.
- User-owned rows generally use `auth.uid()` policies.
- Sensitive wallet and mock operations are intended to execute through database functions.
- Admin recognition currently centres on a single `admin` role, while the PRD calls for more granular roles.

### 5.4 Schema inventory limitation

The repository migration is not a complete export of the live Supabase project. Browser code also references tables such as profiles, articles, bookings, requests, premium prices, video courses, and CV services that are not defined by the checked-in migration. A read-only live-schema export is required before any new migration is written.

## 6. Existing Edge Functions

| Function | Intended purpose |
|---|---|
| `start-mock` | Start a coin-priced mock session |
| `complete-mock` | Complete and score a mock session |
| `refund-mock` | Request/process a mock refund |
| `book-mentor` | Book an approved mentor using server-validated rules |
| `zibur-gemini` | Authenticated Gemini-backed Zibur responses |

### Edge Function findings

- Authentication is checked in the functions.
- Gemini credentials remain server-side.
- Several browser payloads do not match the Edge Function request or response schemas (see P0 findings).
- There is no checked-in shared request-schema package or generated contract.
- Edge Function unit/integration tests are absent.

## 7. Existing UI components and systems

The codebase contains reusable visual patterns, although they are not yet organised as a formal component library:

- Header and profile controls
- Bottom navigation
- Screen panels and modal/dialog shells
- Dashboard/Mission Control cards
- Wallet balance and Beyond Coins widgets
- Journey progress and milestone widgets
- Learning cards and question interfaces
- Jobs, mentors, stories, community, and resource cards
- Toasts, messages, loading, empty, and error states
- Admin navigation, statistics, tables, inbox, editors, and platform operations panels
- Dark-mode and responsive layers
- Capacitor mobile-safe-area and native interaction styles

The Phase 2 design-system work should document and consolidate these patterns without changing their public behaviour.

## 8. Duplicate detection report

### 8.1 Confirmed duplicate declarations

The main application contains repeated declarations for important globals, including:

- `showApp`
- `renderDashboardInsights`
- `message`
- `toast`
- `applyTheme`

Because these are globals, the final behaviour depends on parse and load order.

### 8.2 Competing version layers

The client loads numerous generations of release, dashboard, premium, study-plan, auth, Zibur, learning, admin, and visual refinement scripts. Examples include v21 through v74 assets. These are not all harmless history: later scripts override or wrap earlier functions.

### 8.3 Duplicate/competing business systems

- Legacy Premium subscription flows coexist with the newer Beyond Coins mock-access model.
- Multiple Zibur fallback implementations exist; the older one is the one referenced by the active page.
- Multiple dashboard and welcome-section implementations exist.
- Admin functionality is split across many runtime injection files rather than one registry.
- Profile, auth, and legal-consent refinements are layered across separate versions.

### 8.4 Missing referenced assets

`index.html` still references files that are absent from `web/`, including:

- `experience-v30.6.js`
- `experience-v30.8.js`
- `premium-access-v30.4.js`
- `premium-library-v57.css`
- `premium-library-v57.js`
- `premium-return-v30.5.js`
- `recovery-v62.js`
- `release-v31.css`, `release-v31.js`
- `release-v32.css`, `release-v32.js`
- `release-v37.css`, `release-v37.js`
- `release-v38.js`
- `release-v42.css`, `release-v42.js`
- `release-v43.css`
- `saved-study-plan-v59.js`
- `saved-study-plan-v60.css`
- `signup-legal-v62.css`, `signup-legal-v62.js`
- `study-plan-cloud-v60.js`
- `study-plan-v58.css`, `study-plan-v58.js`

The build currently copies references without verifying that their targets exist.

## 9. Release-blocking contract mismatches

### P0 — Mock catalogue

- Database column: `is_active`.
- Browser code queries/reads: `active`.
- Result: active mock discovery and Admin Hub counts/statuses can fail.

### P0 — Mock session status

- Database uses `active` for a running mock.
- Dashboard code checks `in_progress`.
- Result: current mock state is not represented consistently.

### P0 — Journey model

- Database uses `code`, `sort_order`, `is_active`, and progress `step_code`.
- Browser code uses `id`, `position`, `active`, and progress `step_id`/`completed_at`.
- Result: journey loading and completion writes do not conform to the checked-in schema.

### P0 — Jobs, stories, mentors, and activity analytics

- Jobs: schema has `status` and `visa_sponsorship`; client expects `active` and `sponsorship_verified`.
- Stories: schema has `member_name`, `quote`, and `story`; client expects `summary` and `published_at`.
- Mentors: schema has `biography`; client expects `display_name`, `headline`, and `bio`.
- Study activity: schema has `study_seconds`, `questions_answered`, and `correct_answers`; dashboard expects `minutes` and `total`.

### P0 — RPC signatures

- `btv_bootstrap_user` accepts `p_user`; clients send `p_user_id`.
- `btv_approve_mock_refund` accepts `p_request_id` and `p_approve`; Admin Hub sends `p_request_id` and `p_admin_note`.

### P0 — Edge Function contracts

- `start-mock` expects `mock_code` and `client_session_key`; the browser sends `mockCode` and `clientKey`.
- The function returns a `session` object; the browser expects `session_id` at the top level.
- `complete-mock` expects snake_case fields such as `session_id` and `time_used_seconds`; the browser sends camelCase fields such as `sessionId` plus a different score payload.

### P0 — Zibur wording regression

- The playbook explicitly prohibits “The stored answer is...”.
- The active legacy fallback uses that exact phrase.
- The Gemini function’s system prompt also asks the model to “explain the stored answer”.
- A newer fallback exists but is not the active reference and still contains similar wording.

## 10. Technical debt list

### P0 — Resolve before feature work

1. Establish canonical request/response contracts for mock Edge Functions and their browser callers.
2. Align all browser queries with the live database schema, after exporting the live schema.
3. Repair RPC parameter mismatches.
4. Remove or replace references to missing assets without reactivating older behaviour.
5. Make the approved Zibur wording and fallback canonical.
6. Add a build-time missing-asset check.

### P1 — Foundation phase

1. Introduce a central screen/route registry while retaining current links.
2. Introduce a central Admin Hub module registry.
3. Consolidate duplicate global functions behind compatibility wrappers.
4. Create shared TypeScript contracts for Edge Function payloads.
5. Add a live-schema snapshot and schema documentation.
6. Add unit tests for pure logic and integration tests for Supabase contracts.
7. Add E2E smoke tests for auth, home, journey, Learn, Zibur, wallet, and admin access.
8. Add lint, format, test, and asset-validation scripts.
9. Replace silent catch blocks with user-safe errors plus structured logging.

### P2 — Planned improvements

1. Formalise the existing design tokens and reusable UI patterns.
2. Lazy-load feature scripts after a safe module registry exists.
3. Add accessibility and performance budgets.
4. Add staging deployment, migration validation, monitoring, and rollback documentation.
5. Introduce granular admin roles only through backward-compatible migrations and server-side checks.

## 11. Security observations

- No service-role key was found in the reviewed browser code.
- Zibur’s Gemini key is correctly intended to remain in Edge Function secrets.
- `btv_bootstrap_user` is a security-definer function accepting an arbitrary user ID; its caller identity and execute grants need explicit review.
- Frontend Admin Hub hiding is not sufficient authorization; every mutation must have a corresponding RLS policy or protected server function.
- Direct Admin Hub table updates need role-aware backend enforcement and auditable mutations.
- Live RLS and grants must be exported and tested before they are changed.

## 12. Baseline validation executed

| Check | Result |
|---|---|
| `npm run build:web` | Passed |
| `npx tsc --noEmit` | Passed |
| `node --check` for all top-level `web/*.js` | Passed |
| Unit tests | Not available |
| Integration tests | Not available |
| E2E tests | Not available |
| Accessibility tests | Not available |
| Database contract tests | Not available |

The existing build passing is not sufficient evidence of runtime compatibility because it does not validate asset existence, database columns, RPC arguments, or Edge Function payloads.

## 13. Non-regression baseline for later phases

The following must be preserved while Phase 2 repairs are made:

- Existing email and Google authentication flows
- Existing Supabase session persistence
- Current header, profile access, and bottom navigation
- Home, Journey, Ask Zibur, Learn, and Costs navigation
- Country-specific learning visibility
- Current stored user progress and preferences
- Existing wallet balances and ledger rows
- Existing admin access rules
- Capacitor Android and iOS projects
- Dark mode, safe areas, and responsive behaviour
- Existing content, books, articles, videos, questions, and uploaded files

## 14. Recommended Phase 2 sequence

1. Export and document the live Supabase schema, policies, functions, buckets, and Edge Function configuration without modifying them.
2. Add automated asset-reference and contract tests.
3. Implement compatibility adapters for the P0 schema and Edge Function mismatches.
4. Repair browser callers one domain at a time: bootstrap, mock engine, journey, jobs, stories, mentors, analytics.
5. Consolidate Zibur into one client and one fallback while preserving the public name “Zibur”.
6. Remove dead/missing script tags only after proving the active replacement path.
7. Add regression smoke tests and re-run Android/iOS sync.
8. Produce a separate Phase 2 completion report before beginning the homepage redesign.

## 15. Phase 1 completion report

1. **Summary:** Repository architecture, dependencies, routes, database, Edge Functions, UI systems, duplicates, and technical debt were audited.
2. **Files changed:** This audit document only.
3. **Database changes:** None.
4. **API changes:** None.
5. **UI changes:** None.
6. **Tests executed:** Web build, TypeScript check, browser JavaScript syntax check.
7. **Regression results:** Static build baseline passes; full regression cannot pass because no automated regression suite exists and P0 contracts are inconsistent.
8. **Risks:** Runtime failures, silent fallback to legacy implementations, live-schema divergence, and absent automated coverage.
9. **Remaining work:** Phase 2 foundation and compatibility repairs, followed by the narrowly scoped Phase 3 welcome/Mission Control redesign.

