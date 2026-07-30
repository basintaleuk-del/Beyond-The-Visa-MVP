# Beyond The Visa web push notifications

This release upgrades the existing Supabase notification, preference and push-subscription system. It does not create a second authentication, profile or destination system.

## Configuration

1. Generate VAPID keys locally:

   ```powershell
   npx web-push generate-vapid-keys
   ```

2. Add the following Vercel Production, Preview and Development environment variables:

   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — safe to expose to the browser.
   - `VAPID_PRIVATE_KEY` — server only.
   - `VAPID_SUBJECT` — normally `mailto:support@beyondthevisa.org`.
   - Existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.

3. Apply `supabase/migrations/20260731010000_web_push_notifications_v250.sql`.
4. Deploy the site. Never place the VAPID private key or Supabase service-role key in browser files.

## Safe testing

1. Use a non-production member and administrator account.
2. Open Account → Preferences → Devices & browser push.
3. Select **Enable notifications**. The browser prompt only appears after this action.
4. In Admin → Notification centre, use **Send test to me**. This targets only the signed-in administrator.
5. Confirm the in-site record appears, the unread badge increments and the browser notification opens the internal target.
6. Disable notifications and confirm the browser subscription is unsubscribed and the Supabase record is inactive.
7. Test denied and unsupported permission states without repeatedly prompting.
8. On iPhone or iPad, open in Safari, add the site to the Home Screen, launch the installed app, then enable notifications.

Do not use a broad audience while testing. The admin sender requires an explicit audience confirmation and idempotency key.

## Delivery architecture

- `/api/push-subscription` validates the signed-in user and calls owner-scoped Supabase RPCs.
- `/api/notification-dispatch` requires an existing administrator role, validates content and internal URLs, resolves profile-based targeting and sends in batches.
- `/api/notification-scheduler` requires `CRON_SECRET`, processes due campaigns every 15 minutes and creates deduplicated matching-job alerts.
- Daily, weekly and quiet-hours notifications are queued and released as consolidated push summaries by the scheduler.
- Delivery attempts are written to `notification_delivery_logs`; HTTP 404/410 endpoints are deactivated.
- The existing service worker displays notifications, prevents duplicate tags and focuses or opens the correct internal page.
- In-site records remain available when push is unsupported or disabled.

## Browser limitations

- Chromium desktop and Android support background web push when browser and operating-system settings allow it.
- Safari support varies by macOS version.
- iPhone and iPad web push requires a supported iOS/iPadOS version and a Home Screen-installed web app.
- Browsers and operating systems control final notification styling, vibration, action buttons and whether delivery occurs after the browser is force-quit.
- Email toggles are stored, but email delivery is only used when the existing email provider is configured; this release does not introduce a second email provider.
