# Beyond Coins v88 — End-to-End Test Checklist

## Pre-Deployment (Local Supabase)

- [ ] Run migration: `supabase db push` or paste SQL into Supabase editor
- [ ] Verify tables created: `SELECT tablename FROM pg_tables WHERE schemaname='public'`
- [ ] Verify RPC functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_schema='public'`
- [ ] Verify RLS policies: `SELECT policyname FROM pg_policies WHERE tablename='btv_wallets'`

---

## User Journey Tests

### Test 1: New User Receives Welcome Credit

1. **Sign up a new user**
2. **Open browser console and run:**
   ```javascript
   const wallet = await window.BTVExam.getWallet()
   console.log('Balance:', wallet.balance)  // Should be 0 (no welcome credit in v88 yet)
   ```
3. **Expected**: Wallet created with balance 0
4. **Status**: ☐ PASS ☐ FAIL

### Test 2: Attempt 30-Question Exam (Costs 25 BC)

**Assume: User has 150 BC balance**

1. **Go to CBT section, click "Start 30-Question Mock"**
2. **Expected popup**: "You need 25 BC to start this exam. You have 150 BC."
   - ☐ Check balance displays correctly
   - ☐ Check exam cost displays correctly
3. **Click "Confirm" / "Start Exam"**
4. **Verify wallet updates**:
   ```javascript
   const wallet = await window.BTVExam.getWallet()
   console.log('New balance:', wallet.balance)  // Should be 125 (150 - 25)
   ```
5. **Verify transaction recorded**:
   ```javascript
   const txns = await window.BTVExam.getWalletTransactions(1)
   console.log(txns[0])  // Should show SPEND of 25 BC for 'Mock Exam: cbt-30-30'
   ```
6. **Status**: ☐ PASS ☐ FAIL

### Test 3: Idempotency - No Double Charge on Refresh

**Assume: User just started exam in Test 2, balance now 125**

1. **Hard refresh page** (Ctrl+Shift+R)
2. **Go back to CBT section, click "Start 30-Question Mock" again**
3. **Expected**: 
   - No additional popup (exam already in progress)
   - Resume existing attempt
   - Balance remains 125 (no double charge)
4. **Verify via SQL**:
   ```sql
   SELECT reference_id, amount, status FROM btv_wallet_transactions 
   WHERE feature_name LIKE '%cbt-30-30%' 
   ORDER BY created_at DESC LIMIT 1;
   -- Should see only ONE SPEND transaction, status='COMPLETED'
   ```
5. **Status**: ☐ PASS ☐ FAIL

### Test 4: Insufficient Balance - Cannot Start Exam

1. **Create a test user with only 10 BC balance**
   ```sql
   INSERT INTO btv_wallets (user_id, balance) 
   VALUES ('test-user-uuid', 10);
   ```
2. **Sign in as that user**
3. **Go to CBT section, click "Start 60-Question Mock" (costs 50 BC)**
4. **Expected popup**: "You need 50 BC but have only 10 BC. Buy 40 more coins?"
   - ☐ Cannot start exam
   - ☐ Balance remains 10 BC
   - ☐ No transaction created
5. **Status**: ☐ PASS ☐ FAIL

### Test 5: Manual Coin Spend (Generic Feature)

1. **Open console and run**:
   ```javascript
   const result = await window.BTVExam.spendCoins(
     50,
     'Test Feature',
     'Testing manual coin deduction',
     'test-ref-' + Date.now()
   )
   console.log('Deduction result:', result)
   ```
2. **Expected**: `{ success: true, new_balance: 75, ... }`
3. **Verify wallet updated**:
   ```javascript
   const wallet = await window.BTVExam.getWallet()
   console.log('Balance after spend:', wallet.balance)  // Should be 75
   ```
4. **Status**: ☐ PASS ☐ FAIL

### Test 6: Exam Completion + Score Recording

1. **Complete a started exam** (answer all questions)
2. **Submit exam with score 24/30 (80%)**
3. **Expected**:
   - Exam marked as SUBMITTED
   - Score recorded in database
   - User sees results page
4. **Verify via SQL**:
   ```sql
   SELECT id, status, score, total_questions FROM btv_exam_attempts 
   ORDER BY started_at DESC LIMIT 1;
   -- Should show: status='GRADED', score=24, total_questions=30
   ```
5. **Status**: ☐ PASS ☐ FAIL

### Test 7: Concurrent Exam Attempts (Prevent Race Condition)

1. **Open exam page in browser tab 1**
2. **Open same exam page in browser tab 2** (same user, same exam code)
3. **Click "Start" in tab 1**
4. **Immediately click "Start" in tab 2** (within 1 second)
5. **Expected**:
   - Only ONE exam attempt created
   - Coins deducted exactly once (25 or 50 BC)
   - Both tabs show same attempt ID
6. **Verify via SQL**:
   ```sql
   SELECT COUNT(*) FROM btv_exam_attempts 
   WHERE user_id = 'test-user' AND exam_product_id = 'cbt-30-30';
   -- Should be 1 (only one attempt)
   ```
7. **Status**: ☐ PASS ☐ FAIL

---

## Security Tests

### Test S1: User Cannot Directly Modify Wallet

1. **Open console and attempt**:
   ```javascript
   const result = await window.btvSupabase
     .from('btv_wallets')
     .update({ balance: 9999 })
     .eq('user_id', (await window.btvSupabase.auth.getUser()).data.user.id)
     .select()
   console.log('Result:', result)
   ```
2. **Expected**: Error with `code: 'PGRST301'` (RLS policy violation)
3. **Status**: ☐ PASS ☐ FAIL

### Test S2: User Cannot Insert Transactions Directly

1. **Open console and attempt**:
   ```javascript
   const result = await window.btvSupabase
     .from('btv_wallet_transactions')
     .insert([{ user_id: '...', amount: 1000, transaction_type: 'EARN' }])
     .select()
   console.log('Result:', result)
   ```
2. **Expected**: Error (RLS policy violation)
3. **Status**: ☐ PASS ☐ FAIL

### Test S3: User Cannot See Other Users' Wallets

1. **Sign in as user A**
2. **Open console and attempt to query user B's wallet**:
   ```javascript
   const result = await window.btvSupabase
     .from('btv_wallets')
     .select('*')
     .eq('user_id', 'user-b-uuid')
   console.log('Result:', result)  // Should return empty or error
   ```
3. **Expected**: Empty result (RLS hides other users' data)
4. **Status**: ☐ PASS ☐ FAIL

---

## Performance Tests

### Test P1: Wallet Balance Query < 100ms

1. **Run**:
   ```javascript
   console.time('getWallet')
   await window.BTVExam.getWallet()
   console.timeEnd('getWallet')
   ```
2. **Expected**: < 100ms
3. **Status**: ☐ PASS ☐ FAIL

### Test P2: Exam Start (Coin Deduction) < 500ms

1. **Run**:
   ```javascript
   console.time('startExam')
   await window.BTVCoins.start('cbt-30-30')
   console.timeEnd('startExam')
   ```
2. **Expected**: < 500ms (network latency included)
3. **Status**: ☐ PASS ☐ FAIL

---

## Monitoring (Post-Deployment)

### Daily Checks

- [ ] Monitor `btv_wallet_transactions` table: any status='FAILED' entries?
- [ ] Check for duplicate reference_ids (should be unique)
- [ ] Review wallet balance distribution (sanity check for outliers)

### Weekly Checks

- [ ] Total coins in system (sum of all balances) matches expected (prices × attempts)
- [ ] No orphaned exam attempts without corresponding wallet transactions
- [ ] Average time to complete exam start < 1 second

---

## Sign-Off

**Tester Name**: ________________  
**Date**: ________________  
**All Tests Passed**: ☐ YES ☐ NO  

**If NO, list failures:**

---

**Ready for Production**: ☐ YES ☐ NO
