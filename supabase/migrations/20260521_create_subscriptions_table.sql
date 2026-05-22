-- Create subscriptions table for Sankalp Pro
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL DEFAULT '30_days_plan',
  purchase_token TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiration_date TIMESTAMP WITH TIME ZONE,
  auto_renewing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own subscription
CREATE POLICY subscriptions_users_read_own
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can do everything (for backend/admin)
CREATE POLICY subscriptions_service_role
  ON public.subscriptions
  USING (auth.role() = 'service_role');

-- RLS Policy: Authenticated users can insert their own
CREATE POLICY subscriptions_users_insert
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own
CREATE POLICY subscriptions_users_update
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
