/*
  # Fix loads table INSERT policy

  Adds WITH CHECK clause to the INSERT policy on the loads table so that
  authenticated users can only insert rows with their own user_id. This
  prevents a logged-in user from saving a load under another user's account.
*/

DROP POLICY IF EXISTS "Users can insert own loads" ON loads;

CREATE POLICY "Users can insert own loads"
  ON loads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
