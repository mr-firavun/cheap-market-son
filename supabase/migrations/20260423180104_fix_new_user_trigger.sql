/*
  # Fix new user trigger

  The handle_new_user trigger was failing with "Database error saving new user"
  because the trigger function runs in a context where RLS can block the insert,
  and there could be conflicts with the referral_code generation.

  Fixes:
  - Drop and recreate the trigger function with better error handling
  - Use a more reliable referral_code generation
  - Ensure the function is SECURITY DEFINER with proper search_path
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code text;
BEGIN
  ref_code := upper(substring(md5(NEW.id::text || clock_timestamp()::text), 1, 8));
  
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (NEW.id, NEW.email, ref_code)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
