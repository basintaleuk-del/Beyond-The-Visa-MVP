# Beyond Coins v87 — change record

## Root cause corrected

The previous implementation mixed Premium membership, browser-side unlock state, more than one wallet/transaction model, and mock selection that could change after refresh. Payment confirmation, access, question selection, and debiting were not one authoritative server workflow.

v87 separates these responsibilities and makes Supabase the source of truth:

1. Paystack purchases create a pending server record.
2. Callback/webhook verification confirms exact reference, amount, currency, and status.
3. One idempotent confirmation credits the authoritative Beyond Coins ledger.
4. Starting a paid exam locks the wallet row, validates the complete bank, snapshots exact questions, creates one attempt, and debits once in one transaction.
5. Refresh resumes the stored attempt; it does not select a new set or charge again.
6. Submission is scored server-side and reveals review data only after submission.

## Main changes

- Replaced Premium exam gating with Beyond Coins products and server-controlled prices.
- Added exactly-once 150 BC welcome credit and reconciliation for existing users.
- Added 25 BC / 30-question / 30-minute and 50 BC / 60-question / 60-minute products.
- Added secure Paystack checkout, verification, signed webhook, and idempotent crediting.
- Added atomic exam start, resume, submit, daily free-limit, and refund database functions.
- Added immutable question snapshots for paid attempts.
- Added admin management for exam products, packages, attempts, bank health, refunds, payments, and ledger search.
- Added live wallet balance in the app header and refreshed wallet/exam dialogs.
- Removed stale Premium membership language and client-side access overrides from current exam and IELTS flows.
- Added automated contract tests for payment, wallet, concurrency, question-count, scoring, refund, RLS, and UI integration rules.

## Verification completed locally

- 57 automated tests passed with zero failures.
- QA checks passed with zero failures and zero warnings.
- Web production build completed.
- TypeScript checks completed without errors.

## Production acceptance still required

This environment did not have authorised access to deploy the migration/functions or complete a real Paystack transaction against the user's live Supabase project. Follow the installation guide and live E2E checklist. IELTS/OSCE timed products must not be activated until their server banks meet the advertised question counts.

