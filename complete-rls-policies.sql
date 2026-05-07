-- ========================================
-- COMPLETE RLS POLICIES FOR SANKALP APP
-- ========================================
-- This script adds all missing tables and RLS policies
-- Run this in the Supabase SQL Editor to fix access issues

-- ========================================
-- 1. PROFILES TABLE
-- ========================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them (optional - only if you want to replace)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ========================================
-- 2. USER_SUPPLIERS TABLE
-- ========================================
ALTER TABLE IF EXISTS public.user_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own suppliers" ON public.user_suppliers;
DROP POLICY IF EXISTS "Users can insert own suppliers" ON public.user_suppliers;
DROP POLICY IF EXISTS "Users can update own suppliers" ON public.user_suppliers;
DROP POLICY IF EXISTS "Users can delete own suppliers" ON public.user_suppliers;

CREATE POLICY "Users can read own suppliers" ON public.user_suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers" ON public.user_suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers" ON public.user_suppliers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers" ON public.user_suppliers
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 3. USER_PRODUCTS TABLE (Create if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_products (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  unit TEXT,
  sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own products" ON public.user_products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.user_products;
DROP POLICY IF EXISTS "Users can update own products" ON public.user_products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.user_products;

CREATE POLICY "Users can read own products" ON public.user_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON public.user_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON public.user_products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON public.user_products
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 4. USER_SALES TABLE (Create if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_sales (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT,
  phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total DECIMAL(10, 2) NOT NULL,
  date TEXT,
  time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sales" ON public.user_sales;
DROP POLICY IF EXISTS "Users can insert own sales" ON public.user_sales;
DROP POLICY IF EXISTS "Users can update own sales" ON public.user_sales;
DROP POLICY IF EXISTS "Users can delete own sales" ON public.user_sales;

CREATE POLICY "Users can read own sales" ON public.user_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales" ON public.user_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales" ON public.user_sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales" ON public.user_sales
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 5. USER_SESSIONS TABLE (Create if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id INTEGER,
  customer_name TEXT,
  phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  np_val TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.user_sessions;

CREATE POLICY "Users can read own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 6. USER_SUPPLIER_TRANSACTIONS TABLE (Create if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_supplier_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id BIGINT NOT NULL,
  supplier_name TEXT,
  type TEXT NOT NULL, -- 'bill' or 'payment'
  bill_id INTEGER,
  bill_name TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_supplier_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON public.user_supplier_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.user_supplier_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.user_supplier_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.user_supplier_transactions;

CREATE POLICY "Users can read own transactions" ON public.user_supplier_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.user_supplier_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.user_supplier_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.user_supplier_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 7. PAID_PAYMENTS TABLE (Create if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.paid_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.paid_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own paid payments" ON public.paid_payments;
DROP POLICY IF EXISTS "Users can insert own paid payments" ON public.paid_payments;
DROP POLICY IF EXISTS "Users can update own paid payments" ON public.paid_payments;
DROP POLICY IF EXISTS "Users can delete own paid payments" ON public.paid_payments;

CREATE POLICY "Users can read own paid payments" ON public.paid_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paid payments" ON public.paid_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own paid payments" ON public.paid_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own paid payments" ON public.paid_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 8. PENDING_PAYMENTS TABLE (Create if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.pending_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own pending payments" ON public.pending_payments;
DROP POLICY IF EXISTS "Users can insert own pending payments" ON public.pending_payments;
DROP POLICY IF EXISTS "Users can update own pending payments" ON public.pending_payments;
DROP POLICY IF EXISTS "Users can delete own pending payments" ON public.pending_payments;

CREATE POLICY "Users can read own pending payments" ON public.pending_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending payments" ON public.pending_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending payments" ON public.pending_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending payments" ON public.pending_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- INDEXES (For performance)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON public.user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sales_user_id ON public.user_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_supplier_transactions_user_id ON public.user_supplier_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_paid_payments_user_id ON public.paid_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_user_id ON public.pending_payments(user_id);

-- ========================================
-- VERIFICATION QUERY
-- ========================================
-- Run this to verify all policies are set up correctly:
-- SELECT tablename, policyname, permissive, cmd FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;
