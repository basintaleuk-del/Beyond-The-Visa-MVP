# Phase 2 — Foundation Report

## Summary

Phase 2 establishes canonical browser/backend contracts and automated safeguards without rewriting the application.

## Completed repairs

- Aligned Beyond Coins wallet bootstrap with `btv_bootstrap_user(p_user)`.
- Aligned mock catalogue visibility with `is_active`.
- Aligned mock start/completion payloads with Edge Functions.
- Retained temporary camelCase compatibility inside Edge Functions.
- Corrected country/exam-specific mock selection.
- Aligned journey queries and progress writes with `code`, `sort_order`, `is_active`, `step_code`, and `completed`.
- Aligned jobs, stories, mentors, learning activity, mock catalogue administration, and refund approval with the checked-in schema.
- Removed 25 references to assets that do not exist.
- Added a canonical Zibur fallback and removed prohibited wording from the active fallback and server instruction.
- Added local asset, contract, syntax, TypeScript, and foundation regression checks.

## Files changed

- `web/index.html`
- `web/admin.html`
- `web/beyond-coins-v72.js`
- `web/mock-access-v72.js`
- `web/platform-upgrade-v72.js`
- `web/dashboard-premium-v73.js`
- `web/admin-platform-v72.js`
- `web/zibur-foundation-v75.js`
- `supabase/functions/start-mock/index.ts`
- `supabase/functions/complete-mock/index.ts`
- `supabase/functions/zibur-gemini/index.ts`
- Validation and repair utilities under `scripts/`
- Foundation tests under `tests/`

## Database changes

None. The foundation work aligns callers with the existing checked-in schema.

## API changes

Mock Edge Functions now accept canonical snake_case requests and the previous camelCase request shape during migration.

## UI changes

No intended layout changes. Dead asset references were removed and Zibur fallback copy was corrected.

## Validation

- Web asset validation
- Client/backend contract validation
- JavaScript syntax validation
- TypeScript validation
- Web bundle build
- Node foundation regression tests

## Remaining risk

The checked-in migration may not fully represent the live Supabase project. A live read-only schema export remains required before further database migrations are deployed.
