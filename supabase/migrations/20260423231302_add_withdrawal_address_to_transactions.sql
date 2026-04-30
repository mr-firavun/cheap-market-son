/*
  # Add withdrawal_address to transactions

  1. Changes
    - `transactions` table: add `withdrawal_address` (text) column to store the TRC20 address
      the user wants funds sent to when requesting a withdrawal

  2. Notes
    - Existing rows get NULL by default (safe, only relevant for withdrawal type)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'withdrawal_address'
  ) THEN
    ALTER TABLE transactions ADD COLUMN withdrawal_address text;
  END IF;
END $$;
