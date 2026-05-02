-- ========================================
-- Sankalp App - Database Schema
-- ========================================

-- 1. PROFILES TABLE (stores user profile info)
-- This table links to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  business_name TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own profile record
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ========================================
-- INDEXES (for better query performance)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- ========================================
-- HELPFUL QUERIES
-- ========================================

-- To view all user profiles:
-- SELECT * FROM public.profiles;

-- To check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
