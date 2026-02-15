/*
  # Fix invoice RLS policies to use JWT instead of auth.users table
  
  1. Changes
    - Drop all existing invoice policies that query auth.users table
    - Recreate policies using auth.jwt() to access user metadata
    - This fixes "permission denied for table users" error
  
  2. Security
    - Maintains same security model (customers see own invoices, admins see all)
    - Uses JWT claims which are accessible to authenticated users
    - No direct auth.users table access needed
*/

-- Drop all existing invoice policies
DROP POLICY IF EXISTS "Customers can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can create invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

-- SELECT policies
CREATE POLICY "Customers can view own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin');

-- INSERT policies
CREATE POLICY "Admins can insert invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin');

-- UPDATE policies
CREATE POLICY "Admins can update invoices"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin')
  WITH CHECK ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin');

-- DELETE policies
CREATE POLICY "Admins can delete invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin');
