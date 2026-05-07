# RLS Policies Fix Guide - Sankalp App

## Problem Summary
When RLS (Row Level Security) is enabled on all tables, only the login flow works because:
1. **Missing RLS policies** on 6 out of 8 tables used by your app
2. The code tries to query tables without proper authentication rules
3. Only `profiles` and `user_suppliers` tables had policies defined

## Root Cause Analysis

### Tables WITHOUT RLS Policies (Broken):
- ❌ `user_products`
- ❌ `user_sales`
- ❌ `user_sessions`
- ❌ `user_supplier_transactions`
- ❌ `paid_payments`
- ❌ `pending_payments`

### Tables WITH RLS Policies (Working):
- ✅ `profiles` - Has SELECT, INSERT, UPDATE policies
- ✅ `user_suppliers` - Has SELECT, INSERT, UPDATE, DELETE policies

## Solution

### Step 1: Run the SQL Script in Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open your project
3. Navigate to **SQL Editor**
4. Copy the content from `complete-rls-policies.sql` file
5. Paste it in the SQL editor and execute

**OR** run it from your terminal:
```bash
# If using supabase CLI
supabase db push
```

### Step 2: What Each RLS Policy Does

Each table now has 4 RLS policies (SELECT, INSERT, UPDATE, DELETE):

```sql
-- Example: For user_products table
CREATE POLICY "Users can read own products" ON public.user_products
  FOR SELECT USING (auth.uid() = user_id);
  -- Only authenticated users can SELECT rows where user_id matches their auth.uid()

CREATE POLICY "Users can insert own products" ON public.user_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  -- Users can only INSERT rows with their own user_id

CREATE POLICY "Users can update own products" ON public.user_products
  FOR UPDATE USING (auth.uid() = user_id);
  -- Users can only UPDATE rows they own

CREATE POLICY "Users can delete own products" ON public.user_products
  FOR DELETE USING (auth.uid() = user_id);
  -- Users can only DELETE rows they own
```

### Step 3: Verify Policies Are Correct

Run this query in Supabase SQL editor to verify:

```sql
SELECT tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

Expected output should show 4 policies per table (SELECT, INSERT, UPDATE, DELETE).

## Code Changes (If Needed)

Your code in [lib/database.ts](lib/database.ts) already correctly uses `user_id` in all queries:

✅ **CORRECT - Already doing this:**
```typescript
// All queries filter by user_id
.eq('user_id', userId)

// All inserts include user_id
{ user_id: userId, ...data }
```

**No code changes needed!** Your app is already structured correctly for RLS.

## Complete Policy Summary

### All 8 Tables with Policies

| Table | SELECT | INSERT | UPDATE | DELETE | Key Column |
|-------|--------|--------|--------|--------|------------|
| profiles | ✅ | ✅ | ✅ | - | `id` (UUID) |
| user_suppliers | ✅ | ✅ | ✅ | ✅ | `user_id` |
| user_products | ✅ | ✅ | ✅ | ✅ | `user_id` |
| user_sales | ✅ | ✅ | ✅ | ✅ | `user_id` |
| user_sessions | ✅ | ✅ | ✅ | ✅ | `user_id` |
| user_supplier_transactions | ✅ | ✅ | ✅ | ✅ | `user_id` |
| paid_payments | ✅ | ✅ | ✅ | ✅ | `user_id` |
| pending_payments | ✅ | ✅ | ✅ | ✅ | `user_id` |

## Testing After Implementation

1. **Login Flow** → Should work (already working)
2. **Load Suppliers** → Should load user's suppliers only
3. **Add Product** → Should save to user's products
4. **Record Sales** → Should save to user's sales
5. **Add Sessions** → Should save to user's sessions
6. **Payments Screen** → Should show user's payments

If any section still fails, check:
- ✅ All policies are created (run verification query above)
- ✅ RLS is enabled on the table: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- ✅ Your code is sending `user_id` correctly

## Quick Troubleshooting

### Error: "No rows returned"
- Means user_id filter is working but data doesn't exist
- Create new record to verify write operations work

### Error: "permission denied for table"
- Means RLS is enabled but policies are missing
- Re-run the SQL script from `complete-rls-policies.sql`

### Still seeing other users' data
- Means RLS is NOT enabled on that table
- Run: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`

## Files Modified

- ✅ `complete-rls-policies.sql` - Created (contains all RLS policies)
- ✅ `lib/database.ts` - No changes needed (already correct)
- ✅ `app/_layout.tsx` - No changes needed (already correct)

## Additional Notes

- The `profiles` table uses `id` (UUID from auth.users) instead of `user_id`
- All other tables use `user_id` column for consistency
- Both approaches are valid, but keep consistency within your schema
- Indexes have been added to `user_id` columns for query performance
