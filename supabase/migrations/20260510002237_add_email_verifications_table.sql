/*
  # Add Email Verifications Table

  ## Purpose
  Stores one-time 6-digit codes for email verification during signup.
  Users must verify their email before their account becomes active.

  ## New Tables
  - `email_verifications`
    - `id` (uuid, primary key)
    - `email` (text) - the email address to verify
    - `code` (text) - 6-digit verification code
    - `expires_at` (timestamptz) - code expires after 15 minutes
    - `used` (boolean) - whether the code has been used
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public insert allowed (needed before user is authenticated)
  - Select/update restricted to matching email only (via service role in edge function)
*/

CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Service role (edge function) handles all operations, no direct client access needed
-- We use a public insert policy only for the edge function flow via service role
-- No client-side policies needed since edge function uses service role key
