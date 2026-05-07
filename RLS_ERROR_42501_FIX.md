# RLS Error 42501 - Fix Guide

## Error You're Seeing
```
saveSuppliers error: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"user_suppliers\""
}
```

## What This Means
- RLS is enabled ✅
- Policies exist ✅
- BUT the INSERT is being rejected ❌
- Reason: `auth.uid()` doesn't match the `user_id` being inserted

## Quick Fix (3 Steps)

### Step 1: Fix RLS Policies in Supabase

Go to **Supabase Dashboard** → **SQL Editor** → **New Query**

Paste this exact SQL and execute:

```sql
-- Drop old policies
ALTER TABLE public.user_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own suppliers" ON public.user_suppliers;
DROP POLICY IF EXISTS "Users can insert own suppliers" ON public.user_suppliers;
DROP POLICY IF EXISTS "Users can update own suppliers" ON public.user_suppliers;
DROP POLICY IF EXISTS "Users can delete own suppliers" ON public.user_suppliers;

-- Create new policies
CREATE POLICY "Users can read own suppliers" ON public.user_suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers" ON public.user_suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers" ON public.user_suppliers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers" ON public.user_suppliers
  FOR DELETE USING (auth.uid() = user_id);
```

**Execute this.** You should see: `Success. No rows returned.`

### Step 2: Verify the Policies

Run this query to confirm:

```sql
SELECT policyname, permissive, cmd FROM pg_policies 
WHERE tablename = 'user_suppliers' 
ORDER BY policyname;
```

You should see 4 results:
- Users can delete own suppliers (DELETE)
- Users can insert own suppliers (INSERT)
- Users can read own suppliers (SELECT)
- Users can update own suppliers (UPDATE)

### Step 3: Test Your App

1. Close your app completely
2. Clear app cache / rebuild
3. Login again
4. Try to add/update a supplier

## If Still Not Working

Check your console logs after trying to save:

Look for this output:
```
✅ Auth session confirmed: 8482184b-85fe-4213-9ad5-9b478a18c239
📝 Inserting new supplier: { 
  name: "...",
  user_id: "8482184b-85fe-4213-9ad5-9b478a18c239",
  auth_uid: "8482184b-85fe-4213-9ad5-9b478a18c239",
  match: true
}
```

### Scenario A: `match: true` but still fails
Then there's a Supabase service issue. Try:
1. Run policies again (Step 1)
2. Restart Expo: `npx expo start --clear`

### Scenario B: `match: false`
The `user_id` in store doesn't match `auth.uid()`. This means:
- The auth session isn't being set correctly in the store

**Fix for Scenario B** - Check [app/_layout.tsx](app/_layout.tsx) around line 95:

```typescript
// VERIFY THIS SECTION HAS THE RIGHT CODE:
const { data: profile } = await supabase
  .from('profiles')
  .select('business_name, city')
  .eq('id', session.user.id)  // ← MUST BE session.user.id
  .maybeSingle();

setUser({
  id: session.user.id,        // ← MUST BE session.user.id
  email: session.user.email || '',
  user_metadata: session.user.user_metadata,
  hasCompleteProfile: !!(profile?.business_name && profile?.city),
});
```

### Scenario C: Auth session check fails
Console shows: `❌ Auth session not found!`

**This means**: User is not properly authenticated. Possible causes:
1. Logout without clearing AsyncStorage (check RLS_TROUBLESHOOTING.md)
2. Token expired
3. Google sign-in not completing properly

**Solution**:
```bash
# Clear everything and restart
npx expo start --clear
```

## Manual Database Check

If you want to verify the data directly in Supabase:

1. Go to **Supabase Dashboard** → **Table Editor**
2. Click on `user_suppliers` table
3. Look at the data - check if your suppliers have the correct `user_id`
4. The `user_id` should match the user's UUID from the `profiles` table

## All RLS Policies Required

Your app needs policies on all 8 tables. Run the **complete-rls-policies.sql** script (at project root) to set up everything properly.

```sql
-- Tables that need policies:
1. profiles ✅
2. user_suppliers ✅ (failing - fix above)
3. user_products
4. user_sales
5. user_sessions
6. user_supplier_transactions
7. paid_payments
8. pending_payments
```

## Timeline

- ✅ App loads → Auth works
- ✅ Login successful
- ✅ Route navigation works
- ❌ Trying to save suppliers → RLS error 42501
- **← You are here**

**Solution**: Run the SQL in Step 1 above. That's it!
