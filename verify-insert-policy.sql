-- Proper verification of INSERT policy
-- The INSERT policy condition is in 'with_check' column, NOT 'qual'

SELECT 
  policyname, 
  cmd, 
  qual,           -- For SELECT/UPDATE/DELETE
  with_check      -- For INSERT and UPDATE
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd;

-- Expected output:
-- policyname          | cmd    | qual              | with_check
-- delete_own          | DELETE | (auth.uid() = id) | (null)
-- insert_own          | INSERT | (null)            | (auth.uid() = id) ✅ 
-- select_own          | SELECT | (auth.uid() = id) | (null)
-- update_own          | UPDATE | (auth.uid() = id) | (auth.uid() = id)

-- If your INSERT still shows NULL in with_check, run this to recreate it:
DROP POLICY IF EXISTS "insert_own" ON public.profiles;

CREATE POLICY "insert_own" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
