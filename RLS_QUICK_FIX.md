# RLS Issues - Quick Summary

## 🔴 Problem: Only Login Works with RLS Enabled

```
Login ✅ → Works (profiles table has policies)
Suppliers ❌ → Fails (no policies)
Products ❌ → Fails (no policies)
Sales ❌ → Fails (no policies)
Payments ❌ → Fails (no policies)
```

## 🔍 Root Cause

Your `supabase-schema.sql` only defines RLS policies for **2 tables**:
- ✅ profiles
- ✅ user_suppliers

But your app queries **8 tables**:
- ❌ user_products (MISSING POLICIES)
- ❌ user_sales (MISSING POLICIES)
- ❌ user_sessions (MISSING POLICIES)
- ❌ user_supplier_transactions (MISSING POLICIES)
- ❌ paid_payments (MISSING POLICIES)
- ❌ pending_payments (MISSING POLICIES)
- ✅ profiles (HAS POLICIES)
- ✅ user_suppliers (HAS POLICIES)

## ✅ Solution

### Step 1: Execute SQL Script
Run this SQL in your Supabase Dashboard > SQL Editor:

**File: `complete-rls-policies.sql`** (I created this for you)

This script will:
- Create all missing tables (if they don't exist)
- Enable RLS on all 8 tables
- Create 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
- Add performance indexes

### Step 2: Understand the Policy Pattern

Each table follows this pattern:

```sql
-- This is repeated for all 8 tables

ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can READ only their own rows
CREATE POLICY "Users can read own [items]" ON public.table_name
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can CREATE only with their user_id
CREATE POLICY "Users can insert own [items]" ON public.table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can EDIT only their own rows
CREATE POLICY "Users can update own [items]" ON public.table_name
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy 4: Users can DELETE only their own rows
CREATE POLICY "Users can delete own [items]" ON public.table_name
  FOR DELETE USING (auth.uid() = user_id);
```

### Step 3: Verify It Worked

Run this verification query in SQL Editor:

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

Expected result:
```
paid_payments              | 4
pending_payments           | 4
profiles                   | 3
user_products              | 4
user_sales                 | 4
user_sessions              | 4
user_supplier_transactions | 4
user_suppliers             | 4
```

## 💡 Why Your Code Already Works

Your `lib/database.ts` already does the right thing:

✅ All queries filter by `user_id`:
```typescript
.eq('user_id', userId)  // ← Only gets this user's data
```

✅ All inserts include `user_id`:
```typescript
{ user_id: userId, ...data }  // ← Sets user_id when creating
```

✅ All updates filter by `user_id`:
```typescript
.update(data)
.eq('user_id', userId)  // ← Only updates this user's rows
```

**NO CODE CHANGES NEEDED!**

## 🚀 After Running the SQL

Your app will work like this:

```
User A logs in
  ↓
Can see only User A's suppliers ✅
Can see only User A's products ✅
Can see only User A's sales ✅

User B logs in
  ↓
Cannot see User A's data ❌ (RLS blocks)
Can see only User B's suppliers ✅
Can see only User B's products ✅
Can see only User B's sales ✅
```

## 📊 Side-by-Side Comparison

### BEFORE (Current - Broken)
```
RLS Enabled: YES
Policies: Only on profiles + user_suppliers
Result: ❌ Other tables return permission denied
```

### AFTER (With complete-rls-policies.sql)
```
RLS Enabled: YES
Policies: All 8 tables with complete CRUD policies
Result: ✅ All tables work, data isolated per user
```

## 🎯 Next Steps

1. Copy all SQL from `complete-rls-policies.sql`
2. Go to Supabase Dashboard → SQL Editor
3. Paste and execute
4. Run the verification query above
5. Test the app - suppliers, products, sales should all work!

## ❓ Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "permission denied for table" | RLS enabled but no policies | Run the SQL script |
| "No rows returned" | Policies work but data missing | Create new record to test |
| "Column not found" | Table structure mismatch | Check schema in Supabase UI |

---

**Status**: Ready to fix! Just run the SQL script. 🚀
