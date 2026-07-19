# Beyond Coins v87 — live acceptance checklist

Use Paystack test mode and a fresh test account. Record screenshots, transaction references, wallet balances, and attempt IDs.

## A. Account and welcome credit

- [ ] Create a new account and complete onboarding.
- [ ] Confirm the wallet shows exactly **150 BC**.
- [ ] Sign out/in and refresh several times; confirm the welcome credit is not repeated.
- [ ] Confirm one welcome-credit ledger entry exists and its balance matches the wallet.

## B. Coin purchase

- [ ] Open the Beyond Coins hub and select an active package.
- [ ] Confirm package price and coin quantity come from the server response.
- [ ] Complete a Paystack test payment.
- [ ] Confirm the callback returns to the app and the webhook receives `charge.success`.
- [ ] Confirm the purchase becomes `paid` and records the Paystack reference.
- [ ] Confirm the wallet increases by exactly the purchased coins.
- [ ] Replay the callback/webhook; confirm no second credit or duplicate ledger entry appears.

## C. Paid 30-question exam

- [ ] Select the correct exam for the user's destination and profession.
- [ ] Confirm the 30-question / 30-minute product displays **25 BC**.
- [ ] Confirm the pre-start dialog shows price, duration, question count, and resulting balance.
- [ ] Start it and confirm exactly 25 BC is debited once.
- [ ] Confirm the attempt contains exactly 30 snapshotted questions.
- [ ] Refresh or close/reopen; confirm the same attempt resumes and no second debit occurs.
- [ ] Confirm answers and rationales are absent before submission.
- [ ] Submit; confirm server-side score and review become available.

## D. Paid 60-question exam

- [ ] Repeat section C for 60 questions / 60 minutes / **50 BC**.
- [ ] Confirm exactly 60 questions and one 50 BC debit.

## E. Failure and concurrency safety

- [ ] With insufficient balance, confirm the exam does not start and no debit occurs.
- [ ] Deactivate a product and confirm it cannot be purchased or started.
- [ ] Temporarily reduce a product's mapped question bank below its required count; confirm `QUESTION_BANK_INCOMPLETE` and no debit.
- [ ] Double-click Start or send two simultaneous start requests; confirm one attempt and one debit.
- [ ] Retry submit; confirm the existing result is returned without duplicating rewards or transactions.

## F. Free daily questions

- [ ] Complete 10 free questions for one exam family.
- [ ] Confirm question 11 is blocked until the next UTC day.
- [ ] Refresh or use another browser; confirm the server limit remains enforced.

## G. Admin and refunds

- [ ] Search products, attempts, payments, and ledger entries in Admin.
- [ ] Confirm purchase amount, coins, user, reference, status, and timestamps are readable.
- [ ] Refund one eligible exam from Admin.
- [ ] Confirm one compensating credit transaction is created and the attempt is marked refunded.
- [ ] Try refunding it again; confirm a second refund is blocked.

## Release gate

Production launch is approved only when all items above pass against the deployed Supabase project and Paystack test environment. Local automated tests do not replace this live acceptance test.

