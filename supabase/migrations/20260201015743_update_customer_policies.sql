/*
  # Update customer RLS policies

  1. Changes
    - Add policy for users to insert their own customer record
    - Add policy for users to update their own customer record
  
  2. Security
    - Users can only create/update records linked to their own user_id
    - Admins retain full access via existing policies
*/

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can create own customer record" ON customers;
  DROP POLICY IF EXISTS "Users can update own customer record" ON customers;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow users to insert their own customer record
CREATE POLICY "Users can create own customer record"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own customer record
CREATE POLICY "Users can update own customer record"
  ON customers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
