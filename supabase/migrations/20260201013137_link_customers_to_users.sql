/*
  # Link Customers to Users

  1. Changes
    - Add `user_id` column to `customers` table to link customers with auth users
    - Add foreign key constraint to ensure data integrity
    - Create index on user_id for faster lookups
  
  2. Security
    - Update RLS policies to ensure users can only see their own customer data
  
  3. Important Notes
    - user_id is nullable to allow customers to be created before users are registered
    - Once a user registers, their email can be matched to link the customer record
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN user_id uuid REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

CREATE POLICY "Admins can view all customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role' = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can create customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can delete customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');