/*
  # Password reset RPC function

  Creates a security definer function that allows resetting a user's password
  by email after they've verified their OTP code client-side.

  The function uses auth.users to find the user by email and updates their
  encrypted password using Supabase's built-in crypt functions.
*/

CREATE OR REPLACE FUNCTION reset_user_password(p_email text, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update encrypted password
  UPDATE auth.users
  SET
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now(),
    -- Clear any recovery tokens so old reset links are invalidated
    recovery_token = null,
    recovery_sent_at = null
  WHERE id = v_user_id;
END;
$$;
