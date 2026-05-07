-- Complete RLS Policies for Sankalp App
-- Single-user model: each user can only access their own data

-- ====================================
-- 1. PROFILES TABLE (special: uses id, not user_id)
-- ====================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ====================================
-- 2. USER_PRODUCTS TABLE
-- ====================================
ALTER TABLE IF EXISTS public.user_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON public.user_products;
DROP POLICY IF EXISTS "products_insert" ON public.user_products;
DROP POLICY IF EXISTS "products_update" ON public.user_products;
DROP POLICY IF EXISTS "products_delete" ON public.user_products;

CREATE POLICY "products_select" ON public.user_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert" ON public.user_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update" ON public.user_products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_delete" ON public.user_products
  FOR DELETE USING (auth.uid() = user_id);

-- ====================================
-- 3. USER_SALES TABLE
-- ====================================
ALTER TABLE IF EXISTS public.user_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_select" ON public.user_sales;
DROP POLICY IF EXISTS "sales_insert" ON public.user_sales;
DROP POLICY IF EXISTS "sales_update" ON public.user_sales;
DROP POLICY IF EXISTS "sales_delete" ON public.user_sales;

CREATE POLICY "sales_select" ON public.user_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sales_insert" ON public.user_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_update" ON public.user_sales
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_delete" ON public.user_sales
  FOR DELETE USING (auth.uid() = user_id);

-- ====================================
-- 4. USER_SESSIONS TABLE
-- ====================================
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select" ON public.user_sessions;
DROP POLICY IF EXISTS "sessions_insert" ON public.user_sessions;
DROP POLICY IF EXISTS "sessions_update" ON public.user_sessions;
DROP POLICY IF EXISTS "sessions_delete" ON public.user_sessions;

CREATE POLICY "sessions_select" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_delete" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ====================================
-- 5. USER_SUPPLIERS TABLE
-- ====================================
ALTER TABLE IF EXISTS public.user_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_select" ON public.user_suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON public.user_suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON public.user_suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON public.user_suppliers;

CREATE POLICY "suppliers_select" ON public.user_suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "suppliers_insert" ON public.user_suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "suppliers_update" ON public.user_suppliers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "suppliers_delete" ON public.user_suppliers
  FOR DELETE USING (auth.uid() = user_id);

-- ====================================
-- 6. USER_SUPPLIER_TRANSACTIONS TABLE
-- ====================================
ALTER TABLE IF EXISTS public.user_supplier_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select" ON public.user_supplier_transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.user_supplier_transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.user_supplier_transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.user_supplier_transactions;

CREATE POLICY "transactions_select" ON public.user_supplier_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert" ON public.user_supplier_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update" ON public.user_supplier_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete" ON public.user_supplier_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ====================================
-- 7. PAID_PAYMENTS TABLE
-- ====================================
ALTER TABLE IF EXISTS public.paid_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paid_payments_select" ON public.paid_payments;
DROP POLICY IF EXISTS "paid_payments_insert" ON public.paid_payments;
DROP POLICY IF EXISTS "paid_payments_update" ON public.paid_payments;
DROP POLICY IF EXISTS "paid_payments_delete" ON public.paid_payments;

CREATE POLICY "paid_payments_select" ON public.paid_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "paid_payments_insert" ON public.paid_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "paid_payments_update" ON public.paid_payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "paid_payments_delete" ON public.paid_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ====================================
-- 8. PENDING_PAYMENTS TABLE
-- ====================================
ALTER TABLE IF EXISTS public.pending_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_payments_select" ON public.pending_payments;
DROP POLICY IF EXISTS "pending_payments_insert" ON public.pending_payments;
DROP POLICY IF EXISTS "pending_payments_update" ON public.pending_payments;
DROP POLICY IF EXISTS "pending_payments_delete" ON public.pending_payments;

CREATE POLICY "pending_payments_select" ON public.pending_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pending_payments_insert" ON public.pending_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pending_payments_update" ON public.pending_payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pending_payments_delete" ON public.pending_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ====================================
-- VERIFICATION QUERIES
-- ====================================

-- Count policies by table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('profiles', 'user_products', 'user_sales', 'user_sessions', 
                     'user_suppliers', 'user_supplier_transactions', 'paid_payments', 'pending_payments')
GROUP BY tablename
ORDER BY tablename;

-- Show all policies with details
SELECT 
  tablename,
  policyname, 
  cmd, 
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'user_products', 'user_sales', 'user_sessions', 
                     'user_suppliers', 'user_supplier_transactions', 'paid_payments', 'pending_payments')
ORDER BY tablename, cmd;
