/*
  # Fix customer RLS policies to use correct JWT path
  
  1. Changes
    - Update customer policies to access role from user_metadata in JWT
    - Role is stored in user_metadata, not at JWT root level
  
  2. Security
    - Maintains same security model
    - Customers can view/update own records
    - Admins can view/update all records
*/

-- Drop and recreate admin policies with correct JWT path
DROP POLICY IF EXISTS "Admins can view all customers" ON customers;
DROP POLICY IF EXISTS "Admins can create customers" ON customers;
DROP POLICY IF EXISTS "Admins can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

-- SELECT policy
CREATE POLICY "Admins can view all customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'user_metadata')::json->>'role' = 'admin'
    OR user_id = auth.uid()
  );

-- INSERT policy
CREATE POLICY "Admins can create customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin');

-- UPDATE policy
CREATE POLICY "Admins can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin')
  WITH CHECK ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin');

-- DELETE policy
CREATE POLICY "Admins can delete customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::json->>'role' = 'admin');
