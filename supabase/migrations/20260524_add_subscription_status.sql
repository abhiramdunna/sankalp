-- Add explicit subscription status so the app can trust the stored payment state.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive';

-- Allow a user to have multiple subscription rows over time so we preserve history.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

-- Keep the lookup fast for latest-row queries and status checks.
CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx
  ON public.subscriptions (user_id, status, created_at DESC);

-- Backfill existing rows from expiration timestamps when available.
UPDATE public.subscriptions
SET status = CASE
  WHEN expiration_date IS NULL OR expiration_date > NOW() THEN 'active'
  ELSE 'inactive'
END;