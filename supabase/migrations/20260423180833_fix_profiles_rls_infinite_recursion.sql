/*
  # Fix profiles RLS infinite recursion

  The admin policies were querying the profiles table itself to check is_admin,
  causing infinite recursion. Fixed by using auth.jwt() app_metadata or a
  security definer function instead.

  Changes:
  - Drop recursive admin policies
  - Recreate admin check using a SECURITY DEFINER function to break the recursion
*/

-- Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Drop recursive admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Recreate using the security definer function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());
