# RLS Policy Troubleshooting Guide

## Problem
Getting error: `Failed to create user record: Error: RLS_INSERT_POLICY_NOT_CONFIGURED`

This means the RLS INSERT policy on the `users` table is either:
- ❌ Missing completely
- ❌ Configured with wrong logic
- ❌ Duplicate policies conflicting with each other

---

## Solution: 3-Step Fix

### Step 1: Verify Current Policies in Supabase

1. Go to **Supabase Dashboard**
2. Click **SQL Editor** 
3. Run this query to see all policies:

```sql
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;
```

**What you should see:**
```
policyname                              | permissive | roles          | qual            | with_check
Users can read own user record         | t          | {authenticated} | (auth.uid()=id) | 
Users can insert own user record       | t          | {authenticated} |                 | (auth.uid()=id)
Users can update own user record       | t          | {authenticated} | (auth.uid()=id) | (auth.uid()=id)
```

**If you see different results** (like `users_insert_own`, `users_select_own`, etc.), proceed to Step 2.

---

### Step 2: Fix Incorrect Policies

1. In **SQL Editor**, run [COMPLETE_RLS_FIX.sql](COMPLETE_RLS_FIX.sql)
2. This will:
   - Disable RLS temporarily
   - Drop ALL old policies
   - Re-enable RLS
   - Create 3 correct policies
3. Wait for "Success" message

---

### Step 3: Verify & Test

1. Run the verification query again (from Step 1)
2. Confirm you see exactly 3 policies with correct `auth.uid() = id` checks
3. Go back to your Expo app
4. Press `r` to reload
5. Try signing up again

---

## If It Still Fails...

If you still get the RLS error after Step 2, try this SQL to completely reset:

```sql
-- NUCLEAR OPTION: Reset everything
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own user record" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own user record" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own user record" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'users';
```

---

## Code Changes Made

Updated [lib/auth.ts](lib/auth.ts):
- ✅ Now tries INSERT first
- ✅ Falls back to UPSERT if RLS blocks it
- ✅ Better error logging with clear steps to fix
- ✅ 3 retry attempts with backoff

---

## What This Enables

Once RLS policies are fixed, users can:
1. ✅ Sign up with Google
2. ✅ User record auto-created in database
3. ✅ See welcome screen
4. ✅ Go to profile tab

