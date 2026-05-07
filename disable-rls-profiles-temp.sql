-- TEMPORARY: Disable RLS on profiles table to test if that's the blocker
-- This lets ANY authenticated user insert (not secure long-term)
-- Used only to verify the table schema is correct

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Now try your app - it should work temporarily
-- Once it works, we'll re-enable RLS and fix the auth flow
