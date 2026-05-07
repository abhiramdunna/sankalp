-- Comprehensive RLS policy diagnostic

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 2. Check all policies with both qual and with_check columns
SELECT 
  policyname, 
  cmd, 
  permissive,
  qual,
  with_check,
  roles
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd;

-- 3. Check if there are any RESTRICTIVE policies blocking
SELECT 
  policyname, 
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'profiles' AND permissive = false;

-- 4. Try inserting as service_role to verify the table itself works
-- (This should succeed even if user policies are broken)
INSERT INTO public.profiles (id, business_name, city, email)
VALUES (gen_random_uuid(), 'Test Business', 'Test City', 'test@example.com')
ON CONFLICT DO NOTHING;

-- 5. Verify the test insert worked
SELECT COUNT(*) FROM public.profiles;
