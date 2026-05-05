/*
  # Add referral bonus expiry to profiles

  ## Summary
  Adds a `referral_bonus_expires_at` column to the `profiles` table to track
  whether a user is currently eligible for the +10% profit bonus.

  ## When bonus is active
  - The referred user (someone who signed up with a referral code): bonus starts at signup
  - The referrer (user whose referral code was used): bonus starts when someone uses their code

  Both users get a 45-day window from the trigger event.

  ## New Columns
  - `profiles.referral_bonus_expires_at` (timestamptz, nullable) — null means no active bonus;
    non-null means bonus is active until this timestamp

  ## Notes
  - No data loss; existing rows get NULL (no bonus) by default
  - Frontend reads this column to decide whether to show +10% profit rate
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_bonus_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_bonus_expires_at timestamptz DEFAULT NULL;
  END IF;
END $$;
