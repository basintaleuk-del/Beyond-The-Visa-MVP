# Today’s Golden Question v126

## What ships

The homepage now has a responsive gold-and-green daily challenge card, secure answer submission, London-midnight countdown, monthly score and rank, sharing, competition rules, history and moderated discussion. `golden-question.html` is the privacy-safe public share preview. The Admin Portal has a Golden Question Centre for the dashboard, question bank, scheduling, leaderboards, prizes, moderation and settings.

## Supabase setup

1. Apply `supabase/migrations/202607250002_golden_question_v126.sql` in migration order.
2. Deploy the `golden-question` Edge Function. It uses the platform-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; no new application secret is required.
3. Confirm the private `golden-question-images` bucket exists. The migration limits it to JPG, PNG and WebP files up to 5 MB. Only admins can upload or manage files; member image delivery uses short-lived signed URLs.
4. Add approved, active Nursing and Midwifery questions in Admin Portal → Golden Question. Seed at least one per profession before launch.
5. Review Settings, competition terms, public naming rules, monthly 500 BC reward and sponsor wording. Add sponsor/fulfilment records as needed.
6. Configure a daily scheduled call shortly after 00:00 Europe/London using the service-role key in the `apikey` header and body `{"action":"cron","operation":"daily"}`. The first authenticated member request is also safe to create a missing assignment atomically. At month end call the same function with `{"action":"cron","operation":"month_end","month":"YYYY-MM-01"}` for the closed month.

## Selection and winner flow

The Edge Function derives the Europe/London calendar date, reuses the unique profession/date assignment, honours manual schedules, and otherwise selects from approved, active, publishable questions. It exhausts unseen pool items before cycling. A partial unique index prevents competing live assignments.

At month end `btv_freeze_golden_month` stores immutable Nursing and Midwifery ranking snapshots and creates pending-review winner records. Tie order is points, correct answers, accuracy, longest valid streak and earliest final tied score. An admin investigates eligibility and suspicious activity, marks the winner approved, then uses the Admin Centre to award the prize.

`btv_award_golden_winner` locks the winner and existing wallet, writes one immutable `btv_wallet_transactions` record with transaction type `golden_question_monthly_prize`, updates `btv_wallets`, creates an in-app notification, and records the transaction on the winner. The winner ID is the idempotency key, so retries cannot credit twice.

## Manual checks

- Confirm each existing profile profession maps to Nursing or Midwifery; users without one see a locked profession chooser.
- Review pending short answers and reported comments regularly.
- Record winner contact and sponsor shipping information only in private fulfilment records.
- Deploy the web build after the migration and Edge Function, so the card never launches without its secure backend.
