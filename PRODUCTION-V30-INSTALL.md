# Beyond The Visa production platform v30

This release extends the current static GitHub Pages app. It does not replace the existing authentication, CBT, NCLEX, Zibur, document vault, journey, budget, coaching, Paystack or premium features.

## 1. Run SQL migrations in this exact order

Open Supabase **SQL Editor**, create a new query for each file, paste the complete file and run it. Stop if a migration reports an error.

1. `migrations/001_cms.sql`
2. `migrations/002_notifications.sql`
3. `migrations/003_video_learning.sql`
4. `migrations/004_bookings.sql`
5. `migrations/005_analytics.sql`

These migrations are additive. They use `create table if not exists`, safe column additions and RLS. They do not delete production records.

## 2. Required Storage buckets

- `user-documents` — already used by the private document vault.
- `learning-media` — created by migration 001; private, 50 MB maximum, accepts JPEG/PNG/WEBP, PDF and VTT files.

Administrators upload learning files. Learners receive content only through policies or short-lived signed links; do not make private premium files public.

## 3. Deploy Edge Functions

From the project folder after installing and logging in to the Supabase CLI:

```text
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy booking-checkout
supabase functions deploy notification-dispatch --no-verify-jwt
supabase functions deploy paystack-webhook --no-verify-jwt
```

Redeploy all pre-existing functions whenever `_shared/core.ts` changes so the suspension check is included:

```text
supabase functions deploy zibur-chat
supabase functions deploy ai-explanation
supabase functions deploy mark-mock-exam
supabase functions deploy generate-study-plan
supabase functions deploy generate-pdf
supabase functions deploy send-email
supabase functions deploy create-checkout
supabase functions deploy premium-checkout
supabase functions deploy subscription-status
supabase functions deploy cancel-subscription
```

## 4. Edge Function secrets

Configure values in Supabase **Edge Functions → Secrets**. Values are never placed in browser files.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `APP_URL` (the production GitHub Pages base URL, without a trailing slash)
- `OPENAI_API_KEY` (existing Zibur feature)
- `OPENAI_MODEL` (existing Zibur feature)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (a contact URI such as `mailto:OWNER_EMAIL`)
- `SCHEDULE_SECRET` (a long random value used only by the scheduled notification request)

The Paystack webhook remains:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

Only Paystack-signed webhook events can confirm a paid booking or premium membership. No card data is stored.

## 5. Enable browser push

Generate one Web Push VAPID key pair using a reputable local Web Push tool. Store the private key only in `VAPID_PRIVATE_KEY`. Copy the public key into `platform-config.js` as `BTV_VAPID_PUBLIC_KEY`. A VAPID public key is intentionally public.

Create a Supabase Cron job which calls `notification-dispatch` every five minutes with this header:

```text
x-schedule-secret: YOUR_SCHEDULE_SECRET
```

The scheduled function publishes due announcements, creates in-app notifications and attempts push delivery. Push failures are recorded and expired browser subscriptions are disabled. In-app notifications continue to work when push is denied or unsupported.

## 6. Initial admin configuration

1. Sign in using a profile whose `role` is `admin`.
2. Open `admin.html`.
3. In **Bookings**, create each service and price. Prices use the smallest currency unit: GHS 250.00 is `25000`.
4. In **Availability**, add working hours for every active service. Users cannot book outside published hours.
5. Add blocked dates for leave and unavailable periods.
6. Create article categories, articles, resources, courses and lessons; publish only reviewed material.
7. Use CSV import for CBT/NCLEX. Imports are inactive review drafts and repeated files are de-duplicated by a SHA-256 source hash.

## 7. GitHub Pages deployment

Upload the **contents** of `work/admin-v8` to the repository root, replacing files of the same name. Do not upload a ZIP as the website. Commit all new files, including `migrations/` and `supabase/functions/`.

After GitHub Pages finishes deploying, open:

```text
https://YOUR_GITHUB_NAME.github.io/YOUR_REPOSITORY/index.html?v=30
```

Use a private/incognito window for the first check. The service-worker cache name is v30, so previous application caches are removed on activation.

## 8. Manual acceptance checklist

### Security and access

- Normal user is redirected from `admin.html`.
- Admin can open every admin section.
- Normal user cannot update `profiles.role` or `profiles.account_type` directly.
- Admin plan/suspension changes create `admin_audit_logs` rows.
- Suspended user is signed out and Edge Functions return 403.
- Free user cannot query premium articles, courses or lessons; premium and admin users can.

### CMS and questions

- Create, preview, publish, unpublish and archive an article.
- Add/edit/publish a course and lesson; test YouTube and Vimeo URLs.
- Upload an allowed learning file; reject an oversized or unsupported file.
- Import a valid CBT and NCLEX CSV twice; the second import does not duplicate questions.
- Review and activate an imported draft before a learner can see it.

### Notifications

- Notification centre shows unread count and supports one/all read state.
- Saving preferences persists category choices.
- Push permission appears only after the user enables push.
- Denied/unsupported push still leaves in-app notifications working.
- Scheduled announcement is published by the scheduled function and delivery is logged.

### Bookings and Paystack

- Configure working hours, then book a free service inside them.
- Booking outside working hours or on a blocked date fails clearly.
- Two users cannot reserve an overlapping active slot.
- Cancellation/reschedule cutoffs are enforced.
- Paid booking opens Paystack, remains pending before webhook, then becomes confirmed only after a valid verified webhook.
- Wrong amount/currency does not confirm a booking.
- Admin can update status, notes and meeting link; CSV export opens correctly.

### Analytics and responsive layout

- 7/30/90-day filters query Supabase and show zero rather than fabricated values.
- CSV export matches displayed metrics.
- Test member centre and admin portal at 360 px, tablet and desktop widths.
- Check the browser console while opening every member/admin tab; no uncaught error should appear.

## External setup still required

- Paystack live mode, business verification, supported settlement currencies and webhook configuration belong to the Paystack account owner.
- Browser push requires externally generated VAPID keys and a scheduled Supabase job.
- OpenAI answers require funded OpenAI API access; ChatGPT billing does not fund API usage.
- YouTube/Vimeo privacy and embedding settings must be configured by the video owner.
- Clinical, immigration and country guidance must be reviewed and kept current by qualified people before publication.

