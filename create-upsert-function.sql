-- Better fix: Create a database function for profile upsert
-- This function is called by the app and handles the RLS internally

DROP FUNCTION IF EXISTS public.upsert_user_profile CASCADE;

CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_id UUID,
  p_email TEXT,
  p_business_name TEXT,
  p_city TEXT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Insert or update the profile
  INSERT INTO public.profiles (id, email, business_name, city, created_at, updated_at)
  VALUES (p_id, p_email, p_business_name, p_city, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = p_email,
    business_name = p_business_name,
    city = p_city,
    updated_at = NOW();

  -- Return the updated profile
  SELECT json_build_object(
    'id', id,
    'email', email,
    'business_name', business_name,
    'city', city,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM public.profiles
  WHERE id = p_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
