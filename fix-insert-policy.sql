-- Debug: Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Aggressive fix: DROP ALL policies and disable/re-enable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible policy names
DROP POLICY IF EXISTS "enable_delete_for_users" ON public.profiles;
DROP POLICY IF EXISTS "enable_insert_for_users" ON public.profiles;
DROP POLICY IF EXISTS "enable_select_for_users" ON public.profiles;
DROP POLICY IF EXISTS "enable_update_for_users" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_full_access" ON public.profiles;

-- Create policies with PERMISSIVE explicitly
CREATE POLICY "select_own" ON public.profiles
  AS PERMISSIVE FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "insert_own" ON public.profiles
  AS PERMISSIVE FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own" ON public.profiles
  AS PERMISSIVE FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "delete_own" ON public.profiles
  AS PERMISSIVE FOR DELETE 
  USING (auth.uid() = id);

-- Verify
SELECT policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd;
