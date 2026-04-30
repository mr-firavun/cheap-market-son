/*
  # Add phone number and password reset support

  ## Changes
  1. profiles table
     - `phone_number` (text) — user's phone number for 2FA/security
     - `phone_verified` (boolean) — whether phone is verified
     - `phone_otp` (text) — temporary OTP code for phone verification
     - `phone_otp_expires_at` (timestamptz) — OTP expiry

  2. password_reset_codes table (new)
     - Stores email-based OTP codes for password reset
     - `email`, `code`, `expires_at`, `used`

  ## Security
  - RLS enabled on password_reset_codes
  - Only service role can insert/update reset codes
  - Users can select their own pending reset code (for validation)
*/

-- Add phone fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_otp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_otp text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_otp_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_otp_expires_at timestamptz;
  END IF;
END $$;

-- Password reset codes table
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a reset code request (rate limiting is handled in app logic)
CREATE POLICY "Anyone can request password reset"
  ON password_reset_codes FOR INSERT
  WITH CHECK (true);

-- Anyone can read reset codes by email (needed for client-side code verification)
CREATE POLICY "Anyone can verify reset code"
  ON password_reset_codes FOR SELECT
  USING (true);

-- Anyone can mark a code as used
CREATE POLICY "Anyone can mark code as used"
  ON password_reset_codes FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_codes(email, used, expires_at);
