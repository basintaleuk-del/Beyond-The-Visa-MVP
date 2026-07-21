# Beyond Coins v88 — Deployment Guide

## Overview

v88 fixes the coin deduction system with:
- **Atomic transactions**: Wallet lock + coin deduction + audit log in one operation
- **Idempotency keys**: Re-running the same exam start never double-charges
- **Row-Level Security**: Users cannot modify their own wallets via direct SQL
- **Server-side validation**: All coin logic is in Postgres functions, not JavaScript

---

## Deployment Steps

### 1. Apply Database Migration

In **Supabase SQL Editor**:

```sql
-- Copy entire contents of supabase/migrations/202607210001_beyond_coins_deduction_fix_v88.sql
-- Paste and run
```

**What this does:**
- Creates `btv_wallets`, `btv_wallet_transactions`, `btv_exam_attempts` tables
- Enables RLS: users cannot directly update wallets
- Creates `spend_beyond_coins()` RPC function (atomic, idempotent)
- Creates `start_mock_exam()` RPC function (charges coins + creates attempt)
- Seeds default exam products with correct prices (25/50 BC)

---

### 2. Update Frontend Service Files

Replace in your web repository:

- `coin-exam-service-v88.js` → main site
- `web/coin-exam-service-v88.js` → GitHub Pages deployment

**Changes from v87:**
- `startPaidExam()` now calls `start_mock_exam()` RPC (atomic)
- Added `spendCoins()` function for manual coin deductions
- Removed Paystack checkout calls (those stay in v77 wallet module)
- All coin logic delegated to Supabase RPC functions

---

### 3. Test Coin Deduction

#### Via Browser Console:

```javascript
// 1. Get wallet balance
await window.BTVExam.getWallet()
// → { balance: 150, reserved: 0, ... }

// 2. Start a paid exam (charges coins atomically)
const result = await window.BTVCoins.start('cbt-30-30')
// → { success: true, new_balance: 125, attempt_id: '...', coin_charged: 25 }

// 3. Verify balance decreased
await window.BTVExam.getWallet()
// → { balance: 125, reserved: 0, ... }

// 4. Try starting same exam again with same idempotency key (should not double-charge)
const result2 = await window.BTVCoins.start('cbt-30-30')
// → { success: true, resumed: true, attempt_id: '...', message: 'Existing attempt resumed' }
```

#### Via SQL (Admin Check):

```sql
SELECT user_id, balance, total_spent FROM btv_wallets ORDER BY updated_at DESC LIMIT 1;
SELECT reference_id, amount, status, created_at FROM btv_wallet_transactions WHERE transaction_type='SPEND' ORDER BY created_at DESC LIMIT 5;
```

---

## Security: Row-Level Security Policies

| Table | Policy | Effect |
|-------|--------|--------|
| `btv_wallets` | SELECT: user_id = auth.uid() | Users only read own wallet |
| `btv_wallets` | UPDATE: FALSE | No user can update wallets directly |
| `btv_wallets` | INSERT: FALSE | No user can create wallets |
| `btv_wallet_transactions` | SELECT: user_id = auth.uid() | Users only read own transactions |
| `btv_wallet_transactions` | INSERT: FALSE | Transactions only via RPC |
| `btv_exam_attempts` | SELECT: user_id = auth.uid() | Users only read own attempts |
| `btv_exam_attempts` | INSERT/UPDATE: FALSE | Attempts only via RPC |

**This means:**
- A user cannot run `UPDATE btv_wallets SET balance = 999 WHERE user_id = auth.uid()`
- A user cannot call `INSERT INTO btv_wallet_transactions` directly
- All coin logic is *server-side only*

---

## Idempotency: How to Avoid Double-Charging

The `start_mock_exam()` RPC uses `p_idempotency_key` to ensure the same exam start is never charged twice:

```javascript
// First attempt:
await window.BTVCoins.start('cbt-30-30')  // Generates idempotency key like 'exam-cbt-30-30-1626849600000'
// → Creates attempt, charges 25 BC

// Network error or user refresh within same millisecond:
await window.BTVCoins.start('cbt-30-30')  // Same key generated
// → RPC detects duplicate, resumes existing attempt, no charge
```

The key is stored in `sessionStorage` and included in all RPC calls.

---

## Pricing Reference (Seeded in Migration)

| Code | Name | Cost (BC) | Questions | Duration |
|------|------|-----------|-----------|----------|
| `cbt-30-30` | CBT 30-Question Practice | 25 | 30 | 30 min |
| `cbt-60-60` | CBT 60-Question Mock | 50 | 60 | 60 min |
| `nclex-30-30` | NCLEX 30-Question Practice | 25 | 30 | 30 min |
| `nclex-60-60` | NCLEX 60-Question Mock | 50 | 60 | 60 min |
| `ielts-reading-unlock` | IELTS Reading Unlock | 100 | 1 | — |
| `ielts-writing-unlock` | IELTS Writing Unlock | 100 | 1 | — |

---

## Rollback Plan

If you need to revert to v87:

1. **Keep a backup** of the v88 database (run manually before any exam starts)
2. **Keep the v87 web files** in your previous release branch
3. **In Supabase**, the RPC functions are backward-compatible. The tables exist in v87, so just point the frontend back to v87 files.

---

## Known Limitations

- **No partial refunds yet**: If an exam is submitted and the grade is very low, a refund must be processed manually via SQL for now.
- **Paystack integration**: The payment webhook (coin-verify) is in v77 wallet module. Verify it still works after this deployment.
- **Question snapshots**: v88 does not yet snapshot exam questions at attempt start. This is deferred to v89.

---

## Next Steps

1. Test in Supabase development environment first
2. Run full end-to-end test suite from `BEYOND-COINS-v88-E2E-CHECKLIST.md`
3. Deploy to production after QA passes
4. Monitor wallet transaction logs for any anomalies

**Support**: If coins are deducted but attempt not created, check `btv_wallet_transactions` table for the reference_id and manually inspect the error.
