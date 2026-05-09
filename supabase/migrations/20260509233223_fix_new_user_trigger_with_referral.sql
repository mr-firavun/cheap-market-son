/*
  # Fix new user trigger to handle referral code from metadata

  ## Problem
  After signUp, the client-side upsert to set referred_by and full_name
  fails silently because the user has no authenticated session yet
  (email confirmation flow) or the upsert races with the trigger.

  ## Solution
  Update the trigger to read `full_name` and `referral_code` from
  `raw_user_meta_data` (passed during signUp), resolve the referrer's
  profile ID from the referral code, and set referred_by directly.
  This runs as SECURITY DEFINER so RLS is bypassed safely.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code text;
  referrer_id uuid;
  v_full_name text;
  v_referral_code_used text;
BEGIN
  ref_code := upper(substring(md5(NEW.id::text || clock_timestamp()::text), 1, 8));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_referral_code_used := NEW.raw_user_meta_data->>'referral_code';

  -- Resolve referrer
  IF v_referral_code_used IS NOT NULL AND v_referral_code_used <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = upper(v_referral_code_used)
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by)
  VALUES (NEW.id, NEW.email, v_full_name, ref_code, referrer_id)
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback: at minimum create the profile row
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (NEW.id, NEW.email, ref_code)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
