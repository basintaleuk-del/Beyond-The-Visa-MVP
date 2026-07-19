# Beyond Coins v87 — installation and deployment

This release replaces Premium-gated exam access with the Beyond Coins wallet, paid mock-exam products, secure server-side debits, and Paystack coin purchases.

## Before deploying

1. In Supabase Edge Function secrets, confirm these values exist:
   - `PAYSTACK_SECRET_KEY`: your Paystack **test** secret key for acceptance testing, then the live secret key at launch.
   - `APP_URL`: `https://beyondthevisa.org`
2. Keep all secret keys in Supabase. Never place a Paystack secret key in browser JavaScript or GitHub.
3. Start in Paystack test mode.

## 1. Apply the database migration

Open Supabase **SQL Editor**, create a new query, paste the complete contents of:

`supabase/migrations/202607180002_beyond_coins_exam_platform_v87.sql`

Click **Run** once. The migration is repeat-safe where practical, but it should still be recorded and applied only once per environment.

The migration creates or updates the authoritative wallet ledger, exam products, attempts, question snapshots, payment records, daily free limits, refund support, row-level security, and atomic exam-start/submit functions.

## 2. Deploy the Edge Functions

From this project folder, sign in and link the Supabase CLI if needed:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Deploy the five functions:

```powershell
npx supabase functions deploy coin-checkout
npx supabase functions deploy coin-verify
npx supabase functions deploy paystack-webhook --no-verify-jwt
npx supabase functions deploy start-mock
npx supabase functions deploy exam-attempt
```

The included `supabase/config.toml` also declares that `paystack-webhook` does not require a user JWT. The webhook verifies Paystack's HMAC signature instead.

## 3. Configure Paystack webhook

In Paystack Dashboard → Settings → API Keys & Webhooks, set the webhook URL to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

The handler accepts `charge.success`, verifies the `x-paystack-signature` using HMAC SHA-512, verifies the transaction details with Paystack, and credits each payment reference no more than once.

Official references: [Paystack webhooks](https://paystack.com/docs/payments/webhooks/) and [Paystack refunds](https://paystack.com/docs/api/refund/).

## 4. Publish the website files

Upload the contents of `web` to the GitHub Pages repository root, replacing matching files. Do not upload the ZIP itself. Confirm these new files are visible:

- `coin-exam-service-v87.js`
- `coin-access-v87.js`
- `coin-access-v87.css`
- `admin-v87.js`
- `admin-v87.css`

Wait for GitHub Pages deployment, then open `https://beyondthevisa.org/?v=87` in a private window.

## 5. Populate and validate question banks

CBT Adult Nursing products require explicit product-to-question mappings. Every active timed product must contain at least its advertised question count before it can charge a user. If the bank is short, the server returns `QUESTION_BANK_INCOMPLETE` and makes no debit.

IELTS and OSCE timed products also require sufficient active database questions before activation. The IELTS Reading/Writing permanent unlocks can use the existing client learning bank, but timed mocks must use the server question bank.

## 6. Run live acceptance testing

Follow `BEYOND-COINS-v87-E2E-CHECKLIST.md`. Do not switch Paystack to live mode until every item passes.

## Rollback and support

Keep a database backup and the previous web release before deployment. If a payment succeeds but the wallet is not credited, do not manually re-run payment callbacks: inspect the purchase row, webhook logs, and payment reference first. The unique reference and confirmation function are designed to prevent duplicate credit.

