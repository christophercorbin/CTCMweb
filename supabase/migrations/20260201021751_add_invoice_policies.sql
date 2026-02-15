/*
  # Add RLS policies for invoices table

  1. Changes
    - Add policy for users to view their own invoices
    - Add policy for admins to view all invoices
    - Add policy for admins to create invoices
    - Add policy for admins to update invoices
  
  2. Security
    - Users can only view invoices where customer_id matches their auth.uid()
    - Admins have full access to all invoices
*/

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
  DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
  DROP POLICY IF EXISTS "Admins can create invoices" ON invoices;
  DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
  DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow users to view their own invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Allow admins to view all invoices
CREATE POLICY "Admins can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow admins to create invoices
CREATE POLICY "Admins can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow admins to update invoices
CREATE POLICY "Admins can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow admins to delete invoices
CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
