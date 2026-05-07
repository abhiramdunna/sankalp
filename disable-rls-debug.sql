-- TEMPORARY DEBUG: Disable RLS on profiles to test if that's the blocker
-- This will allow any authenticated user to insert

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Try the insert now (from app)
-- If it works, RLS is the issue
-- Then we'll re-enable RLS with a corrected policy

-- To re-enable later:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
