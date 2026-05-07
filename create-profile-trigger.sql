-- Database Trigger: Auto-set profiles.id from auth.uid()
-- This way, the server sets the ID, not the client
-- This ensures RLS policy WITH CHECK (auth.uid() = id) can properly evaluate

CREATE OR REPLACE FUNCTION public.set_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the id to the authenticated user's ID
  NEW.id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_profile_id_on_insert ON public.profiles;

-- Create trigger: fires BEFORE INSERT on profiles table
CREATE TRIGGER set_profile_id_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_id();
