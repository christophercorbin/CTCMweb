/*
  # Fix authentication users

  1. Changes
    - Delete manually created test users that are causing auth issues
    - Clean up associated customer records
  
  2. Notes
    - Users should be created through the signup flow instead
    - This resolves the "Database error querying schema" issue
*/

-- Delete invoices first (foreign key constraint)
DELETE FROM invoices 
WHERE customer_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('admin@skybox.com', 'customer@skybox.com')
);

-- Delete customer records
DELETE FROM customers 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('admin@skybox.com', 'customer@skybox.com')
);

-- Delete the auth users
DELETE FROM auth.users 
WHERE email IN ('admin@skybox.com', 'customer@skybox.com');
