/*
  # Add admin insert policy for transactions

  ## Problem
  The transactions table only had an INSERT policy allowing users to insert
  rows where auth.uid() = user_id. This blocked admins from inserting
  transactions on behalf of other users (e.g., deposit records and
  referral_bonus records created during manual balance updates).

  ## Change
  Add a new INSERT policy granting admins the ability to insert any transaction.
*/

CREATE POLICY "Admins can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
