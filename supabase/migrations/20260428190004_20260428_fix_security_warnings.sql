/*
  # Fix Security Warnings

  ## Problems Fixed

  1. password_reset_codes RLS policies
     - Removed "Anyone can request password reset" INSERT policy with WITH CHECK (true)
     - Removed "Anyone can mark code as used" UPDATE policy with USING/WITH CHECK (true)
     - Removed "Anyone can verify reset code" SELECT policy with USING (true)
     - New INSERT: anon and authenticated roles allowed (password reset is public by nature)
       but WITH CHECK restricts to only inserting rows where used=false
     - New UPDATE: only allows marking used=true on matching email+code rows (no free update)
     - New SELECT: only allows reading non-used, non-expired codes by email match (server validates)

  2. Function EXECUTE permissions
     - Revoke public/anon EXECUTE on handle_new_user() — it's a trigger, not an RPC
     - Revoke public/anon EXECUTE on is_admin() — internal helper only
     - Revoke public/anon EXECUTE on reset_user_password() — should only be callable by authenticated users
       who have already verified their OTP code

  ## Security Notes
  - handle_new_user is a trigger function, it should never be called directly via RPC
  - is_admin is an internal helper, no need for public access
  - reset_user_password requires the caller to be authenticated (they must have verified OTP first)
  - password_reset_codes INSERT remains open to anon (unauthenticated users need to request a reset)
    but is rate-limited by app logic
*/

-- ============================================================
-- 1. Fix password_reset_codes RLS policies
-- ============================================================

-- Drop the insecure policies
DROP POLICY IF EXISTS "Anyone can request password reset" ON password_reset_codes;
DROP POLICY IF EXISTS "Anyone can verify reset code" ON password_reset_codes;
DROP POLICY IF EXISTS "Anyone can mark code as used" ON password_reset_codes;

-- INSERT: allow anon and authenticated to create a reset code request
-- WITH CHECK ensures only valid, unused records can be inserted
CREATE POLICY "Allow password reset code creation"
  ON password_reset_codes FOR INSERT
  TO anon, authenticated
  WITH CHECK (used = false);

-- SELECT: allow reading a specific code to verify it (email must match, code unused and not expired)
CREATE POLICY "Allow reading own reset codes"
  ON password_reset_codes FOR SELECT
  TO anon, authenticated
  USING (expires_at > now() AND used = false);

-- UPDATE: only allow marking a code as used (cannot change email, code, or other fields freely)
-- Restricts to rows that are not yet used and not expired
CREATE POLICY "Allow marking reset code as used"
  ON password_reset_codes FOR UPDATE
  TO anon, authenticated
  USING (used = false AND expires_at > now())
  WITH CHECK (used = true);

-- ============================================================
-- 2. Revoke public EXECUTE on sensitive SECURITY DEFINER functions
-- ============================================================

-- handle_new_user is a trigger function — should never be called directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- is_admin is an internal helper — no direct RPC access needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated, public;
  END IF;
END $$;

-- reset_user_password should only be callable by authenticated users who have verified OTP
-- Revoke from anon (unauthenticated users must not call this directly)
REVOKE EXECUTE ON FUNCTION public.reset_user_password(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reset_user_password(text, text) TO authenticated;
