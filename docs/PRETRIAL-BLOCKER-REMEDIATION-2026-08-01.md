# Beyond The Visa pre-trial blocker remediation — 2026-08-01

## 1. Branch and checkpoint

- Working branch: `fix-pretrial-blockers`.
- Pre-change checkpoint: `6ec202f chore: checkpoint before blocker remediation`.
- Starting audited commit: `b672b52 audit: complete second-stage pre-trial validation`.
- No production deployment, DNS mutation, Vercel domain mutation, Supabase DDL/history mutation, payment mutation or secret disclosure occurred.

## 2. Domain correction results

Read-only inspection confirms that `www.beyondthevisa.uk` is absent from Vercel project `beyond-the-visa-mvp` (`prj_ieQmvqK3NGssBIGNiR8D8paZjvia`). The apex `.uk`, apex `.org`, `www` `.org` and the Vercel deployment domain are attached. DNS already publishes `www.beyondthevisa.uk` as a CNAME to Vercel, but Vercel cannot provision a matching hostname/certificate until the alias is attached to the project.

The source fix is prepared: `vercel.json` permanently redirects all three non-canonical owned hosts to `https://beyondthevisa.org/:path*`. Live `www.beyondthevisa.uk` remains broken because attachment and certificate issuance were correctly not performed without approval.

## 3. Exact DNS/Vercel changes required

Current authoritative DNS is IONOS (`ui-dns` nameservers). The required action is primarily Vercel-side:

1. Attach `www.beyondthevisa.uk` to the existing `beyond-the-visa-mvp` Vercel project.
2. Configure a permanent redirect from that alias to `https://beyondthevisa.org` or deploy this reviewed `vercel.json` and retain the alias on the project.
3. Run `vercel domains inspect www.beyondthevisa.uk` and use the exact CNAME target it reports. Vercel's current guidance is that project inspection is authoritative; newer projects may receive a project-specific target.

DNS record:

| Field | Required value |
|---|---|
| Type | `CNAME` |
| Host/name | `www` |
| Target/value | Keep the present `cname.vercel-dns.com` unless Vercel inspect returns a project-specific `cname.vercel-dns-0.com` value |
| TTL | `300` seconds during cutover; raise to `3600` after certificate/redirect validation |
| Conflicts | Remove only another record at host `www` (A, AAAA or CNAME) if Vercel inspect reports a conflict; current inspection found the one correct CNAME and no competing record |

Vercel should then issue HTTPS automatically. Follow the official [custom-domain procedure](https://vercel.com/docs/domains/set-up-custom-domain); do not assume the certificate is valid until inspect and a real TLS request pass.

## 4. Canonical-domain decision and all files/settings aligned

Canonical origin: `https://beyondthevisa.org`.

Repository changes align host redirects, canonical metadata, Open Graph, sitemap, robots, job/API attribution, notification URLs and provider referers. Mistaken audit references to a non-owned domain were removed without altering legitimate third-party hosts.

Approval-gated dashboard settings still required:

- Supabase Site URL: `https://beyondthevisa.org`.
- Supabase redirect allowlist: the canonical `/auth/callback` and only necessary isolated Preview callbacks.
- Google/Facebook: retain their Supabase provider callback and verify the app's allowed return origin is the canonical apex.
- Paystack test/live dashboards: canonical callback/return origin, changed only in the appropriate approved environment.
- Vercel: attach all four owned aliases; apex `.org` serves, the other three redirect.

## 5. Redirect test matrix

`vercel.json` contract tests pass for path preservation and destinations without a replacement query, so Vercel preserves incoming query values. Production/live rows remain unverified until deployment and alias attachment.

| Input | Expected | Source test | Live status |
|---|---|---|---|
| `https://beyondthevisa.org/any/path?x=1` | Serve canonical path/query, no loop | Pass | Current production redirects to `www`; unchanged |
| `https://www.beyondthevisa.org/legal?x=1` | 308 to apex, same path/query | Pass | Not deployed |
| `https://beyondthevisa.uk/jobs/123?utm_source=test` | 308 to apex, same path/query | Pass | Not deployed; currently serves directly |
| `https://www.beyondthevisa.uk/auth/callback?code=test&returnTo=%2Fjourney` | Valid TLS then 308 to apex preserving all values | Pass in config | Blocked by missing Vercel alias/certificate |
| password-reset query | 308 with unchanged token/query | Pass in config | Preview/live required |
| legal page, job deep link, sitemap, robots and favicon | 308 to matching apex resource | Pass in config | Preview/live required |

## 6. Homepage performance baseline

Fresh local Lighthouse 13.3.0 baseline, before source optimisation:

| Profile | Performance | FCP | LCP | TBT | CLS | Speed Index | Requests | Transfer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mobile | 49 | 10.1 s | 17.0 s | 310 ms | 0 | 10.1 s | 182 | 2,539,135 B |
| Desktop | 67 | 2.3 s | 3.8 s | 30 ms | 0 | 2.3 s | 182 | 2,538,500 B |

The original validation server incorrectly returned the 264 KB SPA document for missing CSS/API URLs. This inflated baseline byte totals and “stylesheet/other” sizes; timings and request waterfalls remain useful, but byte deltas must be treated as directional rather than a production transfer claim. The validation server now returns 404 for missing assets/API routes and falls back only for HTML navigation.

Baseline signed-out LCP was the auth/logo surface (mobile reported the auth logo after the delayed upgrade; desktop reported the auth story). The delayed auth enhancement sat behind dozens of global feature assets.

## 7. Homepage performance after fixes

Final local Lighthouse:

| Profile | Performance | FCP | LCP | TBT | CLS | Speed Index | Requests | Transfer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mobile | 76 | 2.5 s | 4.4 s | 110 ms | 0.124 | 3.0 s | 179 | 791,468 B |
| Desktop | 98 | 0.5 s | 1.0 s | 0 ms | 0.065 | 0.9 s | 179 | 846,676 B |

Accessibility stayed 100 and SEO stayed 100 on both profiles. Best Practices stayed 96 because the local static harness intentionally cannot serve authenticated APIs and produces expected 401/404 console entries.

The mobile score improved by 27 points, LCP by 12.6 seconds and TBT by 200 ms. Desktop exceeds its target. Mobile remains below the stretch targets of 80, LCP under 4 s and CLS below 0.1. Deeper route-level JavaScript loading is the remaining architectural work; it was not attempted because changing the ordering of approximately 79 dependency-coupled scripts is higher regression risk than justified before Preview.

## 8. Lighthouse mobile and desktop reports

- Before mobile: `docs/evidence/blocker-fixes/before/home-mobile.json`.
- Before desktop: `docs/evidence/blocker-fixes/before/home-desktop.json`.
- Final mobile: `docs/evidence/blocker-fixes/after/home-mobile-final.json`.
- Final desktop: `docs/evidence/blocker-fixes/after/home-desktop-final.json`.

The final mobile LCP audit identifies the signed-out auth content; its remaining delay is dominated by render/boot ordering rather than network TTFB. Visual browser inspection confirmed the approved desktop auth design and a single password-recovery control.

## 9. CSS and JavaScript savings

- Auth enhancement and its critical CSS now load before authenticated feature assets.
- 68 authenticated/route styles are non-render-blocking; only the auth stylesheet and two logo-sizing overrides remain blocking for a stable first paint.
- Render-blocking estimated savings fell from roughly 1,960 ms to roughly 540 ms.
- Unused CSS potential fell from about 780,924 B to 516,861 B. Final transferred stylesheet bytes are 268,420 B under the corrected harness.
- TBT fell from 310 ms to 110 ms mobile and 0 ms desktop.
- Unused JavaScript remains about 315 KB mobile. Safe next work is a dependency-aware authenticated asset loader/dynamic imports, validated across all feature routes in Preview.

## 10. Image and video changes

- Converted the 147,433 B 512 px auth PNG to a 40,672 B WebP and retained intrinsic `512×512` dimensions.
- Reserved mobile logo aspect/height to prevent intrinsic-size surprises.
- Welcome and start-guide videos remain available with controls and no autoplay, but now use `preload="none"` so they are not fetched on signed-out startup.
- No suitable approved poster source existed, so no invented poster artwork was added. Compressed posters and the wider nine-image intrinsic-dimension sweep remain Preview follow-up work.

## 11. Supabase migration reconciliation table

The complete table and rules are in `docs/SUPABASE-PREVIEW-RECONCILIATION-2026-08-01.md`.

| Version | Classification | Action |
|---|---|---|
| `20260731020000` | applied semantically | definition comparison, then Preview history repair only |
| `20260731120000` | applied semantically | definition comparison, then Preview history repair only |
| `20260731123000` | applied semantically | definition comparison, then Preview history repair only |
| `20260731133000` | applied semantically | definition comparison, then Preview history repair only |
| `20260731150000` | partial/superseded | preserve cross-source uniqueness; never recreate old Reed index |
| `20260801120000` | applied semantically | definition comparison, then Preview history repair only |
| `20260801123000` | applied semantically | definition comparison, then Preview history repair only |
| `20260801143000` | applied semantically | compare function/trigger, then Preview history repair only |
| `20260801145133` | genuinely missing | apply only after reconciliation, Preview only |
| `20260801170000` | applied semantically | definition comparison, then Preview history repair only |
| `20260801190000` | applied semantically | definition comparison, then Preview history repair only |

Production records 50 migrations through `20260731011000`; no `db push`, replay or history marking was performed.

## 12. Preview migrations applied

None. Supabase quoted the isolated branch at **$0.01344/hour**. Creation requires explicit cost confirmation, which was not available in this execution. Consequently no Preview branch existed on which to prove definitions, repair history, apply hardening or test the inverse.

The new Preview guard fails closed if required variables are missing; if the Supabase project reference matches production; if the application URL is an owned production hostname; if Paystack is not a test key; or if service-role/Paystack fingerprints match production. It never logs secret values.

## 13. Security advisor before and after

Production read-only baseline remains 150 findings: 2 RLS-without-policy notices, 4 mutable search paths, 1 public extension, 1 public bucket listing policy, 43 anonymous SECURITY DEFINER grants, 98 authenticated SECURITY DEFINER grants, and leaked-password protection disabled.

After: not available because hardening was not applied to Preview. `supabase/verification/20260801145133_restrict_security_definer_execution.verify.sql` is prepared to prove anonymous denial, intended authenticated/service-role execution, trigger-only denial, fixed search paths and removal of the listing policy. No production finding was changed.

## 14. Performance advisor before and after

Production read-only baseline remains 464 findings: 145 unindexed foreign keys, 78 RLS init-plan warnings, 59 unused indexes, 181 multiple-permissive-policy warnings and 1 duplicate index.

After: not available without the approved Preview branch. No speculative index or RLS rewrite was made during migration drift.

## 15. Auth, wallet, payment, mentor, jobs and notification test results

- `npm ci`: pass after Windows cache access was approved.
- `npm run verify`: pass.
- Automated suite: **499/499 pass** (the former 495 plus four blocker tests), including auth/session/callback, wallet idempotency, Paystack verification/webhook replay, mentor booking, job providers/saved jobs, notifications, admin authorisation, RLS contracts and service-worker/offline contracts.
- Production build, TypeScript, QA/lint/contracts and web asset/broken-link validation: pass.
- SEO audit: 100 SEO, 100 Google readiness, 100 AI readiness; 40 public pages; no broken links.
- Browser auth smoke/visual inspection: pass; one recovery action, Google/Facebook controls present, approved desktop surface intact.
- Tracked secret-pattern scan: no matches.
- Production dependency audit (`npm audit --omit=dev`): 0 vulnerabilities.
- Full tooling audit: 10 development-only findings (2 moderate, 7 high, 1 critical), primarily `@capacitor/assets`/CLI transitive tooling; no production dependency finding. Automatic audit fix was not run because it is outside blocker scope and could change build tooling.
- Real provider credentials, real payment, stateful booking race, authenticated storage and live callback tests remain Preview-gated.

## 16. Files changed

Domain/canonical: `vercel.json`, API/job/notification provider modules, `web/opportunity-centre-v138.js`, audit corrections and blocker tests.

Performance/build: `index.html`, `web/index.html`, `web/social-auth-v69.js`, `web/v71-feature-merge-v82.css`, `web/release-v66.js`, `web/welcome-video-v82.js`, `web/favicon-512-v281.webp`, `scripts/apply-homepage-performance-v302.mjs`, `scripts/build-web.mjs`, `scripts/serve-validation-v301.mjs`, and affected auth tests.

Preview/Supabase: `.env.example`, `package.json`, `scripts/validate-preview-isolation-v302.mjs`, `docs/SUPABASE-PREVIEW-RECONCILIATION-2026-08-01.md`, and `supabase/verification/20260801145133_restrict_security_definer_execution.verify.sql`.

Evidence/report: four final/baseline Lighthouse JSON files and this report.

## 17. Database changes made in Preview

None. No Preview project/branch was created, no SQL was executed there, and the inverse was not tested. This is an explicit acceptance blocker, not an implied pass.

## 18. Production changes not yet made

- Attach `www.beyondthevisa.uk`, issue/verify TLS and deploy the canonical redirect configuration.
- Change the current apex `.org` Vercel direction so the apex serves and `www` redirects.
- Update Supabase Site URL/redirect allowlist and verify OAuth provider/Paystack dashboard callback settings.
- Create isolated Preview resources/variables and run stateful validation.
- Reconcile migration history and apply/test `20260801145133` on Preview.
- Obtain backup/checksums/approvals before any production database operation.

## 19. Unresolved risks

1. `www.beyondthevisa.uk` still lacks Vercel attachment/TLS.
2. Live canonical direction remains inconsistent because nothing was deployed.
3. Mobile Lighthouse is materially better but still misses three stretch thresholds: 76 score, 4.4 s LCP and 0.124 CLS.
4. Signed-out startup still downloads roughly 315 KB of unused JavaScript; dependency-aware route splitting remains.
5. Preview isolation, stateful persona tests, advisors-after, migration hardening and inverse validation are blocked on cost approval.
6. Production anonymous SECURITY DEFINER exposure remains.
7. Development tooling has known audit findings; production dependencies are clean.
8. OAuth, payment, email reset and provider dashboards cannot be conclusively validated from repository configuration alone.

## 20. Exact production deployment plan

1. Approve/create the Supabase Preview branch; configure isolated Preview variables and production-secret SHA-256 fingerprints; run the guard.
2. Export migration history/schema/functions/grants/policies/indexes/constraints/storage policies and SHA-256 checksums.
3. Prove semantic equivalence migration by migration. Repair Preview history one version at a time; preserve Reed's newer uniqueness model.
4. Apply only `20260801145133` to Preview. Run verification SQL, both advisors, all 499 tests and real Preview auth/payment/mentor/job/notification/storage journeys.
5. Test the inverse on a second disposable Preview branch, then recreate and revalidate hardening.
6. Capture production PITR/backup confirmation, schema/history checksums, current Vercel deployment ID and owner-approved stop conditions.
7. In the approved database window, repeat only the proven history/hardening sequence; stop on any checksum or definition mismatch. Expected application downtime is zero, with a short monitored change window.
8. Deploy this exact reviewed commit to Vercel Preview. Verify all four host forms, callbacks, reset/deep links, legal/SEO resources, APIs and Lighthouse.
9. Attach `www.beyondthevisa.uk`, confirm the inspect-provided CNAME and valid TLS; then promote the immutable reviewed Vercel deployment.
10. Update approval-gated auth/payment callback dashboards, smoke test and monitor logs/advisors/error/payment/job metrics through the limited trial.

History repair follows Supabase's documented migration workflow and occurs only after schema equivalence: [database migrations](https://supabase.com/docs/guides/deployment/database-migrations). Preview isolation follows [Supabase branching](https://supabase.com/docs/guides/deployment/branching).

## 21. Exact rollback plan

Domain/application rollback:

1. Promote the previously known-good immutable Vercel deployment.
2. Remove only the newly attached `www.beyondthevisa.uk` project alias if it causes a certificate/loop incident; retain the DNS CNAME for investigation unless Vercel directs otherwise.
3. Revert canonical dashboard settings to the captured pre-change values and retest existing production auth/payment flows.

Database rollback:

1. Stop if any verification fails; do not continue history operations.
2. Capture post-failure grants, policies, search paths, migration history and logs.
3. Prefer forward correction. If an approved incident commander requires immediate reversal, run `supabase/rollback/20260801145133_restrict_security_definer_execution.rollback.sql` only after comparing it with the captured pre-state.
4. Rerun the verification queries with inverse expectations and all critical auth/admin/wallet/payment/mentor/job/notification tests.
5. Restore from PITR/backup if schema/history integrity cannot be proven. The inverse deliberately reopens permissions and is not a routine rollback.

## 22. Final recommendation

**NOT READY**

The code-side canonical and performance work is ready for review, the full local suite is green, and desktop performance exceeds target. Release acceptance is not met because the `.uk` alias/TLS is still external and unchanged, live redirects are undeployed, mobile remains just below target, no isolated Preview branch was approved, migration history/hardening/inverse tests have not run, and production anonymous SECURITY DEFINER exposure remains.
