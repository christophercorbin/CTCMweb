/*
  # Create Customers Table

  1. New Tables
    - `customers`
      - `id` (uuid, primary key) - Unique customer identifier
      - `name` (text) - Customer's full name
      - `phone` (text) - Customer's phone number
      - `email` (text, unique) - Customer's email address
      - `air_skybox_address` (text) - Sky box address for air freight
      - `sea_skybox_address` (text) - Sky box address for sea freight
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp
  
  2. Security
    - Enable RLS on `customers` table
    - Add policy for authenticated users to view all customers
    - Add policy for authenticated users to create customers
    - Add policy for authenticated users to update customers
  
  3. Important Notes
    - Email field has unique constraint to prevent duplicate customers
    - Both air and sea skybox addresses stored separately for flexibility
    - Timestamps track when customer records are created and modified
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text UNIQUE NOT NULL,
  air_skybox_address text NOT NULL,
  sea_skybox_address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (true);