/*
  # Add daily_profit column to products

  ## Summary
  Adds an optional `daily_profit` column to the `products` table.
  Admin can enter a dollar value representing the average daily profit
  for a product. When set, it is displayed on the product card in the
  public catalog.

  ## New Columns
  - `products.daily_profit` (numeric(18,2), nullable) — admin-defined
    average daily profit in USDT; null means not shown on the card

  ## Notes
  - Existing rows get NULL by default (no change in behaviour)
  - No RLS changes needed; reads follow existing products policy
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'daily_profit'
  ) THEN
    ALTER TABLE products ADD COLUMN daily_profit numeric(18,2) DEFAULT NULL;
  END IF;
END $$;
