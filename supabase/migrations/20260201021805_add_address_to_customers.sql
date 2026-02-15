/*
  # Add address column to customers table

  1. Changes
    - Add address column to customers table for storing customer physical address
  
  2. Security
    - No policy changes needed - existing policies cover this column
*/

-- Add address column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'address'
  ) THEN
    ALTER TABLE customers ADD COLUMN address text;
  END IF;
END $$;
