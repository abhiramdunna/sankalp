DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_started_at';
    EXECUTE 'ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscribed_until';
  END IF;
END $$;