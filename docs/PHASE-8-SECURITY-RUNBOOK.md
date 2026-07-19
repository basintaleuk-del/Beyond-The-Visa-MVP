# Phase 8 — Security and Infrastructure Runbook

## Controls added

- HTTPS-only Capacitor shell; cleartext, mixed content, and production WebView debugging disabled.
- Content Security Policy, referrer policy, permissions policy, and blocked object embedding.
- Private learning, CV, IELTS audio, book, and user-document buckets with MIME and size limits.
- User-owned paths for private CVs and documents (`<user-id>/...`).
- Administrator-only learning uploads and authenticated learner reads.
- Sanitised, rate-deduplicated client error monitoring without form contents, tokens, or stack traces.
- Existing RLS, authenticated Edge Functions, server-side wallet operations, payment verification, and Zibur rate limits retained.

## Required operational setup

1. Enable Supabase daily backups (Pro plan or higher) and record retention in the operations register.
2. Before every migration batch, create a database backup and export storage object inventory.
3. Quarterly, restore the latest backup into a non-production Supabase project and record recovery time and data verification results.
4. Rotate Paystack, Gemini, VAPID, scheduling, and service-role secrets immediately after suspected exposure and at the organisation's defined interval.
5. Never put secret keys in `web/`, `www/`, Capacitor configuration, GitHub Pages, or mobile binaries.
6. Review `btv_client_events`, Edge Function logs, payment failures, and admin audit logs weekly.

## Incident response

Disable the affected function or feature flag, revoke exposed credentials, preserve audit logs, assess affected users, restore from a verified backup if required, and document corrective actions before re-enabling service.

