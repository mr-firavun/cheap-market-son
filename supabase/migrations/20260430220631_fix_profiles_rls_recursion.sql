/*
  # Fix infinite recursion in profiles RLS policies

  The "Admins can view/update all profiles" policies were causing infinite recursion
  because they queried the profiles table itself to check is_admin, triggering the
  same policy again.

  Fix: Replace the recursive subquery with auth.jwt() to read is_admin from the
  JWT app_metadata, which doesn't trigger RLS.
  
  Since is_admin is stored in the profiles table (not JWT), the safest fix is to
  use a security definer function that bypasses RLS for the admin check.
*/

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create a security definer function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND is_admin = true
  );
$$;

-- Recreate policies using the security definer function (no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));
