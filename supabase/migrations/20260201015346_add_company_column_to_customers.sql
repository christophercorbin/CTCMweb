/*
  # Add company column to customers table

  1. Changes
    - Add `company` column to `customers` table (text, nullable)
  
  2. Notes
    - This column stores the customer's company name
    - Safe to add with IF NOT EXISTS pattern
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'company'
  ) THEN
    ALTER TABLE customers ADD COLUMN company text;
  END IF;
END $$;
