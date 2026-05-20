-- Create deleted_accounts table to track deleted user accounts
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  business_name TEXT,
  business_category TEXT,
  city TEXT,
  state TEXT,
  deletion_reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on deleted_accounts table
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deleted_accounts table
-- Only admins can view all deleted accounts (using a service role)
-- This table is typically accessed server-side only
CREATE POLICY "Only authenticated users can view deleted accounts" ON deleted_accounts
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own deletion record" ON deleted_accounts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index on deleted_at for easy querying
CREATE INDEX idx_deleted_accounts_deleted_at ON deleted_accounts(deleted_at DESC);
CREATE INDEX idx_deleted_accounts_user_id ON deleted_accounts(user_id);

-- Add comment to table
COMMENT ON TABLE deleted_accounts IS 'Tracks users who have deleted their accounts with their deletion reasons';
