/*
  # Add UPDATE RLS policy to saved_products table

  ## Summary
  The saved_products table was missing an UPDATE policy, which prevented
  authenticated users from updating their own saved products.

  ## Changes
  - Add UPDATE RLS policy on saved_products so authenticated users can
    update rows they own (matching auth.uid() = user_id)

  ## Security
  - Policy is restricted to authenticated users only
  - Users can only update their own rows (ownership check via auth.uid())
*/

CREATE POLICY "Users can update own saved products"
  ON saved_products FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
