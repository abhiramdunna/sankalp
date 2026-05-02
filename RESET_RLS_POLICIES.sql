-- ========================================
-- Drop All Existing RLS Policies
-- ========================================

-- Drop all policies on users table
DROP POLICY IF EXISTS "Users can read own user record" ON public.users;
DROP POLICY IF EXISTS "Users can update own user record" ON public.users;
DROP POLICY IF EXISTS "Users can read own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

-- Drop all policies on profile table
DROP POLICY IF EXISTS "Users can read own profile" ON public.profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profile;
DROP POLICY IF EXISTS "Users can read own business record" ON public.profile;
DROP POLICY IF EXISTS "Users can insert own business record" ON public.profile;
DROP POLICY IF EXISTS "Users can update own business record" ON public.profile;

-- Drop all policies on businesses table (if exists)
DROP POLICY IF EXISTS "Users can read own business record" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert own business record" ON public.businesses;
DROP POLICY IF EXISTS "Users can update own business record" ON public.businesses;

-- ========================================
-- Create NEW RLS Policies for USERS Table
-- ========================================

-- Policy 1: Users can SELECT (read) only their own record
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can UPDATE (edit) only their own record
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 3: System can INSERT new user records (for auth signup)
CREATE POLICY "users_insert_new" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ========================================
-- Create NEW RLS Policies for PROFILE Table
-- ========================================

-- Policy 1: Users can SELECT (read) only their own profile
CREATE POLICY "profile_select_own" ON public.profile
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can INSERT (create) only their own profile
CREATE POLICY "profile_insert_own" ON public.profile
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can UPDATE (edit) only their own profile
CREATE POLICY "profile_update_own" ON public.profile
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================================
-- Verify RLS is Enabled
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Check Created Policies (View Only)
-- ========================================

-- Run this query to verify all policies:
-- SELECT tablename, policyname, permissive, roles, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('users', 'profile');
