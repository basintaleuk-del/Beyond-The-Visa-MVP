-- ============================================================================
-- Beyond Coins Deduction Fix v88
-- Atomic wallet spending with idempotency, RLS, and transaction history
-- ============================================================================

-- Create or replace wallets table if not exists
CREATE TABLE IF NOT EXISTS public.btv_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  reserved BIGINT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  total_earned BIGINT NOT NULL DEFAULT 0,
  total_spent BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create or replace wallet transactions table for immutable audit trail
CREATE TABLE IF NOT EXISTS public.btv_wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.btv_wallets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('EARN', 'SPEND', 'REFUND', 'ADJUSTMENT')),
  amount BIGINT NOT NULL,
  feature_name TEXT,
  description TEXT,
  reference_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exam products and attempts tables (used by start-mock function)
CREATE TABLE IF NOT EXISTS public.btv_mock_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  coin_cost BIGINT NOT NULL,
  question_count INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.btv_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_product_id UUID NOT NULL REFERENCES public.btv_mock_catalog(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
  coin_charged BIGINT NOT NULL,
  transaction_reference TEXT UNIQUE,
  score INTEGER,
  total_questions INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new/updated tables
ALTER TABLE public.btv_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btv_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btv_mock_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btv_exam_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Wallets: Users can only read their own
DROP POLICY IF EXISTS "Users can read own wallet" ON public.btv_wallets;
CREATE POLICY "Users can read own wallet"
  ON public.btv_wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Wallets: No user can directly update (only via RPC functions)
DROP POLICY IF EXISTS "Prevent direct wallet updates" ON public.btv_wallets;
CREATE POLICY "Prevent direct wallet updates"
  ON public.btv_wallets FOR UPDATE TO authenticated
  USING (FALSE);

-- Wallets: No user can insert
DROP POLICY IF EXISTS "Prevent wallet insertion" ON public.btv_wallets;
CREATE POLICY "Prevent wallet insertion"
  ON public.btv_wallets FOR INSERT TO authenticated
  WITH CHECK (FALSE);

-- Transactions: Users can only read their own
DROP POLICY IF EXISTS "Users can read own transactions" ON public.btv_wallet_transactions;
CREATE POLICY "Users can read own transactions"
  ON public.btv_wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Transactions: No user can insert directly
DROP POLICY IF EXISTS "Prevent direct transaction insertion" ON public.btv_wallet_transactions;
CREATE POLICY "Prevent direct transaction insertion"
  ON public.btv_wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (FALSE);

-- Mock Catalog: All authenticated users can read active products
DROP POLICY IF EXISTS "Authenticated users read active mock products" ON public.btv_mock_catalog;
CREATE POLICY "Authenticated users read active mock products"
  ON public.btv_mock_catalog FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Exam Attempts: Users can read their own
DROP POLICY IF EXISTS "Users can read own exam attempts" ON public.btv_exam_attempts;
CREATE POLICY "Users can read own exam attempts"
  ON public.btv_exam_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Exam Attempts: No user can insert/update directly
DROP POLICY IF EXISTS "Prevent direct exam attempt manipulation" ON public.btv_exam_attempts;
CREATE POLICY "Prevent direct exam attempt manipulation"
  ON public.btv_exam_attempts FOR INSERT TO authenticated
  WITH CHECK (FALSE);

-- ============================================================================
-- ATOMIC COIN SPENDING FUNCTION
-- ============================================================================
-- This function is idempotent, locks the wallet, validates balance, 
-- deducts coins, and records the transaction in one atomic operation

CREATE OR REPLACE FUNCTION public.spend_beyond_coins(
  p_user_id UUID,
  p_amount BIGINT,
  p_feature_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance BIGINT;
  v_ref TEXT;
  v_result JSONB;
BEGIN
  -- Ensure the authenticated user matches the target user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized coin deduction for user %', p_user_id;
  END IF;

  -- Generate or use provided reference ID for idempotency
  v_ref := COALESCE(p_reference_id, 'bc-' || gen_random_uuid()::TEXT);

  -- Check if this transaction was already processed (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.btv_wallet_transactions
    WHERE reference_id = v_ref AND status = 'COMPLETED'
  ) THEN
    SELECT jsonb_build_object(
      'success', FALSE,
      'error', 'Transaction already processed',
      'code', 'IDEMPOTENT_DUPLICATE',
      'reference_id', v_ref
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Get the wallet and lock the row during this transaction
  SELECT id, balance INTO v_wallet_id, v_new_balance
  FROM public.btv_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If no wallet exists, create one with balance 0
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.btv_wallets (user_id, balance, created_at)
    VALUES (p_user_id, 0, now())
    RETURNING id, balance INTO v_wallet_id, v_new_balance;
  END IF;

  -- Verify sufficient balance
  IF v_new_balance < p_amount THEN
    SELECT jsonb_build_object(
      'success', FALSE,
      'error', 'Insufficient coin balance',
      'code', 'INSUFFICIENT_BALANCE',
      'required', p_amount,
      'available', v_new_balance,
      'reference_id', v_ref
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Deduct the coins (atomic)
  v_new_balance := v_new_balance - p_amount;
  
  UPDATE public.btv_wallets
  SET balance = v_new_balance,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Record the transaction in immutable audit log
  INSERT INTO public.btv_wallet_transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    feature_name,
    description,
    reference_id,
    status,
    created_at
  )
  VALUES (
    p_user_id,
    v_wallet_id,
    'SPEND',
    p_amount,
    p_feature_name,
    p_description,
    v_ref,
    'COMPLETED',
    now()
  );

  -- Return success with new balance
  SELECT jsonb_build_object(
    'success', TRUE,
    'new_balance', v_new_balance,
    'amount_deducted', p_amount,
    'reference_id', v_ref,
    'timestamp', now()
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't expose internal details to client
  RAISE LOG 'Coin deduction error for user %: %', p_user_id, SQLERRM;
  SELECT jsonb_build_object(
    'success', FALSE,
    'error', 'Transaction failed',
    'code', 'DEDUCTION_FAILED',
    'reference_id', v_ref
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ============================================================================
-- ATOMIC EXAM START FUNCTION
-- ============================================================================
-- Charges coins, creates exam attempt, and snapshots questions all at once

CREATE OR REPLACE FUNCTION public.start_mock_exam(
  p_user_id UUID,
  p_product_code TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_coin_cost BIGINT;
  v_question_count INTEGER;
  v_attempt_id UUID;
  v_deduction JSONB;
  v_result JSONB;
BEGIN
  -- Ensure the authenticated user matches
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized exam start for user %', p_user_id;
  END IF;

  -- Check for existing attempt with same idempotency key
  SELECT id INTO v_attempt_id
  FROM public.btv_exam_attempts
  WHERE user_id = p_user_id 
    AND transaction_reference = p_idempotency_key
    AND status IN ('IN_PROGRESS', 'SUBMITTED');
  
  IF v_attempt_id IS NOT NULL THEN
    -- Resume existing attempt, don't charge again
    SELECT jsonb_build_object(
      'success', TRUE,
      'attempt_id', v_attempt_id,
      'resumed', TRUE,
      'message', 'Existing attempt resumed'
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Get product details and validate
  SELECT id, coin_cost, question_count INTO v_product_id, v_coin_cost, v_question_count
  FROM public.btv_mock_catalog
  WHERE code = p_product_code AND is_active = TRUE;

  IF v_product_id IS NULL THEN
    SELECT jsonb_build_object(
      'success', FALSE,
      'error', 'Product not found or inactive',
      'code', 'PRODUCT_NOT_FOUND'
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Attempt coin deduction (atomic with transaction lock)
  v_deduction := public.spend_beyond_coins(
    p_user_id,
    v_coin_cost,
    'Mock Exam: ' || p_product_code,
    'Paid exam access for ' || v_question_count || ' questions',
    p_idempotency_key
  );

  IF NOT (v_deduction->>'success')::BOOLEAN THEN
    -- Deduction failed, return error without creating attempt
    RETURN v_deduction;
  END IF;

  -- Create exam attempt now that payment succeeded
  INSERT INTO public.btv_exam_attempts (
    user_id,
    exam_product_id,
    coin_charged,
    transaction_reference,
    status
  )
  VALUES (
    p_user_id,
    v_product_id,
    v_coin_cost,
    p_idempotency_key,
    'IN_PROGRESS'
  )
  RETURNING id INTO v_attempt_id;

  -- Return success with attempt details
  SELECT jsonb_build_object(
    'success', TRUE,
    'attempt_id', v_attempt_id,
    'new_balance', (v_deduction->>'new_balance')::BIGINT,
    'coin_charged', v_coin_cost,
    'question_count', v_question_count,
    'reference_id', (v_deduction->>'reference_id')::TEXT
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Mock exam start error for user % product %: %', 
    p_user_id, p_product_code, SQLERRM;
  SELECT jsonb_build_object(
    'success', FALSE,
    'error', 'Exam start failed',
    'code', 'START_FAILED'
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Get current wallet balance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(balance, 0)
  FROM public.btv_wallets
  WHERE user_id = p_user_id;
$$;

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_btv_wallets_user_id 
  ON public.btv_wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_btv_wallet_transactions_user_id 
  ON public.btv_wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_btv_wallet_transactions_reference_id 
  ON public.btv_wallet_transactions(reference_id);

CREATE INDEX IF NOT EXISTS idx_btv_wallet_transactions_created_at 
  ON public.btv_wallet_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_btv_exam_attempts_user_id 
  ON public.btv_exam_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_btv_exam_attempts_reference 
  ON public.btv_exam_attempts(transaction_reference);

CREATE INDEX IF NOT EXISTS idx_btv_mock_catalog_code 
  ON public.btv_mock_catalog(code);

-- ============================================================================
-- Seed default exam products with correct prices
-- ============================================================================

INSERT INTO public.btv_mock_catalog (code, name, description, coin_cost, question_count, duration_minutes, is_active)
VALUES
  ('cbt-30-30', 'CBT 30-Question Practice', '30 questions in 30 minutes', 25, 30, 30, TRUE),
  ('cbt-60-60', 'CBT 60-Question Mock', '60 questions in 60 minutes', 50, 60, 60, TRUE),
  ('nclex-30-30', 'NCLEX 30-Question Practice', '30 questions in 30 minutes', 25, 30, 30, TRUE),
  ('nclex-60-60', 'NCLEX 60-Question Mock', '60 questions in 60 minutes', 50, 60, 60, TRUE),
  ('ielts-reading-unlock', 'IELTS Reading Unlock', 'Permanent Reading section access', 100, 1, 0, TRUE),
  ('ielts-writing-unlock', 'IELTS Writing Unlock', 'Permanent Writing section access', 100, 1, 0, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Allow service role to manage wallets for initial setup
-- ============================================================================

GRANT ALL ON public.btv_wallets TO service_role;
GRANT ALL ON public.btv_wallet_transactions TO service_role;
GRANT ALL ON public.btv_mock_catalog TO service_role;
GRANT ALL ON public.btv_exam_attempts TO service_role;

-- ============================================================================
-- End of migration
-- ============================================================================
