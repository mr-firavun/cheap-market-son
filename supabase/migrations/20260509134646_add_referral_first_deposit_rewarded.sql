/*
  # Add referral first deposit reward tracking

  ## Changes
  - `profiles` tablosuna `referral_first_deposit_rewarded` boolean kolonu eklendi.
    Bu kolon, bir kullanıcının ilk 200$+ yatırımı için referans sahibine
    15 USDT ödülünün verilip verilmediğini takip eder.
    Varsayılan false — ödül verildikten sonra true yapılır, böylece
    aynı kullanıcı için ödül bir kez verilir.

  ## Security
  - Mevcut RLS politikaları korunur.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_first_deposit_rewarded'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_first_deposit_rewarded boolean DEFAULT false NOT NULL;
  END IF;
END $$;
