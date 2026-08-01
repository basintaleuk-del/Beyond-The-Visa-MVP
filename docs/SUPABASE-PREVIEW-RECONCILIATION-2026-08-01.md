# Supabase Preview reconciliation — 2026-08-01

Scope: versions newer than the latest production migration-history entry, `20260731011000`. Production was inspected read-only; no history, schema, grant, policy, branch or data mutation was performed.

## Reconciliation table

| Version | Migration | Observed production state | Classification | Preview action |
|---|---|---|---|---|
| `20260731020000` | live international jobs | Expected provider tables/functions are present | Already applied semantically | Compare definitions/checksums, then history repair only |
| `20260731120000` | professional profile persistence | Expected profile persistence objects are present | Already applied semantically | Compare definitions/checksums, then history repair only |
| `20260731123000` | USAJOBS production import | Expected USAJOBS objects are present | Already applied semantically | Compare definitions/checksums, then history repair only |
| `20260731133000` | Adzuna US nursing | Expected Adzuna objects are present | Already applied semantically | Compare definitions/checksums, then history repair only |
| `20260731150000` | Reed UK nursing | Reed data exists (54 jobs); the migration's provider-only uniqueness index has been replaced by the newer cross-source uniqueness model | Partially applied and superseded | Preserve the newer model; never recreate the superseded index; repair history only after documenting semantic equivalence |
| `20260801120000` | Adzuna featured pathways | Expected pathway objects are present | Already applied semantically | Compare definitions/checksums, then history repair only |
| `20260801123000` | qualified job alerts | Expected alert objects are present | Already applied semantically | Compare definitions/checksums, then history repair only |
| `20260801143000` | repair signup wallet bootstrap | Expected signup/wallet bootstrap objects are present | Already applied semantically | Compare function/trigger definitions, then history repair only |
| `20260801145133` | restrict SECURITY DEFINER execution | Revokes, fixed search paths and policy removal are absent; advisor findings remain | Genuinely missing | Apply to Preview only after all earlier history decisions |
| `20260801170000` | Jooble jobs | Expected Jooble objects are present | Already applied semantically | Compare definitions/checksums, then history repair only |
| `20260801190000` | Careerjet jobs | Expected Careerjet objects are present | Already applied semantically | Compare definitions/checksums, then history repair only |

“Semantically” is deliberately not “identically”. Before any history repair, export each Preview definition with `pg_get_functiondef`, `pg_get_indexdef`, `pg_get_constraintdef`, `pg_get_triggerdef`, `pg_policies`, `information_schema.role_routine_grants`, storage policies and table/column metadata, then compare it with the migration's expected end state.

## Isolated Preview sequence

1. Obtain explicit approval for the quoted branch cost and create a data-less Supabase branch from production.
2. Record the branch project reference and run `npm run validate:preview` with Preview-only variables. Stop if the guard fails.
3. Export remote/local migration history and schema definitions; store SHA-256 checksums with the evidence bundle.
4. For each “already applied semantically” row, prove equivalence. On the Preview branch only, repair history one version at a time using `supabase migration repair --status applied <version> --linked`. Re-export after every repair. History repair must not run DDL.
5. For Reed, retain the cross-source uniqueness index. Record the replacement index definition and repair history only; do not execute the Reed migration file.
6. Apply only `20260801145133_restrict_security_definer_execution.sql` to Preview.
7. Run `supabase/verification/20260801145133_restrict_security_definer_execution.verify.sql`, security/performance advisors and the full application regression suite.
8. On a second disposable Preview branch, apply the inverse, verify restoration against the captured pre-state, then discard the branch. Do not test the inverse on production.

## Stop conditions

- Preview reference or credential fingerprint matches production.
- Any expected object definition differs materially from the migration end state.
- Reed's cross-source uniqueness model would be weakened.
- A history repair attempts DDL or changes checksums unexpectedly.
- Anonymous EXECUTE remains on a listed sensitive function.
- Authenticated or service-role access required by tests is lost.
- Wallet/payment idempotency, mentor booking atomicity, job sync, notifications, storage uploads or triggers regress.
- Advisor results introduce a new error-level finding.

## Production approval gate

Production work requires: a verified Preview evidence bundle; database backup/PITR confirmation; schema and migration-history checksums; a maintenance owner; an incident rollback owner; and explicit approval of the exact ordered commands. Estimated application downtime is zero for the grant/search-path/policy DDL, but schedule a short change window because rollback and verification are operationally sensitive.
