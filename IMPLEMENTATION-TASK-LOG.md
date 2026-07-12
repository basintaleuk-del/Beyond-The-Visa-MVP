# Beyond The Visa production platform task log

## Repository audit

- Existing static GitHub Pages application retained (`index.html`, CSS and browser JavaScript).
- Existing Supabase authentication and `profiles` administrator guard retained.
- Existing CBT, NCLEX, document vault, Zibur, journey, budget, coaching and premium modules retained.
- Existing Paystack Edge Functions and verified-webhook architecture retained; no payment secrets are used in browser code.
- Existing admin question editor and question-bank builder retained and extended through separate modules.

## Implementation plan

1. Add ordered, additive SQL migrations with RLS, indexes and secure admin RPC functions.
2. Add a shared browser data/API utility and session-status enforcement.
3. Extend the admin portal with CMS, users, announcements, video, bookings and real analytics.
4. Add the user notification centre, preferences and browser push subscription flow.
5. Add the country/exam-aware learning centre with progress and bookmarks.
6. Add service availability, free/paid bookings, history and Paystack checkout.
7. Add scheduled notification and booking-payment Edge Functions.
8. Validate browser JavaScript, Edge Function TypeScript, SQL ordering and deployment documentation.

## Safety rules used

- All schema changes are additive and idempotent.
- All new tables have RLS enabled.
- Premium content is checked in database policies as well as the interface.
- Administrative mutations use security-definer RPCs which verify `profiles.role = 'admin'` and write an audit record.
- Booking slots use a partial unique index and a transactional RPC to prevent active double bookings.
- Private keys remain Edge Function secrets.
