/*
  # Create invoices table

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key) - Unique invoice identifier
      - `invoice_number` (text, unique) - Human-readable invoice number
      - `customer_id` (uuid) - Reference to auth.users table
      - `shipment_id` (uuid) - Reference to shipments table (nullable for future flexibility)
      - `shipment_tracking` (text) - Tracking number for easy reference
      - `amount` (decimal) - Invoice amount in dollars
      - `status` (text) - Invoice status: 'paid', 'pending', or 'overdue'
      - `issue_date` (timestamptz) - Date invoice was issued
      - `due_date` (timestamptz) - Date payment is due
      - `paid_date` (timestamptz, nullable) - Date invoice was paid
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `invoices` table
    - Add policy for customers to view their own invoices
    - Add policy for admins to view all invoices
    - Add policy for admins to manage invoices

  3. Indexes
    - Index on customer_id for faster queries
    - Index on shipment_id for lookups
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_id uuid,
  shipment_tracking text NOT NULL,
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  issue_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL,
  paid_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_shipment_id ON invoices(shipment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
  );

CREATE POLICY "Admins can view all invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can insert invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update invoices"
  ON invoices
  FOR UPDATE
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

CREATE POLICY "Admins can delete invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
