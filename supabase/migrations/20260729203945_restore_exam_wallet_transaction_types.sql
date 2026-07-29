-- A later Beyond Coins loyalty migration replaced the ledger constraint without
-- the canonical paid-exam types. Restore them without removing any live type.
set local lock_timeout = '5s';

alter table public.btv_wallet_transactions
  drop constraint if exists btv_wallet_transactions_transaction_type_check;

alter table public.btv_wallet_transactions
  add constraint btv_wallet_transactions_transaction_type_check
  check (transaction_type in (
    'welcome','mock_charge','mock_refund','exam_charge','exam_refund','mentor_charge','mentor_refund',
    'reward','purchase','purchase_refund','admin_adjustment','spend','refund','reversal','correction',
    'expiry','promotional_credit','admin_credit','admin_deduction','golden_question_monthly_prize',
    'pending','released','referral_reward','challenge_reward','streak_reward'
  ));
